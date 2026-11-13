import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { EXCHANGE_RATE_BOB } from '@/lib/pricing';
import type { Booking } from './types';
import { dateLabel, methodLabels, operatorDay, statusLabels, usd } from './format';
import { setting } from './core';
type Cell = string | number;
export function csvText(rows: Cell[][]) {
  // BOM, separador español y defensa frente a fórmulas introducidas por contactos.
  return '\ufeffsep=;\r\n' + rows.map(row => row.map(value => {
    let s = String(value);
    if (typeof value === 'string' && /^[\s]*[=+@-]/.test(s)) s = "'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  }).join(';')).join('\r\n');
}
export function downloadCsv(filename: string, rows: Cell[][]) {
  const url=URL.createObjectURL(new Blob([csvText(rows)],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export function exportTable(title: string, headers: string[], rows: Cell[][], filename: string, notes = '') {
  const doc=new jsPDF({orientation:'landscape'});
  autoTable(doc,{head:[headers],body:rows,startY:32,margin:{top:32,bottom:18},styles:{fontSize:8,cellPadding:3},headStyles:{fillColor:[41,66,46]},didDrawPage:()=>{
    doc.setFontSize(17);doc.setTextColor(41,66,46);doc.text('Homeland Tours · '+title,14,15);
    doc.setFontSize(8);doc.text(doc.splitTextToSize(notes || `Generado el ${dateLabel(operatorDay())}`,265),14,23);
    doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`,280,200,{align:'right'});
  }});
  doc.save(filename);
}
export async function openVoucher(booking: Booking) {
  const [qr,payment,qrPayment,instructions] = await Promise.all([
    QRCode.toDataURL(`${window.location.origin}/confirmation?code=${encodeURIComponent(booking.code)}`,{width:240}),
    setting<string|null>('payment_link',null),setting<string|null>('payment_qr_url',null),setting<string|null>('payment_instructions',null),
  ]);
  const doc=new jsPDF();
  doc.setTextColor(41,66,46);doc.setFontSize(23);doc.text('Homeland Tours',14,20);
  doc.setFontSize(14);doc.text(`Voucher ${booking.code}`,14,30);doc.setFontSize(10);
  doc.text(statusLabels[booking.status],14,38);
  autoTable(doc, {
    startY: 46,
    body: [
      ['Viajero', booking.client_name],
      ['Servicio', booking.tour?.title || ''],
      ['Viaje', `${dateLabel(booking.date_row?.date || '')} · ${booking.date_row?.start_time?.slice(0, 5) || 'Sin hora'} (Bolivia)`],
      ['Modalidad', booking.tour_type],
      ['Participantes', String(booking.pax)],
      ['Adultos', String(booking.adults ?? booking.pax)],
      ['Niños', String(booking.children)],
      ['Encuentro', booking.tour?.meeting_point || 'Coordinar con la operadora'],
      ['Pago', `${booking.paid_at ? 'Pagado' : 'Pendiente'} · ${methodLabels[booking.payment_method]}`],
    ],
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 36 } },
  });
  let y=(doc as unknown as { lastAutoTable:{finalY:number} }).lastAutoTable.finalY+10;
  autoTable(doc,{startY:y,head:[['Pasajero','Documento','País','Comida']],body:booking.passengers.map(p=>[p.name,p.doc,p.country,p.meal]),headStyles:{fillColor:[41,66,46]},styles:{fontSize:9}});
  y=(doc as unknown as {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+10;
  if(y>185){doc.addPage();y=20;}
  const adjustment=Number(booking.total)-(Number(booking.subtotal)-Number(booking.group_discount)-Number(booking.coupon_discount)-Number(booking.offer_discount??0));
  autoTable(doc,{startY:y,body:[['Subtotal',usd(booking.subtotal)],['Oferta especial',usd(-Number(booking.offer_discount??0))],['Descuento grupo',usd(-booking.group_discount)],...(Number(booking.coupon_discount)>0?[[booking.coupon_code?'Cupón '+booking.coupon_code:'Cupón',usd(-booking.coupon_discount)]]:[]),...(Math.abs(adjustment)>.001?[['Ajuste manual',usd(adjustment)]]:[]),['Total USD',usd(booking.total)],['Equivalente BOB',`Bs. ${Math.round(Number(booking.total)*EXCHANGE_RATE_BOB)} (1 USD = ${EXCHANGE_RATE_BOB} BOB)`]],styles:{fontSize:9}});
  y=(doc as unknown as {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+8;
  if(y>210){doc.addPage();y=20;}
  doc.addImage(qr,'PNG',14,y,38,38);doc.setFontSize(10);doc.text(booking.code,57,y+10);doc.text('Presenta este QR en el punto de encuentro.',57,y+18);
  if(!booking.paid_at&&(payment||instructions||qrPayment)){
    doc.addPage();doc.setFontSize(16);doc.text('Instrucciones de pago',14,20);doc.setFontSize(10);
    doc.text(doc.splitTextToSize([instructions,payment,qrPayment?`QR de pago: ${qrPayment}`:''].filter(Boolean).join('\n\n'),180),14,32);
    if(payment&&/^https?:\/\//i.test(payment))doc.link(14,25,180,30,{url:payment});
  }
  doc.save(`voucher-${booking.code}.pdf`);
}
