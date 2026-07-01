import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import TiltCard from '../TiltCard';

const HERO_STEP = {
  tag: 'PHASE ONE',
  num: '01',
  title: 'Discovery & Audit — We Start Where You Are',
  description:
    'Before writing a single line of strategy, we immerse ourselves in your operations. We map every pain point, audit your existing tools, and align on growth objectives unique to your business — so the plan we build is built for you, not a template.',
  image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=900&q=80',
  status: 'INITIATE',
};

const STEPS = [
  {
    tag: 'PHASE TWO',
    num: '02',
    title: 'Strategy & Roadmap',
    description: 'A tailored implementation roadmap built specifically for your industry and scale.',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80',
    status: 'PLAN',
  },
  {
    tag: 'PHASE THREE',
    num: '03',
    title: 'Implementation',
    description: 'Our expert team deploys, migrates data, and configures every module with precision.',
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=900&q=80',
    status: 'DEPLOY',
  },
  {
    tag: 'PHASE FOUR',
    num: '04',
    title: 'Scale & Optimize',
    description: 'Continuous optimization, AI learning, and scaling support as your business evolves.',
    image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=900&q=80',
    status: 'SCALE',
  },
];

const TIMELINE_PHASES = ['Discovery', 'Strategy', 'Implementation', 'Scale'];

export default function Process() {
  return (
    <section id="process" className="relative py-28 bg-[#070b14] overflow-hidden">

      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: `
          linear-gradient(hsl(var(--primary)/1) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--primary)/1) 1px, transparent 1px)
        `,
        backgroundSize: '52px 52px',
      }} />

      {/* Scan line sweep */}
      <motion.div
        className="absolute inset-x-0 h-[1px] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary)/0.12) 40%, hsl(200 100% 60%/0.22) 50%, hsl(var(--primary)/0.12) 60%, transparent 100%)' }}
        animate={{ top: ['-2%', '102%'] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'linear', repeatDelay: 5 }}
      />

      {/* Corner brackets */}
      <div className="absolute top-10 left-6 w-6 h-6 border-l border-t border-primary/20 pointer-events-none" />
      <div className="absolute top-10 right-6 w-6 h-6 border-r border-t border-primary/20 pointer-events-none" />
      <div className="absolute bottom-10 left-6 w-6 h-6 border-l border-b border-primary/20 pointer-events-none" />
      <div className="absolute bottom-10 right-6 w-6 h-6 border-r border-b border-primary/20 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6">

        {/* ── Heading ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-primary/60" />
            <span className="text-primary font-inter text-xs font-semibold tracking-[0.35em] uppercase">How It Works</span>
            <div className="h-px w-16 bg-primary/60" />
          </div>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-white leading-tight">Your Journey to</h2>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-primary italic leading-tight">Digital Excellence</h2>
          <p className="font-inter text-white/40 text-lg max-w-2xl mx-auto mt-5">
            A proven four-phase methodology that takes you from audit to scale — without guesswork.
          </p>
        </motion.div>

        {/* ── Timeline progress indicator ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-center gap-0 mb-14 max-w-2xl mx-auto"
        >
          {TIMELINE_PHASES.map((phase, i) => (
            <div key={phase} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.3 + i * 0.1 }}
                  className="w-7 h-7 rounded-full border-2 border-primary/60 bg-primary/10 flex items-center justify-center mb-2 relative"
                >
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                    className="w-2 h-2 rounded-full bg-primary"
                  />
                  {/* Outer glow ring */}
                  <motion.div
                    className="absolute inset-[-4px] rounded-full border border-primary/20"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
                  />
                </motion.div>
                <span className="font-inter text-[10px] font-semibold text-white/40 tracking-widest uppercase text-center">{phase}</span>
              </div>
              {i < TIMELINE_PHASES.length - 1 && (
                <motion.div
                  className="h-px flex-1 mb-5"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.1, ease: 'easeOut' }}
                  style={{
                    background: 'linear-gradient(90deg, hsl(var(--primary)/0.6), hsl(var(--primary)/0.2))',
                    transformOrigin: 'left',
                  }}
                />
              )}
            </div>
          ))}
        </motion.div>

        {/* ── Main grid: big left hero + stacked right ── */}
        <div className="grid lg:grid-cols-2 gap-5">

          {/* Hero step — left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <TiltCard
              className="shimmer-card group relative rounded-2xl overflow-hidden h-[520px] cursor-pointer"
              intensity={6}
            >
              <img
                src={HERO_STEP.image}
                alt={HERO_STEP.title}
                className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/55 to-transparent" />

              {/* Phase number watermark */}
              <div className="absolute top-6 right-7 font-playfair text-7xl font-bold text-white/[0.05] select-none">
                {HERO_STEP.num}
              </div>

              {/* Status badge */}
              <div className="absolute top-5 left-5 flex items-center gap-2 bg-[#070b14]/80 backdrop-blur-sm border border-primary/25 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="font-inter text-[9px] font-bold text-primary tracking-widest">{HERO_STEP.status}</span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-8">
                <span className="font-inter text-xs font-bold text-primary tracking-[0.2em] uppercase mb-3 block">{HERO_STEP.tag}</span>
                <h3 className="font-inter text-2xl font-bold text-white mb-3 leading-tight">{HERO_STEP.title}</h3>
                <p className="font-inter text-sm text-white/50 leading-relaxed mb-5">{HERO_STEP.description}</p>
                <span className="font-inter text-sm font-semibold text-primary flex items-center gap-1.5 group-hover:gap-3 transition-all duration-300">
                  Start Discovery <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </TiltCard>
          </motion.div>

          {/* Steps 2-4 stacked vertically — right */}
          <div className="flex flex-col gap-5">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 95, damping: 16, delay: i * 0.1 }}
                className="flex-1"
              >
                <TiltCard
                  className="shimmer-card group relative rounded-2xl overflow-hidden h-full min-h-[155px] cursor-pointer"
                  intensity={8}
                >
                  <img
                    src={step.image}
                    alt={step.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-58 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#070b14] via-[#070b14]/70 to-transparent" />

                  {/* Phase watermark */}
                  <div className="absolute top-4 right-5 font-playfair text-5xl font-bold text-white/[0.04] select-none">
                    {step.num}
                  </div>

                  {/* Left gold accent */}
                  <div className="absolute left-0 top-[25%] bottom-[25%] w-[3px] rounded-full bg-gradient-to-b from-transparent via-primary/60 to-transparent" />

                  <div className="absolute inset-0 flex flex-col justify-center px-7">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-inter text-[10px] font-bold text-primary tracking-[0.2em] uppercase">{step.tag}</span>
                      <span className="font-inter text-[9px] text-white/25 bg-white/5 rounded px-1.5 py-0.5 font-bold tracking-widest">{step.status}</span>
                    </div>
                    <h4 className="font-inter text-base font-bold text-white mb-1.5 leading-tight">{step.title}</h4>
                    <p className="font-inter text-xs text-white/45 leading-relaxed line-clamp-2">{step.description}</p>
                  </div>

                  {/* Arrow + check on hover */}
                  <div className="absolute right-5 inset-y-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <CheckCircle2 className="w-4 h-4 text-primary/60" />
                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
