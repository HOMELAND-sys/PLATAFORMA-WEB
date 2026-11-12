import type { CSSProperties } from 'react';
import { LOGO_ASPECT, LOGO_SYMBOL, LOGO_TAGLINE, LOGO_VIEWBOX, LOGO_WORDMARK } from './logo-paths';

interface HomelandLogoProps {
  className?: string;
  style?: CSSProperties;
  /** Altura de referencia para los atributos width/height (el CSS puede sobrescribirla). */
  height?: number;
  /**
   * Prefijo de ids para la versión animada (intro). Activa los trazos de contorno,
   * y la máscara de la "H". Sin él se renderiza el logo plano.
   */
  animatedId?: string;
  title?: string;
}

/** Logotipo Homeland Tours en SVG inline — hereda el color con `currentColor`. */
export default function HomelandLogo({
  className,
  style,
  height = 44,
  animatedId,
  title = 'Homeland Tours — Bolivian Tour Operator',
}: HomelandLogoProps) {
  const width = Math.round(height * LOGO_ASPECT * 100) / 100;
  const id = animatedId;

  return (
    <svg
      className={`hl-logo${className ? ` ${className}` : ''}`}
      viewBox={LOGO_VIEWBOX}
      width={width}
      height={height}
      fill="currentColor"
      style={style}
      role="img"
      aria-label={title}
    >
      {id && (
        <defs>
          <clipPath id={`${id}-h`}>
            <rect x="34.5" y="25.4" width="19" height="19.9" />
          </clipPath>
        </defs>
      )}

      <g className="hl-symbol">
        <g className="hl-outer">
          <path className="hl-fill" d={LOGO_SYMBOL.outer} />
          {id && <path className="hl-stroke" d={LOGO_SYMBOL.outer} fill="none" stroke="currentColor" strokeWidth=".55" />}
        </g>
        <g className="hl-inner">
          <path className="hl-fill" d={LOGO_SYMBOL.inner} />
          {id && <path className="hl-stroke" d={LOGO_SYMBOL.inner} fill="none" stroke="currentColor" strokeWidth=".55" />}
        </g>
        {id ? (
          <g clipPath={`url(#${id}-h)`}>
            <path className="hl-h" d={LOGO_SYMBOL.h} />
          </g>
        ) : (
          <path className="hl-h" d={LOGO_SYMBOL.h} />
        )}
      </g>

      <g className="hl-wordmark">
        {LOGO_WORDMARK.map((d, i) => (
          <path key={i} className={`hl-glyph${i === 8 ? ' hl-dot' : ''}`} d={d} fillRule="evenodd" />
        ))}
      </g>

      <g className="hl-tagline">
        {LOGO_TAGLINE.map((d, i) => (
          <path key={i} className="hl-tag" d={d} />
        ))}
      </g>
    </svg>
  );
}
