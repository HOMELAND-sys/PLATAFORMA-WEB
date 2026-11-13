import type { Metadata } from 'next';
import Link from 'next/link';
import DocPage from '@/components/layout/DocPage';
import { getSupabaseServer } from '@/lib/supabase';
import { fetchSiteSettings } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Condiciones de uso del sitio y de contratación de los tours de Homeland Tours.',
  alternates: { canonical: '/terminos' },
};

export const revalidate = 60;

export default async function TermsPage() {
  const { company, policies } = await fetchSiteSettings(getSupabaseServer());
  const name = company.name || 'Homeland Tours';

  return (
    <DocPage
      path="/terminos"
      title="Términos y condiciones"
      lead={`Las reglas claras para reservar y viajar con ${name}. Al crear una reserva aceptas estas condiciones.`}
      updated="noviembre de 2026"
    >
      <h2>1. Quiénes somos</h2>
      <p>
        {name} es una operadora de turismo boliviana{company.license ? ` (licencia ${company.license})` : ''}
        {company.address ? `, con domicilio en ${company.address}` : ''}. Este sitio permite consultar nuestros
        tours, ver la disponibilidad real de cada salida y reservar en línea.
      </p>

      <h2>2. Cuenta de usuario</h2>
      <ul>
        <li>Para reservar necesitas una cuenta con un correo electrónico válido.</li>
        <li>Eres responsable de la veracidad de tus datos y de mantener tu contraseña en reserva.</li>
        <li>Debes ser mayor de edad para contratar. Los menores viajan a cargo de un adulto responsable.</li>
      </ul>

      <h2>3. Reservas</h2>
      <ul>
        <li>
          Una reserva queda registrada cuando recibes tu voucher con un código <strong>HT-XXXXX</strong>. En ese
          momento tu lugar queda apartado en la salida elegida.
        </li>
        <li>
          La reserva nace en estado «Pendiente de pago» y pasa a «Confirmada» cuando registramos tu pago.
        </li>
        <li>
          Podemos liberar una reserva pendiente que no haya sido pagada en un plazo razonable, para ofrecer el
          lugar a otros viajeros.
        </li>
        <li>
          Los datos de cada viajero (nombre, documento, nacionalidad) deben coincidir con su documento de
          identidad: se usan para permisos de ingreso, seguros y registros de hospedaje.
        </li>
      </ul>

      <h2>4. Precios y pagos</h2>
      <ul>
        <li>Los precios se expresan en dólares estadounidenses (USD) y son por persona, salvo indicación contraria.</li>
        <li>
          En los servicios privados el precio por persona depende del tamaño del grupo; el total exacto se muestra
          antes de confirmar.
        </li>
        <li>
          El precio incluye únicamente lo detallado en «Incluye» de cada tour. Entradas, comidas u otros conceptos
          listados en «No incluye» corren por cuenta del viajero.
        </li>
        <li>El pago se realiza por los medios indicados en tu voucher (enlace de pago o código QR).</li>
      </ul>

      <h2>5. Cancelaciones, cambios y reembolsos</h2>
      <p>
        Puedes cancelar hasta {policies.free_cancellation_hours} horas antes del inicio del tour con reembolso del
        total{policies.cancellation_fee_pct > 0 ? ` menos un cargo administrativo del ${policies.cancellation_fee_pct} %` : ''}.
        Pasado ese plazo, o en caso de no presentarte, no corresponde devolución. El detalle está en nuestra{' '}
        <Link href="/politica-de-cancelacion">política de cancelación</Link>.
      </p>

      <h2>6. Cambios en el itinerario</h2>
      <p>
        Los itinerarios pueden modificarse por razones de seguridad o por condiciones ajenas a la operadora (clima,
        estado de carreteras, bloqueos, disposiciones de áreas protegidas). En esos casos buscaremos la mejor
        alternativa disponible y, si la salida no puede operar, te ofreceremos una nueva fecha o la devolución de lo
        pagado.
      </p>

      <h2>7. Responsabilidades del viajero</h2>
      <ul>
        <li>Presentarte puntualmente en el punto de encuentro con tu documento de identidad y tu voucher.</li>
        <li>
          Informarnos de condiciones de salud, alergias o restricciones alimentarias antes del viaje. Varios
          recorridos superan los 4.000 m s. n. m. y no son aptos para personas con afecciones cardiacas o
          respiratorias ni para embarazadas.
        </li>
        <li>Seguir las indicaciones de guías y conductores y respetar las normas de las áreas protegidas y las comunidades.</li>
        <li>Contar con un seguro de viaje adecuado a las actividades que realizarás.</li>
      </ul>

      <h2>8. Responsabilidad de la operadora</h2>
      <p>
        Operamos cada servicio con personal y proveedores calificados. No somos responsables por hechos de fuerza
        mayor, por la pérdida de objetos personales ni por gastos derivados de retrasos de terceros (vuelos, buses
        u otros servicios no contratados con nosotros).
      </p>

      <h2>9. Uso del sitio</h2>
      <p>
        Las fotografías, textos y la marca {name} son de nuestra propiedad o se usan con autorización. No está
        permitido reproducirlos con fines comerciales sin nuestro consentimiento, ni usar el sitio para crear
        reservas falsas o automatizadas.
      </p>

      <h2>10. Datos personales</h2>
      <p>
        Tratamos tus datos según nuestra <Link href="/privacidad">política de privacidad</Link>.
      </p>

      <h2>11. Ley aplicable</h2>
      <p>
        Estas condiciones se rigen por las leyes del Estado Plurinacional de Bolivia. Cualquier diferencia se
        intentará resolver primero de forma directa y amistosa con la operadora.
      </p>
    </DocPage>
  );
}
