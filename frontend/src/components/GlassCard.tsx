import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glowColor?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING_MAP = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hoverEffect = true,
  glowColor = 'rgba(139, 92, 246, 0.04)',
  padding = 'md',
  ...props
}) => {
  const paddingClass = PADDING_MAP[padding];

  return (
    <motion.div
      className={cn(
        'glass-panel rounded-2xl relative overflow-hidden',
        paddingClass,
        hoverEffect && 'glass-panel-hover',
        className
      )}
      whileHover={
        hoverEffect
          ? {
              y: -2,
              boxShadow: `0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 16px 0 ${glowColor}`,
            }
          : undefined
      }
      {...props}
    >
      {children}
    </motion.div>
  );
};
