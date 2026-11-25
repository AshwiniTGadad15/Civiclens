import {
  AlertTriangle,
  Bus,
  Droplets,
  HelpCircle,
  Lamp,
  ShieldAlert,
  Trash2,
  Trees,
  Waves,
  Wind,
} from 'lucide-react';
import type { CategoryMeta } from '../../lib/constants';

export function CategoryIcon({
  iconKey,
  className = 'h-5 w-5',
}: {
  iconKey: CategoryMeta['iconKey'];
  className?: string;
}) {
  switch (iconKey) {
    case 'road':
      return <AlertTriangle className={className} />;
    case 'water':
      return <Droplets className={className} />;
    case 'drainage':
      return <Waves className={className} />;
    case 'waste':
      return <Trash2 className={className} />;
    case 'streetlight':
      return <Lamp className={className} />;
    case 'transit':
      return <Bus className={className} />;
    case 'air':
      return <Wind className={className} />;
    case 'park':
      return <Trees className={className} />;
    case 'safety':
      return <ShieldAlert className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
}
