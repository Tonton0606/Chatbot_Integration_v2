import { useEffect, useRef } from 'react';
import { Quote, Star } from 'lucide-react';

const testimonials = [
  {
    quote: "HermesV2 transformed our customer support. The AI chatbot handles 80% of inquiries instantly.",
    author: "Sarah Chen",
    role: "CTO at TechStart",
    rating: 5,
  },
  {
    quote: "The security scanning caught vulnerabilities we didn't know existed. Game changer for our compliance.",
    author: "Michael Torres",
    role: "Security Lead at FinCorp",
    rating: 5,
  },
  {
    quote: "Setup took 10 minutes. The Groq integration makes responses incredibly fast.",
    author: "Emma Wilson",
    role: "Founder at ScaleUp",
    rating: 5,
  },
];

function Testimonials() {
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
            Loved by Teams
          </h2>
          <p className="text-xl text-gray-400">
            See what our users say about HermesV2
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-[#0d111d] p-8 rounded-2xl border border-[#1a1f2e] hover:border-[#2a2f3e] transition-colors"
            >
              <Quote className="w-10 h-10 text-[#d4a853] mb-4" />
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#d4a853] text-[#d4a853]" />
                ))}
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div>
                <p className="font-bold text-white">{testimonial.author}</p>
                <p className="text-sm text-gray-500">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
