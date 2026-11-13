import type { Metadata } from 'next';
import Link from 'next/link';
import DocPage from '@/components/layout/DocPage';
import Icon from '@/components/ui/Icon';
import { getSupabaseServer } from '@/lib/supabase';
import { fetchSiteSettings } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Cancelaciones y reembolsos',
  description: 'Política de cancelación, cambios y reembolsos de las reservas de Homeland Tours.',
  alternates: { canonical: '/politica-de-cancelacion' },
};

export const revalidate = 60;

export default async function CancellationPage() {
  const { policies } = await fetchSiteSettings(getSupabaseServer());
  const hours = policies.free_cancellation_hours;
  const fee = policies.cancellation_fee_pct;

  return (
    <DocPage
      path="/politica-de-cancelacion"
      title="Cancelaciones y reembolsos"
      lead="Sabemos que los planes cambian. Estas son las condiciones para cancelar o modificar una reserva."
      updated="noviembre de 2026"
    >
      <h2>En resumen</h2>
      <div className="doc-cards">
        <div className="doc-card">
          <span className="doc-card__icon">
            <Icon name="rotate-ccw" size={20} />
          </span>
          <h3>Hasta {hours} horas antes</h3>
          <p>
            Te reembolsamos el total pagado{fee > 0 ? ` menos un cargo administrativo del ${fee} %` : ''}.
          </p>
        </div>
        <div className="doc-card">
          <span className="doc-card__icon">
            <Icon name="clock" size={20} />
          </span>
          <h3>Dentro de las {hours} horas</h3>
          <p>No hay devolución: a esa altura el transporte, los guías y el hospedaje ya están comprometidos.</p>
        </div>
        <div className="doc-card">
          <span className="doc-card__icon">
            <Icon name="x-circle" size={20} />
          </span>
          <h3>Si no te presentas</h3>
          <p>La ausencia en el punto y la hora de encuentro se trata como cancelación sin devolución.</p>
        </div>
      </div>

      {policies.policy_text && (
        <div className="ht-note">
          <Icon name="info" size={20} />
          <span>{policies.policy_text}</span>
        </div>
      )}

      <h2>Cómo cancelar</h2>
      <ol className="doc-steps">
        <li>
          Entra a <Link href="/bookings">Mis reservas</Link> con tu cuenta.
        </li>
        <li>Abre la reserva y elige «Cancelar reserva». El cupo se libera en ese momento.</li>
        <li>
          Si ya habías pagado, la reserva queda marcada con reembolso pendiente y te contactamos para devolverlo
          por el mismo medio de pago.
        </li>
      </ol>

      <h2>Cambios de fecha</h2>
      <p>
        Si prefieres mover tu viaje en lugar de cancelarlo, escríbenos con tu código de reserva. El cambio depende
        del cupo de la nueva fecha y de la anticipación con la que nos avises.
      </p>

      <h2>Si Homeland Tours cancela o modifica una salida</h2>
      <p>
        El itinerario puede variar por condiciones externas como carreteras en mantenimiento, bloqueos, lluvias u
        otras causas de fuerza mayor. Si una salida no puede operar, te ofrecemos una nueva fecha o la devolución
        íntegra de lo que hayas pagado.
      </p>

      <h2>Retrasos y conexiones</h2>
      <p>
        En servicios compartidos, la salida no puede esperar a quien llega tarde. Si un retraso externo (bus o
        vuelo) te impide llegar a la hora de inicio, alcanzar al grupo puede implicar un costo adicional de
        transporte.
      </p>

      <h2>Condiciones particulares de cada tour</h2>
      <p>
        Algunos tours pueden tener plazos distintos por sus reservas de hospedaje o transporte. Cuando es así, lo
        indicamos en la sección «Antes de reservar» de la ficha del tour, y esa condición prevalece sobre la
        general.
      </p>

      <div className="doc-cta">
        <Link className="btn btn--primary" href="/bookings">
          Ir a mis reservas
        </Link>
        <Link className="btn btn--ghost" href="/preguntas-frecuentes">
          Preguntas frecuentes
        </Link>
      </div>
    </DocPage>
  );
}
