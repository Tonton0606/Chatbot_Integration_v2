import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, MessageSquare, Users, Package, BarChart3, Bot, Megaphone } from 'lucide-react';

const SERVICES = [
  {
    id: 'inbox',
    Icon: MessageSquare,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    tag: 'UNIFIED COMMUNICATIONS',
    label: 'Hermes Inbox',
    shortDesc: 'AI-powered unified inbox across Facebook, Instagram, TikTok, Shopee, Lazada & more.',
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=900&q=80',
    demo: {
      title: 'Hermes Inbox — Live Demo',
      desc: 'Manage all your customer conversations from every platform in one intelligent inbox. Auto-prioritize, auto-respond, and never miss a message.',
      metrics: [
        { label: 'Avg Response Time', value: '< 2 min' },
        { label: 'Platforms Connected', value: '12+' },
        { label: 'Messages Handled', value: '50K/day' },
      ],
      preview: [
        { platform: 'Facebook', msg: 'Hi! Is this available for delivery?', time: '2m ago', badge: 'bg-blue-500' },
        { platform: 'Shopee', msg: 'Can I get a discount for bulk order?', time: '5m ago', badge: 'bg-orange-500' },
        { platform: 'Instagram', msg: 'Love your products! DM me', time: '8m ago', badge: 'bg-pink-500' },
        { platform: 'TikTok', msg: 'Where can I buy this item?', time: '12m ago', badge: 'bg-slate-500' },
        { platform: 'Lazada', msg: 'Order #8821 — when will this ship?', time: '15m ago', badge: 'bg-indigo-500' },
      ],
    },
  },
  {
    id: 'crm',
    Icon: Users,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    tag: 'CUSTOMER MANAGEMENT',
    label: 'Hermes CRM',
    shortDesc: '360° customer profiles, lead scoring, pipeline management, and lifetime value tracking.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80',
    demo: {
      title: 'Hermes CRM — Live Demo',
      desc: 'See every customer touchpoint, purchase history, and engagement score in one unified profile. AI ranks your hottest leads automatically.',
      metrics: [
        { label: 'Lead Conversion', value: '+47%' },
        { label: 'Customer Profiles', value: 'Full 360°' },
        { label: 'Pipeline Visibility', value: 'Real-time' },
      ],
      preview: [
        { platform: 'Hot Lead', msg: 'Maria Santos — Score: 94/100 | ₱280K LTV', time: 'New', badge: 'bg-emerald-500' },
        { platform: 'Warm Lead', msg: 'John Reyes — Score: 71/100 | ₱95K LTV', time: 'Follow up', badge: 'bg-yellow-500' },
        { platform: 'Customer', msg: 'Ana Cruz — 12 orders | VIP Tier', time: 'Active', badge: 'bg-blue-500' },
        { platform: 'Prospect', msg: 'Carlos Go — Visited pricing 3x today', time: 'Engage now', badge: 'bg-purple-500' },
        { platform: 'Churned', msg: 'Lisa Tan — 90 days inactive', time: 'Win back', badge: 'bg-red-500' },
      ],
    },
  },
  {
    id: 'erp',
    Icon: Package,
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    tag: 'OPERATIONS & INVENTORY',
    label: 'Hermes ERP',
    shortDesc: 'Real-time stock management, automated reorder alerts, margin analysis, and multi-brand catalog.',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&q=80',
    demo: {
      title: 'Hermes ERP — Live Demo',
      desc: "Complete end-to-end operations management. Know exactly what's in stock, what's selling, and what needs restocking — all automated.",
      metrics: [
        { label: 'Stock Accuracy', value: '99.8%' },
        { label: 'Auto Reorders', value: 'Enabled' },
        { label: 'Margin Visibility', value: 'Real-time' },
      ],
      preview: [
        { platform: 'SKU #1021', msg: 'Nike Air Max — Stock: 42 units | Margin: 38%', time: 'In Stock', badge: 'bg-emerald-500' },
        { platform: 'SKU #3045', msg: 'Wireless Earbuds — Stock: 3 units', time: 'Reorder!', badge: 'bg-red-500' },
        { platform: 'SKU #2088', msg: 'Leather Bag — Stock: 18 units | Top Seller', time: 'Moving fast', badge: 'bg-amber-500' },
        { platform: 'SKU #5512', msg: 'USB Hub — Stock: 0 — PO sent to supplier', time: 'On Order', badge: 'bg-blue-500' },
        { platform: 'SKU #1190', msg: 'Skincare Set — New batch arriving Thu', time: 'Incoming', badge: 'bg-purple-500' },
      ],
    },
  },
  {
    id: 'analytics',
    Icon: BarChart3,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    tag: 'AI-POWERED INSIGHTS',
    label: 'Hermes Analytics',
    shortDesc: 'AI-powered revenue forecasting, cohort analysis, funnel metrics, and cross-platform dashboards.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80',
    demo: {
      title: 'Hermes Analytics — Live Demo',
      desc: 'Turn raw data into business decisions. Our AI engine spots trends, flags anomalies, and forecasts your next 90 days of revenue.',
      metrics: [
        { label: 'Forecast Accuracy', value: '93%' },
        { label: 'Data Sources', value: '15+ platforms' },
        { label: 'Reports', value: 'Real-time' },
      ],
      preview: [
        { platform: 'Revenue Today', msg: '₱485,320 — +23% vs last week', time: 'Live', badge: 'bg-emerald-500' },
        { platform: 'Top Channel', msg: 'Shopee — ₱210K (43% of sales)', time: 'Today', badge: 'bg-orange-500' },
        { platform: 'AI Forecast', msg: 'Next 30 days: ₱2.1M projected revenue', time: 'Prediction', badge: 'bg-blue-500' },
        { platform: 'Anomaly Alert', msg: 'Facebook ROAS dropped 15% — investigate', time: 'Warning', badge: 'bg-red-500' },
        { platform: 'Cohort Insight', msg: 'Mar customers 60% repurchase in 60 days', time: 'Insight', badge: 'bg-purple-500' },
      ],
    },
  },
  {
    id: 'chatbot',
    Icon: Bot,
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-400',
    tag: '24/7 AUTOMATION',
    label: 'Hermes AI Chatbot',
    shortDesc: 'Smart auto-replies in Taglish — trained on your brand voice, products, and FAQs. Live 24/7.',
    image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80',
    demo: {
      title: 'Hermes AI Chatbot — Live Demo',
      desc: "Your AI-powered salesperson that never sleeps. Answers questions, qualifies leads, takes orders, and hands off to humans when needed.",
      metrics: [
        { label: 'Availability', value: '24/7' },
        { label: 'Auto-resolved', value: '78%' },
        { label: 'Response Time', value: '< 3 sec' },
      ],
      preview: [
        { platform: 'Customer', msg: 'Magkano po yung bag na white?', time: 'Just now', badge: 'bg-slate-400' },
        { platform: 'AI Bot', msg: 'Ang white leather bag namin ay ₱1,299 po! Available pa rin siya. Gusto niyo po bang i-order?', time: 'Just now', badge: 'bg-pink-500' },
        { platform: 'Customer', msg: 'Meron bang ibang colors?', time: 'Just now', badge: 'bg-slate-400' },
        { platform: 'AI Bot', msg: 'Meron po kaming Black, Brown, at Beige! Free shipping pa po if ₱999 and up ang order.', time: 'Just now', badge: 'bg-pink-500' },
        { platform: 'AI Bot', msg: '[Lead qualified — handing off to agent]', time: 'Auto', badge: 'bg-emerald-500' },
      ],
    },
  },
  {
    id: 'ads',
    Icon: Megaphone,
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    tag: 'AD PERFORMANCE',
    label: 'Hermes Social Ads',
    shortDesc: 'Track ROAS, optimize ad creatives, and attribute revenue across Facebook, TikTok & Shopee Ads.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=900&q=80',
    demo: {
      title: 'Hermes Social Ads — Live Demo',
      desc: 'Stop guessing which ads work. Our platform tracks every peso spent and every peso earned — with AI recommendations to scale winners and cut losers.',
      metrics: [
        { label: 'Avg ROAS', value: '4.8x' },
        { label: 'Ad Platforms', value: 'FB, TT, Shopee' },
        { label: 'AI Optimization', value: 'Daily' },
      ],
      preview: [
        { platform: 'FB Ad #A12', msg: 'Summer Sale — ROAS: 6.2x | Spend: ₱15K', time: 'Scale it', badge: 'bg-emerald-500' },
        { platform: 'TikTok #T04', msg: 'Unboxing Video — ROAS: 4.1x | CTR: 3.8%', time: 'Running', badge: 'bg-blue-500' },
        { platform: 'Shopee Ad #S7', msg: 'Flash Deal Banner — ROAS: 2.1x', time: 'Review', badge: 'bg-yellow-500' },
        { platform: 'FB Ad #A09', msg: 'Old Creative — ROAS: 0.8x — Paused', time: 'AI paused', badge: 'bg-red-500' },
        { platform: 'AI Tip', msg: 'Increase FB #A12 budget by ₱5K — projected +₱31K revenue', time: 'Recommendation', badge: 'bg-purple-500' },
      ],
    },
  },
];

