import { useEffect, useRef } from 'react';
import { Cpu, MessageSquare, Shield, Terminal } from 'lucide-react';

const capabilities = [
  { icon: MessageSquare, label: 'Natural Language', value: '99.2%' },
  { icon: Cpu, label: 'Response Time', value: '<100ms' },
  { icon: Shield, label: 'Security Score', value: 'A+' },
  { icon: Terminal, label: 'API Uptime', value: '99.9%' },
];

function AIEngine() {
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
    <section ref={sectionRef} className="py-24 bg-[#070b14] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold text-white mb-6">
              Powered by{' '}
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Groq LLM
              </span>
            </h2>
            <p className="text-lg text-gray-400 mb-8">
              Experience lightning-fast AI responses with Llama 3.1. Our optimized infrastructure 
              delivers sub-100ms inference times for real-time conversational experiences.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {capabilities.map((cap, index) => (
                <div
                  key={index}
                  className="p-4 bg-[#0d111d] rounded-xl border border-[#1a1f2e] hover:border-[#2a2f3e] transition-colors"
                >
                  <cap.icon className="w-6 h-6 text-[#d4a853] mb-2" />
                  <p className="text-sm text-gray-500">{cap.label}</p>
                  <p className="text-2xl font-bold text-white">{cap.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-3xl opacity-20" />
            <div className="relative bg-slate-900 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-800">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-4 text-slate-400 text-sm">HermesV2 AI Console</span>
              </div>
              <div className="space-y-4 font-mono text-sm">
                <div className="text-green-400">$ hermes-ai --status</div>
                <div className="text-slate-300">
                  <span className="text-blue-400">→</span> Groq API: <span className="text-green-400">Connected</span>
                </div>
                <div className="text-slate-300">
                  <span className="text-blue-400">→</span> Model: <span className="text-yellow-400">llama-3.1-8b-instant</span>
                </div>
                <div className="text-slate-300">
                  <span className="text-blue-400">→</span> Latency: <span className="text-green-400">45ms avg</span>
                </div>
                <div className="text-slate-300">
                  <span className="text-blue-400">→</span> Tokens/sec: <span className="text-green-400">850</span>
                </div>
                <div className="text-green-400 mt-4">$ _</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AIEngine;
