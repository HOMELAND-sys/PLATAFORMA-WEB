import type { Metadata } from 'next';
import Link from 'next/link';
import DocPage from '@/components/layout/DocPage';
import Icon, { type IconName } from '@/components/ui/Icon';
import { getSupabaseServer } from '@/lib/supabase';
import { fetchSiteSettings, primaryPhone, telHref, whatsappUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Sobre nosotros',
  description: 'Homeland Tours es una operadora de turismo boliviana: diseñamos y operamos cada salida con equipo local.',
  alternates: { canonical: '/nosotros' },
};

export const revalidate = 60;

const VALUES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'pin', title: 'Operación propia', text: 'Los tours que ves en este sitio los operamos nosotros, con nuestros guías, conductores y proveedores de confianza.' },
  { icon: 'shield-check', title: 'Reserva transparente', text: 'Cupos reales, precios por persona a la vista y un voucher con todo el detalle de lo que contrataste.' },
  { icon: 'leaf', title: 'Turismo responsable', text: 'Trabajamos con hospedajes, cocineras y guías de las comunidades que visitamos, y cuidamos las áreas protegidas.' },
  { icon: 'chat', title: 'Trato directo', text: 'Hablas con la operadora antes, durante y después del viaje. Sin intermediarios ni respuestas automáticas.' },
];

export default async function AboutPage() {
  const { company } = await fetchSiteSettings(getSupabaseServer());
  const wa = whatsappUrl(company, 'Hola, quisiera información sobre sus tours.');
  const phone = primaryPhone(company);

  return (
    <DocPage
      path="/nosotros"
      title="Sobre nosotros"
      lead="Somos una operadora de turismo boliviana. Mostramos nuestro país como lo conocemos: de cerca y con la gente que lo habita."
    >
      <h2>Viajes auténticos, corazón local</h2>
      <p>
        Homeland Tours nació para que conocer Bolivia sea simple y seguro. Diseñamos cada itinerario recorriéndolo
        primero nosotros: sabemos cuánto dura cada tramo, dónde se come bien y a qué hora la luz es mejor en el
        salar o frente al Sajama.
      </p>
      <p>
        Operamos salidas compartidas y tours privados al Salar de Uyuni, el Parque Nacional Sajama, Toro Toro, el
        lago Titicaca, La Paz y sus alrededores, y la Amazonía, además de viajes a medida para grupos, colegios y
        empresas.
      </p>

      <h2>Cómo trabajamos</h2>
      <div className="doc-cards">
        {VALUES.map((v) => (
          <div className="doc-card" key={v.title}>
            <span className="doc-card__icon">
              <Icon name={v.icon} size={20} />
            </span>
            <h3>{v.title}</h3>
            <p>{v.text}</p>
          </div>
        ))}
      </div>

      <h2>Reserva en línea, con respaldo real</h2>
      <p>
        Esta plataforma está conectada a nuestra operación: el calendario muestra los lugares que de verdad quedan
        en cada salida y tu reserva llega al instante a nuestro equipo. Si necesitas algo distinto, lo armamos
        contigo.
      </p>

      {(wa || phone || company.email || company.address) && (
        <>
          <h2>Contacto</h2>
          <ul>
            {company.address && <li>{company.address}</li>}
            {phone && (
              <li>
                Teléfono: <a href={telHref(phone)}>{phone}</a>
              </li>
            )}
            {company.email && (
              <li>
                Correo: <a href={`mailto:${company.email}`}>{company.email}</a>
              </li>
            )}
            {company.license && <li>Licencia de operación: {company.license}</li>}
          </ul>
        </>
      )}

      <div className="doc-cta">
        <Link className="btn btn--primary" href="/tours">
          Ver tours <Icon name="arrow-right" size={16} />
        </Link>
        {wa ? (
          <a className="btn btn--ghost" href={wa} target="_blank" rel="noopener noreferrer">
            <Icon name="whatsapp" size={17} /> Escríbenos
          </a>
        ) : (
          <Link className="btn btn--ghost" href="/customize">
            Pedir un viaje a medida
          </Link>
        )}
      </div>
    </DocPage>
  );
}
