import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PlayCircle, Volume2 } from 'lucide-react';

// Marketing demo videos live in client/public/ and are served from the site root.
const VIDEOS = [
  {
    key: 'saas',
    label: 'Platform Tour',
    blurb: 'Your entire business — one login',
    src: '/exponify-demo-saas.mp4',
  },
  {
    key: 'storyboard',
    label: 'Why Exponify',
    blurb: 'The story built for PH businesses',
    src: '/exponify-demo-storyboard.mp4',
  },
  {
    key: 'product',
    label: 'Product Demo',
    blurb: 'Modules, workflows & AI at work',
    src: '/exponify-demo-product.mp4',
  },
];

export default function VideoShowcase() {
  // Default to "Why Exponify" and autoplay it.
  const [active, setActive] = useState(
    Math.max(0, VIDEOS.findIndex((v) => v.key === 'storyboard'))
  );
  const current = VIDEOS[active];

  // Browsers block autoplay WITH sound until the visitor interacts with the
  // page. So we autoplay muted, then unmute automatically on the first user
  // gesture (move / click / scroll / tap / key) — the closest possible thing
  // to "autoplay with sound".
  const videoRef = useRef(null);
  const [soundOn, setSoundOn] = useState(false);
  const [showSoundFlash, setShowSoundFlash] = useState(false);

  useEffect(() => {
    if (soundOn) return undefined;
    const enable = () => {
      setSoundOn(true);
      setShowSoundFlash(true);
    };
    const opts = { once: true, passive: true };
    const events = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach((evt) => window.addEventListener(evt, enable, opts));
    return () => events.forEach((evt) => window.removeEventListener(evt, enable, opts));
  }, [soundOn]);

  // Apply mute state to the current <video> (also runs after a clip switch,
  // since `active` remounts the element via its key).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !soundOn;
    if (soundOn) v.play().catch(() => {});
  }, [soundOn, active]);

  // Auto-hide the "Sound on" flash a couple seconds after it appears.
  useEffect(() => {
    if (!showSoundFlash) return undefined;
    const t = setTimeout(() => setShowSoundFlash(false), 2200);
    return () => clearTimeout(t);
  }, [showSoundFlash]);

  return (
    <section id="demo" className="relative py-28 bg-[#070b14] overflow-hidden">

      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: `
          linear-gradient(hsl(var(--primary)/1) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--primary)/1) 1px, transparent 1px)
        `,
        backgroundSize: '52px 52px',
      }} />

      {/* Corner brackets */}
      <div className="absolute top-10 left-6 w-6 h-6 border-l border-t border-primary/20 pointer-events-none" />
      <div className="absolute top-10 right-6 w-6 h-6 border-r border-t border-primary/20 pointer-events-none" />
      <div className="absolute bottom-10 left-6 w-6 h-6 border-l border-b border-primary/20 pointer-events-none" />
      <div className="absolute bottom-10 right-6 w-6 h-6 border-r border-b border-primary/20 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6">

        {/* ── Heading ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-primary/60" />
            <span className="text-primary font-inter text-xs font-semibold tracking-[0.35em] uppercase">See It In Action</span>
            <div className="h-px w-16 bg-primary/60" />
          </div>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-white leading-tight">Watch Exponify</h2>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-primary italic leading-tight">Work for You</h2>
          <p className="font-inter text-white/40 text-lg max-w-2xl mx-auto mt-5">
            From accounting to AI chatbots — see the all-in-one platform that runs Philippine businesses end to end.
          </p>
        </motion.div>

        {/* ── Video player ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* Glow */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 blur-2xl pointer-events-none" />

          <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-black/40 shadow-2xl">
            {/* Top bar accent */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent z-10" />

            {/* "Sound on" flash — appears the moment audio engages */}
            <AnimatePresence>
              {showSoundFlash && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="absolute top-4 right-4 z-20 flex items-center gap-2 rounded-full bg-[#070b14]/85 backdrop-blur-sm border border-primary/30 px-3.5 py-1.5 shadow-lg"
                >
                  <Volume2 className="w-3.5 h-3.5 text-primary" />
                  <span className="font-inter text-[11px] font-semibold text-white tracking-wide">Sound on</span>
                </motion.div>
              )}
            </AnimatePresence>

            <video
              key={current.src}
              ref={videoRef}
              className="w-full aspect-video object-cover bg-black"
              controls
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            >
              <source src={current.src} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Caption */}
          <div className="flex items-center justify-center gap-2 mt-5 text-white/40">
            <PlayCircle className="w-4 h-4 text-primary/70" />
            <span className="font-inter text-xs tracking-wide">{current.label} · Exponify Enterprise Portal</span>
          </div>
        </motion.div>

        {/* ── Selector ── */}
        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          {VIDEOS.map((video, i) => {
            const isActive = i === active;
            return (
              <button
                key={video.key}
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={isActive}
                className={`group relative text-left rounded-xl border px-5 py-4 transition-all duration-300 ${
                  isActive
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-primary/30 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <PlayCircle className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-white/40 group-hover:text-primary/70'}`} />
                  <span className={`font-inter text-sm font-semibold ${isActive ? 'text-white' : 'text-white/70'}`}>
                    {video.label}
                  </span>
                </div>
                <span className="font-inter text-xs text-white/40 leading-relaxed">{video.blurb}</span>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
}
