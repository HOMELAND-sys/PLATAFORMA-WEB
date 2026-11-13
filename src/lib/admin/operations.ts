import { sb } from './core';
import { slots } from './slots';
import { operatorDay, shiftDay } from './format';
export async function pendingCounts(){
  const [bookings,pases,endosos,reviews,contacts]=await Promise.all([
    sb().from('reservations').select('id',{count:'exact',head:true}).eq('status','pendiente_pago'),
    sb().from('agency_transfers').select('id',{count:'exact',head:true}).eq('status','pendiente').eq('kind','pase'),
    sb().from('agency_transfers').select('id',{count:'exact',head:true}).eq('status','pendiente').eq('kind','endoso'),
    sb().from('reviews').select('id',{count:'exact',head:true}).eq('status','pending'),
    sb().from('contact_requests').select('id',{count:'exact',head:true}).eq('status','new'),
  ]);
  for(const result of [bookings,pases,endosos])if(result.error)throw result.error;
  // Las reseñas no deben romper los contadores si la tabla aún no existe en un entorno.
  return {reservas:bookings.count??0,pases:pases.count??0,endosos:endosos.count??0,resenas:reviews.error?0:reviews.count??0,consultas:contacts.error?0:contacts.count??0};
}
export async function operationalAlerts(){
  const tomorrow=shiftDay(operatorDay(),1);
  const [old,tomorrowPending,departures]=await Promise.all([
    sb().from('reservations').select('id',{count:'exact',head:true}).eq('status','pendiente_pago').lt('created_at',new Date(Date.now()-86400000).toISOString()),
    sb().from('reservations').select('id,date_row:reservations_tour_date_id_fkey!inner(date)',{count:'exact',head:true}).eq('status','pendiente_pago').eq('date_row.date',tomorrow),
    slots(operatorDay(),shiftDay(operatorDay(),6)),
  ]);
  if(old.error)throw old.error;if(tomorrowPending.error)throw tomorrowPending.error;
  return {old:old.count??0,tomorrow:tomorrowPending.count??0,almostFull:departures.filter(s=>s.occupied/s.capacity>=.8).length};
}
