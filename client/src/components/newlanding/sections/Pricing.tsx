import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '₱29,000',
    period: '/month',
    description: 'For growing businesses ready to put AI to work.',
    features: [
      'AI Sales Automation (up to 500 leads/mo)',
      'Automated Email Campaigns',
      'Lead Scoring & Segmentation',
      'Basic Analytics Dashboard',
      'CRM Integration (1 platform)',
      'Email & Chat Support',
    ],
    cta: 'Get Started',
    featured: false,
  },
  {
    name: 'Growth',
    price: '₱79,000',
    period: '/month',
    description: 'For ambitious teams that want the full AI advantage.',
    features: [
      'Everything in Starter',
      'Unlimited Lead Processing',
      'Predictive Analytics & Forecasting',
      'Multi-channel Campaign Automation',
      'AI Assistant (24/7)',
      'Revenue Intelligence Reporting',
      'Priority Support + Dedicated Manager',
    ],
    cta: 'Start Growing',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations that need maximum power and control.',
    features: [
      'Everything in Growth',
      'Custom AI Model Training',
      'White-label Options',
      'Advanced Security & Compliance',
      'Dedicated AI Infrastructure',
      'On-site Team Training',
      'Executive Strategy Sessions',
    ],
    cta: 'Contact Sales',
    featured: false,
  },
];

export default function Pricing() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute inset-0 bg-dot-pattern opacity-20 pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 lg:px-8" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-bold tracking-widest text-primary uppercase mb-4 border border-primary/30 rounded-full px-4 py-1.5">
            Pricing
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4">
            Invest in Growth,{' '}
            <span className="text-gradient">Not Overhead</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Transparent, predictable pricing with no hidden fees. Every plan includes onboarding and a dedicated launch specialist.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-2xl p-7 border transition-all duration-300 hover:-translate-y-1 ${
                plan.featured
                  ? 'glass-card border-primary/50 shadow-lg shadow-primary/10'
                  : 'glass-card border-white/5 hover:border-white/10'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-[#080C16] text-xs font-bold tracking-wider uppercase px-4 py-1.5 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-serif text-2xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                <div className="flex items-end gap-1">
                  <span className={`font-serif text-4xl font-bold ${plan.featured ? 'text-primary' : 'text-white'}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-gray-500 text-sm mb-1.5">{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3 text-sm text-gray-300">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${plan.featured ? 'bg-primary/20' : 'bg-white/5'}`}>
                      <Check size={11} className={plan.featured ? 'text-primary' : 'text-gray-400'} />
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              <a
                href="#contact"
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-sm transition-all duration-300 ${
                  plan.featured
                    ? 'bg-primary text-[#080C16] glow-primary glow-primary-hover hover:scale-[1.02]'
                    : 'border border-white/15 text-white hover:border-primary/40 hover:bg-white/5'
                }`}
              >
                {plan.cta}
                <ArrowRight size={15} />
              </a>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="text-center text-gray-600 text-sm mt-8"
        >
          All prices in Philippine Peso. 30-day money-back guarantee on Starter and Growth plans.
        </motion.p>
      </div>
    </section>
  );
}
