import { useEffect } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { cn } from "../../../lib/adminUtils";

/* ==========================================
   CARD SYSTEM
========================================== */

export function Card({ children, className }) {
  return (
    <div
      className={cn(
        "rounded-2xl border shadow-sm transition-all duration-200",
        "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)]",
        "hover:border-[var(--brand-gold-border)] hover:shadow-[var(--shadow-md)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }) {
  return (
    <div
      className={cn(
        "px-5 py-4 border-b flex items-center justify-between",
        "border-[var(--border-color)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={cn("text-sm font-semibold tracking-tight text-[var(--text-primary)]", className)}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className }) {
  return <div className={cn("p-5 text-[var(--text-primary)]", className)}>{children}</div>;
}

/* ==========================================
   BADGES
========================================== */

const BVS = {
  success: "bg-[var(--success-soft)] text-[var(--success)] border border-green-500/20",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)] border border-yellow-500/20",
  error: "bg-[var(--danger-soft)] text-[var(--danger)] border border-red-500/20",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)] border border-red-500/20",
  info: "bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]",
  premium: "bg-[var(--brand-gold-soft)] text-[var(--brand-gold)] border border-[var(--brand-gold-border)]",
  gold: "bg-[var(--brand-gold-soft)] text-[var(--brand-gold)] border border-[var(--brand-gold-border)]",
  cyan: "bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]",
  purple: "bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]",
  default: "bg-[var(--hover-bg)] text-[var(--text-secondary)] border border-[var(--border-color)]",
};

export function Badge({ children, variant = "default", className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        BVS[variant] || BVS.default,
        className
      )}
    >
      {children}
    </span>
  );
}

/* ==========================================
   BUTTONS
========================================== */

const BVBtn = {
  primary:
    "bg-[var(--brand-gold)] text-[#050816] hover:bg-[var(--brand-gold-hover)] border border-[var(--brand-gold-border)] shadow-lg shadow-yellow-500/10",
  secondary:
    "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--hover-bg)] hover:border-[var(--brand-gold-border)]",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]",
  ai:
    "bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)] hover:border-[var(--brand-gold-border)]",
  danger: "bg-[var(--danger)] text-white hover:bg-red-600 border border-red-500/30",
};

const BSBtn = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-sm gap-2",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading,
  icon: Icon,
  className,
  disabled,
  ...props
}) {
  return (
    <motion.button
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      whileHover={!disabled && !loading ? { y: -1 } : {}}
      transition={{ duration: 0.12 }}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-colors duration-200",
        "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
        BVBtn[variant] || BVBtn.primary,
        BSBtn[size] || BSBtn.md,
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5" />
      ) : null}
      {children}
    </motion.button>
  );
}

/* ==========================================
   FORM CONTROLS
========================================== */

