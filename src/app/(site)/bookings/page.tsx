import type { Metadata } from 'next';
import MyBookingsContent from '@/components/bookings/MyBookingsContent';

export const metadata: Metadata = {
  title: 'Mis reservas',
  robots: { index: false },
};

export default function MyBookingsPage() {
  return <MyBookingsContent />;
}
