// CC-HT7B: revision estatica y renderizado; no ejecuta SQL ni consulta Supabase.
module.exports=function({test,load,lexicalSql,workspace,root,React,renderToStaticMarkup,renderData}){
 const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),ts=require('typescript');
 const sql=fs.readFileSync(path.join(workspace,'supabase/migrations/0011_producto_completo.sql'),'utf8');
 const catalog=fs.readFileSync(path.join(workspace,'supabase/migrations/0013_catalogo_real.sql'),'utf8').replace(/\r\n/g,'\n');
 const fn=name=>{const match=sql.match(new RegExp('create or replace function public\\.'+name+'\\(([\\s\\S]*?)\\)\\s*returns[\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$;','i'));assert.ok(match,'Funcion no encontrada: '+name);return {args:match[1],body:match[2]};};
 const strings=value=>[...value.matchAll(/'((?:[^']|'')*)'/g)].map(m=>m[1].replace(/''/g,"'"));
 // Divide expresiones SQL respetando cadenas, arrays y parentesis anidados.
 function expressions(text){let quote=false,depth=0,brackets=0,start=0,out=[];for(let i=0;i<text.length;i++){const c=text[i];if(c==="'"){if(quote&&text[i+1]==="'"){i++;continue;}quote=!quote;continue;}if(quote)continue;if(c==='(')depth++;if(c===')')depth--;if(c==='[')brackets++;if(c===']')brackets--;if(c===','&&depth===0&&brackets===0){out.push(text.slice(start,i).trim());start=i+1;}}out.push(text.slice(start).trim());return out;}
 function stagedRows(name){const cteStart=catalog.indexOf('with '+name+'('),values=catalog.indexOf('  values',cteStart)+8,end=catalog.indexOf('\n)\n',values);assert.ok(cteStart>=0&&end>values);const text=catalog.slice(values,end);let quote=false,depth=0,start=0,rows=[];for(let i=0;i<text.length;i++){const c=text[i];if(c==="'"){if(quote&&text[i+1]==="'"){i++;continue;}quote=!quote;continue;}if(quote)continue;if(c==='('){if(depth===0)start=i+1;depth++;}if(c===')'){depth--;if(depth===0)rows.push(expressions(text.slice(start,i)));}}assert.equal(depth,0);return rows;}
 test('Cancelacion: exactamente cuatro campos permitidos y propiedad obligatoria',()=>{
  const body=fn('guard_reservation_fields').body;
  const ignored=[...body.matchAll(/array\[([^\]]+)\]/g)].map(m=>strings(m[1]));
  assert.equal(ignored.length,2);for(const set of ignored)assert.deepEqual(set,['status','cancellation_reason','cancelled_at','refund_pending']);
  assert.match(body,/old\.user_id is distinct from auth\.uid\(\)/);assert.match(body,/auth\.uid\(\) is null/);assert.match(body,/old\.status not in \('pendiente_pago','confirmada'\)/);assert.match(body,/new\.status <> 'cancelada'/);
 });
 test('RPC y trigger: solo cancelar lo propio; pago y completado requieren admin',()=>{
  const rpc=fn('update_reservation_status').body,guard=fn('guard_reservation_status').body;
  assert.match(rpc,/if not v_admin and p_status<>'cancelada'/);assert.match(rpc,/where id=p_reservation_id and \(v_admin or user_id=auth\.uid\(\)\) for update/);
  assert.match(guard,/not public\.is_admin\(\) and auth\.uid\(\)=old\.user_id/);assert.match(guard,/old\.status in \('pendiente_pago','confirmada'\) and new\.status='cancelada'/);
  assert.match(guard,/new\.refund_pending:=\(old\.status='confirmada'\)/);assert.match(guard,/new\.cancelled_at:=now\(\)/);
  assert.match(guard,/if public\.is_admin\(\) then[\s\S]*new\.status='completada' and old\.status='confirmada'/);
 });
 test('Cupos: vista y ambas guardas conservan pendiente_pago y confirmada',()=>{
  const view=sql.slice(sql.indexOf('create or replace view public.v_tour_dates_free'),sql.indexOf('grant select on public.v_tour_dates_free'));
  for(const body of [view,fn('guard_tour_date_capacity').body,fn('guard_reservation_capacity').body]){
   const states=[...body.matchAll(/\bstatus in \(([^)]+)\)/g)];assert.ok(states.length);for(const state of states)assert.deepEqual(strings(state[1]),['pendiente_pago','confirmada']);
  }
  assert.match(fn('guard_reservation_capacity').body,/for update/);assert.match(sql,/Cancelar o completar libera plazas/);
 });
 test('Checkout: llamada publica cubierta por la firma vigente de trece argumentos',()=>{
  const current=fs.readFileSync(path.join(workspace,'supabase/migrations/0016_contacto_reserva.sql'),'utf8');
  const booking=current.match(/create or replace function public\.create_booking\(([\s\S]*?)\)\s*returns[\s\S]*?\$\$([\s\S]*?)\$\$;/i);assert.ok(booking);
  const signature=booking[1],params=signature.split(',').map(arg=>arg.trim());
  const names=params.map(arg=>arg.split(/\s+/)[0]);
  const api=ts.createSourceFile('api.ts',fs.readFileSync(path.join(root,'lib/api.ts'),'utf8'),ts.ScriptTarget.Latest,true);
  let used=[];function visit(node){if(ts.isCallExpression(node)&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='create_booking'){used=node.arguments[1].properties.map(p=>p.name.text);}ts.forEachChild(node,visit);}visit(api);
  assert.ok(used.length>=8);for(const key of used)assert.ok(names.includes(key),key);assert.equal(names.length,13);for(const param of params)if(!used.includes(param.split(/\s+/)[0]))assert.match(param,/\bdefault\b/i);assert.match(signature,/p_contact_name text default null, p_contact_phone text default null/);
  assert.ok(sql.includes('drop function if exists public.create_booking(uuid,date,text,integer,jsonb,jsonb,text,text);'));assert.ok(sql.includes('drop function if exists public.create_booking(uuid,date,text,integer,jsonb,jsonb,text,text,uuid);'));
  const body=booking[2];assert.match(body,/if p_tour_date_id is null then[\s\S]*order by td\.id for update/);assert.match(body,/f\.bookable and f\.free>=p_pax/);assert.match(body,/order by td\.start_time nulls first,td\.id limit 1/);assert.doesNotMatch(body,/slot_required/);assert.match(current,/notify pgrst, 'reload schema'/);
 });
 test('0013: delimitadores, transaccion e idempotencia sin tocar migraciones previas',()=>{lexicalSql(catalog);assert.match(catalog,/\bbegin;/);assert.match(catalog,/commit;\s*$/);assert.match(catalog,/on conflict \(slug\) do nothing/);assert.match(catalog,/where t\.slug=m\.slug/);assert.match(catalog,/where not exists\(select 1 from public\.tours existing/);assert.ok(!catalog.includes('\ufeff'));});
 const manifest=JSON.parse(fs.readFileSync(path.join(workspace,'public/assets/tours/manifest.json'),'utf8').replace(/^\ufeff/,''));
 const photos=new Set(Object.values(manifest).flatMap(value=>value?.photos?.map(p=>p.file)??[]));
 const media=stagedRows('media'),drafts=stagedRows('staged');
 test('0013: todas las rutas de fotos existen en el manifest autorizado',()=>{const paths=[...new Set([...catalog.matchAll(/\/assets\/tours\/[a-z0-9-]+\/\d+\.webp/g)].map(m=>m[0]))];assert.equal(paths.length,90);for(const file of paths)assert.ok(photos.has(file),file);});
 test('0013: diez actualizaciones con las portadas solicitadas',()=>{
  assert.equal(media.length,10);const expected=['salar-de-uyuni/02','reserva-eduardo-avaroa/01','salar-de-uyuni/01','lago-titicaca-isla-del-sol-norte-y-sur/03','teleferico-la-paz/02','valle-de-la-luna/02','madidi-national-park/01','pampas-de-yacuma/01','machu-picchu/01','tiwanaku/01'];
  media.forEach((row,i)=>{assert.equal(row.length,3);assert.equal(strings(row[1])[0],'/assets/tours/'+expected[i]+'.webp');if(i===8)assert.equal(row[2],'null::jsonb');else assert.ok(Array.isArray(JSON.parse(strings(row[2])[0])));});
  assert.match(catalog,/rating=null,review_count=0,languages=array\['Espa\u00f1ol','English'\]::text\[\],free_cancellation_hours=24/);
 });
 test('0013: doce borradores, codigos unicos, hero correcto y galerias de hasta ocho',()=>{
  assert.equal(drafts.length,12);assert.equal(new Set(drafts.map(r=>strings(r[0])[0])).size,12);assert.equal(new Set(drafts.map(r=>strings(r[1])[0])).size,12);
  const categories=new Set([...fs.readFileSync(path.join(workspace,'supabase/migrations/0004_seed_categories_coupons_storage.sql'),'utf8').matchAll(/\('([^']+)',\s+'[^']+'/g)].map(m=>m[1]));
  for(const row of drafts){assert.equal(row.length,11);const image=strings(row[6])[0],dest=image.split('/')[3],entry=manifest[dest],gallery=JSON.parse(strings(row[7])[0]);assert.equal(image,entry.hero);assert.ok(gallery.length<=8);assert.ok(!gallery.includes(image));assert.deepEqual(gallery,entry.photos.map(p=>p.file).filter(f=>f!==image).slice(0,8));assert.ok(strings(row[10]).every(p=>p.startsWith('[BORRADOR] ')));for(const category of strings(row[9]))assert.ok(categories.has(category),category);assert.ok(categories.has(strings(row[8])[0]));}
 });
 test('0013: columnas de precios nulas, sin resenas y siempre inactivos',()=>{
  const start=catalog.indexOf('insert into public.tours('),end=catalog.indexOf('\n)\n',start),columns=expressions(catalog.slice(start+'insert into public.tours('.length,end));
  const selectStart=catalog.indexOf('\nselect s.slug',end)+8,selectEnd=catalog.indexOf('\nfrom staged',selectStart),values=expressions(catalog.slice(selectStart,selectEnd));assert.equal(columns.length,22);assert.equal(values.length,22);const mapped=Object.fromEntries(columns.map((key,i)=>[key,values[i]]));
  for(const key of ['price_group','price_semi','price_private','price_child','rating'])assert.equal(mapped[key],'null');assert.equal(mapped.review_count,'0');assert.equal(mapped.active,'false');assert.equal(mapped.featured,'false');assert.equal(mapped.free_cancellation_hours,'24');
 });
 const {isDraftTour}=load(path.join(root,'lib/admin/catalog.ts'));
 test('Badge borrador: solo inactivos cuyo primer resumen lleva marcador',()=>{assert.equal(isDraftTour({active:false,summary:['[BORRADOR] Pendiente']}),true);assert.equal(isDraftTour({active:true,summary:['[BORRADOR] Pendiente']}),false);assert.equal(isDraftTour({active:false,summary:['Resumen final']}),false);assert.equal(isDraftTour({active:false,summary:[]}),false);});
 const EmptyState=load(path.join(root,'components/admin/EmptyState.tsx')).default;
 test('Ilustraciones: once originales disponibles; decorativas, lazy y CTA',()=>{for(const image of ['availability','availability-alt','calendar','slots','scanner','scanner-alt','agencies','transfers','bookings','offers','generic']){assert.ok(fs.existsSync(path.join(workspace,'public/assets/admin/empty',image+'.webp')));const html=renderToStaticMarkup(React.createElement(EmptyState,{image,title:'Sin resultados',text:'Texto de prueba',action:{label:'Actualizar',onClick(){}}}));assert.ok(html.includes('/assets/admin/empty/'+image+'.webp'));assert.match(html,/alt=""/);assert.match(html,/loading="lazy"/);assert.match(html,/<button[^>]*>Actualizar<\/button>/);}const css=fs.readFileSync(path.join(root,'styles/admin-operations.css'),'utf8');assert.match(css,/max-width:280px/);});
 for(const [name,data,props,image] of [
  ['AvailabilityTab',[[],[]],{},'availability'],['ReservasTab',[[]],{},'bookings'],['AgenciesTab',[[]],{},'agencies'],['TransfersTab',[{rows:[],partners:[]}],{kind:'pase'},'transfers'],['TransfersTab',[{rows:[],partners:[]}],{kind:'endoso'},'transfers'],['OffersTab',[{rows:[],tours:[]}],{},'offers'],['TicketScanner',[],{onClose(){},onSaved:async()=>{}},'scanner']
 ])test('Ilustracion de modulo: '+name+(props.kind?' '+props.kind:''),()=>{assert.ok(renderData(name,data,props).includes('/assets/admin/empty/'+image+'.webp'));});
};
if(require.main===module)require('./checks.cjs');
