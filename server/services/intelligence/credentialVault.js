const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

function getKey() {
  const secret = process.env.INTELLIGENCE_CREDENTIALS_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return crypto.createHash("sha256").update(String(secret || "development-only-intelligence-key")).digest();
}

function encryptCredentials(credentials) {
  if (!credentials || !Object.keys(credentials).length) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

function redactDataSource(source = {}) {
  return {
    ...source,
    credentials_encrypted: source.credentials_encrypted ? "[encrypted]" : null,
    has_credentials: Boolean(source.credentials_encrypted),
  };
}

module.exports = {
  encryptCredentials,
  redactDataSource,
};
