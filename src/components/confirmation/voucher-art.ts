// Geometría SVG del voucher: funciones puras y deterministas (idénticas en SSR,
// cliente y PDF). Solo usan comandos absolutos M / L / C / Z para que el PDF
// pueda redibujarlas como vectores.
import { LOGO_SYMBOL, LOGO_TAGLINE, LOGO_VIEWBOX, LOGO_WORDMARK } from '@/components/brand/logo-paths';

export type Ridge = ReadonlyArray<readonly [number, number]>;
export type Pt = readonly [number, number];

const f1 = (n: number) => Math.round(n * 10) / 10;

/* ------------------------------------------------------------------
   Perfiles de cordillera [x 0..1, altura 0..1]
   El frontal evoca la triple cumbre del Illimani sobre La Paz.
   ------------------------------------------------------------------ */
export const ILLIMANI: Ridge = [
  [0, 0.16], [0.04, 0.27], [0.08, 0.2], [0.13, 0.4], [0.17, 0.31], [0.22, 0.48], [0.26, 0.39],
  [0.3, 0.6], [0.34, 0.5], [0.385, 0.77], [0.415, 0.69], [0.448, 0.94], [0.478, 0.82], [0.508, 1],
  [0.538, 0.85], [0.568, 0.96], [0.605, 0.66], [0.645, 0.74], [0.69, 0.5], [0.73, 0.59], [0.78, 0.37],
  [0.83, 0.45], [0.88, 0.25], [0.93, 0.31], [1, 0.13],
];

export const CORDILLERA: Ridge = [
  [0, 0.32], [0.06, 0.5], [0.11, 0.37], [0.19, 0.72], [0.25, 0.52], [0.32, 0.86], [0.37, 0.64],
  [0.43, 0.92], [0.49, 0.7], [0.55, 0.88], [0.61, 0.6], [0.69, 0.8], [0.75, 0.5], [0.82, 0.66],
  [0.89, 0.42], [0.95, 0.5], [1, 0.3],
];

export const ALTIPLANO: Ridge = [
  [0, 0.55], [0.08, 0.7], [0.15, 0.58], [0.24, 0.82], [0.33, 0.6], [0.41, 0.74], [0.5, 0.52],
  [0.6, 0.78], [0.68, 0.62], [0.77, 0.9], [0.85, 0.66], [0.93, 0.8], [1, 0.6],
];

export interface RidgeBox {
  x?: number;
  width: number;
  /** y de la base (altura 0). */
  base: number;
  /** alto de la cumbre más alta. */
  amp: number;
}

export function ridgePoints(ridge: Ridge, { x = 0, width, base, amp }: RidgeBox): Pt[] {
  return ridge.map(([rx, h]) => [x + rx * width, base - h * amp] as const);
}

/** Silueta rellena: cresta + cierre hasta `bottom`. */
export function areaPath(points: Pt[], bottom: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  return `M${f1(first[0])} ${f1(bottom)}L${points.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}L${f1(last[0])} ${f1(
    bottom,
  )}Z`;
}

/** Misma silueta aplanada sobre la base (estado inicial para MorphSVG). */
export function flatAreaPath(points: Pt[], base: number, bottom: number): string {
  return areaPath(
    points.map(([x]) => [x, base] as const),
    bottom,
  );
}

export function linePath(points: Pt[]): string {
  return `M${points.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}`;
}

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Casquetes de nieve en las cumbres más altas (picos locales con h ≥ minH). */
export function snowCaps(ridge: Ridge, points: Pt[], minH = 0.78, depth = 0.32): string[] {
  const caps: string[] = [];
  for (let i = 1; i < ridge.length - 1; i++) {
    const h = ridge[i][1];
    if (h < minH || h < ridge[i - 1][1] || h < ridge[i + 1][1]) continue;
    const p = points[i];
    const a = lerp(p, points[i - 1], depth);
    const b = lerp(p, points[i + 1], depth);
    const drop = Math.abs(((a[1] + b[1]) / 2 - p[1]) * 0.42);
    const z1 = lerp(a, b, 0.28);
    const z2 = lerp(a, b, 0.52);
    const z3 = lerp(a, b, 0.76);
    const pts: Pt[] = [p, a, [z1[0], z1[1] + drop], [z2[0], z2[1] - drop * 0.35], [z3[0], z3[1] + drop * 0.8], b];
    caps.push(`M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}Z`);
  }
  return caps;
}

