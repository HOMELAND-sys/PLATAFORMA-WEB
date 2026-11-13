'use client';

import { useSite } from '@/context/SiteContext';
import { primaryPhone, telHref, whatsappUrl } from '@/lib/site';

export default function FormCompanyContact() {
  const { company } = useSite();
  const phone = primaryPhone(company);
  const whatsapp = whatsappUrl(company);
  return (
    <div className="aside-contact">
      {company.email && <p><a className="aside-link" href={`mailto:${company.email}`}>{company.email}</a></p>}
      {phone && <p><a className="aside-link" href={telHref(phone)}>{phone}</a></p>}
      {whatsapp && <p><a className="aside-link" href={whatsapp} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a></p>}
      <p>Recibimos tu solicitud a través de este formulario. Nuestro equipo revisará los detalles y se pondrá en contacto contigo.</p>
    </div>
  );
}
