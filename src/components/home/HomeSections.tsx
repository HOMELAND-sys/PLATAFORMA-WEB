import Link from 'next/link';
import Icon, { type IconName } from '@/components/ui/Icon';
import TourCard from '@/components/ui/TourCard';
import Reveal from '@/components/ui/Reveal';
import { ReviewCard } from '@/components/reviews/ReviewCards';
import type { CategoryRow, ReviewRow } from '@/lib/api';
import type { Tour } from '@/lib/types';
import { CATEGORY_PHOTOS } from '@/data/site-photos';
import { cancellationShort, type SitePolicies } from '@/lib/site';
import { FAQ_HOME } from '@/data/faq';

/* ---------- Barra de confianza: solo hechos comprobables ---------- */
export function TrustBar({ policies, rating }: { policies: SitePolicies; rating: { avg: number; count: number } | null }) {
  const cancel = cancellationShort(policies.free_cancellation_hours);
  const items: { icon: IconName; text: React.ReactNode }[] = [
    { icon: 'badge-check', text: <>Operadora <strong>100 % boliviana</strong></> },
    { icon: 'shield-check', text: <>Reserva ahora, <strong>paga después</strong></> },
    ...(cancel ? [{ icon: 'rotate-ccw' as IconName, text: <>{cancel}</> }] : []),
    { icon: 'ticket', text: <>Voucher digital <strong>al instante</strong></> },
  ];
  return (
    <div className="trust-bar hs-trust">
      <div className="container trust-bar__inner">
        {rating && rating.count > 0 && (
          <div className="trust-bar__item rating">
            <span className="stars" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <Icon key={i} name="star-solid" size={15} />
              ))}
            </span>
            <span>
              <strong>{rating.avg.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/5</strong>{' '}
              en {rating.count} {rating.count === 1 ? 'opinión' : 'opiniones'}
            </span>
          </div>
        )}
        {items.map((it, i) => (
          <div className="trust-bar__item" key={i}>
            <Icon name={it.icon} size={20} />
            <span>{it.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Tours destacados ---------- */
export function FeaturedTours({ tours }: { tours: Tour[] }) {
  if (tours.length === 0) return null;
  return (
    <section className="section hs-featured">
      <div className="container">
        <div className="hs-head">
          <div>
            <p className="eyebrow">Listos para reservar</p>
            <h2>Experiencias destacadas</h2>
            <p className="hs-head__sub">Salidas confirmadas con cupos reales. Elige tu fecha y reserva en minutos.</p>
          </div>
          <Link className="btn btn--ghost btn--sm" href="/tours">
            Ver todos los tours <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        <div className="hs-tour-grid">
          {tours.map((tour, i) => (
            <TourCard key={tour.slug} tour={tour} priority={i < 4} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Destinos (polaroids, como las fotos de los itinerarios) ---------- */
export function Destinations({ categories, counts }: { categories: CategoryRow[]; counts: Record<string, number> }) {
  const list = categories.filter((c) => (counts[c.slug] ?? 0) > 0);
  if (list.length === 0) return null;
  return (
    <section className="section section-alt hs-dest">
      <div className="container">
        <div className="hs-head">
          <div>
            <p className="eyebrow">Destinos</p>
            <h2>¿Qué Bolivia quieres conocer?</h2>
          </div>
          <Link className="btn btn--ghost btn--sm" href="/tours">
            Ver todos los destinos <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        <div className="hs-dest__grid">
          {list.map((cat) => {
            const photo = CATEGORY_PHOTOS[cat.slug];
            const n = counts[cat.slug] ?? 0;
            return (
              <Link key={cat.slug} className="ht-polaroid hs-dest__card" href={`/tours?cat=${cat.slug}`}>
                <img src={photo?.sm ?? cat.image ?? ''} alt={photo?.alt ?? cat.label} loading="lazy" />
                <span className="ht-polaroid__cap">{cat.label}</span>
                <span className="hs-dest__count">
                  {n} {n === 1 ? 'tour' : 'tours'} <Icon name="arrow-right" size={13} />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Cómo funciona ---------- */
const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'search', title: 'Elige tu tour', text: 'Compara itinerarios, qué incluye y precios por persona, sin letra chica.' },
  { icon: 'calendar', title: 'Reserva tu fecha', text: 'Ves los cupos reales de cada salida y apartas tu lugar en minutos.' },
  { icon: 'ticket', title: 'Recibe tu voucher', text: 'Te llega al instante con el código QR y las instrucciones de pago.' },
  { icon: 'hiker', title: 'Vive la experiencia', text: 'Nosotros nos ocupamos del transporte, los guías y cada detalle.' },
];

export function HowItWorks() {
  return (
    <section className="section hs-steps">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow center">Así de simple</p>
          <h2>Reservar tu viaje toma minutos</h2>
        </div>
        <ol className="hs-steps__grid">
          {STEPS.map((s, i) => (
            <li key={s.title} className="hs-step">
              <span className="hs-step__num">{i + 1}</span>
              <span className="hs-step__icon">
                <Icon name={s.icon} size={26} />
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Por qué Homeland ---------- */
const REASONS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'pin', title: 'Somos de aquí', text: 'Diseñamos y operamos cada salida con equipo local que conoce cada ruta.' },
  { icon: 'award', title: 'Guías profesionales', text: 'Guías locales que te cuentan la historia detrás de cada paisaje.' },
  { icon: 'van', title: 'Todo resuelto', text: 'Transporte, hospedaje, entradas y alimentación según el tour: tú solo disfrutas.' },
  { icon: 'chat', title: 'Atención directa', text: 'Hablas con la operadora, sin intermediarios, antes, durante y después del viaje.' },
];

export function WhyHomeland({ photo }: { photo: { src: string; alt: string } }) {
  return (
    <section className="hs-why" id="nosotros">
      <div className="container hs-why__inner">
        <Reveal>
          <div className="hs-why__media">
            <img src={photo.src} alt={photo.alt} loading="lazy" />
            <span className="hs-why__stamp">
              <Icon name="leaf" size={18} /> Turismo responsable con comunidades locales
            </span>
          </div>
        </Reveal>
        <div className="hs-why__body">
          <p className="eyebrow">Por qué Homeland Tours</p>
          <h2>Viajes auténticos, con corazón local</h2>
          <p className="hs-why__lead">
            No somos una plataforma global: somos una operadora boliviana. Cada tour que ves aquí lo operamos
            nosotros, con la gente y los lugares que conocemos de toda la vida.
          </p>
          <ul className="hs-why__list">
            {REASONS.map((r) => (
              <li key={r.title}>
                <span className="hs-why__icon">
                  <Icon name={r.icon} size={20} />
                </span>
                <div>
                  <strong>{r.title}</strong>
                  <p>{r.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link className="btn btn--dark" href="/nosotros">
            Conoce a la operadora <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Opiniones ---------- */
export function ReviewsSection({ reviews, rating }: { reviews: ReviewRow[]; rating: { avg: number; count: number } | null }) {
  if (reviews.length === 0) return null;
  return (
    <section className="section section-alt hs-reviews">
      <div className="container">
        <div className="hs-head">
          <div>
            <p className="eyebrow">Opiniones de viajeros</p>
            <h2>Lo que cuentan quienes ya viajaron</h2>
          </div>
          {rating && rating.count > 0 && (
            <div className="hs-reviews__score">
              <b>{rating.avg.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b>
              <span>
                <span className="stars" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Icon key={i} name="star-solid" size={14} />
                  ))}
                </span>
                {rating.count} {rating.count === 1 ? 'opinión' : 'opiniones'}
              </span>
            </div>
          )}
        </div>
        <div className="hs-reviews__rail" tabIndex={0} aria-label="Opiniones de viajeros">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Viaje a medida + empresas ---------- */
export function CustomBanner({ photo }: { photo: { src: string; alt: string } }) {
  return (
    <section className="section hs-custom">
      <div className="container hs-custom__grid">
        <article className="hs-custom__card hs-custom__card--photo">
          <img src={photo.src} alt="" loading="lazy" />
          <div className="hs-custom__body">
            <span className="ht-pill ht-pill--dark">
              <Icon name="route" size={15} /> Viaje a medida
            </span>
            <h2>¿Tienes otra ruta en mente?</h2>
            <p>Cuéntanos fechas, destinos y con quién viajas. Armamos un itinerario privado solo para tu grupo.</p>
            <Link className="btn btn--primary" href="/customize">
              Diseñar mi viaje <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </article>
        <article className="hs-custom__card hs-custom__card--b2b">
          <span className="ht-pill">
            <Icon name="users" size={15} /> Empresas y agencias
          </span>
          <h3>Grupos, colegios y viajes corporativos</h3>
          <p>Tarifas para agencias y logística completa para grupos grandes, con una operadora local.</p>
          <Link className="btn btn--ghost" href="/business">
            Trabajemos juntos <Icon name="arrow-right" size={16} />
          </Link>
        </article>
      </div>
    </section>
  );
}

/* ---------- Preguntas frecuentes ---------- */
export function FaqTeaser() {
  return (
    <section className="section hs-faq">
      <div className="container hs-faq__inner">
        <div>
          <p className="eyebrow">Antes de reservar</p>
          <h2>Preguntas frecuentes</h2>
          <p className="hs-head__sub">Lo que más nos preguntan sobre reservas, pagos y cancelaciones.</p>
          <Link className="btn btn--ghost btn--sm" href="/preguntas-frecuentes">
            Ver todas las preguntas <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        <div className="ht-faq-list">
          {FAQ_HOME.map((f) => (
            <details key={f.q} className="ht-faq">
              <summary>
                {f.q}
                <Icon name="plus" size={18} />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
