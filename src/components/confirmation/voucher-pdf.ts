// Voucher PDF (A4) dibujado en vectores con jsPDF: misma identidad que la vista
// web — cordillera, aguayo, ruta, sello de goma y QR de check-in — y con TODOS
// los datos de la reserva: pasajeros, desglose de precio, pago, punto de
// encuentro, qué incluye y políticas.
import QRCode from 'qrcode';
import type { MyBooking, PaymentSettings } from '@/lib/api';
import { LOGO_ASPECT } from '@/components/brand/logo-paths';
import {
  AGUAYO,
  ALTIPLANO,
  CORDILLERA,
  ILLIMANI,
  JEEP,
  PIN_PATH,
  areaPath,
  imageCover,
  logoSvgString,
  ridgePoints,
  snowCaps,
  svgToPng,
  topoRings,
} from './voucher-art';
import {
  DIFFICULTY_LABEL,
  STATUS_META,
  SUPPORT_PHONE,
  TONE_INK,
  TOUR_TYPE_LABEL,
  addDays,
  barcodeBars,
  bob,
  dateParts,
  durationDays,
  fmtDate,
  fmtDateLong,
  leadPassenger,
  meetingTime,
  money,
  parseRoute,
  priceBreakdown,
  voucherUrl,
} from './voucher-data';

type RGB = [number, number, number];

const C = {
  g950: [26, 34, 14] as RGB,
  g900: [35, 45, 19] as RGB,
  g800: [46, 59, 27] as RGB,
  g700: [59, 76, 36] as RGB,
  g600: [78, 99, 48] as RGB,
  g500: [97, 122, 58] as RGB,
  gbg: [117, 149, 62] as RGB,
  g300: [154, 178, 110] as RGB,
  g100: [234, 238, 226] as RGB,
  g50: [244, 246, 236] as RGB,
  ink9: [20, 26, 14] as RGB,
  ink7: [57, 66, 44] as RGB,
  ink5: [107, 117, 96] as RGB,
  ink4: [139, 148, 126] as RGB,
  border: [227, 230, 213] as RGB,
  white: [255, 255, 255] as RGB,
  snow: [244, 246, 236] as RGB,
  gold: [227, 178, 60] as RGB,
};

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const PW = 210;
const PH = 297;
const M = 14;
const CW = PW - M * 2;
const PT = 0.3528; // mm por punto tipográfico

