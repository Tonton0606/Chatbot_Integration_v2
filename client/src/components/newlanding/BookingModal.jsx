import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Calendar, Clock, Video, Mail, User, Building, Phone, MessageSquare, CheckCircle } from 'lucide-react';

import { timeSlots, platforms } from './data/bookingOptions.js';
/* ─────────────────────────────────────────────────────────────────
   reCAPTCHA v2 — "I'm not a robot" checkbox
───────────────────────────────────────────────────────────────────── */
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '';
const SITEKEY_MISSING = !RECAPTCHA_SITE_KEY || RECAPTCHA_SITE_KEY.trim() === '';

function loadRecaptchaScript() {
  if (document.getElementById('recaptcha-script')) return;
  const script    = document.createElement('script');
  script.id       = 'recaptcha-script';
  script.src      = 'https://www.google.com/recaptcha/api.js?render=explicit&onload=__onRecaptchaLoad';
  script.async    = true;
  script.defer    = true;
  document.head.appendChild(script);
}

function RecaptchaBlock({ onVerified, onExpired, resetSignal }) {
  const containerRef = useRef(null);
  const widgetIdRef  = useRef(null);
  const [ready, setReady] = useState(false);

  const renderWidget = useCallback(() => {
    if (!containerRef.current)        return;
    if (widgetIdRef.current !== null) return;
    if (!window.grecaptcha?.render)   return;
    if (SITEKEY_MISSING)              return;

    try {
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey:            RECAPTCHA_SITE_KEY,
        theme:              'dark',
        callback:           (token) => { onVerified(token); },
        'expired-callback': ()      => { onExpired?.(); },
        'error-callback':   ()      => { onExpired?.(); },
      });
      setReady(true);
    } catch (err) {
      console.error('reCAPTCHA render error:', err);
    }
  }, [onVerified, onExpired]);

  useEffect(() => {
    if (SITEKEY_MISSING) return;

    if (window.grecaptcha?.render) {
      renderWidget();
    } else {
      window.__onRecaptchaLoad = () => renderWidget();
      loadRecaptchaScript();

      const poll = setInterval(() => {
        if (window.grecaptcha?.render) {
          clearInterval(poll);
          renderWidget();
        }
      }, 300);
      return () => clearInterval(poll);
    }
  }, [renderWidget]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current !== null && window.grecaptcha?.reset) {
      window.grecaptcha.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  if (SITEKEY_MISSING) {
    return (
      <div className="ep-recaptcha-wrapper">
        <div className="ep-recaptcha-missing">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <strong>reCAPTCHA not configured</strong>
            <p>
              Add <code>VITE_RECAPTCHA_SITE_KEY=your_site_key</code> to your <code>.env</code> file,
              then restart the dev server.{' '}
              <a href="https://www.google.com/recaptcha/admin" target="_blank" rel="noreferrer">
                Get a free key →
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ep-recaptcha-wrapper">
      {!ready && (
        <div className="ep-recaptcha-skeleton">
          <div className="ep-recaptcha-sk-checkbox" />
          <span className="ep-recaptcha-sk-label">I'm not a robot</span>
          <div className="ep-recaptcha-sk-brand">
            <div className="ep-recaptcha-sk-icon" />
            <span className="ep-recaptcha-sk-name">reCAPTCHA</span>
            <span className="ep-recaptcha-sk-sub">Privacy · Terms</span>
          </div>
        </div>
      )}
      <div ref={containerRef} style={{ display: ready ? 'block' : 'none' }} />
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────── */
const RECAPTCHA_CSS = `
  .ep-recaptcha-wrapper { margin-bottom: 1.5rem; }
  .ep-recaptcha-missing {
    display: flex; align-items: flex-start; gap: 10px;
    background: rgba(255,167,38,0.08); border: 1px solid rgba(255,167,38,0.35);
    border-radius: 8px; padding: 12px 14px; color: #ffa726;
    font-size: 0.83rem; max-width: 420px;
  }
  .ep-recaptcha-missing svg { flex-shrink: 0; margin-top: 2px; }
  .ep-recaptcha-missing strong { display: block; margin-bottom: 4px; }
  .ep-recaptcha-missing p { margin: 0; color: #b07c1a; line-height: 1.5; }
  .ep-recaptcha-missing code { background: rgba(255,167,38,0.15); border-radius: 3px; padding: 1px 5px; font-size: 0.8rem; }
  .ep-recaptcha-missing a { color: #ffa726; }
  .ep-recaptcha-skeleton {
    display: flex; align-items: center; gap: 14px;
    width: 304px; height: 78px; background: #1e2d40;
    border: 1px solid rgba(255,255,255,0.1); border-radius: 3px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.4); padding: 0 16px;
    overflow: hidden; position: relative;
  }
  .ep-recaptcha-skeleton::after {
    content: ''; position: absolute; top: 0; left: -100%;
    width: 55%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
    animation: ep-rc-shimmer 1.8s infinite;
  }
  @keyframes ep-rc-shimmer { to { left: 160%; } }
  .ep-recaptcha-sk-checkbox { width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.18); border-radius: 2px; background: rgba(255,255,255,0.04); flex-shrink: 0; }
  .ep-recaptcha-sk-label { flex: 1; font-size: 0.88rem; color: rgba(255,255,255,0.3); font-family: sans-serif; }
  .ep-recaptcha-sk-brand { display: flex; flex-direction: column; align-items: center; gap: 3px; flex-shrink: 0; }
  .ep-recaptcha-sk-icon { width: 32px; height: 32px; border-radius: 50%; border: 3px solid transparent; border-top-color: rgba(66,133,244,0.5); border-right-color: rgba(52,168,83,0.4); border-bottom-color: rgba(234,67,53,0.4); animation: ep-rc-spin 2s linear infinite; }
  @keyframes ep-rc-spin { to { transform: rotate(360deg); } }
  .ep-recaptcha-sk-name { font-size: 0.6rem; color: rgba(255,255,255,0.25); font-family: sans-serif; }
  .ep-recaptcha-sk-sub { font-size: 0.52rem; color: rgba(255,255,255,0.15); font-family: sans-serif; }
`;

let cssInjected = false;
function injectStyles() {
  if (cssInjected) return;
  const tag = document.createElement('style');
  tag.textContent = RECAPTCHA_CSS;
  document.head.appendChild(tag);
  cssInjected = true;
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────── */
const INITIAL_FORM = {
  firstName: '',
  middleName: '',
  lastName: '',
  company: '',
  email: '',
  phone: '',
  platform: 'zoom',
  preferred_date: '',
  preferred_time: '',
  message: '',
};

export default function BookingModal({ isOpen, onClose }) {
  const [form, setForm]                     = useState(INITIAL_FORM);
  const [submitted, setSubmitted]           = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submitLoading, setSubmitLoading]   = useState(false);
  const [submitError, setSubmitError]       = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [resetSignal, setResetSignal]       = useState(0);

  useEffect(() => { injectStyles(); }, []);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const convertTo24Hour = (timeStr) => {
    const [time, meridiem] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!SITEKEY_MISSING && !recaptchaToken) {
      setSubmitError("Please tick \"I'm not a robot\" before submitting.");
      document.querySelector('.ep-recaptcha-wrapper')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitLoading(true);
    setSubmitError('');

    try {
      const payload = {
        full_name: [form.firstName, form.middleName, form.lastName]
          .filter(Boolean).join(' ').trim(),
        company:         form.company.trim() || null,
        email:           form.email.trim(),
        phone:           form.phone.trim() || null,
        preferred_date:  form.preferred_date,
        preferred_time:  convertTo24Hour(form.preferred_time),
        platform:        form.platform,
        message:         form.message.trim() || null,
        recaptcha_token: recaptchaToken || null,
      };

      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/landing/public/book`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        }
      );

      const text = await res.text();
      let result = {};
      try { result = text ? JSON.parse(text) : {}; } catch {}

      if (!res.ok) {
        throw new Error(result.error || result.message || text || `Server error: ${res.status}`);
      }

      setSubmittedEmail(form.email.trim());
      setSubmitted(true);
      setForm(INITIAL_FORM);
      setRecaptchaToken('');
      setResetSignal((s) => s + 1);
    } catch (error) {
      console.error('Booking error:', error);
      setSubmitError(error.message || 'Failed to submit booking.');
      setRecaptchaToken('');
      setResetSignal((s) => s + 1);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleClose = () => {
    if (!submitLoading) {
      setSubmitted(false);
      setSubmitError('');
      setForm(INITIAL_FORM);
      setRecaptchaToken('');
      onClose();
    }
  };

  const captchaBlocking = !SITEKEY_MISSING && !recaptchaToken;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] bg-[#0d1525] border border-white/10 rounded-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold text-white font-playfair">
                  {submitted ? 'Booking Confirmed!' : 'Book a Demo'}
                </h2>
                <p className="text-sm text-white/50 font-inter mt-1">
                  {submitted ? "We'll be in touch shortly." : 'Schedule your personalized demo session'}
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={submitLoading}
                className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} className="text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 font-playfair">Thank You!</h3>
                  <p className="text-white/60 mb-6 max-w-md mx-auto font-inter">
                    Your demo request has been received. A confirmation email has been sent to{' '}
                    <span className="text-primary font-semibold">{submittedEmail}</span>.
                  </p>
                  <p className="text-white/40 text-sm font-inter">
                    Our team will review your request and send you the meeting details once approved.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-8 px-8 py-3 bg-primary text-[#070b14] font-semibold rounded-full hover:bg-primary/90 transition-colors font-inter"
                  >
                    Got it
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Name — 3 split fields */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
                        <User size={14} className="text-primary" />
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-inter"
                        placeholder="Juan"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
                        <User size={14} className="text-primary" />
                        Middle Name
                      </label>
                      <input
                        type="text"
                        name="middleName"
                        value={form.middleName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-inter"
                        placeholder="M."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
                        <User size={14} className="text-primary" />
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-inter"
                        placeholder="dela Cruz"
                      />
                    </div>
                  </div>

                  {/* Company */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
                      <Building size={14} className="text-primary" />
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={form.company}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-inter"
                      placeholder="Your Company, Inc."
                    />
                  </div>

                  {/* Email & Phone */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
                        <Mail size={14} className="text-primary" />
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-inter"
                        placeholder="you@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
                        <Phone size={14} className="text-primary" />
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-inter"
                        placeholder="+63 912 345 6789"
                      />
                    </div>
                  </div>

                  {/* Platform */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
                      <Video size={14} className="text-primary" />
                      Saan mo gustong makapag usap *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {platforms.map((p) => (
                        <label
                          key={p.id}
                          className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all font-inter ${
                            form.platform === p.id
                              ? 'border-primary bg-primary/10'
                              : 'border-white/10 bg-[#070b14] hover:border-white/20'
                          }`}
                        >
                          <input
                            type="radio"
                            name="platform"
                            value={p.id}
                            checked={form.platform === p.id}
                            onChange={handleChange}
                            required
                            className="sr-only"
                          />
                          <Video size={18} className={form.platform === p.id ? 'text-primary' : 'text-white/40'} />
                          <span className={form.platform === p.id ? 'text-white font-medium' : 'text-white/60'}>
                            {p.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
                        <Calendar size={14} className="text-primary" />
                        Preferred Date *
                      </label>
                      <input
                        type="date"
                        name="preferred_date"
                        value={form.preferred_date}
                        onChange={handleChange}
                        required
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-inter [color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
                        <Clock size={14} className="text-primary" />
                        Preferred Time *
                      </label>
                      <select
                        name="preferred_time"
                        value={form.preferred_time}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-inter appearance-none cursor-pointer"
                      >
                        <option value="">Select a time</option>
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
                      <MessageSquare size={14} className="text-primary" />
                      Message (Optional)
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none font-inter"
                      placeholder="Tell us about your project or any specific requirements..."
                    />
                  </div>

                  {/* reCAPTCHA */}
                  <RecaptchaBlock
                    onVerified={(token) => { setRecaptchaToken(token); setSubmitError(''); }}
                    onExpired={() => setRecaptchaToken('')}
                    resetSignal={resetSignal}
                  />

                  {/* Error */}
                  {submitError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-inter"
                    >
                      {submitError}
                    </motion.div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitLoading || captchaBlocking}
                    className="w-full py-4 bg-primary text-[#070b14] font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-inter flex items-center justify-center gap-2"
                  >
                    {submitLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-[#070b14]/30 border-t-[#070b14] rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Request Demo'
                    )}
                  </button>

                  {captchaBlocking && (
                    <p className="text-center font-inter" style={{ fontSize: '0.78rem', color: '#546e7a', marginTop: '8px' }}>
                      Tick "I'm not a robot" above to enable this button.
                    </p>
                  )}

                  <p className="text-center text-xs text-white/40 font-inter">
                    By submitting, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
