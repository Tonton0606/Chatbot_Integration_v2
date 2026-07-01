-- 040_facebook_business_logic_settings.sql
-- Adds configurable business logic settings to Facebook page configuration
-- Allows admins to customize discovery fields, behavioral weights, follow-up timing, and objection patterns

ALTER TABLE public.client_facebook_page_settings
  ADD COLUMN IF NOT EXISTS discovery_field_mappings jsonb,
  ADD COLUMN IF NOT EXISTS behavioral_signal_weights jsonb,
  ADD COLUMN IF NOT EXISTS engagement_thresholds jsonb,
  ADD COLUMN IF NOT EXISTS follow_up_sequences jsonb,
  ADD COLUMN IF NOT EXISTS objection_patterns jsonb,
  ADD COLUMN IF NOT EXISTS language_detection_keywords jsonb;

COMMENT ON COLUMN public.client_facebook_page_settings.discovery_field_mappings IS
  'JSON mapping of page types to ordered discovery field arrays. Example: {"b2b_saas": ["productOrServiceWanted", "businessType", ...]}';

COMMENT ON COLUMN public.client_facebook_page_settings.behavioral_signal_weights IS
  'JSON mapping of signal types to weight values. Example: {"high_engagement": 3, "urgency": 4, ...}';

COMMENT ON COLUMN public.client_facebook_page_settings.engagement_thresholds IS
  'JSON mapping of lead temperature thresholds. Example: {"hot": 80, "warm": 60, "interested": 40, "curious": 20}';

COMMENT ON COLUMN public.client_facebook_page_settings.follow_up_sequences IS
  'JSON array of follow-up sequence definitions with timing. Example: [{"name": "new_lead", "stages": [{"delay": 5, ...}]}]';

COMMENT ON COLUMN public.client_facebook_page_settings.objection_patterns IS
  'JSON mapping of objection types to regex patterns. Example: {"price_objection": ["mahal", "gastos", ...]}';

COMMENT ON COLUMN public.client_facebook_page_settings.language_detection_keywords IS
  'JSON array of Filipino/English keywords for language detection. Example: ["ano", "paano", "what", "how"]';

-- Insert default values for existing records
UPDATE public.client_facebook_page_settings
SET discovery_field_mappings = '{
  "b2b_saas": ["productOrServiceWanted", "businessType", "problemEncountered", "desiredSolution", "dailyVolume"],
  "software": ["productOrServiceWanted", "businessType", "problemEncountered", "desiredSolution", "dailyVolume"],
  "booking_business": ["productOrServiceWanted", "problemEncountered", "desiredSolution", "preferredSchedule"],
  "consultation_business": ["productOrServiceWanted", "problemEncountered", "desiredSolution", "budgetOrQuantity"],
  "ecommerce_business": ["productOrServiceWanted", "budgetOrQuantity", "location"],
  "product_business": ["productOrServiceWanted", "budgetOrQuantity", "location"],
  "service_business": ["productOrServiceWanted", "problemEncountered", "desiredSolution", "location"],
  "mixed_business": ["productOrServiceWanted", "problemEncountered", "desiredSolution"],
  "unknown": ["productOrServiceWanted", "problemEncountered", "desiredSolution"]
}'::jsonb,
behavioral_signal_weights = '{
  "high_engagement": 3,
  "urgency": 4,
  "decision_stage": 2,
  "objection": 2,
  "trust_building": 2,
  "contact_ready": 3,
  "information_gathering": 1,
  "comparison_shopping": 2
}'::jsonb,
engagement_thresholds = '{
  "hot": 80,
  "warm": 60,
  "interested": 40,
  "curious": 20
}'::jsonb,
follow_up_sequences = '[
  {
    "name": "new_lead",
    "stages": [
      {"delay": 5, "trigger": "no_reply", "template": "new_lead_initial"},
      {"delay": 60, "trigger": "no_reply", "template": "new_lead_hour"},
      {"delay": 1440, "trigger": "no_reply", "template": "new_lead_day"},
      {"delay": 4320, "trigger": "no_reply", "template": "new_lead_final"}
    ]
  },
  {
    "name": "hot_lead",
    "stages": [
      {"delay": 5, "trigger": "no_reply", "template": "hot_lead_immediate"},
      {"delay": 30, "trigger": "no_reply", "template": "hot_lead_urgent"},
      {"delay": 120, "trigger": "no_reply", "template": "hot_lead_final"}
    ]
  },
  {
    "name": "interested_but_stalled",
    "stages": [
      {"delay": 1440, "trigger": "stall_detected", "template": "stall_value_reminder"},
      {"delay": 2880, "trigger": "no_reply", "template": "stall_social_proof"},
      {"delay": 4320, "trigger": "no_reply", "template": "stall_final"}
    ]
  },
  {
    "name": "demo_scheduled",
    "stages": [
      {"delay": 60, "trigger": "demo_reminder", "template": "demo_reminder_1hr"},
      {"delay": 1440, "trigger": "no_reply", "template": "demo_no_show"}
    ]
  }
]'::jsonb,
objection_patterns = '{
  "price_objection": ["mahal", "gastos", "budget", "pera", "walang pondo", "walang pera", "expensive", "costly", "pricey", "too much", "di ko afford", "di ko kaya", "hindi ko afford", "hindi ko kaya", "cheaper", "bawas", "discount", "sale", "promo"],
  "stall_objection": ["i'll think", "think about it", "consider", "i'll consider", "mamimili", "magsusuri", "review", "check", "i'll get back", "balik", "follow up", "follow-up", "next time", "mamaya", "bukas", "later", "mamaya na", "after", "soon"],
  "details_request": ["send details", "send info", "email me", "text me", "message me", "details first", "info first", "brochure", "catalog", "pamphlet", "ipadala", "send", "paki send", "paki-text", "paki-email"],
  "trust_objection": ["legit", "legitimate", "scam", "fake", "trust", "tiwala", "nagdadalawang isip", "doubt", "sigurado", "siguradong", "prove", "proba", "testimonials", "reviews", "ref", "referral", "nagkaroon", "nagka"],
  "competitor_objection": ["other", "iba", "competitor", "kumpetisyon", "cheaper elsewhere", "mas mura", "other option", "kumuha na lang", "kumuha sa", "try other", "check other"],
  "timing_objection": ["not ready", "hindi pa", "too early", "mamaya pa", "next month", "next year", "busy", "occupied", "no time", "walang oras", "hindi oras"],
  "authority_objection": ["ask my", "consult", "partner", "spouse", "boss", "manager", "team", "pamilya", "asawa", "magulang", "kumonsulta", "tanungin"]
}'::jsonb,
language_detection_keywords = '{
  "filipino": ["ano", "anong", "mga", "paano", "saan", "kailan", "magkano", "presyo", "bayad", "meron", "wala", "pwede", "pede", "puwede", "kayo", "nyo", "niyo", "namin", "po", "opo", "salamat", "makakabili", "tulong", "serbisyo", "produkto", "inyo", "kita", "ko", "mo", "sa", "ang", "na", "at"],
  "english": ["what", "how", "where", "when", "why", "who", "which", "can", "do", "does", "is", "are", "service", "services", "product", "products"]
}'::jsonb
WHERE discovery_field_mappings IS NULL;
