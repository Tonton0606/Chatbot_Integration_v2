const express = require('express');
const { supabase } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const logger = require('../config/logger');
const { safeError } = require('../utils/safeError');

const router = express.Router();

const BUCKET = 'avatars';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — reasonable for profile photos

// Allowed MIME types (no SVG — prevents stored XSS)
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// Magic byte signatures — verifies actual file content, not just declared Content-Type
// An attacker can send contentType: "image/jpeg" with a PHP payload; magic bytes catch that.
const MAGIC = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png':  [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif':  [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  // WebP: RIFF....WEBP
  'image/webp': null, // handled separately below
};

function hasValidMagicBytes(buf, contentType) {
  if (contentType === 'image/webp') {
    // RIFF (4 bytes) + size (4 bytes) + WEBP (4 bytes)
    return (
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    );
  }
  const signatures = MAGIC[contentType];
  if (!signatures) return false;
  return signatures.some(sig => sig.every((byte, i) => buf[i] === byte));
}

async function ensureBucket() {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: [...ALLOWED_TYPES],
  });
  if (error && !error.message?.toLowerCase().includes('already exists') && !error.message?.toLowerCase().includes('duplicate')) {
    logger.warn({ err: error }, '[storage] bucket creation warning');
  }
}

// POST /api/storage/avatar
// Body: { base64: "data:image/...;base64,...", filename: "photo.jpg", contentType: "image/jpeg" }
router.post('/avatar', requireAuth, async (req, res, next) => {
  try {
    const { base64, filename, contentType } = req.body || {};

    if (!base64 || !filename || !contentType) {
      return res.status(400).json({ error: 'base64, filename, and contentType are required.' });
    }

    // Allowlist check — rejects SVG, PDF, executables, etc.
    if (!ALLOWED_TYPES.has(contentType)) {
      return res.status(400).json({ error: 'Only JPEG, PNG, GIF, or WebP images are allowed.' });
    }

    // Strip data-URL prefix
    const raw = base64.replace(/^data:image\/[^;]+;base64,/, '');
    const buffer = Buffer.from(raw, 'base64');

    // Size guard
    if (buffer.byteLength > MAX_BYTES) {
      return res.status(400).json({ error: 'File exceeds 5 MB limit.' });
    }

    // Magic bytes — catches content-type spoofing attacks
    if (!hasValidMagicBytes(buffer, contentType)) {
      logger.warn({ userId: req.user.id, contentType }, '[storage] magic byte mismatch — possible spoofing attempt');
      return res.status(400).json({ error: 'File content does not match the declared image type.' });
    }

    await ensureBucket();

    const userId = req.user.id;
    const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true });

    if (uploadError) {
      logger.error({ err: uploadError }, '[storage] upload error');
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    // Cache-buster so browser shows updated photo immediately
    const url = `${publicUrl}?t=${Date.now()}`;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', userId);

    if (profileError) {
      logger.warn({ err: profileError }, '[storage] profile update failed');
    }

    return res.json({ url });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/storage/avatar  — clear the avatar
router.delete('/avatar', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', userId);

    if (error) return res.status(500).json({ error: safeError(error) });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
