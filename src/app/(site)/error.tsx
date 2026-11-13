'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import StatePage from '@/components/layout/StatePage';
import Icon from '@/components/ui/Icon';

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatePage
      title="Algo no salió bien"
      text="No pudimos cargar esta página. Suele resolverse al intentarlo de nuevo; si el problema sigue, vuelve en unos minutos."
    >
      <button className="btn btn--primary" type="button" onClick={() => reset()}>
        <Icon name="refresh" size={16} /> Intentar de nuevo
      </button>
      <Link className="btn btn--ghost" href="/">
        Ir al inicio
      </Link>
    </StatePage>
  );
}
