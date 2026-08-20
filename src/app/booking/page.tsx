import type { Metadata } from 'next';
import BookingContent from '@/components/booking/BookingContent';

export const metadata: Metadata = {
  title: 'Completar reserva',
};

export default function BookingPage() {
  return <BookingContent />;
}
