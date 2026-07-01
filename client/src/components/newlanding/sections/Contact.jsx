import { useEffect, useRef, useState } from 'react';
import { Mail, MessageCircle, Send, CheckCircle } from 'lucide-react';

function Contact() {
  const sectionRef = useRef(null);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate form submission
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <section ref={sectionRef} className="py-24 bg-[#0a0e1a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Join thousands of teams using HermesV2 to power their AI operations. 
              Questions? We're here to help.
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#d4a853]/10 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-[#d4a853]" />
                </div>
                <div>
                  <p className="font-medium text-white">Email Us</p>
                  <p className="text-gray-400">support@hermesv2.com</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#22c55e]/10 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-[#22c55e]" />
                </div>
                <div>
                  <p className="font-medium text-white">Live Chat</p>
                  <p className="text-gray-400">Available 24/7</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0d111d] border border-[#1a1f2e] p-8 rounded-2xl">
            {submitted ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-[#22c55e] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
                <p className="text-gray-400">We'll get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#2a2f3e] bg-[#070b14] text-white focus:ring-2 focus:ring-[#d4a853] focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#2a2f3e] bg-[#070b14] text-white focus:ring-2 focus:ring-[#d4a853] focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#2a2f3e] bg-[#070b14] text-white focus:ring-2 focus:ring-[#d4a853] focus:border-transparent outline-none transition-all resize-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#d4a853] to-[#b8944f] hover:from-[#e0b860] hover:to-[#c49e5a] text-[#070b14] font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#d4a853]/20"
                >
                  <Send className="w-5 h-5" />
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Contact;
