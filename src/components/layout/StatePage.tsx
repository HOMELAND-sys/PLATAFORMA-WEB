import type { ReactNode } from 'react';

/** Página de estado (404, error, sin acceso): mensaje centrado con acciones. */
export default function StatePage({
  code,
  title,
  text,
  children,
}: {
  code?: string;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <section className="state-page">
      <div className="state-page__box">
        {code && (
          <span className="state-page__code" aria-hidden="true">
            {code}
          </span>
        )}
        <h1>{title}</h1>
        <p>{text}</p>
        {children && <div className="state-page__actions">{children}</div>}
      </div>
    </section>
  );
}
