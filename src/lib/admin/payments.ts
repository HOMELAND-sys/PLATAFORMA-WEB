import { httpUrl } from './validation';

export function paymentSettingsRows(link: string, instructions: string, qrUrl: string) {
  if (link.trim() && !httpUrl(link.trim())) throw new Error('Usa un enlace de pago HTTP o HTTPS válido.');
  // settings.value es NOT NULL: una cadena vacía representa un dato sin configurar.
  // Enviar null desde PostgREST se convierte en NULL SQL, no en el literal JSON null.
  return [
    { key: 'payment_link', value: link.trim() },
    { key: 'payment_instructions', value: instructions.trim() },
    { key: 'payment_qr_url', value: qrUrl.trim() },
  ];
}
