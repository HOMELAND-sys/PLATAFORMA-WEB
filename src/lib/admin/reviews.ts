import { allRows, sb } from './core';

export type ReviewStatus = 'pending' | 'published' | 'hidden';
export type ReviewSource = 'web' | 'manual' | 'google' | 'tripadvisor';

export interface AdminReview {
  id: string;
  tour_id: string | null;
  reservation_id: string | null;
  author_name: string;
  author_country: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  source: ReviewSource;
  travel_date: string | null;
  admin_reply: string | null;
  created_at: string;
  published_at: string | null;
  tour: { title: string; slug: string } | null;
  reservation: { code: string } | null;
}

export interface ReviewInput {
  tour_id: string | null;
  author_name: string;
  author_country: string;
  rating: number;
  title: string;
  body: string;
  source: ReviewSource;
  travel_date: string | null;
  status: ReviewStatus;
}

export const REVIEW_SOURCE_LABEL: Record<ReviewSource, string> = {
  web: 'Reserva verificada',
  manual: 'Cargada a mano',
  google: 'Google',
  tripadvisor: 'Tripadvisor',
};

export const reviews = () =>
  allRows<AdminReview>((from, to) =>
    sb()
      .from('reviews')
      .select('*, tour:tours(title, slug), reservation:reservations(code)')
      .order('created_at', { ascending: false })
      .range(from, to),
  );

function changed() {
  window.dispatchEvent(new Event('admin-data-changed'));
}

export async function setReviewStatus(id: string, status: ReviewStatus) {
  const { error } = await sb().from('reviews').update({ status }).eq('id', id).select('id').single();
  if (error) throw error;
  changed();
}

export async function setReviewReply(id: string, reply: string) {
  const { error } = await sb()
    .from('reviews')
    .update({ admin_reply: reply.trim() || null })
    .eq('id', id)
    .select('id')
    .single();
  if (error) throw error;
}

export async function createReview(input: ReviewInput) {
  const { error } = await sb()
    .from('reviews')
    .insert({
      ...input,
      author_name: input.author_name.trim(),
      author_country: input.author_country.trim(),
      title: input.title.trim(),
      body: input.body.trim(),
    })
    .select('id')
    .single();
  if (error) throw error;
  changed();
}

export async function deleteReview(id: string) {
  const { error } = await sb().from('reviews').delete().eq('id', id).select('id').single();
  if (error) throw error;
  changed();
}

export function validateReview(input: ReviewInput): string {
  if (!input.author_name.trim()) return 'Escribe el nombre de quien opina.';
  if (input.author_name.trim().length > 80) return 'El nombre admite hasta 80 caracteres.';
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return 'La valoración va de 1 a 5 estrellas.';
  if (input.title.length > 120) return 'El título admite hasta 120 caracteres.';
  const body = input.body.trim();
  if (body.length < 10) return 'El texto de la reseña necesita al menos 10 caracteres.';
  if (body.length > 2000) return 'El texto de la reseña admite hasta 2000 caracteres.';
  return '';
}
