/**
 * Meta (Facebook) Pixel loader.
 * Initialises the base pixel on first import and exposes a typed
 * track() helper so components never call window.fbq directly.
 *
 * Pixel ID is read from VITE_META_PIXEL_ID at build time.
 * If the var is absent (local dev without a pixel) every call is a no-op.
 */

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '';

function initPixel() {
  if (!PIXEL_ID || typeof window === 'undefined') return;
  if (window.fbq) return; // already loaded

  /* eslint-disable */
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');
}

/**
 * Track a standard or custom Meta event.
 * @param {string} event  - e.g. 'Schedule', 'Lead', 'Purchase'
 * @param {object} params - optional event parameters
 */
export function trackEvent(event, params = {}) {
  if (!PIXEL_ID || !window.fbq) return;
  window.fbq('track', event, params);
}

// Initialise immediately when this module is first imported
initPixel();
