import { motion } from 'framer-motion';
import { Star, ShieldCheck } from 'lucide-react';
import TiltCard from '../TiltCard';

const TESTIMONIALS = [
  {
    tag: 'ENTERPRISE CLIENT',
    quote: 'Exponify PH transformed our operations. We reduced manual processes by 80% in the first quarter alone.',
    name: 'Sarah Chen',
    title: 'COO, TechVista Inc.',
    initial: 'S',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&q=80',
    sentiment: '98.4%',
    metric: { label: 'Process Reduction', value: '−80%' },
  },
  {
    tag: 'GROWTH PARTNER',
    quote: "The AI-powered analytics give us insights we never had before. It's like having a team of data scientists on demand.",
    name: 'Marcus Rivera',
    title: 'CEO, GlobalTrade Co.',
    initial: 'M',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=900&q=80',
    sentiment: '99.1%',
    metric: { label: 'Revenue Growth', value: '+312%' },
  },
  {
    tag: 'SALES LEADER',
    quote: 'Moving from Salesforce to Exponify PH was the best decision we made. Better features, lower cost, superior AI.',
    name: 'Emily Nakamura',
    title: 'VP Sales, Horizon Group',
    initial: 'E',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=900&q=80',
    sentiment: '97.8%',
    metric: { label: 'Lead Conversion', value: '+147%' },
  },
];

const STATS = [
  { value: '500+', label: 'Client Reviews' },
  { value: '4.9/5', label: 'Avg Rating' },
  { value: '98%', label: 'Recommend' },
  { value: '12mo', label: 'Avg ROI Payback' },
];

export default function Testimonials() {
  return (
    <section className="relative py-28 bg-[#070b14] overflow-hidden">

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
        transition={{ duration: 10, repeat: Infinity, ease: 'linear', repeatDelay: 6 }}
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
            <span className="text-primary font-inter text-xs font-semibold tracking-[0.35em] uppercase">Testimonials</span>
            <div className="h-px w-16 bg-primary/60" />
          </div>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-white leading-tight">What Leaders</h2>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-primary italic leading-tight">Are Saying</h2>
        </motion.div>

        {/* ── Stats bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12"
        >
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.3 + i * 0.07 }}
              className="relative rounded-xl border border-primary/15 bg-[#0d1525]/80 backdrop-blur-sm p-4 text-center overflow-hidden"
            >
              {/* Top edge glow */}
              <div className="absolute top-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <div className="font-playfair text-2xl font-bold text-primary mb-0.5">{s.value}</div>
              <div className="font-inter text-[11px] text-white/40 tracking-wide">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Cards ── */}
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 60, scale: 0.92 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 90, damping: 14, delay: i * 0.1 }}
            >
              <TiltCard
                className="shimmer-card group relative rounded-2xl overflow-hidden h-[360px] cursor-pointer"
                intensity={9}
              >
                <img
                  src={t.image}
                  alt={t.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/70 to-transparent" />

                {/* Gold border glow on hover */}
                <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-primary/30 transition-all duration-500 pointer-events-none" />

                {/* Left gold accent bar */}
                <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-full bg-gradient-to-b from-transparent via-primary/70 to-transparent" />

                {/* AI verified + sentiment — top right */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1.5 bg-[#070b14]/80 backdrop-blur-sm border border-primary/20 rounded-full px-2.5 py-1">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    <span className="font-inter text-[9px] font-bold text-primary tracking-widest">VERIFIED</span>
                  </div>
                  <div className="bg-[#070b14]/80 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1">
                    <span className="font-inter text-[9px] text-white/40">Sentiment </span>
                    <span className="font-inter text-[9px] font-bold text-emerald-400">{t.sentiment}</span>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-7">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-inter text-xs font-bold text-primary tracking-[0.2em] uppercase">{t.tag}</span>
                    <div className="bg-primary/10 border border-primary/20 rounded px-2 py-0.5">
                      <span className="font-inter text-[9px] font-bold text-primary">{t.metric.value}</span>
                      <span className="font-inter text-[9px] text-white/30 ml-1">{t.metric.label}</span>
                    </div>
                  </div>

                  {/* Stars with staggered entrance */}
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <motion.div
                        key={j}
                        initial={{ opacity: 0, scale: 0, rotate: -20 }}
                        whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                        viewport={{ once: true }}
                        transition={{ type: 'spring', stiffness: 200, damping: 12, delay: i * 0.1 + j * 0.07 }}
                      >
                        <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                      </motion.div>
                    ))}
                  </div>

                  <p className="font-inter text-sm text-white/70 leading-relaxed mb-5 line-clamp-3">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 ring-1 ring-primary/40 flex items-center justify-center shrink-0">
                      <span className="font-inter text-xs font-bold text-primary">{t.initial}</span>
                    </div>
                    <div>
                      <div className="font-inter text-sm font-semibold text-white">{t.name}</div>
                      <div className="font-inter text-xs text-white/40">{t.title}</div>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
