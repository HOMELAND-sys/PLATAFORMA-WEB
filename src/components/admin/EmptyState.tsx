'use client';
import { useId, type ReactNode } from 'react';
export type EmptyImage = 'availability' | 'availability-alt' | 'calendar' | 'slots' | 'scanner' | 'scanner-alt' | 'agencies' | 'transfers' | 'bookings' | 'offers' | 'generic';
export interface EmptyAction { label: string; onClick?: () => void; href?: string; disabled?: boolean }
interface Props { image?: EmptyImage; title: string; text: ReactNode; action?: EmptyAction; compact?: boolean }
export default function EmptyState({ image = 'generic', title, text, action, compact = false }: Props) {
  const id = useId();
  return <section className={`ops-empty-state${compact ? ' ops-empty-state--compact' : ''}`} aria-labelledby={id}>
    <img src={`/assets/admin/empty/${image}.webp`} width={1200} height={900} loading="lazy" decoding="async" alt="" />
    <h3 id={id}>{title}</h3><p>{text}</p>
    {action && (action.href ? <a className="btn btn--ghost btn--sm" href={action.href}>{action.label}</a> : <button type="button" className="btn btn--ghost btn--sm" onClick={action.onClick} disabled={action.disabled}>{action.label}</button>)}
  </section>;
}
