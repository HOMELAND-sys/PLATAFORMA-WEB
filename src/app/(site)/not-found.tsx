import Link from 'next/link';
import StatePage from '@/components/layout/StatePage';
import Icon from '@/components/ui/Icon';

export default function SiteNotFound() {
  return (
    <StatePage
      code="404"
      title="No encontramos esa página"
      text="Puede que el enlace haya cambiado o que el tour ya no esté disponible. Desde aquí puedes volver a explorar."
    >
      <Link className="btn btn--primary" href="/tours">
        Ver todos los tours <Icon name="arrow-right" size={16} />
      </Link>
      <Link className="btn btn--ghost" href="/">
        Ir al inicio
      </Link>
    </StatePage>
  );
}