/** jsPDF con fuentes estándar solo admite Latin-1: normaliza el resto. */
const t = (s: string | null | undefined) =>
  (s ?? '')
    .replace(/[→⟶➝]/g, '-')
    .replace(/≈/g, 'aprox.')
    .replace(/[−–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/•/g, '·')
    .replace(/[^\x00-\xFF]/g, '');

export async function generateVoucherPdf(b: MyBooking, settings: PaymentSettings | null): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const meta = STATUS_META[b.status] ?? STATUS_META.pendiente_pago;
  const ink = TONE_INK[meta.tone].rgb;
  const paid = b.status === 'confirmada' || b.status === 'completada';
  const cancelled = b.status === 'cancelada';
  const route = parseRoute(b.tour_start_end, b.tour_destination);
  const endDate = addDays(b.tour_date, durationDays(b.tour_duration) - 1);
  const lead = leadPassenger(b);
  const price = priceBreakdown(b);
  const info = b.tour_info ?? {};
  const time = meetingTime(info.meeting);
  const url = voucherUrl(b.code);

  doc.setProperties({
    title: `Voucher ${b.code} · ${b.tour_title}`,
    subject: 'Travel voucher — Homeland Tours',
    author: 'Homeland Tours',
    keywords: `voucher, ${b.code}, bolivia, tour`,
    creator: 'homeland.tours',
  });

  /* ---------------- recursos raster (en paralelo, tolerantes a fallos) ---------------- */
  const [logoWhite, photo, payQr] = await Promise.all([
    svgToPng(logoSvgString('#ffffff', 880), 880, 880 / LOGO_ASPECT),
    imageCover(b.tour_image, 720, 504, { radius: 40 }),
    settings?.qrUrl && !paid && !cancelled ? imageCover(settings.qrUrl, 600, 600, { contain: true, format: 'png' }) : null,
  ]);

  /* ---------------- helpers de dibujo ---------------- */
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const color = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (size: number, style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal', family = 'helvetica') => {
    doc.setFont(family, style);
    doc.setFontSize(size);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GState = (doc as any).GState as new (o: Record<string, number>) => unknown;
  const alpha = (a: number) => doc.setGState(new GState({ opacity: a, 'stroke-opacity': a }));
  const label = (txt: string, x: number, y: number, c: RGB = C.ink5, opts: { align?: 'left' | 'right' | 'center' } = {}) => {
    font(6.4, 'bold');
    color(c);
    doc.text(t(txt).toUpperCase(), x, y, { charSpace: 0.45, align: opts.align });
  };
  const fit = (txt: string, maxW: number) => {
    const s = t(txt);
    if (doc.getTextWidth(s) <= maxW) return s;
    let out = s;
    while (out.length > 1 && doc.getTextWidth(`${out}...`) > maxW) out = out.slice(0, -1);
    return `${out.trimEnd()}...`;
  };

  /** Traza un path SVG (M L H V C Z absolutos) transformado a mm. */
  const trace = (d: string, ox: number, oy: number, s: number) => {
    const tokens = d.match(/[MLHVCZ]|-?\d*\.?\d+/gi) ?? [];
    let i = 0;
    let cmd = '';
    let cx = 0;
    let cy = 0;
    const X = (x: number) => ox + x * s;
    const Y = (y: number) => oy + y * s;
    while (i < tokens.length) {
      const tok = tokens[i];
      if (/^[MLHVCZ]$/i.test(tok)) {
        cmd = tok.toUpperCase();
        i++;
        if (cmd === 'Z') doc.close();
        continue;
      }
      const n = (k: number) => parseFloat(tokens[i + k]);
      if (cmd === 'M') {
        cx = n(0);
        cy = n(1);
        doc.moveTo(X(cx), Y(cy));
        i += 2;
        cmd = 'L';
      } else if (cmd === 'L') {
        cx = n(0);
        cy = n(1);
        doc.lineTo(X(cx), Y(cy));
        i += 2;
      } else if (cmd === 'H') {
        cx = n(0);
        doc.lineTo(X(cx), Y(cy));
        i += 1;
      } else if (cmd === 'V') {
        cy = n(0);
        doc.lineTo(X(cx), Y(cy));
        i += 1;
      } else if (cmd === 'C') {
        doc.curveTo(X(n(0)), Y(n(1)), X(n(2)), Y(n(3)), X(n(4)), Y(n(5)));
        cx = n(4);
        cy = n(5);
        i += 6;
      } else {
        i++;
      }
    }
  };
  const fillPath = (d: string, c: RGB, ox = 0, oy = 0, s = 1) => {
    fill(c);
    trace(d, ox, oy, s);
    doc.fill();
  };

  const aguayo = (x: number, y: number, w: number, h: number) => {
    const s = h / 14;
    const tile = 28 * s;
    doc.saveGraphicsState();
    doc.rect(x, y, w, h, null);
    doc.clip();
    doc.discardPath();
    fill(hex(AGUAYO.navy));
    doc.rect(x, y, w, h, 'F');
    fill(hex(AGUAYO.red));
    doc.rect(x, y, w, 1.6 * s, 'F');
    doc.rect(x, y + 12.4 * s, w, 1.6 * s, 'F');
    fill(hex(AGUAYO.gold));
    doc.rect(x, y + 1.6 * s, w, 1.3 * s, 'F');
    doc.rect(x, y + 11.1 * s, w, 1.3 * s, 'F');
    for (let tx = x; tx < x + w + tile; tx += tile) {
      fillPath('M14 3.6L20.2 7L14 10.4L7.8 7Z', hex(AGUAYO.orange), tx, y, s);
      fillPath('M14 5.4L17 7L14 8.6L11 7Z', hex(AGUAYO.cream), tx, y, s);
      fillPath('M0 5L2.8 7L0 9L-2.8 7Z', hex(AGUAYO.teal), tx, y, s);
    }
    doc.restoreGraphicsState();
  };

  const sectionTitle = (txt: string, x: number, y: number) => {
    fillPath('M0 -1.6L1.6 0L0 1.6L-1.6 0Z', hex(AGUAYO.orange), x + 1.6, y - 1.2, 1);
    font(8.5, 'bold');
    color(C.g900);
    doc.text(t(txt).toUpperCase(), x + 5, y, { charSpace: 0.35 });
  };

  /* ---------------- sello de goma vectorial ---------------- */
  const stamp = (cx: number, cy: number, r: number) => {
    const th = (-12 * Math.PI) / 180;
    const rot = (x: number, y: number): [number, number] => [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)];
    const at = (x: number, y: number): [number, number] => {
      const [rx, ry] = rot(x, y);
      return [cx + rx, cy + ry];
    };
    const angleOf = (vx: number, vy: number) => (-Math.atan2(vy, vx) * 180) / Math.PI;

    // respaldo blanco (sobre la foto)
    alpha(0.9);
    fill(C.white);
    doc.circle(cx, cy, r + 1.6, 'F');
    alpha(0.92);
    stroke(ink);
    fill(ink);
    color(ink);
    doc.setLineWidth(r * 0.055);
    doc.circle(cx, cy, r, 'S');
    doc.setLineWidth(0.22);
    doc.circle(cx, cy, r * 0.9, 'S');
    doc.circle(cx, cy, r * 0.55, 'S');

    const ring = (txt: string, radius: number, top: boolean, size: number) => {
      font(size, 'bold');
      const chars = [...t(txt)];
      const gap = size * PT * 0.18;
      const widths = chars.map((ch) => doc.getTextWidth(ch));
      const L = widths.reduce((a, w) => a + w, 0) + gap * (chars.length - 1);
      let acc = 0;
      chars.forEach((ch, i) => {
        const mid = (acc + widths[i] / 2) / radius;
        const a = top ? -Math.PI / 2 - L / radius / 2 + mid : Math.PI / 2 + L / radius / 2 - mid;
        const px = radius * Math.cos(a);
        const py = radius * Math.sin(a);
        const tx = top ? -Math.sin(a) : Math.sin(a);
        const ty = top ? Math.cos(a) : -Math.cos(a);
        const [sx, sy] = at(px - tx * (widths[i] / 2), py - ty * (widths[i] / 2));
        const [rtx, rty] = rot(tx, ty);
        doc.text(ch, sx, sy, { angle: angleOf(rtx, rty) });
        acc += widths[i] + gap;
      });
    };
    ring('HOMELAND TOURS', r * 0.7, true, r * 0.4);
    ring(`BOLIVIA · ${new Date(b.created_at).getFullYear()}`, r * 0.79, false, r * 0.36);

    const star = (lx: number, ly: number, sr: number) => {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? sr * 0.45 : sr;
        return at(lx + Math.cos(a) * rr, ly + Math.sin(a) * rr);
      });
      doc.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach(([x, y]) => doc.lineTo(x, y));
      doc.close();
      doc.fill();
    };
    star(-r * 0.68, r * 0.36, r * 0.05);
    star(r * 0.68, r * 0.36, r * 0.05);

    // banda central
    const bw = r * 0.96;
    const bh = r * 0.22;
    const corners = [at(-bw, -bh), at(bw, -bh), at(bw, bh), at(-bw, bh)];
    fill(C.white);
    doc.setLineWidth(r * 0.04);
    doc.moveTo(corners[0][0], corners[0][1]);
    corners.slice(1).forEach(([x, y]) => doc.lineTo(x, y));
    doc.close();
    doc.fillStroke();

    const centered = (txt: string, ly: number, size: number, style: 'bold' | 'normal' = 'bold') => {
      font(size, style);
      const s = t(txt);
      const w = doc.getTextWidth(s);
      const [sx, sy] = at(-w / 2, ly + size * PT * 0.35);
      doc.text(s, sx, sy, { angle: 12 });
    };
    fill(ink);
    font(10, 'bold');
    const labelSize = Math.min((r * 0.3) / (0.7 * PT), (10 * (bw * 1.7)) / doc.getTextWidth(meta.stamp));
    centered(meta.stamp, 0, labelSize);
    centered(fmtDate(b.created_at.slice(0, 10)).toUpperCase(), -r * 0.36, r * 0.34);
    centered(meta.stampSub, r * 0.38, r * 0.28);
    alpha(1);
  };

  /* ---------------- pie y cabeceras de páginas siguientes ---------------- */
  const miniHeader = () => {
    fill(C.g900);
    doc.rect(0, 0, PW, 22, 'F');
    if (logoWhite) doc.addImage(logoWhite, 'PNG', M, 3.6, 22, 22 / LOGO_ASPECT);
    label('Información del viaje', PW - M, 10, C.g300, { align: 'right' });
    font(11, 'bold', 'courier');
    color(C.white);
    doc.text(b.code, PW - M, 16, { align: 'right' });
    aguayo(0, 22, PW, 3.2);
  };

  /* ================================================================
     PÁGINA 1 — VOUCHER
     ================================================================ */

  /* Cielo con degradado por franjas */
  const BAND = 58;
  const steps = 22;
  for (let i = 0; i < steps; i++) {
    const k = i / (steps - 1);
    const mix = (a: number, z: number) => Math.round(a + (z - a) * k * k);
    doc.setFillColor(mix(22, 117), mix(29, 140), mix(12, 70));
    doc.rect(0, (BAND / steps) * i, PW, BAND / steps + 0.3, 'F');
  }

  doc.saveGraphicsState();
  doc.rect(0, 0, PW, BAND, null);
  doc.clip();
  doc.discardPath();

  // curvas de nivel
  alpha(0.22);
  stroke(C.g300);
  doc.setLineWidth(0.18);
  topoRings({ count: 7, cx: 128, cy: 62, r0: 13, step: 8.5, sx: 1.7, sy: 0.75, seed: 3 }).forEach((d) => {
    trace(d, 0, 0, 1);
    doc.stroke();
  });
  // sol
  alpha(0.1);
  fill(C.gold);
  doc.circle(150, 40, 19, 'F');
  alpha(0.16);
  doc.circle(150, 40, 12.5, 'F');
  alpha(0.95);
  fill([243, 210, 122]);
  doc.circle(150, 40, 7.5, 'F');
  alpha(1);

  // cordilleras
  const farPts = ridgePoints(ALTIPLANO, { width: PW, base: BAND, amp: 19 });
  const backPts = ridgePoints(CORDILLERA, { x: -8, width: PW + 16, base: BAND, amp: 23 });
  const frontPts = ridgePoints(ILLIMANI, { x: 40, width: PW - 30, base: BAND + 1, amp: 29 });
  alpha(0.7);
  fillPath(areaPath(farPts, BAND + 2), C.g500);
  alpha(1);
  fillPath(areaPath(backPts, BAND + 2), C.g800);
  snowCaps(CORDILLERA, backPts, 0.84, 0.26).forEach((d) => {
    alpha(0.75);
    fillPath(d, C.g100);
  });
  alpha(1);
  fillPath(areaPath(frontPts, BAND + 2), C.g900);
  snowCaps(ILLIMANI, frontPts, 0.76, 0.3).forEach((d) => fillPath(d, C.snow));
  doc.restoreGraphicsState();

  // logo + documento
  if (logoWhite) doc.addImage(logoWhite, 'PNG', M, 7, 32, 32 / LOGO_ASPECT);
  else {
    font(16, 'bold');
    color(C.white);
    doc.text('HOMELAND.TOURS', M, 20);
  }
  label('Travel voucher · Nº', PW - M, 14, C.g300, { align: 'right' });
  font(19, 'bold', 'courier');
  color(C.white);
  doc.text(b.code, PW - M, 23, { align: 'right' });

  // pastilla de estado
  font(7.2, 'bold');
  const pill = t(meta.label).toUpperCase();
  const pw = doc.getTextWidth(pill) + 9;
  fill(ink);
  doc.roundedRect(PW - M - pw, 27, pw, 6, 3, 3, 'F');
  fill(C.white);
  doc.circle(PW - M - pw + 3.4, 30, 0.9, 'F');
  color(C.white);
  doc.text(pill, PW - M - 2.6, 31.2, { align: 'right', charSpace: 0.3 });

  aguayo(0, BAND, PW, 4.6);

  /* Título + foto */
  let y = BAND + 13;
  label('Tu experiencia', M, y, C.g600);
  y += 7.5;
  font(19, 'bold', 'times');
  color(C.g900);
  const titleLines = doc.splitTextToSize(t(b.tour_title), 112) as string[];
  doc.text(titleLines, M, y, { lineHeightFactor: 1.08 });
  y += titleLines.length * 7.4;

  font(9.2);
  color(C.ink5);
  fillPath(PIN_PATH, C.gbg, M + 1.6, y + 0.4, 0.17);
  doc.text(t(b.tour_destination || route.highlight), M + 4.6, y);
  y += 6;

  // chips
  const chips = [
    b.tour_duration,
    `Tour ${TOUR_TYPE_LABEL[b.tour_type]?.toLowerCase() ?? ''}`,
    b.tour_max_altitude ? `Altitud ${b.tour_max_altitude}` : '',
    b.tour_difficulty ? `Dificultad ${(DIFFICULTY_LABEL[b.tour_difficulty] ?? b.tour_difficulty).toLowerCase()}` : '',
  ].filter(Boolean);
  let cxp = M;
  font(7.2, 'bold');
  chips.forEach((c) => {
    const s = t(c);
    const w = doc.getTextWidth(s) + 6;
    if (cxp + w > M + 116) {
      cxp = M;
      y += 7.5;
    }
    fill(C.g50);
    stroke(C.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(cxp, y - 4, w, 6, 3, 3, 'FD');
    color(C.g700);
    doc.text(s, cxp + 3, y);
    cxp += w + 2;
  });
  y += 4;

  const photoY = BAND + 9;
  if (photo) {
    doc.addImage(photo, 'JPEG', 136, photoY, 60, 42);
  } else {
    fill(C.g100);
    doc.roundedRect(136, photoY, 60, 42, 3.4, 3.4, 'F');
  }
  stamp(184, photoY + 33, 14);

  /* Banda de ruta */
  y = Math.max(y, photoY + 42) + 7;
  const RY = y;
  const RH = 31;
  fill(C.g50);
  stroke(C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, RY, CW, RH, 3.5, 3.5, 'FD');

  const stopBlock = (dStr: string, city: string, extra: string | null, align: 'left' | 'right', title: string) => {
    const x = align === 'left' ? M + 7 : PW - M - 7;
    const p = dateParts(dStr);
    label(title, x, RY + 7, C.ink5, { align });
    font(25, 'bold', 'times');
    color(C.g900);
    const dayW = doc.getTextWidth(p.day);
    doc.text(p.day, x, RY + 18, { align });
    font(8, 'bold');
    color(C.g700);
    const mx = align === 'left' ? x + dayW + 2 : x - dayW - 2;
    doc.text(`${p.month} ${p.year}`, mx, RY + 13.6, { align });
    font(7.2);
    color(C.ink5);
    doc.text(p.weekday, mx, RY + 17.6, { align });
    font(8.2, 'bold');
    color(C.ink7);
    doc.text(fit(city, 50) + (extra ? `  ·  ${extra}` : ''), x, RY + 25, { align });
  };
  stopBlock(b.tour_date, route.origin, time, 'left', 'Salida');
  stopBlock(endDate, route.end, null, 'right', 'Regreso');

  // arco de ruta con colinas, pines y 4x4
  const ax0 = 72;
  const ax1 = 138;
  const aBase = RY + 22;
  alpha(0.9);
  fillPath(areaPath(ridgePoints(CORDILLERA, { x: ax0 + 6, width: ax1 - ax0 - 12, base: aBase + 1.5, amp: 9 }), aBase + 2), C.g100);
  alpha(1);
  stroke(C.gbg);
  doc.setLineWidth(0.55);
  doc.setLineDashPattern([0.2, 1.4], 0);
  doc.setLineCap('round');
  doc.moveTo(ax0, aBase);
  doc.curveTo(ax0 + 12, aBase - 13, ax1 - 12, aBase - 13, ax1, aBase);
  doc.stroke();
  doc.setLineDashPattern([], 0);
  doc.setLineCap('butt');
  fillPath(PIN_PATH, C.g700, ax0, aBase, 0.22);
  fillPath(PIN_PATH, C.g700, ax1, aBase, 0.22);
  fill(C.white);
  doc.circle(ax0, aBase - 2.8, 0.7, 'F');
  doc.circle(ax1, aBase - 2.8, 0.7, 'F');
  // jeep en la cumbre del arco
  const js = 0.3;
  const jx = (ax0 + ax1) / 2 - 14 * js;
  const jy = aBase - 9.75 - 13.4 * js;
  fillPath(JEEP.body, C.g700, jx, jy, js);
  fillPath(JEEP.windows, C.g100, jx, jy, js);
  JEEP.wheels.forEach(([wx, wy]) => {
    fill(C.ink9);
    doc.circle(jx + wx * js, jy + wy * js, 2.7 * js, 'F');
    fill(C.g300);
    doc.circle(jx + wx * js, jy + wy * js, 1 * js, 'F');
  });
  font(7.6, 'bold');
  color(C.g700);
  doc.text(fit(route.highlight, 60), (ax0 + ax1) / 2, RY + 6.4, { align: 'center' });
  font(7);
  color(C.ink5);
  doc.text(t(b.tour_duration), (ax0 + ax1) / 2, RY + 28, { align: 'center' });

  /* Datos clave */
  y = RY + RH + 5;
  const facts: Array<[string, string, string]> = [
    ['Titular', lead?.name ?? '-', [lead?.doc, lead?.country].filter(Boolean).join(' · ') || 'Datos a completar'],
    ['Pasajeros', `${b.pax} adulto${b.pax === 1 ? '' : 's'}`, `Tour ${TOUR_TYPE_LABEL[b.tour_type]?.toLowerCase() ?? ''}`],
    ['Emitido', fmtDate(b.created_at.slice(0, 10)), new Date(b.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + ' hs'],
    ['Estado', meta.label, paid && b.paid_at ? `Pagado el ${fmtDate(b.paid_at.slice(0, 10))}` : `Pago por ${b.payment_method === 'qr' ? 'QR' : 'enlace'}`],
  ];
  const fw = (CW - 3 * 3) / 4;
  facts.forEach(([k, v, s], i) => {
    const x = M + i * (fw + 3);
    stroke(C.border);
    fill(C.white);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, fw, 17, 2.4, 2.4, 'FD');
    label(k, x + 3.5, y + 5.2);
    font(9.4, 'bold');
    color(i === 3 ? ink : C.g900);
    doc.text(fit(v, fw - 7), x + 3.5, y + 10.4);
    font(6.8);
    color(C.ink5);
    doc.text(fit(s, fw - 7), x + 3.5, y + 14.2);
  });
  y += 17 + 9;

  /* Pasajeros */
  sectionTitle(`Pasajeros (${b.pax})`, M, y);
  const missing = Math.max(0, b.pax - b.passengers.length);
  autoTable(doc, {
    startY: y + 3,
    margin: { left: M, right: M, top: 34, bottom: 22 },
    head: [['#', 'Nombre completo', 'Documento', 'País', 'Alimentación', 'Rol']],
    body: [
      ...b.passengers.map((p, i) => [
        String(i + 1).padStart(2, '0'),
        t(p.name),
        t(p.doc) || '-',
        t(p.country) || '-',
        t(p.meal) || 'Normal',
        p.is_lead ? 'Titular' : 'Acompañante',
      ]),
      ...(missing > 0 ? [['+', `${missing} pasajero${missing > 1 ? 's' : ''} sin datos registrados`, '-', '-', '-', '-']] : []),
    ],
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.4, cellPadding: { top: 2.4, bottom: 2.4, left: 2.6, right: 2.6 }, textColor: C.ink7, lineColor: C.border },
    headStyles: { fillColor: C.g900, textColor: C.white, fontStyle: 'bold', fontSize: 7, cellPadding: { top: 2.6, bottom: 2.6, left: 2.6, right: 2.6 } },
    alternateRowStyles: { fillColor: C.g50 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', textColor: C.ink4, font: 'courier', fontStyle: 'bold' },
      1: { fontStyle: 'bold', textColor: C.g900 },
      5: { cellWidth: 24 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5 && data.cell.raw === 'Titular') {
        data.cell.styles.textColor = C.g600;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.section === 'body' && missing > 0 && data.row.index === b.passengers.length) {
        data.cell.styles.fontStyle = 'italic';
        data.cell.styles.textColor = C.ink4;
      }
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY ?? y + 20) + 7;

  /* ---------------- Franja de check-in: QR · código · total ---------------- */
  const SH = 44;
  if (y + SH > PH - 22) {
    doc.addPage();
    y = 36;
  }
  fill(C.white);
  stroke(C.g300);
  doc.setLineWidth(0.35);
  doc.setLineDashPattern([1.2, 1], 0);
  doc.roundedRect(M, y, CW, SH, 3.5, 3.5, 'FD');
  doc.setLineDashPattern([], 0);

  // QR vectorial (corridas horizontales → pocos rectángulos)
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const qs = 34;
  const ms = qs / n;
  const q0x = M + 5;
  const q0y = y + (SH - qs) / 2;
  fill(C.g900);
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (qr.modules.get(r, c)) {
        let run = 1;
        while (c + run < n && qr.modules.get(r, c + run)) run++;
        doc.rect(q0x + c * ms, q0y + r * ms, run * ms + 0.02, ms + 0.02, 'F');
        c += run;
      } else c++;
    }
  }
  doc.link(q0x, q0y, qs, qs, { url });

  // datos de check-in
  const cx0 = q0x + qs + 7;
  label('Check-in · pase de abordaje', cx0, y + 8, C.g600);
  font(17, 'bold', 'courier');
  color(C.g900);
  doc.text(b.code, cx0, y + 16.5);
  font(7.8);
  color(C.ink7);
  doc.text('Mostrá este código (impreso o en el celular) en el punto de encuentro.', cx0, y + 22, { maxWidth: 82 });
  font(7.8, 'bold');
  color(C.g700);
  doc.text(t(`Presentarse: ${time ?? 'hora a confirmar'} · ${route.origin}`), cx0, y + 30, { maxWidth: 82 });
  font(7.4);
  color(C.g600);
  doc.textWithLink('Ver voucher en línea', cx0, y + 35.5, { url });
  // código de barras
  const bars = barcodeBars(b.code, 220);
  const bw = 70;
  const bs = bw / 220;
  fill(C.ink9);
  bars.forEach(([x, w]) => doc.rect(cx0 + x * bs, y + 37.5, w * bs, 3.6, 'F'));

  // total destacado
  const tw = 50;
  const tx = PW - M - tw - 4;
  fill(C.g900);
  doc.roundedRect(tx, y + 4, tw, SH - 8, 3, 3, 'F');
  aguayo(tx, y + 4, tw, 2.2);
  label(paid ? 'Total pagado' : cancelled ? 'Total' : 'Total a pagar', tx + tw / 2, y + 12, C.g300, { align: 'center' });
  font(19, 'bold', 'times');
  color(C.white);
  doc.text(t(money(price.total)), tx + tw / 2, y + 21.5, { align: 'center' });
  font(7.2);
  color(C.g300);
  doc.text(t(`aprox. ${bob(price.total)}`), tx + tw / 2, y + 26.5, { align: 'center' });
  font(7, 'bold');
  const st = t(meta.label).toUpperCase();
  const sw = doc.getTextWidth(st) + 7;
  fill(ink);
  doc.roundedRect(tx + (tw - sw) / 2, y + 29.5, sw, 5.4, 2.7, 2.7, 'F');
  color(C.white);
  doc.text(st, tx + tw / 2, y + 33.2, { align: 'center', charSpace: 0.2 });

  /* ================================================================
     PÁGINA 2 — DETALLE E INFORMACIÓN DEL VIAJE
     ================================================================ */
  doc.addPage();
  y = 36;
  const ensure = (h: number) => {
    if (y + h > PH - 24) {
      doc.addPage();
      y = 36;
    }
  };
  const paragraph = (txt: string, x = M + 5, w = CW - 5) => {
    font(8.8);
    color(C.ink7);
    const lines = doc.splitTextToSize(t(txt), w) as string[];
    ensure(lines.length * 4.4 + 2);
    doc.text(lines, x, y, { lineHeightFactor: 1.45 });
    y += lines.length * 4.4 + 2;
  };
  const section = (title: string, body: () => void, minH = 18) => {
    ensure(minH);
    sectionTitle(title, M, y);
    y += 6;
    body();
    y += 5;
  };

  /* Detalle de pago (izq.) + estado del pago (der.) */
  const leftW = 112;
  sectionTitle('Detalle de pago', M, y);
  const rows: string[][] = [
    [`Tarifa ${TOUR_TYPE_LABEL[b.tour_type]?.toLowerCase() ?? ''} · ${b.pax} × ${money(price.perPerson)}`, money(price.base)],
    ...price.paidExtras.map((e) => [`Extra · ${t(e.name)}${e.sub ? ` (${t(e.sub)})` : ''}`, money(e.price)]),
    ...(price.freeExtras.length ? [[`Incluido · ${price.freeExtras.map((e) => t(e.name)).join(', ')}`, 'Sin costo']] : []),
    ...price.onSiteExtras.map((e) => [`En destino · ${t(e.name)}`, `${money(e.price)} *`]),
    ...(price.groupDiscount > 0 ? [['Descuento grupal', `- ${money(price.groupDiscount)}`]] : []),
    ...(price.couponDiscount > 0 ? [[`Cupón ${t(price.couponCode ?? '')}`, `- ${money(price.couponDiscount)}`]] : []),
  ];
  const tableTop = y;
  autoTable(doc, {
    startY: y + 3,
    margin: { left: M, right: PW - M - leftW, top: 34, bottom: 22 },
    tableWidth: leftW,
    body: rows.map((r) => r.map((c) => t(c))),
    foot: [[paid ? 'TOTAL PAGADO (USD)' : 'TOTAL A PAGAR (USD)', money(price.total)]],
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.4, cellPadding: { top: 2.2, bottom: 2.2, left: 2.6, right: 2.6 }, textColor: C.ink7 },
    columnStyles: { 1: { halign: 'right', cellWidth: 34, fontStyle: 'bold', textColor: C.g900 } },
    footStyles: { fillColor: C.g900, textColor: C.white, fontStyle: 'bold', fontSize: 9.6, cellPadding: { top: 3.2, bottom: 3.2, left: 2.6, right: 2.6 } },
    alternateRowStyles: { fillColor: C.g50 },
    didParseCell: (data) => {
      if (data.section === 'foot' && data.column.index === 1) data.cell.styles.halign = 'right';
      if (data.section === 'body' && String(data.cell.raw).startsWith('- ')) data.cell.styles.textColor = C.g600;
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ly = ((doc as any).lastAutoTable?.finalY ?? y + 30) + 5;
  font(7.4);
  color(C.ink5);
  doc.text(t(`Aprox. ${bob(price.total)} · tipo de cambio ${price.rate} BOB/USD`), M, ly);
  if (price.onSiteExtras.length) {
    ly += 4;
    doc.text('* Se abona directamente en destino; no está incluido en el total.', M, ly);
  }

  // columna de pago
  const px = M + leftW + 6;
  const pw2 = PW - M - px;
  let ry = tableTop + 9;
  const kv = (k: string, v: string, c: RGB = C.ink9) => {
    font(6.4, 'bold');
    color(C.ink5);
    doc.text(t(k).toUpperCase(), px + 4, ry, { charSpace: 0.3 });
    font(8.6, 'bold');
    color(c);
    const lines = doc.splitTextToSize(t(v), pw2 - 8) as string[];
    doc.text(lines, px + 4, ry + 4.2);
    ry += 4.2 + lines.length * 3.8 + 3;
  };
  label('Pago', px + 4, ry - 3, C.g600);
  ry += 3;
  kv('Estado', meta.label, ink);
  kv('Modalidad', b.payment_method === 'qr' ? 'QR de pago' : 'Enlace de pago');
  if (paid && b.paid_at) kv('Pagado el', fmtDateLong(b.paid_at.slice(0, 10)));
  if (cancelled && b.cancellation_reason) kv('Motivo', b.cancellation_reason);
  if (!paid && !cancelled) {
    if (settings?.link) {
      font(6.4, 'bold');
      color(C.ink5);
      doc.text('ENLACE DE PAGO', px + 4, ry, { charSpace: 0.3 });
      font(8.2, 'bold');
      color(C.g600);
      doc.textWithLink(fit('Pagar en línea', pw2 - 8), px + 4, ry + 4.2, { url: settings.link });
      ry += 10;
    }
    if (payQr) {
      const s = Math.min(30, pw2 - 8);
      doc.addImage(payQr, 'PNG', px + (pw2 - s) / 2, ry, s, s);
      font(6.4, 'bold');
      color(C.g600);
      doc.text('ESCANEÁ PARA PAGAR', px + pw2 / 2, ry + s + 3.6, { align: 'center', charSpace: 0.2 });
      ry += s + 7;
    }
    if (settings?.instructions) {
      font(7.2);
      color(C.ink7);
      const ins = doc.splitTextToSize(t(settings.instructions), pw2 - 8) as string[];
      doc.text(ins, px + 4, ry + 1, { lineHeightFactor: 1.35 });
      ry += ins.length * 3.4 + 3;
    }
    if (!settings?.link && !payQr) {
      font(7.4);
      color(C.ink5);
      const l = doc.splitTextToSize(t(`Coordiná el pago por WhatsApp al ${SUPPORT_PHONE}.`), pw2 - 8) as string[];
      doc.text(l, px + 4, ry + 1);
      ry += l.length * 3.4 + 3;
    }
  }
  stroke(C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(px, tableTop - 1, pw2, ry - tableTop + 2, 3, 3, 'S');

  y = Math.max(ly, ry) + 8;

  // Punto de encuentro
  section('Punto de encuentro', () => {
    fill(C.g50);
    stroke(C.border);
    doc.setLineWidth(0.3);
    const txt = info.meeting || `${b.tour_start_end || 'A confirmar'}: te enviaremos la dirección exacta por email.`;
    font(9.2, 'bold');
    const lines = doc.splitTextToSize(t(txt), CW - 26) as string[];
    const h = lines.length * 4.6 + 8;
    doc.roundedRect(M, y - 3, CW, h, 3, 3, 'FD');
    fillPath(PIN_PATH, C.gbg, M + 8, y - 3 + h / 2 + 3.2, 0.32);
    fill(C.white);
    doc.circle(M + 8, y - 3 + h / 2 - 0.9, 1, 'F');
    color(C.g900);
    doc.text(lines, M + 16, y + 3, { lineHeightFactor: 1.38 });
    y += h - 2;
  });

  // Qué incluye
  const included = (b.tour_included ?? []).filter(Boolean);
  if (included.length) {
    section('Qué incluye', () => {
      const colW = (CW - 10) / 2;
      const half = Math.ceil(included.length / 2);
      const startY = y;
      let maxY = y;
      included.forEach((item, i) => {
        const col = i < half ? 0 : 1;
        if (i === half) y = startY;
        const x = M + 5 + col * (colW + 6);
        font(8.4);
        const lines = doc.splitTextToSize(t(item), colW - 7) as string[];
        stroke(C.gbg);
        doc.setLineWidth(0.6);
        doc.setLineCap('round');
        doc.moveTo(x, y - 1.2);
        doc.lineTo(x + 1.2, y);
        doc.lineTo(x + 3.2, y - 2.6);
        doc.stroke();
        doc.setLineCap('butt');
        color(C.ink7);
        doc.text(lines, x + 6, y);
        y += lines.length * 4 + 1.4;
        maxY = Math.max(maxY, y);
      });
      y = maxY;
    });
  }

  // Políticas
  if (info.cancellation) section('Política de cancelación', () => paragraph(info.cancellation!));
  if (info.health) section('Salud y altitud', () => paragraph(info.health!));
  if (info.transport) section('Transporte', () => paragraph(info.transport!));

  // Próximos pasos
  section(
    'Próximos pasos',
    () => {
      const stepsList: Array<[string, string]> = [
        [paid ? 'Pago recibido' : 'Completá el pago', paid ? 'Tu operadora ya registró el pago.' : 'Con el enlace o el QR de pago de este voucher.'],
        ['Confirmación', 'Te avisamos por email cuando la reserva pase a "Confirmada".'],
        ['Recordatorio', 'Recibís un aviso antes de la fecha del tour.'],
        ['Check-in', 'Presentá el QR de este voucher en el punto de encuentro.'],
      ];
      const done = b.status === 'completada' ? 4 : b.status === 'confirmada' ? 2 : 0;
      const sw2 = (CW - 9) / 4;
      stepsList.forEach(([h, p], i) => {
        const x = M + i * (sw2 + 3);
        fill(i < done ? C.g600 : C.g900);
        doc.circle(x + 4, y + 0.6, 3.3, 'F');
        font(8.2, 'bold', 'times');
        color(C.white);
        doc.text(String(i + 1), x + 4, y + 1.9, { align: 'center' });
        font(8, 'bold');
        color(C.g900);
        doc.text(t(h), x + 9.5, y + 1.8, { maxWidth: sw2 - 10 });
        font(7.2);
        color(C.ink5);
        doc.text(doc.splitTextToSize(t(p), sw2 - 2) as string[], x, y + 8.4, { lineHeightFactor: 1.35 });
      });
      y += 18;
    },
    26,
  );

  /* ---------------- cabeceras y pies en todas las páginas ---------------- */
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    if (p > 1) miniHeader();
    aguayo(0, PH - 13, PW, 2.6);
    font(6.8);
    color(C.ink5);
    doc.text(t(`Homeland Tours · Bolivian Tour Operator · ${SUPPORT_PHONE} · homeland.tours`), M, PH - 6.5);
    doc.text(`Página ${p} de ${total}`, PW - M, PH - 6.5, { align: 'right' });
    font(6, 'bold');
    color(C.ink4);
    doc.text(
      t(`Boleta electrónica · No válido como factura · Generado el ${new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}`),
      PW / 2,
      PH - 15.5,
      { align: 'center', charSpace: 0.2 },
    );
  }

  doc.save(`voucher-${b.code}.pdf`);
}
