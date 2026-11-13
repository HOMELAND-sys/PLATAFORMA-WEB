import type { Metadata } from 'next';
import Link from 'next/link';
import DocPage from '@/components/layout/DocPage';
import Icon from '@/components/ui/Icon';
import { FAQ_GROUPS } from '@/data/faq';

export const metadata: Metadata = {
  title: 'Preguntas frecuentes',
  description: 'Respuestas sobre reservas, precios, pagos, cancelaciones y lo que necesitas saber antes de viajar con Homeland Tours.',
  alternates: { canonical: '/preguntas-frecuentes' },
};

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_GROUPS.flatMap((g) => g.items).map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  return (
    <DocPage
      path="/preguntas-frecuentes"
      title="Preguntas frecuentes"
      lead="Todo lo que suelen preguntarnos antes de reservar: cómo funciona, cuándo se paga y qué pasa si cambian tus planes."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {FAQ_GROUPS.map((group) => (
        <section key={group.title} className="doc-faq-group">
          <h2>{group.title}</h2>
          <div className="ht-faq-list">
            {group.items.map((f) => (
              <details key={f.q} className="ht-faq">
                <summary>
                  {f.q}
                  <Icon name="plus" size={18} />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
      <div className="ht-note">
        <Icon name="chat" size={20} />
        <span>
          <strong>¿No encontraste tu respuesta?</strong> Cuéntanos qué necesitas en el formulario de{' '}
          <Link href="/customize">viaje a medida</Link> y te respondemos personalmente.
        </span>
      </div>
    </DocPage>
  );
}
