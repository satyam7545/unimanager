import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glowColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hoverEffect = true,
  glowColor = 'rgba(139, 92, 246, 0.05)',
  ...props
}) => {
  return (
    <motion.div
      className={cn(
        'glass-panel rounded-xl p-6 relative overflow-hidden',
        hoverEffect && 'glass-panel-hover',
        className
      )}
      whileHover={
        hoverEffect
          ? {
              y: -2,
              boxShadow: `0 8px 30px -4px rgba(0, 0, 0, 0.4), 0 0 16px 0 ${glowColor}`,
            }
          : undefined
      }
      {...props}
    >
      {children}
    </motion.div>
  );
};
