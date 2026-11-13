import Link from 'next/link';
import type { ReactNode } from 'react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

const DOC_LINKS = [
  { href: '/nosotros', label: 'Sobre nosotros' },
  { href: '/preguntas-frecuentes', label: 'Preguntas frecuentes' },
  { href: '/politica-de-cancelacion', label: 'Cancelaciones y reembolsos' },
  { href: '/terminos', label: 'Términos y condiciones' },
  { href: '/privacidad', label: 'Política de privacidad' },
];

interface DocPageProps {
  path: string;
  title: string;
  lead: string;
  updated?: string;
  children: ReactNode;
}

/** Plantilla de páginas de contenido: ayuda, legales y "nosotros". */
export default function DocPage({ path, title, lead, updated, children }: DocPageProps) {
  return (
    <>
      <section className="doc-hero">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: title }]} />
          <h1>{title}</h1>
          <p>{lead}</p>
        </div>
      </section>
      <div className="container doc-body">
        <nav className="doc-nav" aria-label="Información y ayuda">
          <strong>Información</strong>
          {DOC_LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={l.href === path ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <article className="doc-content">
          {children}
          {updated && <p className="doc-updated">Última actualización: {updated}.</p>}
        </article>
      </div>
    </>
  );
}
