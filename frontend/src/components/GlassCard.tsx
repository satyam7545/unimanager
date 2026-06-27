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
        'glass-panel rounded-xl p-6 relative overflow-hidden transition-colors duration-200',
        hoverEffect && 'glass-panel-hover',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      whileHover={
        hoverEffect
          ? {
              y: -4,
              boxShadow: `0 12px 40px -4px rgba(0, 0, 0, 0.4), 0 0 20px 0 ${glowColor}`,
            }
          : undefined
      }
      {...props}
    >
      {/* Translucent background overlay */}
      <div className="absolute inset-0 bg-glass-gradient pointer-events-none -z-10" />
      {children}
    </motion.div>
  );
};
