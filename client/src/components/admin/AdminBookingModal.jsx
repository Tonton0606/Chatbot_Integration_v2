import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Calendar, Clock, Video, Mail, User, Building, Phone, MessageSquare, CheckCircle } from 'lucide-react';
import { timeSlots, platforms } from '../newlanding/data/bookingOptions.js';
import { bookingsApi } from '../../services/api';

const INITIAL_FORM = {
  name: '', company: '', email: '', phone: '',
  platform: '', date: '', time: '', message: '',
};

export default function AdminBookingModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

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
    setSubmitLoading(true);
    setSubmitError('');

    try {
      const payload = {
        full_name:       form.name.trim(),
        company:         form.company.trim() || null,
        email:           form.email.trim(),
        phone:           form.phone.trim() || null,
        preferred_date:  form.date,
        preferred_time:  convertTo24Hour(form.time),
        platform:        form.platform,
        message:         form.message.trim() || null,
        recaptcha_token: 'admin_bypass', // Admin bypass for reCAPTCHA
      };

      const result = await bookingsApi.create(payload);

      setSubmittedEmail(form.email.trim());
      setSubmitted(true);
      setForm(INITIAL_FORM);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Admin booking error:', error);
      setSubmitError(error.message || 'Failed to submit booking.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleClose = () => {
    if (!submitLoading) {
      setSubmitted(false);
      setSubmitError('');
      setForm(INITIAL_FORM);
      onClose();
    }
  };

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
                  {submitted ? 'Booking Created!' : 'Create New Booking'}
                </h2>
                <p className="text-sm text-white/50 font-inter mt-1">
                  {submitted ? 'The booking has been successfully created.' : 'Schedule a new demo session for a client'}
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
                  <h3 className="text-2xl font-bold text-white mb-4 font-playfair">
                    Booking Successful!
                  </h3>
                  <p className="text-white/60 mb-6 max-w-md mx-auto font-inter">
                    The booking has been created for{' '}
                    <span className="text-primary font-semibold">{submittedEmail}</span>.
                  </p>
                  <p className="text-white/40 text-sm font-inter mb-6">
                    The booking is now in pending status and will be visible in the calendar.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-8 px-8 py-3 bg-primary text-[#070b14] font-semibold rounded-full hover:bg-primary/90 transition-colors font-inter"
                  >
                    Close
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
                      <User size={14} className="text-primary" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-inter"
                      placeholder="Enter client's full name"
                    />
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
                      placeholder="Client company name"
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
                        placeholder="client@company.com"
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
                      Meeting Platform *
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
                        name="date"
                        value={form.date}
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
                        name="time"
                        value={form.time}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-inter appearance-none cursor-pointer"
                      >
                        <option value="">Select a time</option>
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
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
                      placeholder="Additional notes or requirements for this booking..."
                    />
                  </div>

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
                    disabled={submitLoading}
                    className="w-full py-4 bg-primary text-[#070b14] font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-inter flex items-center justify-center gap-2"
                  >
                    {submitLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-[#070b14]/30 border-t-[#070b14] rounded-full animate-spin" />
                        Creating Booking...
                      </>
                    ) : (
                      'Create Booking'
                    )}
                  </button>

                  <p className="text-center text-xs text-white/40 font-inter">
                    Admin booking - reCAPTCHA bypass enabled
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
