'use client';

import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  fetchReportBookings,
  fetchReportClients,
  fetchReportSales,
  type ReportBookings,
  type ReportClients,
  type ReportSales,
} from '@/lib/api';
import { getSupabase } from '@/lib/supabase';

type ReportType = 'ventas' | 'reservas' | 'clientes';

const REPORT_TYPES: { id: ReportType; label: string; hint: string }[] = [
  { id: 'ventas', label: 'Ventas', hint: 'Reservas, pax, ingresos confirmados y cancelaciones, por tour y por mes.' },
  { id: 'reservas', label: 'Reservas', hint: 'Listado completo de reservas creadas en el rango, filtrable por estado.' },
  { id: 'clientes', label: 'Clientes', hint: 'Cuentas registradas en el rango y gasto por cliente.' },
];

const STATUS_LABELS: Record<string, string> = {
  pendiente_pago: 'Pendiente de pago',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

const TOUR_TYPE_LABELS: Record<string, string> = {
  group: 'Compartido',
  semi: 'Semiprivado',
  private: 'Privado',
};

const GREEN_DARK: [number, number, number] = [13, 31, 22];
const GREEN: [number, number, number] = [117, 149, 62];
const LOGO_URL = '/assets/full_square_transparent_customcolor%20(2).png';

function isoDay(d: Date): string {
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return isoDay(d);
}

function usd(n: number): string {
  return `US$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDay(d: string): string {
  return new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Logo rasterizado sobre blanco (aplana la transparencia para jsPDF).
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const img = new Image();
    img.src = LOGO_URL;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function drawPageChrome(
  doc: jsPDF,
  logo: string | null,
  title: string,
  periodLabel: string,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoSize = 18;
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 14, 8, logoSize, logoSize);
    } catch {
      /* el reporte no depende del logo */
    }
  }
  const textX = logo ? 14 + logoSize + 4 : 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...GREEN_DARK);
  doc.text('HOMELAND.TOURS', textX, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(92, 102, 96);
  doc.text('Bolivian Tour Operator', textX, 21);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...GREEN_DARK);
  doc.text(title, pageWidth - 14, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(92, 102, 96);
  doc.text(periodLabel, pageWidth - 14, 21, { align: 'right' });
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.6);
  doc.line(14, 25, pageWidth - 14, 25);
  return 32;
}

function stampFooter(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 146, 141);
    doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, 14, pageHeight - 8);
    doc.text(`Página ${i} de ${total}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }
}

