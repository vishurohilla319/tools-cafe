import React from 'react';
import * as Icons from 'lucide-react';

interface IconProps {
  name: string;
  size?: number | string;
  className?: string;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, className, color }) => {
  const LucideIcon = (Icons as any)[name];
  
  if (!LucideIcon) {
    // Fallback to HelpCircle if icon name is not found
    const Fallback = Icons.HelpCircle;
    return <Fallback size={size} className={className} color={color} />;
  }

  return <LucideIcon size={size} className={className} color={color} />;
};

export default Icon;
