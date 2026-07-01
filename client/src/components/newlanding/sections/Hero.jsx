import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useInView } from 'framer-motion';
import { ArrowRight, Play, TrendingUp, Zap, BarChart2, Target, ChevronDown } from 'lucide-react';
import MagneticButton from '../MagneticButton';

function CountUp({ target, prefix = '', suffix = '', decimal = false, inView }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let cur = 0;
    const total = 1800;
    const fps = 16;
    const steps = total / fps;
    const increment = target / steps;
    const t = setInterval(() => {
      cur += increment;
      if (cur >= target) {
        setVal(target);
        clearInterval(t);
      } else {
        setVal(decimal ? Math.round(cur * 10) / 10 : Math.floor(cur));
      }
    }, fps);
    return () => clearInterval(t);
  }, [inView, target, decimal]);
  return <>{prefix}{decimal ? val.toFixed(1) : val}{suffix}</>;
}

const CYCLING = ['Scale Faster.', 'Sell Smarter.', 'Grow Bigger.', 'Win More.'];

const METRICS = [
  { icon: TrendingUp, label: 'Revenue Growth', target: 247, prefix: '+', suffix: '%', decimal: false, sub: 'avg per client', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', glow: 'shadow-emerald-500/20' },
  { icon: Zap,        label: 'AI Automation',  target: 78,  prefix: '',  suffix: '%', decimal: false, sub: 'tasks automated', color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20',    glow: 'shadow-blue-500/20' },
  { icon: Target,     label: 'Lead Conversion',target: 147, prefix: '+', suffix: '%', decimal: false, sub: 'MQL to SQL',      color: 'text-primary',     bg: 'bg-primary/10',     border: 'border-primary/20',     glow: 'shadow-primary/20' },
  { icon: BarChart2,  label: 'ROAS Boost',     target: 4.8, prefix: '',  suffix: 'x', decimal: true,  sub: 'ad spend return', color: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-purple-400/20',  glow: 'shadow-purple-500/20' },
];

const NODES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: 5 + (i * 13.7 + i * i * 0.4) % 90,
  y: 8 + (i * 11.3 + i * i * 0.6) % 84,
  size: 1.5 + (i % 3) * 1.2,
  dur: 2.5 + (i % 4) * 0.7,
  delay: i * 0.22,
}));

const LINES = [
  [0, 5], [1, 8], [2, 11], [3, 14], [4, 9], [5, 12],
  [6, 17], [7, 20], [8, 15], [10, 19], [13, 22], [16, 25],
];

const STREAM_WORDS = [
  'LEADS', 'REVENUE', 'AUTOMATION', 'CRM', 'ROAS', 'AI', 'PIPELINE',
  'CONVERSION', 'ANALYTICS', 'GROWTH', 'SALES', 'FUNNEL', 'ENGAGE',
];