function buildSalesPdf(data: ReportSales, logo: string | null): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const title = 'Reporte de Ventas';
  const periodLabel = `Período: ${fmtDay(data.from)} – ${fmtDay(data.to)} · Ingresos = reservas confirmadas/completadas`;
  let startY = drawPageChrome(doc, logo, title, periodLabel);

  autoTable(doc, {
    startY,
    head: [['Tour', 'Reservas', 'Pax', 'Ingresos confirmados', 'Cancelaciones']],
    body: data.tours.map((t) => [
      t.tour_title,
      t.reservations,
      t.pax,
      usd(t.revenue),
      t.cancellations,
    ]),
    foot: [
      [
        'TOTAL',
        data.totals.reservations,
        data.totals.pax,
        usd(data.totals.revenue),
        data.totals.cancellations,
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: GREEN_DARK, fontSize: 8.5 },
    footStyles: { fillColor: [230, 239, 227], textColor: GREEN_DARK, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { top: 32, bottom: 16 },
  });

  startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...GREEN_DARK);
  doc.text('Evolución por mes', 14, startY);
  startY += 4;

  autoTable(doc, {
    startY,
    head: [['Mes', 'Reservas', 'Pax', 'Ingresos confirmados', 'Cancelaciones']],
    body: data.months.map((m) => [
      m.month,
      m.reservations,
      m.pax,
      usd(m.revenue),
      m.cancellations,
    ]),
    foot: [
      [
        'TOTAL',
        data.totals.reservations,
        data.totals.pax,
        usd(data.totals.revenue),
        data.totals.cancellations,
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: GREEN, fontSize: 8.5 },
    footStyles: { fillColor: [230, 239, 227], textColor: GREEN_DARK, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { top: 32, bottom: 16 },
  });

  stampFooter(doc);
  return doc;
}

function buildBookingsPdf(data: ReportBookings, logo: string | null): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const statusLabel = data.status ? ` · Estado: ${STATUS_LABELS[data.status] ?? data.status}` : '';
  const title = 'Reporte de Reservas';
  const periodLabel = `Creadas entre ${fmtDay(data.from)} y ${fmtDay(data.to)}${statusLabel}`;
  let startY = drawPageChrome(doc, logo, title, periodLabel);

  autoTable(doc, {
    startY,
    head: [['Código', 'Creada', 'Cliente', 'Email', 'Tour', 'Fecha tour', 'Tipo', 'Pax', 'Total', 'Estado']],
    body: data.rows.map((r) => [
      r.code,
      fmtDateTime(r.created_at),
      r.client_name || '—',
      r.client_email || '—',
      r.tour_title,
      fmtDay(r.tour_date),
      TOUR_TYPE_LABELS[r.tour_type] ?? r.tour_type,
      r.pax,
      usd(r.total),
      STATUS_LABELS[r.status] ?? r.status,
    ]),
    foot: [
      [
        'TOTAL',
        `${data.totals.reservations} reservas`,
        '',
        '',
        '',
        '',
        '',
        data.totals.pax,
        usd(data.totals.grand_total),
        `Ingresos: ${usd(data.totals.revenue)}`,
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: GREEN_DARK, fontSize: 8 },
    footStyles: { fillColor: [230, 239, 227], textColor: GREEN_DARK, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 1.6 },
    columnStyles: { 7: { halign: 'right' }, 8: { halign: 'right' } },
    margin: { top: 32, bottom: 16 },
  });

  stampFooter(doc);
  return doc;
}

function buildClientsPdf(data: ReportClients, logo: string | null): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const rangeLabel =
    data.from && data.to ? `Registrados entre ${fmtDay(data.from)} y ${fmtDay(data.to)}` : 'Todos los clientes registrados';
  const title = 'Reporte de Clientes';
  let startY = drawPageChrome(doc, logo, title, rangeLabel);

  autoTable(doc, {
    startY,
    head: [['Cliente', 'Email', 'Registro', 'Reservas', 'Total gastado']],
    body: data.rows.map((r) => [
      r.full_name || 'Sin nombre',
      r.email || '—',
      fmtDateTime(r.created_at),
      r.reservations_count,
      usd(r.total_spent),
    ]),
    foot: [['TOTAL', `${data.totals.clients} clientes`, '', data.totals.reservations, usd(data.totals.revenue)]],
    theme: 'striped',
    headStyles: { fillColor: GREEN_DARK, fontSize: 8.5 },
    footStyles: { fillColor: [230, 239, 227], textColor: GREEN_DARK, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
    margin: { top: 32, bottom: 16 },
  });

  stampFooter(doc);
  return doc;
}

// ---------------------------------------------------------------------------
// CSV (mismos datos, ; como separador + BOM para Excel en español)
// ---------------------------------------------------------------------------

function toCsv(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = `${v}`;
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `\ufeff${rows.map((r) => r.map(esc).join(';')).join('\n')}`;
}

function downloadBlob(content: string | Blob, filename: string, type = 'text/csv;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsTab() {
  const [type, setType] = useState<ReportType>('ventas');
  const [from, setFrom] = useState(daysAgo(89));
  const [to, setTo] = useState(daysAgo(0));
  const [status, setStatus] = useState('');
  const [includeAllClients, setIncludeAllClients] = useState(true);
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  useEffect(() => {
    setOkMsg('');
    setError('');
  }, [type, from, to, status]);

  const generate = async (format: 'pdf' | 'csv') => {
    setBusy(format);
    setError('');
    setOkMsg('');
    try {
      const sb = getSupabase();
      const range = { from, to };
      const suffix = `${from}_a_${to}`;
      const logo = format === 'pdf' ? await loadLogoDataUrl() : null;

      if (type === 'ventas') {
        const data = await fetchReportSales(sb, range.from, range.to);
        if (format === 'pdf') {
          buildSalesPdf(data, logo).save(`homeland-reporte-ventas-${suffix}.pdf`);
        } else {
          const rows: (string | number)[][] = [
            ['Reporte de Ventas', `Período: ${from} a ${to}`],
            [],
            ['Ingresos confirmados = reservas confirmadas/completadas'],
            [],
            ['Por tour', 'Reservas', 'Pax', 'Ingresos', 'Cancelaciones'],
            ...data.tours.map((t) => [t.tour_title, t.reservations, t.pax, usd(t.revenue), t.cancellations]),
            ['TOTAL', data.totals.reservations, data.totals.pax, usd(data.totals.revenue), data.totals.cancellations],
            [],
            ['Por mes', 'Reservas', 'Pax', 'Ingresos', 'Cancelaciones'],
            ...data.months.map((m) => [m.month, m.reservations, m.pax, usd(m.revenue), m.cancellations]),
            ['TOTAL', data.totals.reservations, data.totals.pax, usd(data.totals.revenue), data.totals.cancellations],
          ];
          downloadBlob(toCsv(rows), `homeland-reporte-ventas-${suffix}.csv`);
        }
        setOkMsg(`Reporte de ventas generado: ${data.totals.reservations} reservas en el rango.`);
      } else if (type === 'reservas') {
        const data = await fetchReportBookings(sb, range.from, range.to, status || null);
        if (format === 'pdf') {
          buildBookingsPdf(data, logo).save(`homeland-reporte-reservas-${suffix}.pdf`);
        } else {
          const rows: (string | number)[][] = [
            ['Reporte de Reservas', `Creadas entre ${from} y ${to}${status ? ` · Estado: ${STATUS_LABELS[status]}` : ''}`],
            [],
            ['Código', 'Creada', 'Cliente', 'Email', 'Tour', 'Fecha tour', 'Tipo', 'Pax', 'Total', 'Estado'],
            ...data.rows.map((r) => [
              r.code,
              fmtDateTime(r.created_at),
              r.client_name,
              r.client_email,
              r.tour_title,
              r.tour_date,
              TOUR_TYPE_LABELS[r.tour_type] ?? r.tour_type,
              r.pax,
              usd(r.total),
              STATUS_LABELS[r.status] ?? r.status,
            ]),
            ['TOTAL', `${data.totals.reservations} reservas`, '', '', '', '', '', data.totals.pax, usd(data.totals.grand_total), `Ingresos: ${usd(data.totals.revenue)}`],
          ];
          downloadBlob(toCsv(rows), `homeland-reporte-reservas-${suffix}.csv`);
        }
        setOkMsg(`Reporte de reservas generado: ${data.totals.reservations} reservas en el rango.`);
      } else {
        const data = await fetchReportClients(sb, includeAllClients ? null : range.from, includeAllClients ? null : range.to);
        if (format === 'pdf') {
          buildClientsPdf(data, logo).save(`homeland-reporte-clientes-${suffix}.pdf`);
        } else {
          const rows: (string | number)[][] = [
            ['Reporte de Clientes', includeAllClients ? 'Todos los registrados' : `Registrados entre ${from} y ${to}`],
            [],
            ['Cliente', 'Email', 'Registro', 'Reservas', 'Total gastado'],
            ...data.rows.map((r) => [
              r.full_name,
              r.email,
              fmtDateTime(r.created_at),
              r.reservations_count,
              usd(r.total_spent),
            ]),
            ['TOTAL', `${data.totals.clients} clientes`, '', data.totals.reservations, usd(data.totals.revenue)],
          ];
          downloadBlob(toCsv(rows), `homeland-reporte-clientes-${suffix}.csv`);
        }
        setOkMsg(`Reporte de clientes generado: ${data.totals.clients} clientes.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el reporte.');
    } finally {
      setBusy(null);
    }
  };

  const activeHint = REPORT_TYPES.find((r) => r.id === type)?.hint;

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Reportes</h1>
          <p>Genera reportes profesionales en PDF o exporta los mismos datos a CSV.</p>
        </div>
        <div className="admin-header__actions">
          <button className="btn btn--ghost" disabled={busy !== null} onClick={() => void generate('csv')}>
            {busy === 'csv' ? 'Exportando…' : 'Descargar CSV'}
          </button>
          <button className="btn btn--primary" disabled={busy !== null} onClick={() => void generate('pdf')}>
            {busy === 'pdf' ? 'Generando…' : 'Generar PDF'}
          </button>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-form">
          <div className="admin-form__row">
            <div className="af-field">
              <label>Tipo de reporte</label>
              <select value={type} onChange={(e) => setType(e.target.value as ReportType)}>
                {REPORT_TYPES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              {activeHint && <small className="af-hint">{activeHint}</small>}
            </div>
            {type === 'reservas' && (
              <div className="af-field">
                <label>Estado <small>(opcional)</small></label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Todos los estados</option>
                  <option value="pendiente_pago">Pendiente de pago</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            )}
          </div>

          <div className="admin-form__row">
            <div className="af-field">
              <label>Desde</label>
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="af-field">
              <label>Hasta</label>
              <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          {type === 'clientes' && (
            <label className="af-toggle">
              <input
                type="checkbox"
                checked={includeAllClients}
                onChange={(e) => setIncludeAllClients(e.target.checked)}
              />
              Incluir todos los clientes (ignora el rango de fechas)
            </label>
          )}
        </div>
      </div>

      {error && <div className="admin-alert admin-alert--error">{error}</div>}
      {okMsg && <div className="admin-alert admin-alert--ok">{okMsg}</div>}

      <div className="admin-card">
        <h3>¿Qué incluye cada reporte?</h3>
        <ul className="admin-report-help">
          <li>
            <strong>Ventas:</strong> tabla por tour y evolución por mes, con reservas, pax, ingresos
            confirmados (solo pagadas) y cancelaciones, más totales del período.
          </li>
          <li>
            <strong>Reservas:</strong> listado completo con código, cliente, tour, fechas, total y
            estado; totales al pie. Formato apaisado para leer todas las columnas.
          </li>
          <li>
            <strong>Clientes:</strong> cuentas registradas con su nº de reservas y gasto total, más
            totales.
          </li>
        </ul>
        <p className="af-hint">
          Sin datos en el rango, el PDF sale con la tabla vacía y totales en cero.
        </p>
      </div>
    </>
  );
}
