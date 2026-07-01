import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, ChevronDown } from 'lucide-react';

const WHY = [
  'No setup fees — get started immediately',
  'Dedicated onboarding specialist assigned to you',
  'Results guaranteed or your money back',
  'Trusted by 120+ businesses across the Philippines',
];

const SIZES = ['1–10 employees', '11–50 employees', '51–200 employees', '201+ employees'];

const inputClass =
  'w-full bg-[#0a0f1d] border border-white/[0.08] rounded-xl px-4 py-3 font-inter text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/10 transition-all duration-200';

function CustomSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${inputClass} flex items-center justify-between text-left ${value ? 'text-white' : 'text-white/25'}`}
        style={{ appearance: 'none' }}
      >
        <span>{value || 'Company Size'}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1.5 w-full rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/60"
            style={{ background: '#0d1220' }}
          >
            {SIZES.map(s => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => { onChange(s); setOpen(false); }}
                  className={`w-full text-left px-4 py-3 font-inter text-sm transition-all duration-150 flex items-center justify-between ${
                    value === s
                      ? 'text-primary bg-primary/10'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {s}
                  {value === s && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [size, setSize] = useState('');

  return (
    <section id="contact" className="relative py-28 bg-[#070b14] overflow-hidden">

      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: `
          linear-gradient(hsl(var(--primary)/1) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--primary)/1) 1px, transparent 1px)
        `,
        backgroundSize: '52px 52px',
      }} />

      {/* Scan line */}
      <motion.div
        className="absolute inset-x-0 h-[1px] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary)/0.12) 40%, hsl(200 100% 60%/0.22) 50%, hsl(var(--primary)/0.12) 60%, transparent 100%)' }}
        animate={{ top: ['-2%', '102%'] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear', repeatDelay: 6 }}
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
            <span className="text-primary font-inter text-xs font-semibold tracking-[0.35em] uppercase">Get Started</span>
            <div className="h-px w-16 bg-primary/60" />
          </div>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-white leading-tight">Ready to</h2>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-primary italic leading-tight">Transform?</h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 items-start">

          {/* ── Left — image card ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group relative rounded-2xl overflow-hidden h-[540px]"
          >
            <img
              src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80"
              alt="Transform your business"
              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/60 to-transparent" />

            {/* Left gold accent bar */}
            <div className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-full bg-gradient-to-b from-transparent via-primary/60 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-10">
              <span className="font-inter text-xs font-bold text-primary tracking-[0.2em] uppercase mb-4 block">WHY EXPONIFY PH</span>
              <h3 className="font-playfair text-3xl font-bold text-white mb-6 leading-tight">
                Book a personalized demo and discover the difference.
              </h3>
              <div className="space-y-3">
                {WHY.map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="font-inter text-sm text-white/60">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Right — form ── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            {submitted ? (
              <div className="rounded-2xl border border-primary/20 p-12 text-center" style={{ background: '#0d1220' }}>
                {/* Top gold line */}
                <div className="absolute top-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                  className="w-16 h-16 rounded-full bg-primary/15 ring-2 ring-primary/30 flex items-center justify-center mx-auto mb-6"
                >
                  <Check className="w-8 h-8 text-primary" />
                </motion.div>
                <h3 className="font-playfair text-2xl font-bold text-white mb-3">Thank You!</h3>
                <p className="font-inter text-white/50 text-sm">Our team will reach out within 24 hours to schedule your personalized demo.</p>
              </div>
            ) : (
              <form
                onSubmit={e => { e.preventDefault(); setSubmitted(true); }}
                className="relative rounded-2xl border border-white/[0.08] p-8 space-y-4 overflow-hidden"
                style={{ background: '#0d1220' }}
              >
                {/* Top gold shimmer line */}
                <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                <div className="mb-2">
                  <h3 className="font-playfair text-2xl font-bold text-white mb-1">Book a Demo</h3>
                  <p className="font-inter text-sm text-white/40">Fill out the form and we'll be in touch within 24 hours.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <input placeholder="Full Name *"        required className={inputClass} />
                  <input placeholder="Work Email *" type="email" required className={inputClass} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input placeholder="Company Name"       className={inputClass} />
                  <input placeholder="Phone Number"       className={inputClass} />
                </div>

                {/* Custom gold-themed select — replaces native <select> */}
                <CustomSelect value={size} onChange={setSize} />

                <textarea
                  placeholder="Tell us about your needs..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />

                {/* Submit button — matches site's gold gradient CTA */}
                <button
                  type="submit"
                  className="relative w-full flex items-center justify-center gap-2 font-inter font-bold text-[15px] text-[#070b14] py-4 rounded-full overflow-hidden group"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(43 100% 65%) 100%)',
                    boxShadow: '0 0 24px hsl(var(--primary)/0.40), 0 4px 16px hsl(var(--primary)/0.25)',
                  }}
                >
                  <span className="relative z-10">Schedule My Demo</span>
                  <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                  {/* Shine sweep */}
                  <motion.span
                    className="absolute inset-0 bg-white/20"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.5 }}
                  />
                </button>

                <p className="font-inter text-xs text-white/20 text-center pt-1">
                  By submitting, you agree to our Privacy Policy.
                </p>
              </form>
            )}
          </motion.div>

        </div>
      </div>
    </section>
  );
}