export default function Hero({ onCtaClick }) {
  const [wordIdx, setWordIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const containerRef = useRef(null);
  const metricsRef = useRef(null);
  const metricsInView = useInView(metricsRef, { once: true, margin: '-80px' });
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 40, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 40, damping: 20 });

  useEffect(() => {
    const t = setInterval(() => setWordIdx(i => (i + 1) % CYCLING.length), 2200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1400);
    return () => clearInterval(t);
  }, []);

  const handleMouseMove = (e) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    mouseX.set((e.clientX - r.left) / r.width);
    mouseY.set((e.clientY - r.top) / r.height);
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#070b14]"
    >
      {/* BACKGROUND LAYERS */}

      {/* Base hexagonal scan grid - subtle golden pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `
          linear-gradient(hsl(var(--primary)/1) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--primary)/1) 1px, transparent 1px)
        `,
        backgroundSize: '52px 52px',
      }} />

      {/* Diagonal lines overlay - warm golden */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `repeating-linear-gradient(
          45deg,
          hsl(45 90% 50% / 1) 0px,
          transparent 1px,
          transparent 38px,
          hsl(45 90% 50% / 1) 39px
        )`,
      }} />

      {/* Parallax golden aurora blobs responding to mouse */}
      <motion.div
        className="absolute top-[-10%] left-[-5%] w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(45 90% 60%/0.15) 0%, transparent 70%)',
          filter: 'blur(90px)',
          x: useSpring(useMotionValue(0), { stiffness: 30, damping: 15 }),
          y: springY,
        }}
      />
      <motion.div
        className="absolute bottom-[-10%] right-[-5%] w-[650px] h-[650px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(43 85% 55%/0.12) 0%, transparent 70%)',
          filter: 'blur(100px)',
          x: springX,
        }}
      />
      <motion.div
        className="absolute top-[30%] left-[35%] w-[500px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, hsl(40 80% 65%/0.10) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Neural network SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.18 }}>
        {LINES.map(([a, b], i) => {
          const na = NODES[a], nb = NODES[b];
          return (
            <motion.line
              key={i}
              x1={`${na.x}%`} y1={`${na.y}%`}
              x2={`${nb.x}%`} y2={`${nb.y}%`}
              stroke="hsl(var(--primary))"
              strokeWidth="0.6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.5, 0.5, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }}
            />
          );
        })}
        {NODES.map(n => (
          <motion.circle
            key={n.id}
            cx={`${n.x}%`} cy={`${n.y}%`}
            r={n.size}
            fill="hsl(var(--primary))"
            animate={{ opacity: [0.15, 0.7, 0.15] }}
            transition={{ duration: n.dur, repeat: Infinity, delay: n.delay, ease: 'easeInOut' }}
          />
        ))}
      </svg>

      {/* Vertical data streams */}
      {STREAM_WORDS.slice(0, 5).map((word, i) => (
        <motion.div
          key={word}
          className="absolute font-inter text-[9px] font-bold tracking-[0.3em] text-primary/20 pointer-events-none select-none"
          style={{ left: `${8 + i * 18}%`, writingMode: 'vertical-rl' }}
          animate={{ y: ['-10%', '110%'] }}
          transition={{ duration: 12 + i * 2, repeat: Infinity, ease: 'linear', delay: i * 2.4 }}
        >
          {Array.from({ length: 6 }, (_, j) => STREAM_WORDS[(i + j * 3) % STREAM_WORDS.length]).join(' · ')}
        </motion.div>
      ))}

      {/* Scan line sweep */}
      <motion.div
        className="absolute inset-x-0 h-[2px] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary)/0.15) 40%, hsl(200 100% 60%/0.3) 50%, hsl(var(--primary)/0.15) 60%, transparent 100%)' }}
        animate={{ top: ['-2%', '102%'] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
      />

      {/* MAIN CONTENT */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-16 w-full">
        <div className="flex flex-col items-center text-center">

          {/* Top badge */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="inline-flex items-center gap-3 bg-[#0d1525] border border-primary/25 rounded-full px-5 py-2.5 mb-10 shadow-lg shadow-primary/10"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            <span className="font-inter text-[11px] font-bold text-primary tracking-[0.3em] uppercase">
              AI-Powered Sales &amp; Marketing Platform
            </span>
            <span className="font-inter text-[10px] bg-primary/15 text-primary px-2.5 py-0.5 rounded-full font-bold">LIVE</span>
          </motion.div>

          {/* Main headline */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
            className="mb-3"
          >
            <h1 className="font-playfair font-bold leading-[1.0] tracking-tight">
              <span
                className="block text-[clamp(3rem,9vw,7.5rem)] text-white"
                style={{
                  textShadow: '0 0 80px hsl(var(--primary)/0.25), 0 2px 0 rgba(0,0,0,0.8)',
                }}
              >
                Exponential
              </span>
              <span
                className="block text-[clamp(3rem,9vw,7.5rem)]"
                style={{
                  background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(43 100% 72%) 40%, hsl(200 100% 65%) 75%, hsl(var(--primary)) 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'gradientShift 4s linear infinite',
                  textShadow: 'none',
                  filter: 'drop-shadow(0 0 30px hsl(var(--primary)/0.5))',
                }}
              >
                Growth.
              </span>
            </h1>
          </motion.div>

          {/* Cycling sub-headline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-primary/60" />
            <div className="h-[2em] overflow-hidden flex items-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIdx}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -30, opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="font-inter text-xl md:text-2xl font-semibold text-white/80 tracking-wide"
                >
                  {CYCLING[wordIdx]}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-primary/60" />
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="font-inter text-white/45 text-base md:text-lg leading-relaxed max-w-2xl mb-12"
          >
            Exponify PH fuses{' '}
            <span className="text-white font-semibold">cutting-edge AI</span>{' '}
            with next-generation sales and marketing intelligence — automating your pipeline,
            supercharging your ROAS, and delivering{' '}
            <span className="text-primary font-semibold">measurable exponential results</span>{' '}
            for Philippine businesses.
          </motion.p>

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-4 mb-16"
          >
            <MagneticButton strength={0.35}>
              <button
                onClick={onCtaClick}
                className="relative inline-flex items-center gap-2 font-inter font-bold text-base px-9 py-4 rounded-full overflow-hidden group"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(43 100% 72%) 100%)',
                  boxShadow: '0 0 30px hsl(var(--primary)/0.45), 0 4px 20px hsl(var(--primary)/0.3)',
                }}
              >
                <span className="relative z-10 text-[#070b14]">Start Growing Now</span>
                <ArrowRight className="relative z-10 w-4 h-4 text-[#070b14] group-hover:translate-x-1 transition-transform" />
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.5 }}
                />
              </button>
            </MagneticButton>

            <a
              href="#services"
              className="inline-flex items-center gap-2 font-inter font-medium text-base px-9 py-4 rounded-full border text-white hover:text-primary transition-all duration-300 group backdrop-blur-sm"
              style={{
                borderColor: 'rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <div className="relative w-5 h-5 flex items-center justify-center">
                <span className="absolute w-5 h-5 rounded-full border border-white/30 group-hover:border-primary/60 group-hover:scale-110 transition-all" />
                <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
              </div>
              See the Platform
            </a>
          </motion.div>

          {/* METRICS ROW */}
          <motion.div
            ref={metricsRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.75 }}
            className="w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-3 mb-16"
          >
            {METRICS.map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.8 + i * 0.1 }}
                  whileHover={{ y: -6, scale: 1.04 }}
                  className={`shimmer-card relative rounded-2xl border p-5 text-center overflow-hidden ${m.bg} ${m.border} shadow-lg ${m.glow}`}
                  style={{ background: 'rgba(13,18,32,0.85)', backdropFilter: 'blur(12px)' }}
                >
                  {/* Glow top edge */}
                  <div className="absolute top-0 left-[20%] right-[20%] h-px"
                    style={{ background: `linear-gradient(90deg, transparent, currentColor 50%, transparent)`, opacity: 0.6 }}
                  />
                  <div className={`w-9 h-9 rounded-xl ${m.bg} border ${m.border} flex items-center justify-center mx-auto mb-3`}>
                    <Icon size={16} className={m.color} />
                  </div>
                  <div className={`font-playfair text-2xl font-bold ${m.color} mb-0.5`}>
                    <CountUp
                      target={m.target}
                      prefix={m.prefix}
                      suffix={m.suffix}
                      decimal={m.decimal}
                      inView={metricsInView}
                    />
                  </div>
                  <div className="font-inter text-xs font-semibold text-white/60">{m.label}</div>
                  <div className="font-inter text-[10px] text-white/30 mt-0.5">{m.sub}</div>
                  {/* Animated progress bar */}
                  <motion.div
                    className="absolute bottom-0 left-0 h-0.5"
                    style={{ background: 'currentColor' }}
                    initial={{ width: 0 }}
                    animate={{ width: ['0%', '100%', '0%'] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
                  />
                </motion.div>
              );
            })}
          </motion.div>

          {/* LIVE TICKER STRIP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="w-full max-w-5xl rounded-2xl overflow-hidden"
            style={{ background: 'rgba(13,18,32,0.9)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-inter text-[11px] font-bold text-emerald-400 tracking-widest uppercase">AI Engine — Live</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-inter text-[11px] text-white/25">Processing 12,483 data points</span>
                <motion.span
                  key={tick}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-inter text-[11px] text-primary font-semibold"
                >
                  {(0.1 + Math.random() * 0.9).toFixed(1)}s response
                </motion.span>
              </div>
            </div>

            {/* Scrolling ticker */}
            <div className="relative overflow-hidden py-3 px-2">
              <motion.div
                className="flex items-center gap-8 whitespace-nowrap"
                animate={{ x: [0, -1400] }}
                transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
              >
                {[...Array(3)].map((_, rep) => (
                  <div key={rep} className="flex items-center gap-8">
                    {[
                      { label: 'Facebook ROAS', value: '6.2x', color: 'text-emerald-400', up: true },
                      { label: 'Lead Score Avg', value: '87/100', color: 'text-blue-400', up: true },
                      { label: 'Shopee Revenue', value: '485K', color: 'text-primary', up: true },
                      { label: 'AI Responses', value: '24/7', color: 'text-purple-400', up: null },
                      { label: 'CRM Pipeline', value: '12.4M', color: 'text-emerald-400', up: true },
                      { label: 'Chatbot Auto-Res', value: '78%', color: 'text-blue-400', up: true },
                      { label: 'TikTok CTR', value: '3.8%', color: 'text-pink-400', up: true },
                      { label: 'Ad Spend Saved', value: '92K', color: 'text-primary', up: true },
                      { label: 'Inventory Acc.', value: '99.8%', color: 'text-emerald-400', up: null },
                      { label: 'MQL→SQL Rate', value: '+147%', color: 'text-amber-400', up: true },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2 shrink-0">
                        <span className="font-inter text-[11px] text-white/30">{item.label}</span>
                        <span className={`font-inter text-[11px] font-bold ${item.color}`}>{item.value}</span>
                        {item.up !== null && (
                          <span className={`text-[9px] ${item.up ? 'text-emerald-400' : 'text-white/20'}`}>{item.up ? '▲' : '—'}</span>
                        )}
                        <span className="text-white/10 mx-1">|</span>
                      </div>
                    ))}
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Scroll indicator */}
      <motion.a
        href="#services"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/20 hover:text-primary transition-colors"
      >
        <span className="font-inter text-[10px] tracking-widest uppercase">Explore</span>
        <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
          <ChevronDown size={16} />
        </motion.div>
      </motion.a>

      {/* Corner HUD decorations */}
      <div className="absolute top-24 right-8 hidden xl:flex flex-col items-end gap-1 pointer-events-none select-none">
        {['SYS', 'AI', 'NET'].map((t, i) => (
          <motion.div
            key={t}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
            className="font-inter text-[9px] tracking-widest text-primary/50 flex items-center gap-1.5"
          >
            <span className={`w-1 h-1 rounded-full bg-primary/50`} />
            {t} <span className="text-primary/30">ONLINE</span>
          </motion.div>
        ))}
      </div>

      {/* Bottom corner bracket decorations */}
      <div className="absolute bottom-6 left-6 w-6 h-6 border-l border-b border-primary/20 pointer-events-none" />
      <div className="absolute bottom-6 right-6 w-6 h-6 border-r border-b border-primary/20 pointer-events-none" />
      <div className="absolute top-24 left-6 w-6 h-6 border-l border-t border-primary/20 pointer-events-none" />
      <div className="absolute top-24 right-6 w-6 h-6 border-r border-t border-primary/20 pointer-events-none" />
    </section>
  );
}
