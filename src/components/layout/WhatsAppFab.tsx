'use client';

import Icon from '@/components/ui/Icon';
import { useSite } from '@/context/SiteContext';
import { whatsappUrl } from '@/lib/site';

/** Botón flotante de WhatsApp. Solo aparece cuando la empresa cargó su número. */
export default function WhatsAppFab() {
  const { company } = useSite();
  const url = whatsappUrl(company, 'Hola, quisiera información sobre sus tours.');
  if (!url) return null;
  return (
    <a
      className="fab-whatsapp"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chatea con nosotros por WhatsApp"
    >
      <Icon name="whatsapp" size={28} />
    </a>
  );
}
