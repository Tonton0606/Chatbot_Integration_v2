import { useEffect, useRef } from 'react';
import { Sparkles, Zap, Lock, Globe } from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered',
    description: 'Groq LLM integration for lightning-fast responses and intelligent automation.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Sub-second response times with optimized infrastructure and edge caching.',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Lock,
    title: 'Enterprise Security',
    description: 'Nuclei + Trivy scanning, Supabase auth, and comprehensive audit logging.',
    color: 'from-green-500 to-teal-500',
  },
  {
    icon: Globe,
    title: 'Global Scale',
    description: 'Built on Render cloud with automatic scaling and 99.9% uptime guarantee.',
    color: 'from-blue-500 to-cyan-500',
  },
];

function Features() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-[#070b14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Why Choose HermesV2
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Built with modern open-source tools for maximum performance, security, and flexibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="relative p-8 rounded-2xl bg-[#0d111d] backdrop-blur border border-[#1a1f2e] hover:border-[#2a2f3e] transition-all duration-300 group"
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${feature.color} rounded-t-2xl`} />
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#d4a853] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
