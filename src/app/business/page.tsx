import type { Metadata } from 'next';
import BusinessContent from '@/components/forms/BusinessContent';

export const metadata: Metadata = {
  title: 'Empresas',
};

export default function BusinessPage() {
  return <BusinessContent />;
}
