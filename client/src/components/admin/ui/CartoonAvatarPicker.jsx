import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Shuffle, Check, Sparkles, Wand2 } from 'lucide-react';

/* ─── Keyframe CSS injected once ───────────────────────────────────────────── */
const STYLE_TAG = `
  @keyframes avatar-float {
    0%,100% { transform: translateY(0px) rotate(-1deg); }
    50%      { transform: translateY(-8px) rotate(1deg); }
  }
  @keyframes avatar-wiggle {
    0%,100% { transform: rotate(-4deg) scale(1.05); }
    50%      { transform: rotate(4deg) scale(1.05); }
  }
  @keyframes avatar-pulse-ring {
    0%,100% { box-shadow: 0 0 0 0px hsl(45 93% 47% / 0.7), 0 0 18px hsl(45 93% 47% / 0.3); }
    50%      { box-shadow: 0 0 0 6px hsl(45 93% 47% / 0), 0 0 28px hsl(45 93% 47% / 0.6); }
  }
  @keyframes avatar-bounce {
    0%,100% { transform: translateY(0); }
    40%      { transform: translateY(-10px); }
    60%      { transform: translateY(-5px); }
  }
  @keyframes avatar-spin-in {
    from { transform: rotate(-8deg) scale(0.8); opacity: 0; }
    to   { transform: rotate(0deg) scale(1);   opacity: 1; }
  }
  @keyframes sparkle-orbit {
    from { transform: rotate(0deg) translateX(22px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(22px) rotate(-360deg); }
  }
  .avatar-float  { animation: avatar-float  3s ease-in-out infinite; }
  .avatar-bounce { animation: avatar-bounce 2.4s ease-in-out infinite; }
  .avatar-wiggle { animation: avatar-wiggle 0.4s ease-in-out; }
  .avatar-pulse-ring { animation: avatar-pulse-ring 2s ease-in-out infinite; }
  .avatar-spin-in    { animation: avatar-spin-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
`;

if (typeof document !== 'undefined' && !document.getElementById('cartoon-avatar-styles')) {
  const el = document.createElement('style');
  el.id = 'cartoon-avatar-styles';
  el.textContent = STYLE_TAG;
  document.head.appendChild(el);
}

/* ─── DiceBear styles catalogue ─────────────────────────────────────────────── */
const AVATAR_STYLES = [
  { id: 'adventurer',      label: 'Adventurer',  emoji: '🧙',  animation: 'avatar-float'  },
  { id: 'fun-emoji',       label: 'Fun Emoji',   emoji: '😄',  animation: 'avatar-bounce' },
  { id: 'lorelei',         label: 'Illustrative',emoji: '🎨',  animation: 'avatar-float'  },
  { id: 'micah',           label: 'Micah',       emoji: '🌟',  animation: 'avatar-bounce' },
  { id: 'avataaars',       label: 'Comic',       emoji: '💥',  animation: 'avatar-float'  },
  { id: 'croodles',        label: 'Croodles',    emoji: '✏️',  animation: 'avatar-bounce' },
  { id: 'pixel-art',       label: 'Pixel Art',   emoji: '👾',  animation: 'avatar-float'  },
  { id: 'thumbs',          label: 'Thumbs',      emoji: '👍',  animation: 'avatar-bounce' },
];

const BASE_SEEDS = [
  'Felix','Luna','Zara','Milo','Nova','Kai','Aria','Rex',
  'Orion','Lyra','Echo','Dusk','Ember','Storm','Blaze','Sage',
];

