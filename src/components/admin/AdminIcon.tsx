import type { ReactNode } from 'react';

const paths: Record<string, ReactNode> = {
  dashboard: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-7h6v7" /></>,
  tours: <><path d="m9 4 6 3 6-3v16l-6 3-6-3-6 3V7l6-3Z" /><path d="M9 4v16m6-13v16" /><circle cx="9" cy="8" r="2.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18m-13 4h.01m4 0h.01m4 0h.01M8 18h.01m4 0h.01" /></>,
  ticket: <><path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6V5Z" /><path d="M9 9h6m-6 4h6m-6 3h4" /></>,
  users: <><circle cx="9" cy="7" r="3" /><path d="M3 20v-3a5 5 0 0 1 10 0v3H3Zm12-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 4 5v2h-5" /></>,
  chart: <><path d="M3 21h18M5 17V9h4v8m3 0V3h4v14m3 0v-5h3v5" /></>,
  settings: <><path d="m10 3-1 3-3-1-2 3 2 2-1 3-2 1 1 4 3 .2 2 2-.1 2h4l1-2 3-1 2 1 2-3-2-2 1-3 2-1-1-4-3-.2-2-2V3Z" /><circle cx="12" cy="12" r="3" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4m-2-19v2" /></>,
  chevron: <path d="m8 10 4 4 4-4" />,
  logout: <><path d="M9 4H4v16h5m5-12 5 4-5 4m-6-4h11" /></>,
  external: <><path d="M14 3h7v7m0-7L10 14" /><path d="M10 4H4v16h16v-6" /></>,
  money: <><path d="m9 3 3 2 3-2 1 3-2 3c5 4 7 7 5 10-2 3-12 3-14 0-2-3 0-6 5-10L8 6l1-3Z" /><path d="M14 12c-4-2-5 3-2 3s2 5-2 3m2-7v8" /></>,
  occupancy: <><path d="M10 3a9 9 0 1 0 11 11H10V3Z" /><path d="M14 2v8h8a9 9 0 0 0-8-8Z" /></>,
  tag: <><path d="M3 4h9l9 9-8 8-10-9V4Z" /><circle cx="8" cy="9" r="1.5" /></>,
  discount: <><circle cx="12" cy="12" r="9" /><path d="m12 6 2 4 4 .5-3 3 .7 4.5-3.7-2-3.7 2 .7-4.5-3-3 4-.5 2-4Z" /></>,
  arrow: <path d="M4 12h16m-5-5 5 5-5 5" />,
  up: <path d="M12 20V4m-5 5 5-5 5 5" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1" /></>,
};

export default function AdminIcon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.dashboard}</svg>;
}
