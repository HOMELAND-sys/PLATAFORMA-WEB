import type { CSSProperties, ReactNode } from 'react';

/* ============================================================
   Homeland Icons — sistema de iconos propio de Homeland Tours
   Grilla 24×24 · trazo redondeado · capa duotono (`tone`)
   La capa tono usa currentColor con opacidad baja; se puede
   personalizar con las variables CSS --hi-tone y --hi-tone-opacity.
   ============================================================ */

interface Glyph {
  /** Capa de relleno suave (duotono). */
  t?: ReactNode;
  /** Capa de trazo principal. */
  l?: ReactNode;
  /** Icono sólido (relleno completo, sin trazo). */
  s?: ReactNode;
}

const DOT = { strokeWidth: 2.4 } as const;

const STAR =
  'M12 3.2 14.53 8.92 20.75 9.56 16.09 13.73 17.41 19.84 12 16.7 6.59 19.84 7.91 13.73 3.25 9.56 9.47 8.92Z';
const GEAR =
  'M10.54 5.15 10.6 2.81h2.8l.06 2.34a7 7 0 0 1 2.35.98l1.7-1.62 1.98 1.98-1.62 1.7a7 7 0 0 1 .98 2.35l2.34.06v2.8l-2.34.06a7 7 0 0 1-.98 2.35l1.62 1.7-1.98 1.98-1.7-1.62a7 7 0 0 1-2.35.98l-.06 2.34h-2.8l-.06-2.34a7 7 0 0 1-2.35-.98l-1.7 1.62-1.98-1.98 1.62-1.7a7 7 0 0 1-.98-2.35l-2.34-.06v-2.8l2.34-.06a7 7 0 0 1 .98-2.35l-1.62-1.7 1.98-1.98 1.7 1.62a7 7 0 0 1 2.35-.98Z';
const ROSETTE =
  'M12 3.8a3.4 3.4 0 0 1 5.8 2.4 3.4 3.4 0 0 1 2.4 5.8 3.4 3.4 0 0 1-2.4 5.8 3.4 3.4 0 0 1-5.8 2.4 3.4 3.4 0 0 1-5.8-2.4A3.4 3.4 0 0 1 3.8 12a3.4 3.4 0 0 1 2.4-5.8A3.4 3.4 0 0 1 12 3.8Z';
const HEART =
  'M12 20.2c-3-1.9-8.5-5.6-8.5-10.6A4.6 4.6 0 0 1 8.1 5c1.6 0 3 .8 3.9 2.1A4.7 4.7 0 0 1 15.9 5a4.6 4.6 0 0 1 4.6 4.6c0 5-5.5 8.7-8.5 10.6Z';
const PIN = 'M12 21.2s-6.8-5.7-6.8-11.4a6.8 6.8 0 1 1 13.6 0c0 5.7-6.8 11.4-6.8 11.4Z';
const SHIELD = 'M12 3 5 5.9v5.3c0 4.4 2.9 8.1 7 9.8 4.1-1.7 7-5.4 7-9.8V5.9L12 3Z';
const BUBBLE =
  'M20 11.6c0 4.1-3.6 7.4-8 7.4-1.25 0-2.45-.27-3.5-.74L4 19.6l1.3-3.7A7.1 7.1 0 0 1 4 11.6C4 7.5 7.6 4.2 12 4.2s8 3.3 8 7.4Z';
const TICKET =
  'M3.5 8A1.5 1.5 0 0 1 5 6.5h14A1.5 1.5 0 0 1 20.5 8v2.3a1.8 1.8 0 0 0 0 3.4V16a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 16v-2.3a1.8 1.8 0 0 0 0-3.4V8Z';
const TAG =
  'M3.5 5v6.1c0 .53.21 1.04.59 1.41l7.9 7.9a2 2 0 0 0 2.82 0l5.6-5.6a2 2 0 0 0 0-2.82l-7.9-7.9A2 2 0 0 0 11.1 3.5H5A1.5 1.5 0 0 0 3.5 5Z';
