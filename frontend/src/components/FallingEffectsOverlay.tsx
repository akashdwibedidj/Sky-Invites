import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { FallingEffect } from '../types/invitation';

interface FallingEffectsOverlayProps {
  effects: FallingEffect[];
  intensity?: number; // 0 - 100
  compact?: boolean;
}

interface ParticleConfig {
  id: number;
  effect: Exclude<FallingEffect, 'None'>;
  leftPct: number;
  delay: number;
  duration: number;
  size: number;
  sway: number;
  rotate: number;
}

export const FallingEffectsOverlay: React.FC<FallingEffectsOverlayProps> = ({
  effects,
  intensity = 55,
  compact = false,
}) => {
  const activeEffects = useMemo(
    () => effects.filter((e): e is Exclude<FallingEffect, 'None'> => e !== 'None'),
    [effects]
  );

  const particles = useMemo<ParticleConfig[]>(() => {
    if (activeEffects.length === 0 || intensity <= 0) return [];
    const baseCount = compact ? 8 : Math.max(6, Math.round((intensity / 100) * 26));
    const list: ParticleConfig[] = [];

    for (let i = 0; i < baseCount; i++) {
      const effect = activeEffects[i % activeEffects.length];
      // Deterministic pseudo-random spread for smooth stable rendering
      const seed = (i * 37 + 13) % 100;
      const seed2 = (i * 53 + 7) % 100;
      list.push({
        id: i,
        effect,
        leftPct: 4 + (seed % 92),
        delay: (seed2 % 40) / 10,
        duration: compact ? 3.2 + (seed % 15) / 10 : 4.5 + (seed % 30) / 10,
        size: compact ? 6 + (seed % 5) : 9 + (seed % 8),
        sway: ((seed2 % 24) - 12) * 1.4,
        rotate: (seed % 360) - 180,
      });
    }
    return list;
  }, [activeEffects, intensity, compact]);

  if (particles.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden z-20"
      aria-hidden="true"
    >
      {particles.map((p) => {
        if (p.effect === 'Sparkles') {
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.4, y: `${(p.id * 11) % 85}%` }}
              animate={{
                opacity: [0, 0.9, 0.25, 0.85, 0],
                scale: [0.4, 1.15, 0.7, 1.05, 0.4],
                y: [`${(p.id * 11) % 85}%`, `${((p.id * 11) % 85) - 12}%`],
              }}
              transition={{
                duration: p.duration * 0.75,
                delay: p.delay * 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                left: `${p.leftPct}%`,
                width: p.size * 0.65,
                height: p.size * 0.65,
              }}
              className="absolute rounded-full bg-[#F6DFB0] shadow-[0_0_8px_rgba(246,223,176,0.9)]"
            />
          );
        }

        const shapeStyle: React.CSSProperties =
          p.effect === 'Flower petals'
            ? {
                width: p.size,
                height: p.size * 1.3,
                borderRadius: '70% 30% 70% 30%',
                background:
                  p.id % 2 === 0
                    ? 'linear-gradient(135deg, #F6C8C4, #E89993)'
                    : 'linear-gradient(135deg, #FFF5F2, #F4B9B2)',
              }
            : p.effect === 'Leaves'
              ? {
                  width: p.size * 0.85,
                  height: p.size * 1.45,
                  borderRadius: '85% 15% 85% 15%',
                  background:
                    p.id % 2 === 0
                      ? 'linear-gradient(135deg, #A3B18A, #728562)'
                      : 'linear-gradient(135deg, #D4A373, #B5835A)',
                }
              : p.effect === 'Confetti'
                ? {
                    width: p.size * 0.6,
                    height: p.size * 1.05,
                    borderRadius: '2px',
                    background:
                      p.id % 3 === 0
                        ? '#D4AF37'
                        : p.id % 3 === 1
                          ? '#E6B8A2'
                          : '#F3E5AB',
                  }
                : {
                    // Snow
                    width: p.size * 0.65,
                    height: p.size * 0.65,
                    borderRadius: '9999px',
                    background: 'rgba(255,255,255,0.9)',
                    boxShadow: '0 0 6px rgba(255,255,255,0.8)',
                  };

        return (
          <motion.div
            key={p.id}
            initial={{ y: -24, x: 0, opacity: 0, rotate: 0 }}
            animate={{
              y: ['0%', '108%'],
              x: [0, p.sway, -p.sway * 0.7, p.sway * 0.5],
              opacity: [0, 0.9, 0.9, 0],
              rotate: [0, p.rotate, p.rotate * 1.6],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              left: `${p.leftPct}%`,
              top: '-5%',
              ...shapeStyle,
            }}
            className="absolute"
          />
        );
      })}
    </div>
  );
};
