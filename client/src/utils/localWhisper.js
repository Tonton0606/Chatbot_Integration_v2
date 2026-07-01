// Keyless on-device speech-to-text using @huggingface/transformers (Whisper).
//
// Runs ENTIRELY in the browser (WASM / WebGPU) — no API key, no Groq, no cloud
// speech backend. Works on any browser/OS, including Linux Chromium where the
// native Web Speech API fails with a "network" error.
//
// The heavy library + model are loaded lazily on first use (dynamic import →
// separate Vite chunk), so they never weigh down the main bundle. The ~40 MB
// whisper-tiny.en model is fetched once from the HF CDN and cached by the browser.

let transcriberPromise = null;

async function getTranscriber(onProgress) {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      return pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
        progress_callback: onProgress,
      });
    })();
  }
  return transcriberPromise;
}

// Decode a recorded audio Blob into mono Float32 @16 kHz — the format Whisper expects.
async function blobToMono16k(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx({ sampleRate: 16000 });
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    if (decoded.numberOfChannels === 1) return decoded.getChannelData(0);
    const a = decoded.getChannelData(0);
    const b = decoded.getChannelData(1);
    const mono = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) mono[i] = (a[i] + b[i]) / 2;
    return mono;
  } finally {
    ctx.close?.();
  }
}

/**
 * Transcribe a recorded audio Blob locally. Returns the recognized text.
 * @param {Blob} blob - audio captured via MediaRecorder
 * @param {{ onProgress?: Function }} [opts] - model-download progress callback
 */
export async function transcribeBlobLocally(blob, { onProgress } = {}) {
  const transcriber = await getTranscriber(onProgress);
  const audio = await blobToMono16k(blob);
  const result = await transcriber(audio);
  return (result?.text || "").trim();
}

// Lets the UI warm up the model ahead of first use (optional).
export function preloadLocalWhisper(onProgress) {
  return getTranscriber(onProgress).then(() => true).catch(() => false);
}
