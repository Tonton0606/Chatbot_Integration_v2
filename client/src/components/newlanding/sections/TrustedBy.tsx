import { motion } from 'framer-motion';

const LOGOS = ['Salesforce', 'Oracle', 'SAP', 'Microsoft', 'Adobe', 'Slack', 'Zoom', 'HubSpot'];

export default function TrustedBy() {
  return (
    <section className="py-14 bg-[#070b14] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center gap-4 mb-10">
          <div className="h-px w-16 bg-primary/40" />
          <p className="font-inter text-xs text-white/25 tracking-[0.4em] uppercase whitespace-nowrap">
            Trusted by industry leaders worldwide
          </p>
          <div className="h-px w-16 bg-primary/40" />
        </div>
        <div className="flex flex-wrap justify-center items-center gap-x-14 gap-y-5">
          {LOGOS.map((name, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="font-inter text-sm font-bold text-white/15 hover:text-primary/60 transition-colors duration-300 cursor-default tracking-widest uppercase"
            >
              {name}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
