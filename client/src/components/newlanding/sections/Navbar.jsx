import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import logo from '../../../assets/EXPONIFY_LOGO.png';

const navLinks = [
  { name: 'Services',  href: '#services' },
  { name: 'Features',  href: '#features' },
  { name: 'Demo',      href: '#demo' },
  { name: 'AI Engine', href: '#ai' },
  { name: 'Process',   href: '#process' },
  { name: 'Contact',   href: '#contact' },
];

export default function Navbar({ onLogin, onSignup, onBookDemo }) {
  const [scrolled, setScrolled]   = useState(false);
  const [open, setOpen]           = useState(false);
  const [active, setActive]       = useState('');

  /* scroll-glass */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* active-section tracker */
  useEffect(() => {
    const ids = navLinks.map(l => l.href.replace('#', ''));
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const isActive = (href) => active === href.replace('#', '');

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#070b14]/90 backdrop-blur-xl border-b border-white/[0.06] shadow-xl shadow-black/30'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between gap-8">

        {/* ── Logo ── */}
        <a href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <img
              src={logo}
              alt="Exponify PH"
              className="relative w-9 h-9 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-primary/40 transition-all duration-300"
            />
          </div>
          <span className="font-playfair text-[17px] font-bold text-white tracking-tight">
            Exponify <span className="text-primary">PH</span>
          </span>
        </a>

        {/* ── Desktop nav ── */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(l => {
            const active_ = isActive(l.href);
            return (
              <a
                key={l.name}
                href={l.href}
                className="relative group px-4 py-2 rounded-lg"
              >
                {/* hover bg pill */}
                <span className="absolute inset-0 rounded-lg bg-white/0 group-hover:bg-white/[0.05] transition-colors duration-200" />

                {/* label */}
                <span
                  className={`relative font-inter text-[13px] font-medium tracking-wide transition-colors duration-200 ${
                    active_ ? 'text-white' : 'text-white/50 group-hover:text-white/90'
                  }`}
                >
                  {l.name}
                </span>

                {/* active / hover underline dot */}
                <motion.span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[3px] rounded-full bg-primary"
                  initial={false}
                  animate={{ width: active_ ? 20 : 0, opacity: active_ ? 1 : 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                />
              </a>
            );
          })}
        </nav>

        {/* ── Desktop CTAs ── */}
        <div className="hidden md:flex items-center gap-2 shrink-0">

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mr-1" />

          {/* Log In — ghost text */}
          <button
            onClick={onLogin}
            className="font-inter text-[13px] font-medium text-white/55 hover:text-white px-4 py-2 rounded-lg hover:bg-white/[0.05] transition-all duration-200"
          >
            Log In
          </button>

          {/* Sign Up — outline pill */}
          <button
            onClick={onSignup}
            className="font-inter text-[13px] font-medium text-white/80 hover:text-white border border-white/15 hover:border-white/30 rounded-full px-5 py-2 transition-all duration-200 hover:bg-white/[0.04]"
          >
            Sign Up
          </button>

          {/* Book a Demo — filled gold pill */}
          <button
            onClick={onBookDemo}
            className="relative inline-flex items-center gap-2 font-inter text-[13px] font-bold text-[#070b14] rounded-full px-5 py-2 overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(43 100% 65%) 100%)',
              boxShadow: '0 0 18px hsl(var(--primary)/0.35), 0 2px 8px hsl(var(--primary)/0.25)',
            }}
          >
            <span className="relative z-10">Book a Demo</span>
            <ArrowRight className="relative z-10 w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
            {/* shine sweep */}
            <motion.span
              className="absolute inset-0 bg-white/20"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.45 }}
            />
          </button>
        </div>

        {/* ── Mobile toggle ── */}
        <button
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-all"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-[#070b14]/95 backdrop-blur-xl border-b border-white/[0.06]"
          >
            <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-1">
              {navLinks.map(l => (
                <a
                  key={l.name}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`font-inter text-sm font-medium px-3 py-3 rounded-lg flex items-center justify-between transition-all duration-200 ${
                    isActive(l.href)
                      ? 'text-white bg-white/[0.06]'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {l.name}
                  {isActive(l.href) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </a>
              ))}

              <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-white/[0.06]">
                <button
                  onClick={() => { setOpen(false); onLogin(); }}
                  className="font-inter text-sm font-medium text-center text-white/60 hover:text-white py-3 rounded-lg hover:bg-white/[0.04] transition-all"
                >
                  Log In
                </button>
                <button
                  onClick={() => { setOpen(false); onSignup(); }}
                  className="font-inter text-sm font-medium text-center border border-white/15 text-white/80 rounded-full py-3 hover:border-white/30 transition-all"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => { setOpen(false); onBookDemo(); }}
                  className="font-inter text-sm font-bold text-center text-[#070b14] rounded-full py-3"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(43 100% 65%) 100%)',
                    boxShadow: '0 0 16px hsl(var(--primary)/0.3)',
                  }}
                >
                  Book a Demo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
