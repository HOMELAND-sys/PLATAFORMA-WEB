import Icon from '@/components/ui/Icon';

export default function WhatsAppFab() {
  return (
    <a
      className="fab-whatsapp"
      href="https://wa.me/59176012345"
      target="_blank"
      rel="noopener"
      aria-label="Chatea con nosotros por WhatsApp"
    >
      <Icon name="whatsapp" size={28} />
    </a>
  );
}
