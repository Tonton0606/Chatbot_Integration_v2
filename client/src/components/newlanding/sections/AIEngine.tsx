import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    tag: 'FORECASTING',
    title: 'Predictive Analytics',
    description: 'Forecast demand, revenue, and churn before they happen with AI-driven models.',
    image: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=900&q=80',
  },
  {
    tag: 'AUTOMATION',
    title: 'Smart Automation',
    description: 'Auto-assign tasks, route tickets, and trigger workflows without human input.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80',
  },
  {
    tag: 'MACHINE LEARNING',
    title: 'Adaptive Learning',
    description: 'The platform evolves with your business patterns, improving every single day.',
    image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80',
  },
  {
    tag: 'INTELLIGENCE',
    title: 'Actionable Insights',
    description: 'Surface opportunities and risks your team would otherwise miss.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80',
  },
];

export default function AIEngine() {
  return (
    <section id="ai" className="relative py-28 bg-[#070b14] overflow-hidden">

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
        transition={{ duration: 8, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
      />

      {/* Corner brackets */}
      <div className="absolute top-10 left-6 w-6 h-6 border-l border-t border-primary/20 pointer-events-none" />
      <div className="absolute top-10 right-6 w-6 h-6 border-r border-t border-primary/20 pointer-events-none" />
      <div className="absolute bottom-10 left-6 w-6 h-6 border-l border-b border-primary/20 pointer-events-none" />
      <div className="absolute bottom-10 right-6 w-6 h-6 border-r border-b border-primary/20 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-primary/60" />
            <span className="text-primary font-inter text-xs font-semibold tracking-[0.35em] uppercase">AI Engine</span>
            <div className="h-px w-16 bg-primary/60" />
          </div>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-white leading-tight">Intelligence That</h2>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-primary italic leading-tight">Works for You</h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          {/* Big left card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group relative rounded-2xl overflow-hidden h-[480px] cursor-pointer row-span-2"
          >
            <img
              src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=900&q=80"
              alt="AI Core Engine"
              className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <span className="font-inter text-xs font-bold text-primary tracking-[0.2em] uppercase mb-3 block">AI CORE ENGINE</span>
              <h3 className="font-inter text-2xl font-bold text-white mb-3 leading-tight">
                Our AI Doesn't Just Analyze — It Understands Your Business
              </h3>
              <p className="font-inter text-sm text-white/50 leading-relaxed mb-5">
                Trained on millions of business data points, our engine learns your patterns, adapts to market shifts, and delivers intelligence that grows sharper every day.
              </p>
              <span className="font-inter text-sm font-semibold text-primary flex items-center gap-1.5 group-hover:gap-2.5 transition-all duration-300">
                Discover the Engine <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </motion.div>

          {/* Right grid of 4 */}
          <div className="grid grid-cols-2 gap-5">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative rounded-2xl overflow-hidden h-[225px] cursor-pointer"
              >
                <img
                  src={feat.image}
                  alt={feat.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/65 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span className="font-inter text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-1 block">{feat.tag}</span>
                  <h4 className="font-inter text-sm font-bold text-white mb-1 leading-tight">{feat.title}</h4>
                  <p className="font-inter text-xs text-white/40 leading-relaxed line-clamp-2">{feat.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
