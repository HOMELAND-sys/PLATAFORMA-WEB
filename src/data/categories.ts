import type { Category } from '@/lib/types';

export const categories: Category[] = [
  { id: 'all', label: 'All tours', emoji: '🌎' },
  { id: 'lapaz-city', label: 'La Paz city tours', emoji: '🏔️' },
  { id: 'lapaz-top', label: 'La Paz top tours', emoji: '⭐' },
  { id: 'uyuni', label: 'Salar de Uyuni', emoji: '🧂' },
  { id: 'amazon', label: 'Amazonía', emoji: '🌿' },
  { id: 'trekking', label: 'Trekking Cordillera', emoji: '⛰️' },
  { id: 'bolivia-top', label: 'Bolivia top tours', emoji: '🏛️' },
  { id: 'peru', label: 'Tours en Perú', emoji: '🦙' },
];

export const categoryImages: Record<string, string> = {
  'lapaz-city': '/assets/lapaz-city.jpg',
  'lapaz-top': '/assets/uyuni-mirror.jpg',
  uyuni: '/assets/uyuni-salt.jpg',
  amazon: '/assets/titicaca-lake.jpg',
  trekking: '/assets/andes-mountains.jpg',
  'bolivia-top': '/assets/uyuni-salt.jpg',
  peru: '/assets/machu-picchu.jpg',
};

export function categoryLabel(id: string): string {
  return categories.find((c) => c.id === id)?.label ?? id;
}
