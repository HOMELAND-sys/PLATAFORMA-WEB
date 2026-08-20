'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { BookingResult, BookingSelection } from '@/lib/types';

const STORAGE_KEY = 'homeland-booking';

interface BookingContextValue {
  selection: BookingSelection | null;
  result: BookingResult | null;
  setSelection: (sel: BookingSelection | null) => void;
  setResult: (res: BookingResult | null) => void;
  clear: () => void;
}

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [selection, setSelectionState] = useState<BookingSelection | null>(null);
  const [result, setResultState] = useState<BookingResult | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { selection: BookingSelection | null; result: BookingResult | null };
        setSelectionState(parsed.selection ?? null);
        setResultState(parsed.result ?? null);
      }
    } catch {
      // localStorage no disponible o JSON inválido: ignorar
    }
  }, []);

  const persist = useCallback(
    (sel: BookingSelection | null, res: BookingResult | null) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ selection: sel, result: res }));
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

  const clear = useCallback(() => {
    setSelectionState(null);
    setResultState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <BookingContext.Provider value={{ selection, result, setSelection, setResult, clear }}>
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
