import type { Metadata } from 'next';
import CustomizeContent from '@/components/forms/CustomizeContent';

export const metadata: Metadata = {
  title: 'Personalizá tu viaje',
};

export default function CustomizePage() {
  return <CustomizeContent />;
}
