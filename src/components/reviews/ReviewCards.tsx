import Icon from '@/components/ui/Icon';
import type { ReviewRow } from '@/lib/api';

const TONES = ['#75953e', '#4f6a26', '#c9862b', '#b5533f', '#2f7a72', '#5b6b8c'];

export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || 'V'
  );
}

function toneOf(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

export function reviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="rv-stars" role="img" aria-label={`${value.toLocaleString('es-ES', { maximumFractionDigits: 1 })} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star-solid" size={size} className={i <= full ? 'is-on' : 'is-off'} />
      ))}
    </span>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  google: 'Opinión de Google',
  tripadvisor: 'Opinión de Tripadvisor',
  web: 'Reserva verificada',
};

export function ReviewCard({ review }: { review: ReviewRow }) {
  const tag = SOURCE_LABEL[review.source];
  return (
    <article className="rv-card">
      <header className="rv-card__head">
        <span className="rv-avatar" style={{ background: toneOf(review.author_name) }} aria-hidden="true">
          {initialsOf(review.author_name)}
        </span>
        <div className="rv-card__who">
          <strong>{review.author_name}</strong>
          <span>
            {review.author_country ? `${review.author_country} · ` : ''}
            {reviewDate(review.travel_date ?? review.created_at)}
          </span>
        </div>
        <Stars value={review.rating} />
      </header>
      {review.title && <h4 className="rv-card__title">{review.title}</h4>}
      <p className="rv-card__body">{review.body}</p>
      {tag && (
        <span className="rv-card__tag">
          <Icon name="badge-check" size={14} /> {tag}
        </span>
      )}
      {review.admin_reply && (
        <div className="rv-card__reply">
          <strong>Respuesta de Homeland Tours</strong>
          <p>{review.admin_reply}</p>
        </div>
      )}
    </article>
  );
}
