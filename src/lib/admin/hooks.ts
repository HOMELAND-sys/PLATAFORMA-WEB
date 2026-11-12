'use client';
import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { messageOf } from './core';
export function useAdminData<T>(loader: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const current = useRef(loader);
  current.current = loader;
  const reload = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true); setError('');
    try { const value = await current.current(); if (id === seq.current) setData(value); }
    catch (err) { if (id === seq.current) setError(messageOf(err)); }
    finally { if (id === seq.current) setLoading(false); }
  }, []);
  useEffect(() => { setData(null); void reload(); return () => { seq.current++; }; }, [...deps, reload]);
  return { data, error, loading, reload };
}
