import { motion } from 'framer-motion';
import { ArrowRight, Activity } from 'lucide-react';
import TiltCard from '../TiltCard';

const HERO = {
  tag: 'CUSTOMER MANAGEMENT',
  title: 'CRM & Sales Intelligence Built for the Philippine Market',
  description:
    '360° customer profiles, AI-powered lead scoring, multi-stage pipeline management, and lifetime value tracking — all unified across every channel your business touches.',
  image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80',
  metric: { label: 'Active Pipelines', value: '12.4M' },
};

const MODULES = [
  {
    tag: 'OPERATIONS',
    title: 'Inventory & ERP',
    description: 'Real-time stock management, automated reorder alerts, and margin analysis.',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&q=80',
    stat: '99.8% accuracy',
  },
  {
    tag: 'INSIGHTS & DATA',
    title: 'Advanced Analytics',
    description: 'AI-powered revenue forecasting, cohort analysis, and cross-platform dashboards.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80',
    stat: '+247% avg growth',
  },
  {
    tag: 'ARTIFICIAL INTELLIGENCE',
    title: 'AI Automation Engine',
    description: 'Smart workflows that automate repetitive tasks and surface actionable insights.',
    image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80',
    stat: '78% tasks automated',
  },
  {
    tag: 'COMMUNICATIONS',
    title: 'Unified Inbox',
    description: 'Manage email, social, chat, and marketplace conversations in one place.',
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=900&q=80',
    stat: '24/7 AI responses',
  },
];

const FOOTER_MODULE = {
  tag: 'FINANCE & ACCOUNTING',
  title: 'Full Financial Suite — Invoicing, Payroll & BIR Compliance',
  description:
    'Multi-currency accounting, automated invoicing, SSS/PhilHealth/Pag-IBIG payroll, and BIR-ready tax reporting in one integrated platform.',
  image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=900&q=80',
};

export default function Features() {
  return (
    <section id="features" className="relative py-28 bg-[#070b14] overflow-hidden">

      {/* Background grid — matches Hero */}
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
        style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary)/0.12) 40%, hsl(200 100% 60%/0.25) 50%, hsl(var(--primary)/0.12) 60%, transparent 100%)' }}
        animate={{ top: ['-2%', '102%'] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
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
            <span className="text-primary font-inter text-xs font-semibold tracking-[0.35em] uppercase">What We Offer</span>
            <div className="h-px w-16 bg-primary/60" />
          </div>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-white leading-tight">Enterprise Modules,</h2>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-primary italic leading-tight">Designed for Growth</h2>
          <p className="font-inter text-white/40 text-lg max-w-2xl mx-auto mt-5">
            Six fully integrated modules — one unified platform — powering every function of your Philippine enterprise.
          </p>
        </motion.div>

        {/* ── Main grid: big left + 2×2 right ── */}
        <div className="grid lg:grid-cols-2 gap-5 mb-5">

          {/* Hero card — left */}
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
                src={HERO.image}
                alt={HERO.title}
                className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/55 to-transparent" />

              {/* Live metric badge — top right */}
              <div className="absolute top-5 right-5 flex items-center gap-2 bg-[#070b14]/80 backdrop-blur-sm border border-primary/25 rounded-full px-3 py-1.5">
                <Activity className="w-3 h-3 text-primary" />
                <span className="font-inter text-[10px] font-bold text-primary">{HERO.metric.value}</span>
                <span className="font-inter text-[10px] text-white/40">{HERO.metric.label}</span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-8">
                <span className="font-inter text-xs font-bold text-primary tracking-[0.2em] uppercase mb-3 block">{HERO.tag}</span>
                <h3 className="font-inter text-2xl font-bold text-white mb-3 leading-tight">{HERO.title}</h3>
                <p className="font-inter text-sm text-white/50 leading-relaxed mb-5">{HERO.description}</p>
                <span className="font-inter text-sm font-semibold text-primary flex items-center gap-1.5 group-hover:gap-3 transition-all duration-300">
                  Explore CRM <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </TiltCard>
          </motion.div>

          {/* 2×2 small cards — right */}
          <div className="grid grid-cols-2 gap-5">
            {MODULES.map((mod, i) => (
              <motion.div
                key={mod.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 100, damping: 16, delay: i * 0.08 }}
              >
                <TiltCard
                  className="shimmer-card group relative rounded-2xl overflow-hidden h-[245px] cursor-pointer"
                  intensity={10}
                >
                  <img
                    src={mod.image}
                    alt={mod.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-58 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/65 to-transparent" />

                  {/* Stat chip — top right */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="font-inter text-[9px] font-bold text-primary bg-primary/10 border border-primary/25 rounded-full px-2 py-0.5 whitespace-nowrap">
                      {mod.stat}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <span className="font-inter text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-1.5 block">{mod.tag}</span>
                    <h4 className="font-inter text-sm font-bold text-white mb-1.5 leading-tight">{mod.title}</h4>
                    <p className="font-inter text-xs text-white/40 leading-relaxed line-clamp-2">{mod.description}</p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Full-width bottom card ── */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 90, damping: 16, delay: 0.1 }}
        >
          <TiltCard
            className="shimmer-card group relative rounded-2xl overflow-hidden h-52 cursor-pointer"
            intensity={5}
          >
            <img
              src={FOOTER_MODULE.image}
              alt={FOOTER_MODULE.title}
              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-58 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070b14] via-[#070b14]/75 to-transparent" />

            {/* Left gold accent border */}
            <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-full bg-gradient-to-b from-transparent via-primary to-transparent" />

            <div className="absolute inset-0 flex flex-col justify-center px-10">
              <span className="font-inter text-[10px] font-bold text-primary tracking-[0.25em] uppercase mb-2">{FOOTER_MODULE.tag}</span>
              <h3 className="font-inter text-xl md:text-2xl font-bold text-white mb-2 leading-tight max-w-xl">{FOOTER_MODULE.title}</h3>
              <p className="font-inter text-sm text-white/45 leading-relaxed max-w-2xl line-clamp-2">{FOOTER_MODULE.description}</p>
            </div>
            <div className="absolute right-8 top-1/2 -translate-y-1/2">
              <span className="font-inter text-sm font-semibold text-primary flex items-center gap-1.5 group-hover:gap-3 transition-all duration-300">
                Explore Finance <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </TiltCard>
        </motion.div>

      </div>
    </section>
  );
}
