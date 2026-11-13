'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { BookingSelection } from '@/lib/types';

const STORAGE_KEY = 'homeland-booking';

// Resultado de una reserva real: el código único es la clave para leer
// la reserva (y su voucher) en la base. Después de la creación, la base es
// la única fuente de verdad (sección 10).
export interface BookingResult {
  code: string;
  reservationId: string;
  createdAt: string;
}

interface BookingContextValue {
  selection: BookingSelection | null;
  result: BookingResult | null;
  hydrated: boolean;
  setSelection: (sel: BookingSelection | null) => void;
  setResult: (res: BookingResult | null) => void;
  clear: () => void;
  /** Vacía el carrito tras una reserva confirmada, conservando el resultado. */
  clearCart: () => void;
}

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [selection, setSelectionState] = useState<BookingSelection | null>(null);
  const [result, setResultState] = useState<BookingResult | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { selection: BookingSelection | null; result: BookingResult | null };
        setSelectionState(parsed.selection ?? null);
        setResultState(parsed.result ?? null);
      }
    } catch {
      // sessionStorage no disponible o JSON inválido: ignorar
    }
    setHydrated(true);
  }, []);

  const persist = useCallback(
    (sel: BookingSelection | null, res: BookingResult | null) => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ selection: sel, result: res }));
      } catch {
        // sin persistencia disponible
      }
    },
    [],
  );

  const setSelection = useCallback(
    (sel: BookingSelection | null) => {
      setSelectionState(sel);
      persist(sel, result);
    },
    [result, persist],
  );

  const setResult = useCallback(
    (res: BookingResult | null) => {
      setResultState(res);
      persist(selection, res);
    },
    [selection, persist],
  );

  const clearCart = useCallback(() => {
    setSelectionState(null);
    persist(null, result);
  }, [result, persist]);

  const clear = useCallback(() => {
    setSelectionState(null);
    setResultState(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <BookingContext.Provider value={{ selection, result, hydrated, setSelection, setResult, clear, clearCart }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error('useBooking debe usarse dentro de <BookingProvider>');
  }
  return ctx;
}