/* ------------------------------------------------------------------
   Curvas de nivel topográficas (Catmull-Rom cerradas → Bézier)
   ------------------------------------------------------------------ */
function closedCurve(p: Pt[]) {
  const n = p.length;
  let d = `M${f1(p[0][0])} ${f1(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n];
    const p1 = p[i];
    const p2 = p[(i + 1) % n];
    const p3 = p[(i + 2) % n];
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(
      p2[1] - (p3[1] - p1[1]) / 6,
    )} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return `${d}Z`;
}

export function topoRings(opts: {
  count: number;
  cx: number;
  cy: number;
  r0: number;
  step: number;
  sx?: number;
  sy?: number;
  seed?: number;
}): string[] {
  const { count, cx, cy, r0, step, sx = 1.3, sy = 0.8, seed = 0 } = opts;
  return Array.from({ length: count }, (_, k) => {
    const base = r0 + k * step;
    const pts: Pt[] = [];
    const N = 26;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const noise =
        Math.sin(a * 3 + k * 0.7 + seed) * 0.07 +
        Math.sin(a * 5 - k * 1.3 + seed * 2) * 0.045 +
        Math.cos(a * 2 + k + seed) * 0.05;
      const r = base * (1 + noise);
      pts.push([cx + Math.cos(a) * r * sx, cy + Math.sin(a) * r * sy]);
    }
    const start = (k * 7) % N;
    const ordered = [...pts.slice(start), ...pts.slice(0, start)];
    return closedCurve(k % 2 ? ordered.reverse() : ordered);
  });
}

/* ------------------------------------------------------------------
   Guilloché (patrón de seguridad de billetes): hipotrocoides
   ------------------------------------------------------------------ */
function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

/** Roseta hipotrocoide. R y r enteros; `scale` ajusta el radio final. */
export function guilloche(cx: number, cy: number, R: number, r: number, d: number, scale = 1, steps = 900): string {
  const turns = r / gcd(R, r);
  const k = (R - r) / r;
  const period = Math.PI * 2 * turns;
  let path = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * period;
    const x = cx + ((R - r) * Math.cos(t) + d * Math.cos(k * t)) * scale;
    const y = cy + ((R - r) * Math.sin(t) - d * Math.sin(k * t)) * scale;
    path += `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`;
  }
  return path;
}

/** Ondas paralelas desfasadas (bordes de billete). */
export function waveLines(width: number, y0: number, count: number, gap: number, amp: number, wavelength: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const phase = i * 0.55;
    let d = '';
    for (let x = 0; x <= width; x += 4) {
      const y = y0 + i * gap + Math.sin((x / wavelength) * Math.PI * 2 + phase) * amp * (1 - i * 0.04);
      d += `${x ? 'L' : 'M'}${f1(x)} ${f1(y)}`;
    }
    return d;
  });
}

/* ------------------------------------------------------------------
   Ilustraciones
   ------------------------------------------------------------------ */

/** Cóndor andino planeando — caja 60×18, centro en (30, 9). */
export const CONDOR_PATH =
  'M30 6.2C28.6 6.2 27.6 7 26.6 7.6C22 6.2 15 5.2 8.5 6.4L5.2 5.6L6.6 7.1L2.8 6.9L5.2 8.1L1.6 8.6L5 9.3L2.6 10.3L7.4 10.1C13 10.6 20 10.4 26.4 10.2L28.6 12.6L31.4 12.6L33.6 10.2C40 10.4 47 10.6 52.6 10.1L57.4 10.3L55 9.3L58.4 8.6L54.8 8.1L57.2 6.9L53.4 7.1L54.8 5.6L51.5 6.4C45 5.2 38 6.2 33.4 7.6C32.4 7 31.4 6.2 30 6.2Z';
export const CONDOR_RUFF = 'M27.6 7.4C28.6 8.3 31.4 8.3 32.4 7.4C31.6 8.9 28.4 8.9 27.6 7.4Z';

/** Jeep 4x4 de perfil, mirando a la derecha — caja 28×16. */
export const JEEP = {
  body: 'M2 11.4V8.2C2 7.5 2.4 7.1 3.1 7L7.6 6.6L10.4 2.7C10.7 2.2 11.1 2 11.7 2H21.6C22.3 2 22.7 2.4 22.8 3L23.6 6.6L25.6 7C26.2 7.2 26.6 7.6 26.6 8.3V11.4C26.6 11.9 26.2 12.2 25.8 12.2H2.8C2.3 12.2 2 11.9 2 11.4Z',
  windows: 'M11.9 3.4H16V6.3H9.6ZM17.1 3.4H21.3L21.9 6.3H17.1Z',
  rack: 'M11 1H22.4',
  wheels: [
    [7.6, 12.6],
    [21.2, 12.6],
  ] as const,
};

/** Pin de mapa con la punta en (0,0). */
export const PIN_PATH = 'M0 0C-4.6-5.6-7.6-9-7.6-12.8C-7.6-17 -4.2-20.4 0-20.4C4.2-20.4 7.6-17 7.6-12.8C7.6-9 4.6-5.6 0 0Z';

/** Roseta festoneada (n lóbulos) y círculo con los mismos puntos — para MorphSVG. */
export function scallopPath(cx: number, cy: number, r: number, lobes: number, depth: number): string {
  const pts: Pt[] = [];
  const N = lobes * 2;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r - depth : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return closedCurve(pts);
}

export function circlePath(cx: number, cy: number, r: number, points = 24): string {
  const pts: Pt[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2 - Math.PI / 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return closedCurve(pts);
}

/* ------------------------------------------------------------------
   Paleta del aguayo (tejido andino) — acentos de celebración
   ------------------------------------------------------------------ */
export const AGUAYO = {
  red: '#b8322a',
  magenta: '#a3245f',
  orange: '#d9772b',
  gold: '#e3b23c',
  green: '#5d8a2e',
  teal: '#1f6f78',
  navy: '#26304f',
  cream: '#f6edd6',
} as const;

export const CONFETTI_COLORS = [AGUAYO.red, AGUAYO.magenta, AGUAYO.orange, AGUAYO.gold, AGUAYO.green, AGUAYO.teal, '#9ab26e'];

/* ------------------------------------------------------------------
   Utilidades raster para el PDF
   ------------------------------------------------------------------ */

/** Logotipo Homeland como SVG standalone de un color. */
export function logoSvgString(color: string, pxWidth = 880): string {
  const [, , vw, vh] = LOGO_VIEWBOX.split(/\s+/).map(Number);
  const w = Math.round(pxWidth);
  const h = Math.round((pxWidth * vh) / vw);
  const paths = [
    `<path d="${LOGO_SYMBOL.outer}"/>`,
    `<path d="${LOGO_SYMBOL.inner}"/>`,
    `<path d="${LOGO_SYMBOL.h}"/>`,
    ...LOGO_WORDMARK.map((d) => `<path fill-rule="evenodd" d="${d}"/>`),
    ...LOGO_TAGLINE.map((d) => `<path fill-rule="evenodd" d="${d}"/>`),
  ].join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}" width="${w}" height="${h}" fill="${color}">${paths}</svg>`;
}

/** Rasteriza un SVG (sin texto) a PNG data URL. */
export function svgToPng(svg: string, width: number, height: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/** Carga una imagen remota y la recorta tipo `object-fit: cover` con esquinas redondeadas. */
export function imageCover(
  url: string,
  width: number,
  height: number,
  opts: { radius?: number; bg?: string; format?: 'jpeg' | 'png'; contain?: boolean } = {},
): Promise<string | null> {
  const { radius = 0, bg = '#ffffff', format = 'jpeg', contain = false } = opts;
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (radius > 0) {
          ctx.beginPath();
          ctx.roundRect(0, 0, canvas.width, canvas.height, radius);
          ctx.clip();
        }
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const s = contain ? Math.min(canvas.width / iw, canvas.height / ih) : Math.max(canvas.width / iw, canvas.height / ih);
        const dw = iw * s;
        const dh = ih * s;
        ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
        resolve(canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.88));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