function DemoModal({ service, onClose }: { service: typeof SERVICES[0]; onClose: () => void }) {
  const Icon = service.Icon;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-black/60"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${service.iconBg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${service.iconColor}`} />
            </div>
            <div>
              <h3 className="font-inter text-base font-bold text-white">{service.demo.title}</h3>
              <span className="font-inter text-xs text-primary tracking-widest uppercase font-semibold">{service.tag}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="font-inter text-sm text-white/55 leading-relaxed">{service.demo.desc}</p>

          <div className="grid grid-cols-3 gap-3">
            {service.demo.metrics.map(m => (
              <div key={m.label} className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                <div className={`font-playfair text-xl font-bold ${service.iconColor} mb-1`}>{m.value}</div>
                <div className="font-inter text-xs text-white/40">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-black/30 rounded-xl border border-white/5 overflow-hidden">
            {service.demo.preview.map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
                <span className={`w-2 h-2 rounded-full shrink-0 ${item.badge}`} />
                <span className="font-inter text-xs font-semibold text-white/50 shrink-0 w-24">{item.platform}</span>
                <span className="font-inter text-xs text-white/40 flex-1 truncate">{item.msg}</span>
                <span className="font-inter text-xs text-white/25 whitespace-nowrap">{item.time}</span>
              </div>
            ))}
          </div>

          <a
            href="#contact"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-primary text-[#070b14] font-inter font-bold rounded-full py-4 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300"
          >
            Get Started with {service.label}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Services() {
  const [active, setActive] = useState<typeof SERVICES[0] | null>(null);

  return (
    <section id="services" className="relative py-28 bg-[#070b14] overflow-hidden">

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
        transition={{ duration: 10, repeat: Infinity, ease: 'linear', repeatDelay: 5 }}
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
            <span className="text-primary font-inter text-xs font-semibold tracking-[0.35em] uppercase">Our Services</span>
            <div className="h-px w-16 bg-primary/60" />
          </div>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-white leading-tight">The Hermes</h2>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-primary italic leading-tight">Business Suite</h2>
          <p className="font-inter text-white/40 text-lg max-w-2xl mx-auto mt-5">
            Each service is a live interactive preview. Click any card to see a real-time demo of what Exponify PH delivers for your business.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((svc, i) => {
            const Icon = svc.Icon;
            return (
              <motion.div
                key={svc.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                onClick={() => setActive(svc)}
                className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/[0.07] hover:border-white/[0.14] transition-all duration-300"
              >
                {/* Background image */}
                <img
                  src={svc.image}
                  alt={svc.label}
                  className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/80 to-[#070b14]/30" />

                {/* Content */}
                <div className="relative p-7 flex flex-col min-h-[280px] justify-between">
                  {/* Icon top-left */}
                  <div className="flex items-start justify-between">
                    <div className={`w-11 h-11 rounded-xl ${svc.iconBg} border border-white/5 flex items-center justify-center backdrop-blur-sm`}>
                      <Icon className={`w-5 h-5 ${svc.iconColor}`} />
                    </div>
                    <div className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-white/25 group-hover:border-primary/40 group-hover:text-primary/70 transition-all duration-300">
                      <ArrowRight className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  {/* Text bottom */}
                  <div>
                    <span className="font-inter text-[11px] font-bold text-primary tracking-[0.2em] uppercase mb-2 block">{svc.tag}</span>
                    <h3 className="font-inter text-xl font-bold text-white mb-2 leading-snug">{svc.label}</h3>
                    <p className="font-inter text-sm text-white/45 leading-relaxed mb-5 line-clamp-2">{svc.shortDesc}</p>
                    <span className="font-inter text-sm font-semibold text-primary flex items-center gap-1.5 group-hover:gap-2.5 transition-all duration-300">
                      Click to view live demo <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {active && <DemoModal service={active} onClose={() => setActive(null)} />}
      </AnimatePresence>
    </section>
  );
}
