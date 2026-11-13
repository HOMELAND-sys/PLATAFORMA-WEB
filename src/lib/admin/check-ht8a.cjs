// CC-HT8A: contratos, casos límite y renderizado local. Nunca conecta a Supabase.
module.exports=async function({test,load,lexicalSql,workspace,root,React,renderToStaticMarkup,sbStub}){
 const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
 const read=file=>fs.readFileSync(path.join(workspace,file),'utf8').replace(/\r\n/g,'\n');
 const editor=load(path.join(__dirname,'tour-editor.ts'));
 const base=editor.makeAdminTourForm();
 const operation={...base,code:'TEST-OP',languages:['Español','English'],price_child:25,min_pax:2,child_age_max:10,pay_later:true,pickup_included:true,meeting_point:'Dirección de prueba',meeting_lat:-16.5,meeting_lng:-68.1,default_start_times:['08:00','14:30'],default_cutoff_hours:6,free_cancellation_hours:48};
 test('Editor: operaciones se guardan junto al contenido para altas y cambios',()=>{
  const payload=editor.buildAdminTourPayload({...operation,title:'Prueba',slug:'prueba'},[]);
  for(const key of ['code','languages','price_child','min_pax','child_age_max','pay_later','pickup_included','meeting_point','meeting_lat','meeting_lng','default_start_times','default_cutoff_hours','free_cancellation_hours'])assert.deepEqual(payload[key],operation[key],key);
  assert.equal(payload.title,'Prueba');assert.equal(editor.validateTourOperation(operation),'');
 });
 test('Duplicado: conserva operación y fotos, limpia código y reseñas, queda inactivo',()=>{
  const original={...operation,title:'Prueba',slug:'prueba',image:'principal',gallery:['segunda'],active:true,rating:4.5,review_count:20};
  const copy=editor.copyAdminTourForm(original,['prueba-copia']);
  assert.equal(copy.slug,'prueba-copia-2');assert.equal(copy.code,null);assert.equal(copy.rating,null);assert.equal(copy.review_count,0);assert.equal(copy.active,false);assert.equal(copy.featured,false);assert.equal(copy.free_cancellation_hours,48);assert.equal(copy.price_child,25);assert.deepEqual(copy.default_start_times,['08:00','14:30']);copy.gallery.push('tercera');assert.deepEqual(original.gallery,['segunda']);
 });
 test('Editor: rechaza cantidades fraccionarias, horas inválidas y coordenadas incompletas',()=>{
  for(const patch of [{min_pax:1.5},{min_pax:9},{child_age_max:18},{free_cancellation_hours:-1},{default_cutoff_hours:NaN},{default_start_times:['24:00']},{meeting_lat:null},{meeting_lng:181},{price_child:Infinity},{review_count:1.5},{languages:[]}])assert.ok(editor.validateTourOperation({...operation,...patch}),JSON.stringify(patch));
 });
 test('Fotos: reordenación conserva todas las imágenes, actualiza portada y no muta el origen',()=>{
  const images=['principal','segunda','tercera'];assert.deepEqual(editor.reorderTourImages(images,2,0),['tercera','principal','segunda']);assert.deepEqual(editor.reorderTourImages(images,0,2),['segunda','tercera','principal']);assert.deepEqual(images,['principal','segunda','tercera']);assert.deepEqual(editor.reorderTourImages(images,-1,2),images);
 });
 const TourEditor=load(path.join(root,'components/admin/TourEditor.tsx')).default;
 for(const existing of [false,true])test('Render editor amplio: '+(existing?'edición':'nuevo/duplicado'),()=>{
  const html=renderToStaticMarkup(React.createElement(TourEditor,{tour:existing?{id:'test-tour',active:false,featured:false,reservation_count:0}:null,initialData:{...operation,title:'Tour de prueba',image:'foto-1',gallery:['foto-2','foto-3']},categories:[],busy:false,onClose(){},onSaved:async()=>{},onDuplicate(){},onToggleActive:async()=>{}}));
  for(const text of ['tour-editor__media','tour-editor__fields','tour-editor__footer','Precios y operación','Itinerario','Configuración','Código corto','Mover imagen 2 antes','Mover imagen 2 después'])assert.ok(html.includes(text),text);
  assert.match(html,/role="dialog" aria-modal="true"/);assert.equal((html.match(/class="tour-gallery__image"/g)||[]).length,3);
 });
 test('Operación: cinco grupos y todos los controles, sin segundo formulario de guardado',()=>{
  const C=load(path.join(root,'components/admin/ProductOperations.tsx')).default;
  const html=renderToStaticMarkup(React.createElement(C,{data:operation,onChange(){}}));
  for(const label of ['Precios','Participantes','Horarios y hora límite','Políticas','Punto de encuentro','Grupo (USD)','Semiprivado','Privado','Niño','Idiomas','Cancelación gratis','Latitud','Longitud','Pago posterior','Recogida incluida'])assert.ok(html.includes(label),label);
  assert.doesNotMatch(html,/<form\b/);
 });
 test('CSS: ancho 1180/92vw, columnas 40/60, galería 3 y adaptación tablet/móvil',()=>{
  const css=read('src/styles/admin-tours.css').split('/* CC-HT8A:')[1];assert.ok(css);
  for(const rule of [/width: min\(1180px, 92vw\)/,/minmax\(0, 2fr\) minmax\(0, 3fr\)/,/\.tour-gallery \{ grid-template-columns: repeat\(3/,/max-width: 1199px/,/max-width: 660px/,/width: 100vw/])assert.match(css,rule);
 });
 const validation=load(path.join(__dirname,'validation.ts'));
 test('Rangos: inválidos e invertidos fallan; un día y año bisiesto son válidos',()=>{
  assert.throws(()=>validation.requireRange('2026-02-30','2026-03-01'));assert.throws(()=>validation.requireRange('2026-03-02','2026-03-01'));validation.requireRange('2028-02-29','2028-02-29');
 });
 const manual={p_slot_id:'test-slot',p_tour_type:'group',p_adults:1,p_children:1,p_contact_name:'Persona de prueba',p_contact_phone:'+591000000',p_contact_country:'Bolivia',p_passengers:[{name:'Adulto'},{name:'Niño'}],p_source:'oficina',p_agency_id:null,p_contact_email:null,p_total:null,p_paid:false,p_payment_method:'efectivo',p_notes:null};
 test('Reserva manual: exige enteros, contacto, pasajeros y agencia; acepta total cero',()=>{
  validation.validateManualBooking({...manual,p_total:0});for(const patch of [{p_adults:.5},{p_children:-1},{p_contact_phone:' '},{p_passengers:[{name:' '}]},{p_source:'agencia'},{p_total:Infinity}])assert.throws(()=>validation.validateManualBooking({...manual,...patch}));
 });
 test('Cupones: rechaza fechas invertidas y descuento fraccionario, admite 0 y 100 %',()=>{
  const coupon={code:'TEST',discount_pct:100,active:true,valid_from:null,valid_to:null};validation.validateCoupon(coupon);validation.validateCoupon({...coupon,discount_pct:0});assert.throws(()=>validation.validateCoupon({...coupon,discount_pct:2.5}));assert.throws(()=>validation.validateCoupon({...coupon,valid_from:'2026-02-02',valid_to:'2026-02-01'}));
 });
 test('Pases/endosos: dirección y moneda se conservan; monto y pax deben ser válidos',()=>{
  for(const kind of ['pase','endoso']){const transfer={kind,agency_id:'test',service:'Prueba',travel_date:'2026-11-12',pax:2,amount:100,currency:'BOB'};validation.validateTransfer(transfer);assert.throws(()=>validation.validateTransfer({...transfer,pax:1.5}));assert.throws(()=>validation.validateTransfer({...transfer,amount:-1}));}
 });
 test('Ofertas: límite vendido, fechas y aviso de anticipación se validan',()=>{
  const offer={name:'Prueba',tour_ids:['test'],kind:'limited',activity_from:'2026-11-12',activity_to:'2026-11-12',discount_pct:10,seats_limit:10,weekdays:null,booking_notice_days:null};validation.validateOffer(offer,10);for(const patch of [{seats_limit:9},{discount_pct:91},{weekdays:[]},{kind:'early_bird'},{activity_to:'2026-11-11'}])assert.throws(()=>validation.validateOffer({...offer,...patch},10));
 });
 test('Pago: configuración vacía cumple NOT NULL y URL inválida tiene error en español',()=>{
  const {paymentSettingsRows}=load(path.join(__dirname,'payments.ts'));const rows=paymentSettingsRows('','','');assert.equal(rows.length,3);assert.ok(rows.every(row=>row.value===''));assert.throws(()=>paymentSettingsRows('javascript:alert(1)','',''),/HTTP o HTTPS/);assert.throws(()=>paymentSettingsRows('dirección inválida','',''),/válido/);assert.equal(paymentSettingsRows(' https://example.invalid/pago ',' texto ','')[0].value,'https://example.invalid/pago');
 });

 // Contrasta las llamadas reales con la ÚLTIMA definición de cada RPC en 0001–0014.
 const migrations=fs.readdirSync(path.join(workspace,'supabase/migrations')).filter(file=>/^00(?:0[1-9]|1[0-4])_.*\.sql$/.test(file)).sort();
 const functions=new Map();for(const file of migrations){const sql=read('supabase/migrations/'+file);for(const match of sql.matchAll(/create or replace function public\.(\w+)\(([\s\S]*?)\)\s*returns/gi))functions.set(match[1],match[2]);}
 const oldFrom=sbStub.from,oldRpc=sbStub.rpc,oldWindow=global.window;let calls=[],rpcResult=null,rpcError=null,queries=[],responses={};
 global.window={dispatchEvent(){}};
 sbStub.rpc=async(name,args)=>{calls.push({name,args});return {data:rpcResult,error:rpcError};};
 sbStub.from=table=>{
  const entry={table,ops:[]};queries.push(entry);let from=0,to=Infinity;
  const result=()=>{const response=responses[table]??{data:[],error:null};return {...response,data:Array.isArray(response.data)?response.data.slice(from,to+1):response.data};};
  const query={then(a,b){return Promise.resolve(result()).then(a,b);},single(){const r=result();return Promise.resolve({...r,data:Array.isArray(r.data)?r.data[0]:r.data});},maybeSingle(){return this.single();}};
  for(const method of ['select','order','eq','gte','lte','lt','in','abortSignal'])query[method]=(...args)=>{entry.ops.push([method,...args]);return query;};
  query.range=(a,b)=>{from=a;to=b;entry.ops.push(['range',a,b]);return query;};return query;
 };
 try{
  const bookings=load(path.join(__dirname,'bookings.ts')),slots=load(path.join(__dirname,'slots.ts')),catalog=load(path.join(__dirname,'catalog.ts')),api=load(path.join(root,'lib/api.ts'));
  const cases=[
   ['admin_generate_slots',()=>slots.generateSlots({p_tour_id:'tour',p_from:'2026-11-12',p_to:'2026-11-12',p_weekdays:[4],p_start_times:['08:00'],p_capacity:8,p_cutoff:0}),1],
   ['admin_bulk_update_slots',()=>slots.updateSlots(['slot'],{blocked:false,cutoff:0,capacity:8}),1],
   ['admin_create_manual_booking',()=>bookings.manualBooking(manual),{id:'booking'}],
   ['update_reservation_status',()=>bookings.bookingStatus('booking','cancelada','Motivo de prueba'),{}],
   ['admin_check_in',()=>bookings.checkIn('HT-TEST1'),{checked_in_at:'2026-11-12T12:00:00Z'}],
   ['admin_delete_tour',()=>catalog.deleteTour('tour'),'tour'],
   ['admin_dashboard_overview',()=>api.fetchDashboardOverview(sbStub,'2026-11-01','2026-11-12'),{}],
   ['admin_report_sales',()=>api.fetchReportSales(sbStub,'2026-11-01','2026-11-12'),{}],
   ['admin_report_bookings',()=>api.fetchReportBookings(sbStub,'2026-11-01','2026-11-12',null),{}],
   ['admin_report_clients',()=>api.fetchReportClients(sbStub,null,null),{}],
  ];
  for(const [name,run,result] of cases){rpcResult=result;calls=[];await run();test('Contrato real de RPC: '+name,()=>{assert.equal(calls.length,1);assert.equal(calls[0].name,name);const params=[...functions.get(name).matchAll(/\b(p_\w+)\s+(uuid\[\]|int\[\]|text\[\]|uuid|integer|int|text|date|numeric|boolean|bool|jsonb)(?![\w\[])/g)];assert.deepEqual(Object.keys(calls[0].args).sort(),params.map(m=>m[1]).sort());for(const [,key,type] of params){const value=calls[0].args[key];if(value===null)continue;if(type.endsWith('[]')){assert.ok(Array.isArray(value),key);assert.ok(value.every(item=>type==='int[]'?Number.isInteger(item):typeof item==='string'),key);}else if(['integer','int','numeric'].includes(type)){assert.equal(typeof value,'number',key);assert.ok(Number.isFinite(value),key);if(type!=='numeric')assert.ok(Number.isInteger(value),key);}else if(type==='bool'||type==='boolean')assert.equal(typeof value,'boolean',key);else if(type==='jsonb')assert.ok(typeof value==='object',key);else assert.equal(typeof value,'string',key);}if(name==='admin_bulk_update_slots'){assert.equal(calls[0].args.p_cutoff,0);assert.equal(calls[0].args.p_blocked,false);}});}
  calls=[];await assert.rejects(()=>slots.updateSlots(['slot'],{capacity:1.5}));await assert.rejects(()=>slots.generateSlots({p_tour_id:'tour',p_from:'2026-11-12',p_to:'2026-11-12',p_weekdays:[4],p_start_times:['25:00'],p_capacity:8,p_cutoff:0}));test('Validaciones fallidas nunca envían RPC de cupos',()=>assert.equal(calls.length,0));
  rpcError={message:'Error simulado del servidor'};await assert.rejects(()=>bookings.checkIn('HT-TEST1'),error=>error.message==='Error simulado del servidor');test('Errores RPC se propagan sin anunciar éxito',()=>assert.ok(true));rpcError=null;
  responses={tours:{data:[{id:'tour',category_id:'cat',category_ids:['cat']}],error:null},categories:{data:[{id:'cat',slug:'uyuni'}],error:null},reservations:{data:[{tour_id:'tour'},{tour_id:'tour'}],error:null}};queries=[];
  const data=await catalog.catalogForAdmin();test('Catálogo: recuento completo y categorías, sin consultas por cada tour',()=>{assert.equal(data.tours[0].reservation_count,2);assert.equal(data.tours[0].primary_category_slug,'uyuni');assert.deepEqual(data.tours[0].category_slugs,['uyuni']);assert.equal(queries.length,3);});
  responses.reservations={data:null,error:{message:'No se pudo contar las reservas'}};await assert.rejects(()=>catalog.catalogForAdmin(),error=>error.message==='No se pudo contar las reservas');test('Fallo al contar reservas impide presentar cero y permitir un borrado',()=>assert.ok(true));
  responses.reservations={data:[{code:'HT-TEST1',contact_name:'Viajero',profile:null,passengers:[],contact_phone:'123',contact_country:'Bolivia'}],error:null};queries=[];const ticket=await bookings.ticketByCode('HT-TEST1');test('Escáner consulta código actual y maneja reservas sin perfil ni pasajeros',()=>{assert.equal(ticket.client_name,'Viajero');assert.ok(queries[0].ops.some(op=>op[0]==='eq'&&op[1]==='code'&&op[2]==='HT-TEST1'));});
 }finally{sbStub.from=oldFrom;sbStub.rpc=oldRpc;if(oldWindow===undefined)delete global.window;else global.window=oldWindow;}
 const migration=read('supabase/migrations/0014_catalogo_drive.sql');
 test('0014: transacción, delimitadores y recarga de esquema; sin desactivar guardas',()=>{assert.ok(lexicalSql(migration)>=3);assert.match(migration,/\bbegin;/i);assert.match(migration,/notify pgrst, 'reload schema';\s*commit;\s*$/i);assert.doesNotMatch(migration,/disable\s+trigger|delete\s+from\s+public\.(?:reservations|categories)\b/i);assert.ok(!migration.includes('\ufeff'));});
 test('0014: solo los cuatro slugs pedidos y aborto por reservas de cualquier estado',()=>{
  const slugs=migration.match(/v_slugs text\[\] := array\[([\s\S]*?)\]/)[1];assert.deepEqual([...slugs.matchAll(/'([^']+)'/g)].map(m=>m[1]),['sucre-colonial-city-tour','potosi-colonial-silver-route','rainbow-mountain-day-hike','andean-traditions-communities']);
  const guard=migration.slice(migration.indexOf('select string_agg'),migration.indexOf('if cardinality(v_ids)'));assert.match(guard,/public\.reservations/);assert.doesNotMatch(guard,/r\.status\s*(?:=|in)/);assert.match(guard,/raise exception/);assert.ok(migration.indexOf('for update;')<migration.indexOf('select string_agg'));assert.match(migration,/cardinality\(v_ids\) > 0/);
 });
 test('0014: ofertas vacías se borran antes de actualizar arrays; categorías se conservan',()=>{assert.ok(migration.indexOf('delete from public.special_offers')<migration.indexOf('update public.special_offers'));assert.ok(migration.indexOf('update public.special_offers')<migration.indexOf('delete from public.tours'));assert.match(migration,/with ordinality/);assert.match(migration,/lock table public.special_offers/);assert.match(migration,/raise notice 'Categoría conservada sin tours activos/);});
 test('0014: borrado de interfaz es atómico y exclusivo de admin',()=>{const fn=migration.match(/function public\.admin_delete_tour\(p_tour_id uuid\)[\s\S]*?\$\$([\s\S]*?)\$\$;/)[1];assert.match(fn,/if not public\.is_admin\(\)/);assert.match(fn,/tour_has_bookings/);assert.ok(fn.indexOf('delete from public.special_offers')<fn.indexOf('update public.special_offers'));assert.ok(fn.indexOf('update public.special_offers')<fn.indexOf('delete from public.tours'));assert.match(migration,/revoke all on function public\.admin_delete_tour\(uuid\) from public, anon/);});
 test('0014: cascada de fechas compatible con guarda original y sin reservas',()=>{const schema=read('supabase/migrations/0001_schema.sql');assert.match(schema,/tour_id uuid not null references public\.tours \(id\) on delete cascade/);const guard=schema.match(/function public\.guard_tour_date_delete\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/)[1];assert.match(guard,/v_count > 0/);assert.match(guard,/status in \('pendiente_pago', 'confirmada'\)/);assert.match(guard,/return old/);});
 test('0014: pasajeros de ventas por tour y mes excluyen canceladas como el total',()=>{const fn=migration.match(/function public\.admin_report_sales\([\s\S]*?\$\$([\s\S]*?)\$\$;/)[1];assert.equal((fn.match(/sum\(r\.pax\) filter \(where r\.status <> 'cancelada'\)/g)||[]).length,2);assert.match(fn,/'pax', \(select coalesce\(sum\(pax\), 0\) from scoped where status <> 'cancelada'\)/);});
};
