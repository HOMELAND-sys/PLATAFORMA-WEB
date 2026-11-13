import type { Metadata } from 'next';
import FavoritesContent from '@/components/tours/FavoritesContent';
import { getSupabaseServer } from '@/lib/supabase';
import { fetchActiveTours, fetchOpenDates } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Mis favoritos',
  robots: { index: false },
};

export const revalidate = 30;

export default async function FavoritesPage() {
  const sb = getSupabaseServer();
  const [tours, openDates] = await Promise.all([fetchActiveTours(sb), fetchOpenDates(sb)]);
  return <FavoritesContent tours={tours} openDates={openDates} />;
}
