import React from 'react';
import { 
  Flame, Snowflake, ArrowsClockwise, Knife, CirclesThreePlus, 
  Package, Oven, Drop, ArrowBendUpRight, IntersectThree,
  ThermometerSimple, Moon, ArrowFatLinesUp, CircleDashed, 
  DotsSix, DotsThreeCircle, CookingPot
} from '@phosphor-icons/react';

interface ActionIconProps {
  action: string;
  size?: number;
  className?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}

const actionMap: Record<string, React.FC<any>> = {
  heat: Flame,
  cool: Snowflake,
  mix: ArrowsClockwise,
  chop: Knife,
  grind: CirclesThreePlus,
  jar: Package,
  bake: Oven,
  freeze: Snowflake,
  whip: Drop,
  fold: ArrowBendUpRight,
  emulsify: IntersectThree,
  temper: ThermometerSimple,
  rest: Moon,
  proof: ArrowFatLinesUp,
  blend: CircleDashed,
  sift: DotsSix,
  other: DotsThreeCircle,
};

export default function ActionIcon({ 
  action, 
  size = 32, 
  className = '',
  weight = 'duotone' 
}: ActionIconProps) {
  const Icon = actionMap[action?.toLowerCase()] || CookingPot;
  return <Icon size={size} weight={weight} className={className} />;
}
