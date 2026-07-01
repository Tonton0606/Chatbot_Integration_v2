import { useRef } from 'react';
import { motion, useSpring } from 'framer-motion';

export default function MagneticButton({ children, strength = 0.28, className = '', style = {} }) {
  const ref = useRef(null);
  const x = useSpring(0, { stiffness: 280, damping: 18 });
  const y = useSpring(0, { stiffness: 280, damping: 18 });

  const handleMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - (rect.left + rect.width  / 2)) * strength);
    y.set((e.clientY - (rect.top  + rect.height / 2)) * strength);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ x, y, display: 'inline-flex', ...style }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
