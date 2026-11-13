// Comprobaciones sin red ni base de datos: node src/lib/admin/checks.cjs
// El analisis lexico de SQL NO sustituye aplicar las migraciones en PostgreSQL.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'../..'),workspace=path.resolve(root,'..');
const cache=new Map();let hookMode='loading',hookData=[],hookCall=0;
const sbStub={from(){throw Error('Este control no permite acceder a una base de datos');}};
const hooks={useAdminData:()=>({data:hookMode==='ready'?hookData[hookCall++]:null,error:hookMode==='error'?'Error local de prueba':'',loading:hookMode==='loading',reload:async()=>{}})};
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 const module={exports:{}};cache.set(file,module);
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const localRequire=id=>{
  if(id==='@/lib/supabase')return {getSupabase:()=>sbStub};
  if(id==='@/lib/admin/hooks')return hooks;
  if(id==='next/navigation')return {useSearchParams:()=>new URLSearchParams(),useRouter:()=>({push(){},replace(){}})};
  if(id==='next/link')return {__esModule:true,default:({children,...props})=>require('react').createElement('a',props,children)};
  if(id.startsWith('@/')||id.startsWith('.')){
   const base=id.startsWith('@/')?path.join(root,id.slice(2)):path.resolve(path.dirname(file),id);
   for(const ext of ['','.ts','.tsx'])if(fs.existsSync(base+ext)&&fs.statSync(base+ext).isFile())return load(base+ext);
   throw Error('Modulo local no encontrado: '+id);
  }
  return require(id);
 };
 vm.runInThisContext('(function(require,module,exports){'+source+'\n})',{filename:file})(localRequire,module,module.exports);
 return module.exports;
}
let passed=0;
function test(name,fn){fn();passed++;console.log('OK '+name);}
function lexicalSql(sql){
 let i=0,paren=0,bodies=0;
 while(i<sql.length){
  if(sql.startsWith('--',i)){const end=sql.indexOf('\n',i);i=end<0?sql.length:end+1;continue;}
  if(sql.startsWith('/*',i)){const end=sql.indexOf('*/',i+2);assert.ok(end>=0,'Comentario abierto');i=end+2;continue;}
  if(sql[i]==="'"||sql[i]==='"'){
   const quote=sql[i++];let closed=false;
   while(i<sql.length){if(sql[i]===quote){i++;if(sql[i]===quote){i++;continue;}closed=true;break;}i++;}
   assert.ok(closed,'Cadena SQL abierta');continue;
  }
  if(sql[i]==='$'){
   const tag=sql.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/)?.[0];
   assert.ok(tag,'Delimitador SQL invalido');const end=sql.indexOf(tag,i+tag.length);assert.ok(end>=0,'Bloque SQL abierto');
   // Comprueba tambien literales y parentesis dentro de los cuerpos PL/pgSQL.
   lexicalSql(sql.slice(i+tag.length,end));i=end+tag.length;bodies++;continue;
  }
  if(sql[i]==='(')paren++;if(sql[i]===')')paren--;assert.ok(paren>=0,'Parentesis SQL inesperado');i++;
 }
 assert.equal(paren,0,'Parentesis SQL abierto');return bodies;
}
(async()=>{
 const format=load(path.join(__dirname,'format.ts'));
 test('Fechas en Bolivia y cambio de dia',()=>{assert.equal(format.operatorDay(new Date('2026-08-25T02:00:00Z')),'2026-08-24');assert.equal(format.shiftDay('2028-02-28',1),'2028-02-29');assert.equal(format.validDay('2026-02-30'),null);assert.equal(format.validDay('2026-08-25'),'2026-08-25');});
 test('QR actual: URL, codigo directo y entradas invalidas',()=>{assert.equal(format.ticketCode('https://homeland.tours/confirmation?code=HT-ABCDE'),'HT-ABCDE');assert.equal(format.ticketCode(' ht-ab234 '),'HT-AB234');assert.equal(format.ticketCode('https://example.invalid/?code=INVALIDO'),'');assert.equal(format.ticketCode('javascript:alert(1)'),'');});
 test('Estados de ticket: valido, usado, otra fecha, cancelada y pendiente',()=>{const b={status:'confirmada',checked_in_at:null,date_row:{date:format.operatorDay()}};assert.equal(format.ticketState(b),'Válido');assert.equal(format.ticketState({...b,checked_in_at:'fecha'}),'Ya usado');assert.equal(format.ticketState({...b,status:'completada'}),'Ya usado');assert.equal(format.ticketState({...b,status:'cancelada'}),'Cancelada');assert.equal(format.ticketState({...b,status:'pendiente_pago'}),'Pago pendiente');assert.equal(format.ticketState({...b,date_row:{date:'2020-01-01'}}),'Otra fecha');});
 const {csvText}=load(path.join(__dirname,'exports.ts'));
 test('CSV Excel: BOM, separador, comillas, saltos y formula neutralizada',()=>{const text=csvText([['=SUM(A1)','Ana; "Viaje"','A\nB',12]]);assert.ok(text.startsWith('\ufeffsep=;\r\n'));assert.ok(text.includes('"\'=SUM(A1)"'));assert.ok(text.includes('"Ana; ""Viaje"""'));assert.ok(text.includes('"A\nB"'));});
 const core=load(path.join(__dirname,'core.ts'));let queries=0;
 const values=await core.allRows(async(from,to)=>{queries++;return {data:Array.from({length:Math.max(0,Math.min(1201,to+1)-from)},(_,i)=>({id:from+i})),error:null};});
 test('Paginacion completa de 1201 filas',()=>{assert.equal(values.length,1201);assert.equal(queries,3);assert.equal(values[1200].id,1200);});
 await assert.rejects(()=>core.allRows(async()=>({data:null,error:new Error('Error de consulta')})),/Error de consulta/);passed++;console.log('OK Errores de datos propagados');
 test('Errores de cupo claros',()=>{assert.match(core.messageOf({message:'capacity_below_occupied: 5 participantes'}),/5 participantes/);assert.match(core.messageOf({message:'date_full'}),/cupo suficiente/);assert.match(core.messageOf({message:'cutoff_passed'}),/hora límite/);});
 for(const filename of ['0011_producto_completo.sql','0012_compatibilidad_operativa.sql'])test('SQL lexico y transaccion: '+filename,()=>{
  const sql=fs.readFileSync(path.join(workspace,'supabase/migrations',filename),'utf8');assert.ok(!sql.includes('\ufeff'));assert.match(sql,/\bbegin\s*;/i);assert.match(sql,/commit;\s*$/i);const blocks=lexicalSql(sql);assert.ok(blocks>0);const functions=[...sql.matchAll(/create or replace function public\.\w+\([\s\S]*?\bas\s+\$\$([\s\S]*?)\$\$;/gi)];assert.equal(functions.length,(sql.match(/create or replace function/gi)||[]).length,'Cada funcion necesita un cuerpo cerrado');
 });
 const sql=fs.readFileSync(path.join(workspace,'supabase/migrations/0011_producto_completo.sql'),'utf8');
 test('Contrato SQL de las cuatro RPC y privilegios',()=>{for(const name of ['admin_create_manual_booking','admin_bulk_update_slots','admin_generate_slots','admin_check_in']){const fn=sql.match(new RegExp('create or replace function public\\.'+name+'\\([\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$;','i'));assert.ok(fn,name);assert.match(fn[0],/security definer/i);assert.match(fn[1],/if not public\.is_admin\(\)/i);assert.ok(sql.includes('revoke all on function public.'+name));}});
 test('Contrato SQL: limites, franjas, RLS y ofertas atomicas',()=>{assert.match(sql,/coalesce\(start_time, time '00:00'\)/);assert.match(sql,/v_slot\.blocked/);assert.match(sql,/cutoff_passed/);assert.match(sql,/for update/);assert.match(sql,/America\/La_Paz/);assert.match(sql,/reservations_offer_seats after insert/);for(const table of ['agencies','agency_transfers','special_offers'])assert.ok(sql.includes('alter table public.'+table+' enable row level security'));});
 // Renderizado real de componentes en servidor, con hooks de datos controlados.
 // No sustituye la inspeccion de CSS en un navegador ni pruebas contra Supabase.
 const React=require('react'),renderStatic=require('react-dom/server').renderToStaticMarkup;
 const {ConfirmProvider}=load(path.join(root,'components/admin/ConfirmDialog.tsx'));
 const renderToStaticMarkup=element=>renderStatic(React.createElement(ConfirmProvider,null,element));
 const components=[['AvailabilityTab',[[],[]]],['ReservasTab',[[]]],['AgenciesTab',[[]]],['TransfersTab',[{rows:[],partners:[]}],{kind:'pase'}],['OffersTab',[{rows:[],tours:[]}]],['OperationalAlerts',[{old:0,tomorrow:0,almostFull:0}]]];
 for(const [name,data,props] of components){const C=load(path.join(root,'components/admin',name+'.tsx')).default;
  for(const mode of ['loading','error','ready'])test('Render '+name+' / '+mode,()=>{hookMode=mode;hookData=data;hookCall=0;const html=renderToStaticMarkup(React.createElement(C,props||{}));assert.ok(html.length>0);if(mode==='loading')assert.match(html,/Cargando/);if(mode==='error')assert.match(html,/Error local de prueba/);if(mode==='ready')assert.match(html,/Sin resultados/);});
 }

 const product={id:'test-tour',title:'Producto sintetico de prueba',code:'TEST-01',active:true,price_group:50,price_semi:80,price_private:100,price_child:30,child_age_max:11,min_pax:1,default_start_times:['08:00'],default_cutoff_hours:12,summary:[],included:[]};
 const agency={id:'test-agency',company:'Agencia sintetica de prueba',contact:'Contacto de prueba',phone:'',email:'',address:'',other_contacts:[],company_type:'agencia',active:true,notes:'',created_at:new Date().toISOString()};
 const slot={id:'test-slot',tour_id:product.id,date:format.operatorDay(),start_time:'08:00:00',capacity:10,occupied:8,booked:8,free:2,blocked:false,cutoff_hours:12,bookable:true};
 const booking={id:'test-booking',code:'HT-TEST1',tour_id:product.id,tour_date_id:slot.id,tour_type:'group',pax:1,adults:1,children:0,subtotal:50,group_discount:0,coupon_discount:0,offer_discount:0,total:50,status:'confirmada',payment_method:'efectivo',source:'oficina',paid_at:new Date().toISOString(),created_at:new Date().toISOString(),checked_in_at:null,voucher_sent_at:null,cancelled_at:null,completed_at:null,refund_pending:false,client_name:'Viajero sintetico de prueba',client_email:'prueba@example.invalid',client_phone:'',client_country:'Bolivia',tour:product,date_row:slot,passengers:[{id:'test-passenger',position:1,name:'Pasajero de prueba',country:'Bolivia',doc:'',meal:'Normal'}],extras:[]};
 const transfer={id:'test-transfer',kind:'pase',agency_id:agency.id,travel_date:slot.date,service:product.title,pax:1,names:'Pasajero de prueba',amount:345,currency:'BOB',status:'pendiente'};
 const offer={id:'test-offer',name:'Oferta de prueba',tour_ids:[product.id],kind:'limited',discount_pct:10,activity_from:slot.date,activity_to:slot.date,weekdays:null,start_times:null,seats_limit:10,seats_sold:1,status:'active'};
 const filled=[
  ['AvailabilityTab',[[product],[slot]],{},/TEST-01/],
  ['ReservasTab',[[booking]],{},/HT-TEST1/],
  ['AgenciesTab',[[agency]],{},/Agencia sintetica/],
  ['TransfersTab',[{rows:[transfer],partners:[agency]}],{kind:'pase'},/Bs\./],
  ['OffersTab',[{rows:[offer],tours:[product]}],{},/Oferta de prueba/],
  ['CouponsTab',[[{code:'PRUEBA',discount_pct:10,active:true,valid_from:null,valid_to:null}]],{},/PRUEBA/],
  ['ManualBookingForm',[{tours:[product],partners:[agency]},[]],{onClose(){},onSaved(){}},/Crear reserva/],
  ['TransferForm',[{tours:[product],partners:[agency],reservations:[booking]}],{kind:'pase',transfer:null,onClose(){},onSaved(){}},/Guardar registro/],
  ['OfferForm',[[product]],{offer:null,onClose(){},onSaved(){}},/Guardar oferta/],
  ['AgencyForm',[],{agency:null,onClose(){},onSaved(){}},/Guardar agencia/],
  ['SlotGenerator',[],{products:[product],onClose(){},onSaved(){}},/Crear franjas/],
  ['ReservationDetail',[[]],{booking,onClose(){},onSaved:async()=>{}},/Confirmar|Acciones/],
  ['TicketScanner',[],{bookings:[booking],onClose(){},onSaved:async()=>{}},/Validar ticket/],
 ];
 for(const [name,data,props,expected] of filled)test('Render con datos y formularios: '+name,()=>{hookMode='ready';hookData=data;hookCall=0;const C=load(path.join(root,'components/admin',name+'.tsx')).default;assert.match(renderToStaticMarkup(React.createElement(C,props)),expected);});
 require('./check-round2.cjs')({test,load,lexicalSql,workspace,root,React,renderToStaticMarkup,renderData:(name,data,props)=>{hookMode='ready';hookData=data;hookCall=0;const C=load(path.join(root,'components/admin',name+'.tsx')).default;return renderToStaticMarkup(React.createElement(C,props));}});
 await require('./check-ht8a.cjs')({test,load,lexicalSql,workspace,root,React,renderToStaticMarkup,sbStub});
 await require('./check-ht8b.cjs')({test,load,lexicalSql,workspace,root,React,renderToStaticMarkup,sbStub,renderData:(name,data,props)=>{hookMode='ready';hookData=data;hookCall=0;const C=load(path.join(root,'components/admin',name+'.tsx')).default;return renderToStaticMarkup(React.createElement(C,props));}});
 await require('./check-ht8c.cjs')({test,load,workspace,root,renderData:(name,data,props)=>{hookMode='ready';hookData=data;hookCall=0;const C=load(path.join(root,'components/admin',name+'.tsx')).default;return renderToStaticMarkup(React.createElement(C,props));}});
 await require('./check-ht8d.cjs')({test,load,lexicalSql,workspace,root,renderData:(name,data,props)=>{hookMode='ready';hookData=data;hookCall=0;const C=load(path.join(root,'components/admin',name+'.tsx')).default;return renderToStaticMarkup(React.createElement(C,props));}});
 console.log(`${passed} comprobaciones locales correctas. Sin SQL ejecutado ni acceso a credenciales.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
