import type { Metadata } from 'next';
import ConfirmationContent from '@/components/confirmation/ConfirmationContent';

export const metadata: Metadata = {
  title: '¡Tu aventura está reservada!',
};

export default function ConfirmationPage() {
  return <ConfirmationContent />;
}
