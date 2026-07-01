import { useMemo } from 'react';
import { motion } from 'framer-motion';

const SPARKLE_COUNT = 55;

export default function SparkleParticles() {
  const sparkles = useMemo(() =>
    Array.from({ length: SPARKLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2.2,
      dur: 3.5 + Math.random() * 5,
      delay: Math.random() * 8,
      driftX: (Math.random() - 0.5) * 30,
      driftY: -(10 + Math.random() * 50),
      opacity: 0.4 + Math.random() * 0.5,
    })), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {sparkles.map(s => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: `hsl(45 93% ${55 + Math.random() * 20}%)`,
            boxShadow: `0 0 ${s.size * 4}px hsl(45 93% 60% / 0.9)`,
          }}
          animate={{
            opacity: [0, s.opacity, 0],
            x: [0, s.driftX],
            y: [0, s.driftY],
            scale: [0, 1.3, 0],
          }}
          transition={{
            duration: s.dur,
            repeat: Infinity,
            delay: s.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
