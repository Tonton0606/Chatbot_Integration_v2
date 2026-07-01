import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function TiltCard({ children, className = '', intensity = 10, style = {}, ...props }) {
  const ref = useRef(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [intensity, -intensity]), { stiffness: 220, damping: 28 });
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-intensity, intensity]), { stiffness: 220, damping: 28 });
  const scale   = useSpring(1, { stiffness: 260, damping: 24 });

  const handleMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
    scale.set(1.025);
  };

  const handleLeave = () => {
    rawX.set(0);
    rawY.set(0);
    scale.set(1);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, scale, transformStyle: 'preserve-3d', ...style }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
