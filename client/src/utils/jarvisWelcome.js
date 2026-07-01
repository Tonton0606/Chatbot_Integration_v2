// JARVIS-style spoken welcome for the admin shell.
//
// Uses the browser-native Web Speech Synthesis API — fully local, no API key,
// no network — so it works on every browser/OS (unlike the cloud STT path).
// Greets once per browser session, time-aware and personalized, and can be
// disabled by the user (localStorage "hermes_jarvis_welcome" = "off").

const GREETED_KEY = "hermes_jarvis_greeted"; // sessionStorage — once per session
const PREF_KEY = "hermes_jarvis_welcome";    // localStorage  — "off" disables

function timeGreeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Prefer a British English voice for the JARVIS timbre; fall back gracefully.
function pickVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return (
    voices.find((v) => /en-GB/i.test(v.lang) && /male|daniel|george|arthur|oliver/i.test(v.name)) ||
    voices.find((v) => /en-GB/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    voices[0] ||
    null
  );
}

export function isJarvisWelcomeEnabled() {
  try {
    return localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setJarvisWelcomeEnabled(enabled) {
  try {
    localStorage.setItem(PREF_KEY, enabled ? "on" : "off");
  } catch {
    /* non-fatal */
  }
}

export function speakJarvisWelcome(displayName) {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!isJarvisWelcomeEnabled()) return;
    if (sessionStorage.getItem(GREETED_KEY) === "1") return;

    const first = String(displayName || "").trim().split(/\s+/)[0] || "Administrator";
    const text = `${timeGreeting()}, ${first}. All systems are online. Welcome back to Hermes.`;

    const speak = () => {
      // Atomic guard so the voiceschanged listener and the timeout fallback
      // can never both fire the greeting.
      if (sessionStorage.getItem(GREETED_KEY) === "1") return;
      sessionStorage.setItem(GREETED_KEY, "1");

      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = v?.lang || "en-GB";
      u.rate = 0.95; // measured, composed
      u.pitch = 0.9; // slightly lower for gravitas
      u.volume = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    };

    // getVoices() is populated asynchronously; wait for it if empty.
    if ((window.speechSynthesis.getVoices() || []).length === 0) {
      window.speechSynthesis.addEventListener("voiceschanged", speak, { once: true });
      setTimeout(speak, 700); // fallback if the event never fires
    } else {
      speak();
    }
  } catch {
    /* non-fatal — a missing greeting must never break the admin shell */
  }
}
