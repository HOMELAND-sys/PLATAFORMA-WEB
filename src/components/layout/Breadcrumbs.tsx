import Link from 'next/link';

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  light?: boolean;
}

export default function Breadcrumbs({ items, light = false }: BreadcrumbsProps) {
  const linkColor = light ? { color: 'var(--ink-500)' } : undefined;
  const sepColor = light ? { color: 'var(--ink-400)' } : undefined;
  const currentColor = light ? { color: 'var(--ink-700)' } : undefined;

  return (
    <nav className="crumbs">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {i > 0 && <span className="sep" style={sepColor}>/</span>}
          {item.href ? (
            <Link href={item.href} style={linkColor}>
              {item.label}
            </Link>
          ) : (
            <span style={currentColor}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