export function Input({ label, error, icon: Icon, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />}
        <input
          className={cn(
            "block w-full rounded-xl border text-sm py-2.5 pr-3 transition-all duration-200",
            "bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)]",
            "placeholder:text-[var(--text-muted)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)] focus:border-[var(--brand-gold-border)]",
            Icon ? "pl-9" : "pl-3",
            error && "border-red-400",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

const nativeOptionStyle = {
  backgroundColor: "#ffffff",
  color: "#111827",
};

export function Select({ label, options, error, className, children, style, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>}
      <select
        className={cn(
          "block w-full rounded-xl border text-sm py-2.5 px-3 transition-all duration-200",
          "bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)] focus:border-[var(--brand-gold-border)]",
          error && "border-red-400",
          className
        )}
        style={{ colorScheme: "dark light", ...style }}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value} style={nativeOptionStyle}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

export function TextArea({ label, error, className, rows = 3, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>}
      <textarea
        rows={rows}
        className={cn(
          "block w-full rounded-xl border text-sm py-2.5 px-3 resize-none transition-all duration-200",
          "bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)]",
          "placeholder:text-[var(--text-muted)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)] focus:border-[var(--brand-gold-border)]",
          error && "border-red-400",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

export { TextArea as Textarea };

export function Label({ children, className, ...props }) {
  return (
    <label className={cn("block text-sm font-medium text-[var(--text-secondary)]", className)} {...props}>
      {children}
    </label>
  );
}

export function SelectItem({ value, children, style, ...props }) {
  return (
    <option value={value} style={{ ...nativeOptionStyle, ...style }} {...props}>
      {children}
    </option>
  );
}

/* ==========================================
   MODAL / DIALOG
========================================== */

export function Modal({ open, onClose, title, children, className }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative w-full max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl",
              "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)]",
              className || "max-w-md"
            )}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)]">
                ✕
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Dialog({ open, onOpenChange, onClose, children }) {
  const handleClose = () => {
    onOpenChange?.(false);
    onClose?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-3xl shadow-2xl w-full max-h-[90vh] overflow-y-auto max-w-md"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DialogHeader({ children, className }) {
  return <div className={cn("px-5 py-4 border-b border-[var(--border-color)]", className)}>{children}</div>;
}

export function DialogFooter({ children, className }) {
  return <div className={cn("px-5 py-4 border-t border-[var(--border-color)] flex gap-2 justify-end", className)}>{children}</div>;
}

export function DialogTitle({ children, className }) {
  return <h2 className={cn("text-sm font-semibold text-[var(--text-primary)]", className)}>{children}</h2>;
}

export function DialogDescription({ children, className }) {
  return <p className={cn("text-sm text-[var(--text-secondary)]", className)}>{children}</p>;
}

export function DialogContent({ children, className }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

/* ==========================================
   STAT CARD
========================================== */

const STAT_COLORS = {
  gold: "bg-[var(--brand-gold-soft)] text-[var(--brand-gold)] border border-[var(--brand-gold-border)]",
  cyan: "bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]",
  success: "bg-green-500/10 text-green-400 border border-green-500/20",
  danger: "bg-red-500/10 text-red-400 border border-red-500/20",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)] border border-yellow-500/20",
  purple: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  violet: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  indigo: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  pink: "bg-pink-500/10 text-pink-400 border border-pink-500/20",
  lime: "bg-lime-500/10 text-lime-400 border border-lime-500/20",
  amber: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  slate: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
};

/* Parse a display value to extract prefix/number/suffix for count-up */
function parseDisplayValue(v) {
  if (typeof v === 'number') return { prefix: '', num: v, suffix: '', isNumeric: true };
  const s = String(v);
  const match = s.match(/^([^0-9]*)([0-9][0-9,.]*)(.*)$/);
  if (!match) return { isNumeric: false, raw: s };
  const num = parseFloat(match[2].replace(/,/g, ''));
  if (isNaN(num)) return { isNumeric: false, raw: s };
  return { prefix: match[1], num, suffix: match[3], isNumeric: true };
}

/* Animated number display using framer-motion spring */
function AnimatedValue({ value }) {
  const parsed = parseDisplayValue(value);
  const spring = useSpring(0, { stiffness: 80, damping: 18, restDelta: 0.5 });

  useEffect(() => {
    if (parsed.isNumeric) spring.set(parsed.num);
  }, [parsed.num, parsed.isNumeric, spring]);

  const display = useTransform(spring, (v) => {
    if (!parsed.isNumeric) return parsed.raw;
    const isFloat = parsed.suffix === '%' || String(parsed.num).includes('.');
    const formatted = v.toLocaleString('en-US', {
      minimumFractionDigits: isFloat ? 1 : 0,
      maximumFractionDigits: isFloat ? 1 : 0,
    });
    return `${parsed.prefix}${formatted}${parsed.suffix}`;
  });

  if (!parsed.isNumeric) {
    return <span>{value}</span>;
  }

  return <motion.span>{display}</motion.span>;
}

export function StatCard({ title, value, sub, icon: Icon, color = "gold", trend, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.07,
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
    <Card className="relative overflow-hidden h-full">
      <div className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.10),transparent_35%)]" />
      <div className="relative p-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            <AnimatedValue value={value} />
          </p>
          {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
          {trend && (
            <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              trend === 'up' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {trend === 'up' ? '↑ Trending up' : '↓ Needs attention'}
            </div>
          )}
        </div>
        {Icon && (
          <motion.div
            className={cn("w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0", STAT_COLORS[color] || STAT_COLORS.gold)}
            whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
          >
            <Icon className="w-5 h-5" />
          </motion.div>
        )}
      </div>
    </Card>
    </motion.div>
  );
}

/* ==========================================
   KANBAN
========================================== */

const KANBAN_COLOR_MAP = {
  gold: "bg-[var(--brand-gold)]",
  cyan: "bg-[var(--brand-cyan)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
};

export function KanbanColumn({ title, count, color = "gold", children }) {
  const resolvedColor = color?.startsWith?.("bg-") ? color : KANBAN_COLOR_MAP[color] || "bg-[var(--brand-gold)]";

  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("w-2.5 h-2.5 rounded-full", resolvedColor)} />
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{title}</span>
        <span className="ml-auto text-xs font-semibold text-[var(--text-muted)] bg-[var(--hover-bg)] border border-[var(--border-color)] px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/* ==========================================
   TABLES
========================================== */

export function Table({ children, className }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <table className={cn("min-w-full divide-y divide-[var(--border-color)]", className)}>{children}</table>
    </div>
  );
}

