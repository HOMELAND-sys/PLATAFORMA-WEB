'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_SITE, type SiteSettings } from '@/lib/site';

const SiteContext = createContext<SiteSettings>(DEFAULT_SITE);

/** Datos de empresa y políticas leídos en el servidor (layout del sitio). */
export function SiteProvider({ value, children }: { value: SiteSettings; children: ReactNode }) {
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteSettings {
  return useContext(SiteContext);
}
