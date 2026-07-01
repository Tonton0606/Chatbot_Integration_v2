export const DOMAIN_TARGET =
  import.meta.env.VITE_RENDER_CUSTOM_DOMAIN_TARGET ||
  "hermesfrontend-k551.onrender.com";

export function getDomainStatusClass(status) {
  if (status === "verified") {
    return "bg-[var(--success-soft)] text-[var(--success)]";
  }

  if (status === "warning") {
    return "bg-yellow-500/10 text-yellow-400";
  }

  if (status === "duplicate" || status === "failed") {
    return "bg-[var(--danger-soft)] text-[var(--danger)]";
  }

  return "bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]";
}

export function getResultTitle(result) {
  if (result?.status === "verified") return "Domain Verified";
  if (result?.status === "duplicate") return "Domain Already Used";
  if (result?.status === "failed") return "Domain Check Failed";
  if (result?.status === "pending") return "Domain Pending Setup";
  return "Domain Needs Review";
}
