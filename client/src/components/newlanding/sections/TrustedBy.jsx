import { useEffect, useRef } from 'react';
import { Shield, Zap, Globe, Lock } from 'lucide-react';

const companies = [
  { name: 'Enterprise', icon: Shield },
  { name: 'Startups', icon: Zap },
  { name: 'Global', icon: Globe },
  { name: 'Secure', icon: Lock },
];

function TrustedBy() {
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
    <section ref={sectionRef} className="py-20 bg-[#0a0e1a] border-y border-[#1a1f2e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-gray-500 mb-8 text-sm uppercase tracking-wider">
          Trusted by innovative companies worldwide
        </p>
        <div className="flex flex-wrap justify-center items-center gap-12">
          {companies.map((company, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-gray-500 hover:text-[#d4a853] transition-colors cursor-default"
            >
              <company.icon className="w-6 h-6" />
              <span className="font-semibold text-lg">{company.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustedBy;
