import { useEffect, useRef } from 'react';
import { UserPlus, Settings, Rocket, LineChart } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    number: '01',
    title: 'Create Account',
    description: 'Sign up in seconds with email or SSO. No credit card required.',
  },
  {
    icon: Settings,
    number: '02',
    title: 'Configure',
    description: 'Add your Groq API key and customize your AI assistant settings.',
  },
  {
    icon: Rocket,
    number: '03',
    title: 'Deploy',
    description: 'Deploy to Render with one click. Automatic SSL and scaling.',
  },
  {
    icon: LineChart,
    number: '04',
    title: 'Scale',
    description: 'Monitor usage, analyze insights, and scale as you grow.',
  },
];

function Process() {
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
    <section ref={sectionRef} className="py-24 bg-[#0a0e1a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Get Started in Minutes
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            From zero to production-ready AI assistant in four simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-blue-500 to-transparent" />
              )}
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
                  <div className="absolute inset-0 bg-[#d4a853]/10 rounded-full" />
                  <div className="relative w-16 h-16 bg-gradient-to-br from-[#d4a853] to-[#b8944f] rounded-full flex items-center justify-center shadow-lg shadow-[#d4a853]/20">
                    <step.icon className="w-8 h-8 text-[#070b14]" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-[#1a1f2e] text-white text-sm font-bold rounded-full flex items-center justify-center border border-[#2a2f3e]">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-400">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Process;
