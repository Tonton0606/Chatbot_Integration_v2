import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function CursorSpotlight() {
  const rawX = useMotionValue(-800);
  const rawY = useMotionValue(-800);
  const x = useSpring(rawX, { stiffness: 70, damping: 20 });
  const y = useSpring(rawY, { stiffness: 70, damping: 20 });

  useEffect(() => {
    const move = (e) => {
      rawX.set(e.clientX);
      rawY.set(e.clientY);
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [rawX, rawY]);

  return (
    <motion.div
      className="fixed pointer-events-none z-10 rounded-full"
      style={{
        width: 700,
        height: 700,
        x,
        y,
        translateX: '-50%',
        translateY: '-50%',
        background:
          'radial-gradient(circle, hsl(45 93% 47% / 0.06) 0%, hsl(45 93% 47% / 0.02) 40%, transparent 70%)',
      }}
    />
  );
}
