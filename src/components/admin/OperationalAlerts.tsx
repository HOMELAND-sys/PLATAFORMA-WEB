'use client';
import Link from 'next/link';
import { operationalAlerts } from '@/lib/admin/operations';
import { useAdminData } from '@/lib/admin/hooks';
import { operatorDay, shiftDay } from '@/lib/admin/format';
import { LoadState } from './AdminShared';
export default function OperationalAlerts(){
  const load=useAdminData(operationalAlerts);
  return <section className="admin-card"><div className="dash-card__heading"><h2>Alertas operativas</h2><button className="btn btn--ghost btn--sm" onClick={()=>void load.reload()}>Actualizar</button></div><LoadState loading={load.loading} error={load.error} empty={Boolean(load.data&&!load.data.old&&!load.data.tomorrow&&!load.data.almostFull)} onRetry={()=>void load.reload()} label="Sin alertas operativas en este momento."/>{load.data&&!load.error&&<ul className="ops-alert-list"><li><Link href="/admin?tab=reservas&status=pendiente_pago&alert=stale"><span>Pagos pendientes desde hace más de 24 h</span><strong>{load.data.old}</strong></Link></li><li><Link href={`/admin?tab=reservas&status=pendiente_pago&travel=${shiftDay(operatorDay(),1)}`}><span>Reservas de mañana sin confirmar</span><strong>{load.data.tomorrow}</strong></Link></li><li><Link href="/admin?tab=disponibilidad&alert=almost-full"><span>Franjas con ocupación ≥80 % · próximos 7 días</span><strong>{load.data.almostFull}</strong></Link></li></ul>}</section>;
}
