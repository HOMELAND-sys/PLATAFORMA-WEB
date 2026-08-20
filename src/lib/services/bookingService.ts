import type { BookingResult, BookingSelection, Passenger } from '@/lib/types';

export interface BookingService {
  createBooking(selection: BookingSelection, passenger: Passenger, total: number): Promise<BookingResult>;
}

function generateId(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${out}`;
}

/**
 * Implementación mock del servicio de reservas.
 * Para conectar un backend real, reemplazar esta implementación
 * por una llamada a la API (fetch) manteniendo la misma interfaz.
 */
const mockBookingService: BookingService = {
  async createBooking(selection, passenger, total) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      id: generateId('HT'),
      createdAt: new Date().toISOString(),
      transactionId: generateId('ZW'),
      selection,
      passenger,
      total,
    };
  },
};

export const bookingService: BookingService = mockBookingService;