export function TableHead({ children }) {
  return <thead className="bg-[var(--hover-bg)]">{children}</thead>;
}

export function TableBody({ children }) {
  return <tbody className="bg-[var(--bg-card)] divide-y divide-[var(--border-color)]">{children}</tbody>;
}

export function TableRow({ children, className }) {
  return <tr className={cn("hover:bg-[var(--hover-bg)] transition-colors", className)}>{children}</tr>;
}

export function TableHeader({ children, className }) {
  return (
    <th className={cn("px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider", className)}>
      {children}
    </th>
  );
}

export function TableCell({ children, className }) {
  return <td className={cn("px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]", className)}>{children}</td>;
}

/* ==========================================
   AVATAR
========================================== */

const AVATAR_SIZE_CLASSES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ name, src, size = "md", className, children }) {
  if (children) {
    return (
      <div className={cn("rounded-full flex items-center justify-center overflow-hidden", AVATAR_SIZE_CLASSES[size], className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-[#050816]",
        "bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-cyan-bright)]",
        AVATAR_SIZE_CLASSES[size],
        className
      )}
    >
      {src ? <img src={src} alt={name} className="w-full h-full rounded-full object-cover" /> : getInitials(name)}
    </div>
  );
}

export function AvatarImage({ src, alt, className }) {
  return <img src={src} alt={alt} className={cn("w-full h-full rounded-full object-cover", className)} />;
}

export function AvatarFallback({ children, name, className }) {
  const displayName = children || getInitials(name);
  return (
    <div
      className={cn(
        "w-full h-full rounded-full flex items-center justify-center font-bold text-[#050816]",
        "bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-cyan-bright)]",
        className
      )}
    >
      {displayName}
    </div>
  );
}

/* ==========================================
   FEEDBACK / UTILITY
========================================== */

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse bg-[var(--hover-bg)] rounded-xl", className)} />;
}

export function Switch({ checked, onChange, label, className, ...props }) {
  return (
    <label className={cn("relative inline-flex items-center cursor-pointer", className)}>
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} {...props} />
      <div
        className={cn(
          "w-9 h-5 rounded-full peer transition-all",
          "bg-[var(--hover-bg)] border border-[var(--border-color)]",
          "peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--brand-gold-soft)]",
          "peer-checked:bg-[var(--brand-gold)]",
          "after:content-[''] after:absolute after:top-[2px] after:left-[2px]",
          "after:bg-white after:border after:border-[var(--border-color)] after:rounded-full",
          "after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"
        )}
      />
      {label && <span className="ml-2 text-sm font-medium text-[var(--text-secondary)]">{label}</span>}
    </label>
  );
}

export function Progress({ value, className }) {
  return (
    <div className={cn("w-full bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-full h-2.5 overflow-hidden", className)}>
      <div
        className="bg-gradient-to-r from-[var(--brand-gold)] to-[var(--brand-cyan-bright)] h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }}
      />
    </div>
  );
}
