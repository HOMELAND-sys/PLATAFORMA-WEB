import { getSupabase } from '@/lib/supabase';

export type ContactSource = 'customize' | 'business';
export interface ContactRequest {
  id: string;
  source: ContactSource;
  full_name: string;
  email: string;
  phone: string;
  details: Record<string, string>;
  status: 'new' | 'contacted';
  created_at: string;
}

export const CONTACT_FIELDS: Record<string, string> = {
  country: 'País', city: 'Ciudad', passengers: 'Viajeros', days: 'Días de viaje',
  start_date: 'Fecha de inicio', alternative_date: 'Fecha alternativa', end_date: 'Fecha de regreso',
  interests: 'Intereses', hotel: 'Alojamiento', message: 'Mensaje', tour_type: 'Modalidad',
  company: 'Empresa', address: 'Dirección', province: 'Departamento / provincia',
  postal_code: 'Código postal', meeting_date: 'Fecha de reunión solicitada', meeting_time: 'Hora (La Paz)',
};

export async function submitContactRequest(source: ContactSource, form: FormData): Promise<void> {
  const value = (key: string) => String(form.get(key) ?? '').trim();
  const email = value('email').toLowerCase();
  const fullName = `${value('first_name')} ${value('last_name')}`.trim();
  const phone = `${value('phone_code')} ${value('phone')}`.trim();
  if (value('website')) throw new Error('No se pudo enviar la consulta.');
  if (fullName.length < 2 || fullName.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    throw new Error('Revisa tu nombre y correo electrónico.');
  }
  if (phone.replace(/\D/g, '').length < 7 || phone.length > 40) throw new Error('Revisa tu número de teléfono.');
  if (source === 'customize') {
    if (email !== value('confirm_email').toLowerCase()) throw new Error('Los correos electrónicos no coinciden.');
    if (value('end_date') < value('start_date')) throw new Error('La fecha de regreso debe ser igual o posterior al inicio.');
  }
  const details: Record<string, string> = {};
  for (const key of Object.keys(CONTACT_FIELDS)) {
    const text = value(key);
    if (text.length > 2000) throw new Error('El mensaje es demasiado largo; usa hasta 2000 caracteres por campo.');
    if (text) details[key] = text;
  }
  if (JSON.stringify(details).length > 6000) throw new Error('La consulta es demasiado larga. Reduce el mensaje e intenta de nuevo.');
  const { error } = await getSupabase().from('contact_requests').insert({ source, full_name: fullName, email, phone, details });
  if (error) {
    if (error.message.includes('contact_rate_limit')) throw new Error('Ya recibimos una consulta reciente de este correo. Espera un minuto antes de enviar otra.');
    throw new Error('No se pudo guardar tu consulta. Intenta de nuevo en unos minutos.');
  }
}

export async function listContactRequests(): Promise<ContactRequest[]> {
  const { data, error } = await getSupabase().from('contact_requests').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as ContactRequest[];
}

export async function setContactStatus(id: string, status: ContactRequest['status']): Promise<void> {
  const { data, error } = await getSupabase().from('contact_requests').update({ status }).eq('id', id).select('id').single();
  if (error || !data) throw error ?? new Error('No se pudo actualizar la consulta.');
  window.dispatchEvent(new Event('admin-data-changed'));
}
