import type { Metadata } from 'next';
import DocPage from '@/components/layout/DocPage';
import { getSupabaseServer } from '@/lib/supabase';
import { fetchSiteSettings } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Qué datos personales recoge Homeland Tours, para qué los usa y cómo ejercer tus derechos.',
  alternates: { canonical: '/privacidad' },
};

export const revalidate = 60;

export default async function PrivacyPage() {
  const { company } = await fetchSiteSettings(getSupabaseServer());
  const name = company.name || 'Homeland Tours';

  return (
    <DocPage
      path="/privacidad"
      title="Política de privacidad"
      lead="Recogemos solo los datos que necesitamos para operar tu viaje, y te explicamos cada uno."
      updated="noviembre de 2026"
    >
      <h2>Qué datos recogemos</h2>
      <ul>
        <li>
          <strong>Cuenta:</strong> nombre, correo electrónico y, si lo indicas, teléfono o WhatsApp.
        </li>
        <li>
          <strong>Reserva:</strong> por cada viajero, nombre, número de documento, nacionalidad y preferencia de
          comida; además del tour, la fecha y el importe.
        </li>
        <li>
          <strong>Consultas:</strong> lo que nos escribes en los formularios de viaje a medida y de empresas.
        </li>
      </ul>
      <p>
        <strong>No guardamos datos de tarjetas ni de cuentas bancarias.</strong> Los pagos se realizan en la
        plataforma del proveedor de pagos o por transferencia con código QR.
      </p>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Gestionar tu reserva: lista de pasajeros, permisos de ingreso, hospedaje y alimentación.</li>
        <li>Contactarte sobre tu viaje: confirmaciones, cambios de horario o emergencias.</li>
        <li>Emitir tu voucher y llevar el registro administrativo y contable de la operadora.</li>
        <li>Mejorar el sitio con estadísticas de uso agregadas, sin identificarte personalmente.</li>
      </ul>

      <h2>Con quién los compartimos</h2>
      <p>
        Solo con quienes participan en la operación de tu viaje y en la medida necesaria: hospedajes, transportes,
        guías y autoridades de áreas protegidas cuando exigen un registro de visitantes. No vendemos ni cedemos tus
        datos con fines publicitarios.
      </p>

      <h2>Dónde y cuánto tiempo se guardan</h2>
      <p>
        Los datos se almacenan en servicios en la nube con acceso restringido. Conservamos las reservas y los datos
        de pasajeros durante cinco años como respaldo administrativo y fiscal. Tu cuenta se mantiene mientras esté
        activa.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes pedir en cualquier momento acceder a tus datos, corregirlos o eliminarlos. Al eliminar una cuenta
        conservamos las reservas ya realizadas de forma anonimizada, por coherencia contable.
        {company.email ? ` Escríbenos a ${company.email}.` : ' Escríbenos por los canales de contacto de este sitio.'}
      </p>

      <h2>Cookies y almacenamiento local</h2>
      <p>
        Usamos almacenamiento del navegador para mantener tu sesión iniciada, recordar la reserva que estás
        armando y tus tours favoritos. Si activamos herramientas de analítica, medirán visitas de forma agregada.
      </p>

      <h2>Responsable</h2>
      <p>
        {name}
        {company.address ? `, ${company.address}` : ''}. Tratamos los datos personales conforme a la normativa
        boliviana aplicable.
      </p>
    </DocPage>
  );
}
