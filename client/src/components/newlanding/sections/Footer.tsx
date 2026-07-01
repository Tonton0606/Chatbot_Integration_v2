import { ArrowUp } from 'lucide-react';
import logo from '../../../assets/EXPONIFY_LOGO.png';

const LINKS = {
  Services: ['Hermes CRM', 'Hermes ERP', 'AI Chatbot', 'Social Ads', 'Analytics'],
  Solutions: ['E-Commerce', 'Retail', 'Healthcare', 'Finance', 'Real Estate'],
  Company: ['About Us', 'Careers', 'Blog', 'Press', 'Contact'],
};

export default function Footer() {
  return (
    <footer className="bg-[#070b14] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <img
                src={logo}
                alt="Exponify PH"
                className="w-9 h-9 rounded-full object-cover"
              />
              <span className="font-playfair text-lg font-bold text-white">Exponify PH</span>
            </div>
            <p className="font-inter text-sm text-white/35 leading-relaxed mb-6 max-w-xs">
              AI-powered business growth platform for forward-thinking Philippine enterprises. Automate. Accelerate. Dominate.
            </p>
            <div className="flex gap-2">
              {['FB', 'IG', 'TW', 'LI'].map(s => (
                <a
                  key={s}
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center font-inter text-[10px] text-white/30 hover:text-primary hover:border-primary/30 transition-colors"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Link groups */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group}>
              <h4 className="font-inter text-xs font-bold text-white/40 uppercase tracking-widest mb-5">{group}</h4>
              <ul className="space-y-3">
                {links.map(link => (
                  <li key={link}>
                    <a href="#" className="font-inter text-sm text-white/30 hover:text-primary transition-colors duration-300">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-inter text-xs text-white/20">
            &copy; {new Date().getFullYear()} Exponify PH. All rights reserved.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/30 hover:text-primary hover:border-primary/30 transition-colors"
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
}