const PHONE =
  'M8.6 3.8H6a2 2 0 0 0-2 2.1A15.6 15.6 0 0 0 18.1 20a2 2 0 0 0 2.1-2v-2.6a1 1 0 0 0-.7-1l-3.2-1.1a1 1 0 0 0-1.1.3l-1.3 1.6a12 12 0 0 1-5.1-5.1l1.6-1.3a1 1 0 0 0 .3-1.1L9.6 4.5a1 1 0 0 0-1-.7Z';
const BAG =
  'M5.5 8.5h13l-.85 10.6a1.6 1.6 0 0 1-1.6 1.4H7.95a1.6 1.6 0 0 1-1.6-1.4L5.5 8.5Z';
const MOUNTAIN = 'M2.5 19.5 9.5 6.5l4 7.2 2.5-3.2 5.5 9Z';
const PLANE =
  'M12 2.8c.95 0 1.55.95 1.55 2.1V9.6l6.95 4.1v1.85l-6.95-2v4.4l2.15 1.65v1.6L12 20.4l-3.7.8v-1.6l2.15-1.65v-4.4l-6.95 2V13.7l6.95-4.1V4.9c0-1.15.6-2.1 1.55-2.1Z';
const SPARKLE = 'M11 3.5c.6 4.3 2.7 6.4 7 7-4.3.6-6.4 2.7-7 7-.6-4.3-2.7-6.4-7-7 4.3-.6 6.4-2.7 7-7Z';
const LEAF = 'M6.2 17.8C4.6 10.6 9.6 4.4 20 4c-.4 10.4-6.6 15.4-13.8 13.8Z';
const LLAMA =
  'M3.5 7.4c0-1.1.8-1.9 1.9-1.9h.9l.3-2.9 1 2 1-1.7.3 2.7c.4.5.6 1.1.6 1.8v3.1h8c1.4 0 2.5 1 2.5 2.4 0 .9-.4 1.7-1 2.2v5.4h-1.6l-.3-4h-6.2l-.3 4H9v-5c-1.5-.6-2.5-2-2.5-3.7v-3H4.9c-.8 0-1.4-.6-1.4-1.4Z';
const WHATSAPP =
  'M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 4.9L2 22l5.3-1.4c1.4.7 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.5 0-3-.4-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3C4 14.7 3.5 13.4 3.5 12c0-4.7 3.8-8.5 8.5-8.5s8.5 3.8 8.5 8.5-3.8 8.5-8.5 8.5z';

