const cors = require("cors");

const IS_DEV = process.env.NODE_ENV !== "production";

const PRODUCTION_ORIGINS = [
  "https://exponify.ph",
  "https://www.exponify.ph",
  "https://hermesv2-frontend.onrender.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

const DEV_ORIGINS = IS_DEV
  ? [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
    ]
  : [];

const ALLOWED_ORIGINS = [...PRODUCTION_ORIGINS, ...DEV_ORIGINS];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https:\/\/(hermesv2-frontend|hermesbackend(-[a-z0-9]+)?|chatbot-integration-[a-zA-Z0-9-]+)\.onrender\.com$/.test(origin)) return true;
  if (IS_DEV && /^http:\/\/(192\.168|10\.|172\.(1[6-9]|2\d|3[0-1]))\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`Blocked by CORS: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-workspace-id"],
  credentials: true,
  optionsSuccessStatus: 204,
};

// Public, embeddable lead-capture surface. These endpoints are unauthenticated
// by design (AGENTS.md §5.2) and are embedded on arbitrary client domains
// (e.g. a client landing page hosted on Vercel), so the request origin is
// reflected — never the literal "*" — and credentials are disabled to keep this
// a pure data-intake surface. The workspace is selected by the landing slug in
// the body, not by the origin, so an open origin cannot cross workspaces.
const PUBLIC_CAPTURE_PREFIX = "/api/landing/public";

const publicCaptureCorsOptions = {
  origin: true,
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: false,
  optionsSuccessStatus: 204,
};

function corsDelegate(req, callback) {
  if (req.path.startsWith(PUBLIC_CAPTURE_PREFIX)) {
    return callback(null, publicCaptureCorsOptions);
  }
  return callback(null, corsOptions);
}

module.exports = {
  cors,
  corsOptions,
  publicCaptureCorsOptions,
  corsDelegate,
  isAllowedOrigin,
};
// trigger restart
