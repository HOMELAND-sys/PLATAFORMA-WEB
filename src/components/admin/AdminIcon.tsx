import Icon, { isIconName, type IconName } from '@/components/ui/Icon';

/** Nombres históricos del panel admin → iconos del sistema Homeland Icons. */
const ALIASES: Record<string, IconName> = {
  tours: 'map',
  chevron: 'chevron-down',
  arrow: 'arrow-right',
  up: 'arrow-up',
  checkCircle: 'check-circle',
  crossCircle: 'x-circle',
  left: 'chevron-left',
  right: 'chevron-right',
};

export default function AdminIcon({ name, size = 20 }: { name: string; size?: number }) {
  const resolved: IconName = ALIASES[name] ?? (isIconName(name) ? name : 'dashboard');
  return <Icon name={resolved} size={size} />;
}