const ICONS = {
  /* ---------- Navegación / UI ---------- */
  'arrow-right': { l: <path d="M4.5 12h14.5M13.5 6.5 19 12l-5.5 5.5" /> },
  'arrow-left': { l: <path d="M19.5 12H5M10.5 6.5 5 12l5.5 5.5" /> },
  'arrow-up': { l: <path d="M12 19.5V5M6.5 10.5 12 5l5.5 5.5" /> },
  'arrow-down': { l: <path d="M12 4.5V19M6.5 13.5 12 19l5.5-5.5" /> },
  'chevron-down': { l: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" /> },
  'chevron-up': { l: <path d="m6.5 14.5 5.5-5.5 5.5 5.5" /> },
  'chevron-left': { l: <path d="m14.5 6-6 6 6 6" /> },
  'chevron-right': { l: <path d="m9.5 6 6 6-6 6" /> },
  close: { l: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /> },
  menu: { l: <path d="M4 7h16M4 12h16M4 17h10" /> },
  plus: { l: <path d="M12 5v14M5 12h14" /> },
  minus: { l: <path d="M5 12h14" /> },
  check: { l: <path d="m5 12.5 4.5 4.5L19 7.5" /> },
  more: {
    s: (
      <>
        <circle cx="12" cy="5.5" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="12" cy="18.5" r="1.6" />
      </>
    ),
  },
  external: {
    t: <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />,
    l: <path d="M13.5 4.5h6v6M19.5 4.5 11 13M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />,
  },
  search: {
    t: <circle cx="10.5" cy="10.5" r="6.5" />,
    l: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.4 15.4 4.6 4.6M7.6 9.4a3.2 3.2 0 0 1 2.2-2.1" />
      </>
    ),
  },
  filter: {
    t: (
      <>
        <circle cx="15" cy="7" r="2.2" />
        <circle cx="9" cy="17" r="2.2" />
      </>
    ),
    l: (
      <>
        <path d="M4 7h8.8M17.2 7H20M4 17h2.8M11.2 17H20" />
        <circle cx="15" cy="7" r="2.2" />
        <circle cx="9" cy="17" r="2.2" />
      </>
    ),
  },
  globe: {
    t: <circle cx="12" cy="12" r="9" />,
    l: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 9h17M3.5 15h17" />
        <path d="M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" />
      </>
    ),
  },
  heart: {
    t: <path d={HEART} />,
    l: (
      <>
        <path d={HEART} />
        <path d="M7.3 8.3a1.9 1.9 0 0 1 1.5-1" />
      </>
    ),
  },
  user: {
    t: <circle cx="12" cy="8" r="3.8" />,
    l: (
      <>
        <circle cx="12" cy="8" r="3.8" />
        <path d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6" />
      </>
    ),
  },
  users: {
    t: <circle cx="9.5" cy="8.5" r="3.3" />,
    l: (
      <>
        <circle cx="9.5" cy="8.5" r="3.3" />
        <path d="M3.5 19.5c.7-3.1 3-5 6-5s5.3 1.9 6 5M15.2 5.4a3.3 3.3 0 0 1 0 6.2M17.6 14.7c1.6.7 2.6 2.4 2.9 4.8" />
      </>
    ),
  },
  bag: {
    t: <path d={BAG} />,
    l: (
      <>
        <path d={BAG} />
        <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
      </>
    ),
  },
  ticket: {
    t: <path d={TICKET} />,
    l: (
      <>
        <path d={TICKET} />
        <path d="M15 7.6v1.3M15 11.35v1.3M15 15.1v1.3" />
      </>
    ),
  },
  settings: {
    t: <circle cx="12" cy="12" r="7" />,
    l: (
      <>
        <path d={GEAR} />
        <circle cx="12" cy="12" r="2.8" />
      </>
    ),
  },
  logout: {
    t: <path d="M4.5 6.5a2 2 0 0 1 2-2H10v15H6.5a2 2 0 0 1-2-2v-11Z" />,
    l: <path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10M15 8l4 4-4 4M19 12H9.5" />,
  },
  home: {
    t: <path d="M4 10.6 12 4l8 6.6V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19v-8.4Z" />,
    l: (
      <path d="M4 10.6 12 4l8 6.6V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.5H5.5A1.5 1.5 0 0 1 4 19v-8.4Z" />
    ),
  },
  share: {
    t: <path d="M8.5 10.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5a2 2 0 0 0-2-2h-1.5" />,
    l: <path d="M12 14V3.5M8 7.5l4-4 4 4M8.5 10.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5a2 2 0 0 0-2-2h-1.5" />,
  },
  download: {
    l: <path d="M12 4v10.5M7.5 10l4.5 4.5 4.5-4.5M4.5 15.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2.5" />,
  },
  upload: {
    l: <path d="M12 14.5V4M7.5 8.5 12 4l4.5 4.5M4.5 15.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2.5" />,
  },
  send: {
    t: <path d="M20.5 3.5 3.5 10.3l6.9 3.2 3.2 6.9 6.9-16.9Z" />,
    l: <path d="M20.5 3.5 3.5 10.3l6.9 3.2 3.2 6.9 6.9-16.9ZM10.4 13.5 15 8.9" />,
  },
  refresh: {
    l: <path d="M20 12a8 8 0 1 1-8-8c2.24 0 4.38.9 5.99 2.43L20 8.5M20 4v4.5h-4.5" />,
  },
  'rotate-ccw': {
    l: <path d="M4 12a8 8 0 1 0 8-8c-2.24 0-4.38.9-5.99 2.43L4 8.5M4 4v4.5h4.5" />,
  },
  'check-circle': {
    t: <circle cx="12" cy="12" r="9" />,
    l: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.3 12.3 2.5 2.5 4.9-5.2" />
      </>
    ),
  },
  'x-circle': {
    t: <circle cx="12" cy="12" r="9" />,
    l: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6" />
      </>
    ),
  },
  info: {
    t: <circle cx="12" cy="12" r="9" />,
    l: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5.3" />
        <path d="M12 7.9h.01" {...DOT} />
      </>
    ),
  },
  alert: {
    t: <circle cx="12" cy="12" r="9" />,
    l: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.7V13" />
        <path d="M12 16.3h.01" {...DOT} />
      </>
    ),
  },
  warning: {
    t: <path d="M10.3 4.4 2.9 17.5a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0Z" />,
    l: (
      <>
        <path d="M10.3 4.4 2.9 17.5a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0ZM12 9.5v4" />
        <path d="M12 17h.01" {...DOT} />
      </>
    ),
  },
  eye: {
    t: <circle cx="12" cy="12" r="3" />,
    l: (
      <>
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  copy: {
    t: <rect x="8.5" y="8.5" width="12" height="12" rx="2.2" />,
    l: (
      <>
        <rect x="8.5" y="8.5" width="12" height="12" rx="2.2" />
        <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
      </>
    ),
  },
  power: { l: <path d="M12 3v8.5M7.2 6.2a7.5 7.5 0 1 0 9.6 0" /> },
  save: {
    t: <path d="M7 20.5v-6.5h10v6.5Z" />,
    l: (
      <path d="M5 3.5h11.2l4.3 4.3V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5ZM7.5 3.5V8H15V3.5M7 20.5v-6.5h10v6.5" />
    ),
  },
  trash: {
    t: <path d="M6 6.5l.9 12.6a1.5 1.5 0 0 0 1.5 1.4h7.2a1.5 1.5 0 0 0 1.5-1.4L18 6.5Z" />,
    l: (
      <path d="M4 6.5h16M9 6.5v-2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 6.5l.9 12.6a1.5 1.5 0 0 0 1.5 1.4h7.2a1.5 1.5 0 0 0 1.5-1.4L18 6.5M10 10.5v6M14 10.5v6" />
    ),
  },
  bell: {
    t: <path d="M18 10.5a6 6 0 0 0-12 0c0 5-2.5 6.5-2.5 6.5h17S18 15.5 18 10.5Z" />,
    l: <path d="M18 10.5a6 6 0 0 0-12 0c0 5-2.5 6.5-2.5 6.5h17S18 15.5 18 10.5ZM10.2 20a2 2 0 0 0 3.6 0" />,
  },
  document: {
    t: <path d="M14 3.5v5h5Z" />,
    l: (
      <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L14 3.5ZM14 3.5v5h5M8.5 13h7M8.5 16.5h5" />
    ),
  },
  clipboard: {
    t: <rect x="5" y="4.5" width="14" height="16.5" rx="2.2" />,
    l: (
      <>
        <rect x="5" y="4.5" width="14" height="16.5" rx="2.2" />
        <path d="M9 4.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1ZM9 13l2.2 2.2 4-4.2" />
      </>
    ),
  },

  /* ---------- Comercio / contacto ---------- */
  tag: {
    t: <path d={TAG} />,
    l: (
      <>
        <path d={TAG} />
        <circle cx="8" cy="8" r="1.6" />
      </>
    ),
  },
  discount: {
    t: <path d={ROSETTE} />,
    l: (
      <>
        <path d={ROSETTE} />
        <path d="m9.5 14.5 5-5" />
        <path d="M9.6 9.6h.01M14.4 14.4h.01" {...DOT} />
      </>
    ),
  },
  card: {
    t: <path d="M2.5 9.5h19v-2A2.5 2.5 0 0 0 19 5H5a2.5 2.5 0 0 0-2.5 2.5Z" />,
    l: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
        <path d="M2.5 9.5h19M6 15h3.5M13 15h1.5" />
      </>
    ),
  },
  money: {
    t: <circle cx="12" cy="12" r="2.6" />,
    l: (
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M6 9.5h.01M18 14.5h.01" {...DOT} />
      </>
    ),
  },
  qr: {
    t: (
      <>
        <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5" />
      </>
    ),
    l: (
      <>
        <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5" />
        <path d="M14 14h2.5v2.5M20.5 14v.01M14 20.5h3M20.5 17.5v3" />
      </>
    ),
  },
  phone: { t: <path d={PHONE} />, l: <path d={PHONE} /> },
  mobile: {
    t: <rect x="6.5" y="2.5" width="11" height="19" rx="2.6" />,
    l: (
      <>
        <rect x="6.5" y="2.5" width="11" height="19" rx="2.6" />
        <path d="M10.5 5.5h3M11 18.3h2" />
      </>
    ),
  },
  mail: {
    t: <rect x="3" y="5" width="18" height="14" rx="2.5" />,
    l: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m3.8 7.3 8.2 5.9 8.2-5.9" />
      </>
    ),
  },
  chat: {
    t: <path d={BUBBLE} />,
    l: (
      <>
        <path d={BUBBLE} />
        <path d="M8.5 11.7h.01M12 11.7h.01M15.5 11.7h.01" {...DOT} />
      </>
    ),
  },
  whatsapp: { s: <path d={WHATSAPP} /> },
  lock: {
    t: <rect x="5" y="10.5" width="14" height="10" rx="2.5" />,
    l: (
      <>
        <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
        <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5V17" />
      </>
    ),
  },
  'shield-check': {
    t: <path d={SHIELD} />,
    l: (
      <>
        <path d={SHIELD} />
        <path d="m9.1 12.1 2.1 2.1 3.9-4.1" />
      </>
    ),
  },
  'badge-check': {
    t: <path d={ROSETTE} />,
    l: (
      <>
        <path d={ROSETTE} />
        <path d="m8.8 12.2 2.2 2.2 4.3-4.6" />
      </>
    ),
  },
  star: { t: <path d={STAR} />, l: <path d={STAR} /> },
  'star-solid': { s: <path d={STAR} strokeLinejoin="round" stroke="currentColor" strokeWidth={1.4} /> },
  award: {
    t: <circle cx="12" cy="9.2" r="5.7" />,
    l: (
      <>
        <circle cx="12" cy="9.2" r="5.7" />
        <path d="M8.7 13.9 7.5 21l4.5-2.6 4.5 2.6-1.2-7.1" />
        <path d="m12 6.6.85 1.7 1.85.27-1.35 1.3.32 1.85L12 10.85l-1.67.87.32-1.85-1.35-1.3 1.85-.27Z" />
      </>
    ),
  },
  sparkle: {
    t: <path d={SPARKLE} />,
    l: (
      <>
        <path d={SPARKLE} />
        <path d="M18.5 14.5c.25 1.6.95 2.3 2.5 2.5-1.55.2-2.25.9-2.5 2.5-.25-1.6-.95-2.3-2.5-2.5 1.55-.2 2.25-.9 2.5-2.5Z" />
      </>
    ),
  },

  /* ---------- Tiempo / planificación ---------- */
  clock: {
    t: <circle cx="12" cy="12" r="8.8" />,
    l: (
      <>
        <circle cx="12" cy="12" r="8.8" />
        <path d="M12 7.2V12l3.2 1.9" />
      </>
    ),
  },
  calendar: {
    t: <path d="M3.5 9.5v-2A2.5 2.5 0 0 1 6 5h12a2.5 2.5 0 0 1 2.5 2.5v2Z" />,
    l: (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4" />
        <path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01" {...DOT} />
      </>
    ),
  },

  /* ---------- Viaje / Bolivia ---------- */
  pin: {
    t: <path d={PIN} />,
    l: (
      <>
        <path d={PIN} />
        <circle cx="12" cy="9.8" r="2.5" />
      </>
    ),
  },
  compass: {
    t: <path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1Z" />,
    l: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1ZM12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21" />
      </>
    ),
  },
  route: {
    t: (
      <>
        <circle cx="6" cy="18" r="2.2" />
        <path d="M18 9.4s-2.6-2.1-2.6-4.3a2.6 2.6 0 1 1 5.2 0c0 2.2-2.6 4.3-2.6 4.3Z" />
      </>
    ),
    l: (
      <>
        <circle cx="6" cy="18" r="2.2" />
        <path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h4.2" />
        <path d="M18 9.4s-2.6-2.1-2.6-4.3a2.6 2.6 0 1 1 5.2 0c0 2.2-2.6 4.3-2.6 4.3Z" />
      </>
    ),
  },
  map: {
    t: <path d="m9 4.5 6 2.1v13l-6-2.1Z" />,
    l: <path d="M9 4.5 3.5 6.6v13L9 17.5l6 2.1 5.5-2.1v-13L15 6.6 9 4.5ZM9 4.5v13M15 6.6v13" />,
  },
  plane: {
    t: <path d={PLANE} transform="rotate(45 12 12)" />,
    l: <path d={PLANE} transform="rotate(45 12 12)" />,
  },
  mountain: {
    t: <path d={MOUNTAIN} />,
    l: <path d={`${MOUNTAIN}M7.35 10.5l1.15 1 1-1 1.1.9 1.1-.9`} />,
  },
  altitude: {
    t: <path d="M2.5 20 10 8.5l3.6 6 2.6-3.3L21.5 20Z" />,
    l: <path d="M2.5 20 10 8.5l3.6 6 2.6-3.3L21.5 20ZM10 8.5V3.2l4.2 1.7L10 6.6" />,
  },
  sun: {
    t: <circle cx="12" cy="12" r="4.2" />,
    l: (
      <>
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 5.4V2.6M16.67 7.33l1.6-1.6M18.6 12h2.8M16.67 16.67l1.6 1.6M12 18.6v2.8M7.33 16.67l-1.6 1.6M5.4 12H2.6M7.33 7.33l-1.6-1.6" />
      </>
    ),
  },
  backpack: {
    t: <path d="M9.5 20.5V16a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v4.5Z" />,
    l: (
      <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0V19a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 19V9.5ZM9.5 4.6V4a2.5 2.5 0 0 1 5 0v.6M9.5 20.5V16a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v4.5M6.5 12h11" />
    ),
  },
  bed: {
    t: <path d="M10.5 10h7.5a3 3 0 0 1 3 3v1.5H10.5Z" />,
    l: (
      <>
        <path d="M3 18.5V6M3 14.5h18v4M10.5 14.5V10h7.5a3 3 0 0 1 3 3v1.5" />
        <circle cx="6.8" cy="11.3" r="1.8" />
      </>
    ),
  },
  meal: {
    t: <path d="M17.5 3c-2.1 1.4-3.2 4-3.2 7v3.5h3.2Z" />,
    l: <path d="M6.5 3v5a2.5 2.5 0 0 0 5 0V3M9 3v18M17.5 21V3c-2.1 1.4-3.2 4-3.2 7v3.5h3.2" />,
  },
  leaf: {
    t: <path d={LEAF} />,
    l: <path d={`${LEAF}M3.5 20.5l2.7-2.7M6.2 17.8 15 9M10.2 13.8l-.5-3.3M12.9 11.1l3 .4`} />,
  },
  /** Teleférico de La Paz */
  'cable-car': {
    t: <path d="M6.5 13.5v-2.2a2.8 2.8 0 0 1 2.8-2.8h5.4a2.8 2.8 0 0 1 2.8 2.8v2.2Z" />,
    l: (
      <>
        <path d="M3 6.5 21 3.5M12 5v3.5" />
        <rect x="6.5" y="8.5" width="11" height="11.5" rx="2.8" />
        <path d="M6.5 13.5h11M12 8.5v5M9.5 17h5" />
      </>
    ),
  },
  /** Salar de Uyuni — efecto espejo */
  'salt-flat': {
    t: <path d="M5 13l3.5-4.5 2.5 3 2.5-4 4.5 5.5Z" />,
    l: (
      <>
        <path d="M2.5 13h19M5 13l3.5-4.5 2.5 3 2.5-4L18 13" />
        <path d="M5 13l3.5 4.5 2.5-3 2.5 4L18 13" opacity=".45" />
        <circle cx="18.5" cy="5.5" r="1.7" />
      </>
    ),
  },
  /** Amazonía */
  palm: {
    t: <path d="M7 21c1.5-1.4 3.4-2 5.5-2s4 .6 5.5 2Z" />,
    l: (
      <path d="M12.6 21c-.4-4 .1-7.6 1.4-10.5M14 10.5c-1.8-2.8-5-3.9-9-3M14 10.5c-3-.6-6 .5-7.8 3.5M14 10.5c1-3.2 3.6-5.2 7-5.2M14 10.5c3-.4 5.6 1 6.8 4M14 10.5c-.4-2.8.6-5.3 2.6-7M7 21h11" />
    ),
  },
  /** Puerta del Sol — Tiwanaku */
  gate: {
    t: <path d="M4.5 9V5.5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1V9Z" />,
    l: (
      <>
        <path d="M3 20.5h18M4.5 20.5v-15a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1v15M9.5 20.5V13a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v7.5M4.5 9h15" />
        <rect x="10.9" y="5.7" width="2.2" height="2.2" rx=".5" />
        <path d="M7 6.8h.01M17 6.8h.01" {...DOT} />
      </>
    ),
  },
  llama: {
    t: <path d={LLAMA} />,
    l: (
      <>
        <path d={LLAMA} />
        <path d="M19.8 11.7c.8-.1 1.3-.7 1.3-1.5" />
        <path d="M7.4 7h.01" {...DOT} />
      </>
    ),
  },

  /* ---------- Admin / datos ---------- */
  dashboard: {
    t: <rect x="3.5" y="3.5" width="7.5" height="9" rx="2" />,
    l: (
      <>
        <rect x="3.5" y="3.5" width="7.5" height="9" rx="2" />
        <rect x="13" y="3.5" width="7.5" height="5.5" rx="2" />
        <rect x="13" y="11" width="7.5" height="9.5" rx="2" />
        <rect x="3.5" y="14.5" width="7.5" height="6" rx="2" />
      </>
    ),
  },
  chart: {
    t: <rect x="10.25" y="6" width="3.5" height="11.5" rx="1.2" />,
    l: (
      <>
        <path d="M4 20.5h16" />
        <rect x="5" y="11" width="3.5" height="6.5" rx="1.2" />
        <rect x="10.25" y="6" width="3.5" height="11.5" rx="1.2" />
        <rect x="15.5" y="9" width="3.5" height="8.5" rx="1.2" />
      </>
    ),
  },
  trend: { l: <path d="m3.5 16.5 5.5-5.5 4 4 7-7.5M15 7.5h5v5" /> },
  occupancy: {
    t: <path d="M14 2.6V10h7.4A7.5 7.5 0 0 0 14 2.6Z" />,
    l: <path d="M11 3.6A8.5 8.5 0 1 0 20.4 13H11V3.6ZM14 2.6V10h7.4A7.5 7.5 0 0 0 14 2.6Z" />,
  },
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export function isIconName(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}

/** Grosor de trazo óptico según el tamaño renderizado. */
function opticalStroke(size: number) {
  if (size <= 14) return 2;
  if (size <= 17) return 1.85;
  if (size <= 21) return 1.7;
  if (size <= 26) return 1.55;
  return 1.45;
}

export interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  /** Muestra la capa duotono (por defecto true). */
  tone?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export default function Icon({ name, size = 20, strokeWidth, tone = true, className, style, title }: IconProps) {
  const glyph: Glyph = ICONS[name];
  const sw = strokeWidth ?? opticalStroke(size);
  const cls = `hi hi--${name}${className ? ` ${className}` : ''}`;
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true as const };

  return (
    <svg
      className={cls}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      focusable="false"
      {...a11y}
    >
      {title && <title>{title}</title>}
      {glyph.s && (
        <g className="hi-solid" fill="currentColor" stroke="none">
          {glyph.s}
        </g>
      )}
      {tone && glyph.t && (
        <g className="hi-tone" fill="currentColor" stroke="none" opacity={0.16}>
          {glyph.t}
        </g>
      )}
      {glyph.l && <g className="hi-line">{glyph.l}</g>}
    </svg>
  );
}