function dicebearUrl(style, seed) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=120&radius=12`;
}

function randomSeed() {
  const words = ['Comet','Pixel','Neon','Frost','Blaze','Storm','Echo','Tide',
                 'Dusk','Dawn','Flux','Glow','Haze','Iris','Jade','Kite'];
  return words[Math.floor(Math.random() * words.length)] + Math.floor(Math.random() * 99);
}

/* ─── Single avatar card ─────────────────────────────────────────────────────── */
function AvatarCard({ url, selected, onClick, delay = 0, animation }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, scale: 0.7, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18, delay }}
      className="relative flex flex-col items-center gap-1 focus:outline-none"
    >
      {/* Glow ring behind when selected */}
      {selected && (
        <motion.div
          layoutId="selected-ring"
          className="absolute inset-[-4px] rounded-2xl avatar-pulse-ring"
          style={{ background: 'hsl(45 93% 47% / 0.15)', borderRadius: 18 }}
        />
      )}

      <div
        className={`relative w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
          selected
            ? 'border-[hsl(45_93%_47%)] shadow-lg shadow-yellow-500/30'
            : 'border-white/10 hover:border-white/30'
        } ${hovered ? 'avatar-wiggle' : animation}`}
        style={{ background: '#0d1525' }}
      >
        <img
          src={url}
          alt="Avatar option"
          className="w-full h-full object-contain p-1"
          loading="lazy"
        />
      </div>

      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[hsl(45_93%_47%)] flex items-center justify-center shadow-md"
        >
          <Check className="w-3 h-3 text-[#050816]" />
        </motion.div>
      )}
    </motion.button>
  );
}

/* ─── Main picker component ──────────────────────────────────────────────────── */
export default function CartoonAvatarPicker({ onSelect, onClose, currentUrl }) {
  const [activeStyle, setActiveStyle] = useState(AVATAR_STYLES[0]);
  const [seeds, setSeeds] = useState(BASE_SEEDS.slice(0, 12));
  const [selected, setSelected] = useState(currentUrl || null);
  const [applying, setApplying] = useState(false);

  const shuffleSeeds = useCallback(() => {
    setSeeds(prev => [...prev].map(() => randomSeed()));
  }, []);

  const handleApply = async () => {
    if (!selected) return;
    setApplying(true);
    await onSelect(selected);
    setApplying(false);
    onClose();
  };

  const avatarList = seeds.map(s => ({
    seed: s,
    url: dicebearUrl(activeStyle.id, s),
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 30 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="relative w-full max-w-2xl rounded-3xl border border-white/[0.08] overflow-hidden"
        style={{ background: '#0a0f1d' }}
      >
        {/* Top gold shimmer */}
        <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[hsl(45_93%_47%/0.5)] to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[hsl(45_93%_47%/0.15)] border border-[hsl(45_93%_47%/0.3)] flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-[hsl(45_93%_47%)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Cartoon Avatar Generator</h2>
              <p className="text-[10px] text-white/35">Pick a style · choose a character · apply</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/25 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Style tabs */}
        <div className="flex gap-1 px-4 pt-4 pb-2 overflow-x-auto no-scrollbar">
          {AVATAR_STYLES.map(style => (
            <button
              key={style.id}
              type="button"
              onClick={() => setActiveStyle(style)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeStyle.id === style.id
                  ? 'bg-[hsl(45_93%_47%/0.15)] text-[hsl(45_93%_47%)] border border-[hsl(45_93%_47%/0.3)]'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              <span>{style.emoji}</span>
              {style.label}
            </button>
          ))}
        </div>

        {/* Preview selected avatar (large, animated) */}
        {selected && (
          <div className="flex justify-center py-4">
            <div className="relative">
              <div
                className={`w-20 h-20 rounded-2xl overflow-hidden border-2 border-[hsl(45_93%_47%)] shadow-xl shadow-yellow-500/20 avatar-pulse-ring ${activeStyle.animation}`}
                style={{ background: '#0d1525' }}
              >
                <img src={selected} alt="Selected avatar" className="w-full h-full object-contain p-1.5" />
              </div>
              {/* Sparkle orbit */}
              <Sparkles
                className="absolute w-3 h-3 text-[hsl(45_93%_47%)]"
                style={{ top: '50%', left: '50%', animation: 'sparkle-orbit 3s linear infinite', marginTop: -6, marginLeft: -6 }}
              />
            </div>
          </div>
        )}

        {/* Avatar grid */}
        <div className="px-5 pb-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStyle.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-6 gap-3"
            >
              {avatarList.map(({ seed, url }, i) => (
                <AvatarCard
                  key={`${activeStyle.id}-${seed}`}
                  url={url}
                  selected={selected === url}
                  onClick={() => setSelected(url)}
                  delay={i * 0.03}
                  animation={activeStyle.animation}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={shuffleSeeds}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-white/50 hover:text-white hover:border-white/25 transition-all"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Randomize
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-white/50 hover:text-white transition-all"
            >
              Cancel
            </button>
            <motion.button
              type="button"
              onClick={handleApply}
              disabled={!selected || applying}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="relative flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-[#050816] overflow-hidden disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, hsl(45 93% 47%) 0%, hsl(43 100% 65%) 100%)',
                boxShadow: '0 0 18px hsl(45 93% 47% / 0.4)',
              }}
            >
              {applying ? (
                <div className="w-3.5 h-3.5 border-2 border-[#050816] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {applying ? 'Applying…' : 'Use This Avatar'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
