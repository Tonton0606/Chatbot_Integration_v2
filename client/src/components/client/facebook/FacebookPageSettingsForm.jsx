import { useEffect, useState } from "react";
import { BUSINESS_LOGIC_PRESETS, validateBusinessLogicSettings } from "./businessLogicPresets";

const DEFAULT_SETTINGS = {
  pageName: "",
  businessType: "",
  businessDescription: "",
  productsServices: "",
  productServicePriceRanges: "",
  knowledgeBase: "",
  websiteLink: "",
  bookingLink: "",
  shoppeLink: "",
  lazadaLink: "",
  fallbackMode: "booking_and_handoff",
  aiEnabled: true,
  faqEnabled: true,
  suggestionsEnabled: true,
  humanHandoffEnabled: true,
  ownerNotificationEnabled: true,
  aiInstruction: "",
  welcomeEnabled: false,
  welcomeMessage: "",
  defaultReply: "",
  commentAutomationEnabled: false,
  commentReplyTemplate: "",
  commentKeywordFilter: "",
};

export default function FacebookPageSettingsForm({
  settings = null,
  selectedPage = null,
  loading = false,
  saving = false,
  onSave,
}) {
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [selectedPreset, setSelectedPreset] = useState("default");
  const [validationErrors, setValidationErrors] = useState([]);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  useEffect(() => {
    setForm({
      ...DEFAULT_SETTINGS,
      pageName:
        settings?.pageName ||
        selectedPage?.pageName ||
        DEFAULT_SETTINGS.pageName,
      businessType: settings?.businessType || "",
      businessDescription: settings?.businessDescription || "",
      productsServices: settings?.productsServices || "",
      productServicePriceRanges: settings?.productServicePriceRanges || "",
      knowledgeBase: settings?.knowledgeBase || settings?.knowledge_base || "",
      websiteLink: settings?.websiteLink || "",
      bookingLink: settings?.bookingLink || "",
      shoppeLink: settings?.shoppeLink || "",
      lazadaLink: settings?.lazadaLink || "",
      fallbackMode: settings?.fallbackMode || "booking_and_handoff",
      aiEnabled: settings?.aiEnabled !== false,
      faqEnabled: settings?.faqEnabled !== false,
      suggestionsEnabled: settings?.suggestionsEnabled !== false,
      humanHandoffEnabled: settings?.humanHandoffEnabled !== false,
      ownerNotificationEnabled: settings?.ownerNotificationEnabled !== false,
      aiInstruction: settings?.aiInstruction || settings?.ai_instruction || "",
      welcomeEnabled: settings?.welcomeEnabled ?? settings?.welcome_enabled ?? false,
      welcomeMessage: settings?.welcomeMessage || settings?.welcome_message || "",
      defaultReply: settings?.defaultReply || settings?.default_reply || "",
      commentAutomationEnabled: settings?.commentAutomationEnabled === true,
      commentReplyTemplate: settings?.commentReplyTemplate || "",
      commentKeywordFilter: settings?.commentKeywordFilter || "",
      businessLogicSettings: settings?.businessLogicSettings ? JSON.stringify(settings.businessLogicSettings, null, 2) : "",
    });
  }, [settings, selectedPage]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    
    // Parse businessLogicSettings if provided
    const parsedSettings = { ...form };
    if (form.businessLogicSettings) {
      try {
        const parsed = JSON.parse(form.businessLogicSettings);
        const validation = validateBusinessLogicSettings(parsed);
        
        if (!validation.valid) {
          setValidationErrors(validation.errors);
          return;
        }
        
        parsedSettings.businessLogicSettings = parsed;
        setValidationErrors([]);
      } catch (e) {
        setValidationErrors(["Invalid JSON in Business Logic Settings. Please check the format."]);
        return;
      }
    }
    
    onSave?.(parsedSettings);
  };

  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey);
    const preset = BUSINESS_LOGIC_PRESETS[presetKey];
    if (preset) {
      setForm((current) => ({
        ...current,
        businessLogicSettings: JSON.stringify(preset.settings, null, 2),
      }));
      setValidationErrors([]);
    }
  };

  return (
    <form className="facebook-connect-panel" onSubmit={handleSubmit}>
      <div className="facebook-connect-panel-header">
        <div>
          <h2 className="facebook-connect-panel-title">
            Page Knowledge & AI Settings
          </h2>
          <p className="facebook-connect-panel-description">
            This controls how the AI answers questions when no approved FAQ matches.
          </p>
        </div>

        <button
          type="submit"
          className="facebook-connect-button facebook-connect-button-primary"
          disabled={loading || saving || !selectedPage?.pageId}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {!selectedPage?.pageId && (
        <div className="facebook-connect-empty">
          Select or connect a Facebook Page first.
        </div>
      )}

      {selectedPage?.pageId && (
        <div className="facebook-connect-form-grid">
          <label className="facebook-connect-field">
            <span className="facebook-connect-label">Page Name</span>
            <input
              className="facebook-connect-input"
              value={form.pageName}
              onChange={(event) => updateField("pageName", event.target.value)}
              placeholder="Facebook Page"
            />
          </label>

          <label className="facebook-connect-field">
            <span className="facebook-connect-label">Business Type</span>
            <input
              className="facebook-connect-input"
              value={form.businessType}
              onChange={(event) =>
                updateField("businessType", event.target.value)
              }
              placeholder="Restaurant, Retail, Tech Company..."
            />
          </label>

          <label className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">Business Description</span>
            <textarea
              className="facebook-connect-textarea"
              value={form.businessDescription}
              onChange={(event) =>
                updateField("businessDescription", event.target.value)
              }
              placeholder="Describe what this business does, who it serves, and what customers usually ask about."
            />
          </label>

          <label className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">
              AI Custom Instructions (Tone / Rules / Personality)
            </span>
            <textarea
              className="facebook-connect-textarea"
              value={form.aiInstruction}
              onChange={(event) =>
                updateField("aiInstruction", event.target.value)
              }
              placeholder="e.g. Speak Taglish only, use happy emojis, be a witty seller, refer to clients as suki"
            />
          </label>

          <label className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">
              Welcome Message (sent on first contact)
              <input
                type="checkbox"
                checked={form.welcomeEnabled}
                onChange={(e) => updateField("welcomeEnabled", e.target.checked)}
                style={{ marginLeft: "8px", verticalAlign: "middle" }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Enable</span>
            </span>
            <textarea
              className="facebook-connect-textarea"
              value={form.welcomeMessage}
              onChange={(event) =>
                updateField("welcomeMessage", event.target.value)
              }
              placeholder="e.g. Hi! Welcome to our page. How can we help you today? Ask about our products, pricing, or book a demo!"
              disabled={!form.welcomeEnabled}
            />
          </label>

          <label className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">Default Reply (fallback when AI and keyword rules don't match)</span>
            <textarea
              className="facebook-connect-textarea"
              value={form.defaultReply}
              onChange={(event) =>
                updateField("defaultReply", event.target.value)
              }
              placeholder="e.g. Thanks for your message! Our team will get back to you shortly. You can also ask about our products, pricing, or schedule a demo."
            />
          </label>

          <label className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">Products & Services</span>
            <textarea
              className="facebook-connect-textarea"
              value={form.productsServices}
              onChange={(event) =>
                updateField("productsServices", event.target.value)
              }
              placeholder="List products, services, packages, or solutions offered by this page."
            />
          </label>

          <label className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">Pricing / Price Ranges</span>
            <textarea
              className="facebook-connect-textarea"
              value={form.productServicePriceRanges}
              onChange={(event) =>
                updateField("productServicePriceRanges", event.target.value)
              }
              placeholder="Only add approved pricing. Leave blank if pricing should go to consultation."
            />
          </label>

          <label className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">Knowledge Base</span>
            <textarea
              className="facebook-connect-textarea"
              value={form.knowledgeBase}
              onChange={(event) =>
                updateField("knowledgeBase", event.target.value)
              }
              placeholder="Paste any reference info the AI can use to answer customers: policies, FAQs in prose, shipping/returns, hours, common questions, do's and don'ts. The AI uses this when no approved FAQ matches."
              rows={6}
            />
          </label>

          <label className="facebook-connect-field">
            <span className="facebook-connect-label">Website Link</span>
            <input
              className="facebook-connect-input"
              value={form.websiteLink}
              onChange={(event) =>
                updateField("websiteLink", event.target.value)
              }
              placeholder="https://example.com"
            />
          </label>

          <label className="facebook-connect-field">
            <span className="facebook-connect-label">Booking / Meeting Link</span>
            <input
              className="facebook-connect-input"
              value={form.bookingLink}
              onChange={(event) =>
                updateField("bookingLink", event.target.value)
              }
              placeholder="https://example.com/book"
            />
          </label>

          <label className="facebook-connect-field">
            <span className="facebook-connect-label">Shopee Link</span>
            <input
              className="facebook-connect-input"
              value={form.shoppeLink}
              onChange={(event) =>
                updateField("shoppeLink", event.target.value)
              }
              placeholder="Optional"
            />
          </label>

          <label className="facebook-connect-field">
            <span className="facebook-connect-label">Lazada Link</span>
            <input
              className="facebook-connect-input"
              value={form.lazadaLink}
              onChange={(event) =>
                updateField("lazadaLink", event.target.value)
              }
              placeholder="Optional"
            />
          </label>

          <label className="facebook-connect-field">
            <span className="facebook-connect-label">Fallback Mode</span>
            <select
              className="facebook-connect-select"
              value={form.fallbackMode}
              onChange={(event) =>
                updateField("fallbackMode", event.target.value)
              }
            >
              <option value="booking_and_handoff">Booking + Human Handoff</option>
              <option value="booking_only">Booking Only</option>
              <option value="handoff_only">Human Handoff Only</option>
              <option value="safe_reply_only">Safe Reply Only</option>
            </select>
          </label>

          <div className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">AI Controls</span>

            <div className="facebook-connect-grid">
              {[
                ["aiEnabled", "Enable AI replies"],
                ["faqEnabled", "Use approved FAQs"],
                ["suggestionsEnabled", "Create FAQ suggestions"],
                ["humanHandoffEnabled", "Allow human handoff"],
                ["ownerNotificationEnabled", "Notify owner on unknown questions"],
              ].map(([field, label]) => (
                <label key={field} className="facebook-connect-alert">
                  <input
                    type="checkbox"
                    checked={Boolean(form[field])}
                    onChange={(event) =>
                      updateField(field, event.target.checked)
                    }
                  />{" "}
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">Comment Automation</span>
            <label className="facebook-connect-alert">
              <input
                type="checkbox"
                checked={Boolean(form.commentAutomationEnabled)}
                onChange={(event) =>
                  updateField("commentAutomationEnabled", event.target.checked)
                }
              />{" "}
              Auto-reply to post/livestream comments and open a private message
            </label>
          </div>

          {form.commentAutomationEnabled && (
            <>
              <label className="facebook-connect-field facebook-connect-field-full">
                <span className="facebook-connect-label">Comment Reply Template</span>
                <textarea
                  className="facebook-connect-textarea"
                  value={form.commentReplyTemplate}
                  onChange={(event) =>
                    updateField("commentReplyTemplate", event.target.value)
                  }
                  placeholder="Custom public comment reply. Leave blank for default."
                  rows={3}
                />
              </label>

              <label className="facebook-connect-field facebook-connect-field-full">
                <span className="facebook-connect-label">Comment Keyword Filter</span>
                <textarea
                  className="facebook-connect-textarea"
                  value={form.commentKeywordFilter}
                  onChange={(event) =>
                    updateField("commentKeywordFilter", event.target.value)
                  }
                  placeholder="Comma-separated keywords. Only comments containing these will auto-reply. Empty = all comments."
                  rows={2}
                />
              </label>
            </>
          )}

          <div className="facebook-connect-field facebook-connect-field-full">
            <span className="facebook-connect-label">Business Logic Settings</span>
            
            <div className="facebook-connect-grid" style={{ marginBottom: "12px" }}>
              <label className="facebook-connect-field">
                <span className="facebook-connect-label">Preset</span>
                <select
                  className="facebook-connect-select"
                  value={selectedPreset}
                  onChange={(event) => handlePresetChange(event.target.value)}
                >
                  {Object.entries(BUSINESS_LOGIC_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.name} - {preset.description}
                    </option>
                  ))}
                </select>
              </label>
              
              <label className="facebook-connect-alert" style={{ alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={showAdvancedSettings}
                  onChange={(event) => setShowAdvancedSettings(event.target.checked)}
                />{" "}
                Show Advanced JSON Editor
              </label>
            </div>

            {showAdvancedSettings && (
              <>
                {validationErrors.length > 0 && (
                  <div style={{ marginBottom: "12px", padding: "8px", backgroundColor: "#fee", border: "1px solid #fcc", borderRadius: "4px" }}>
                    <strong style={{ color: "#c00" }}>Validation Errors:</strong>
                    <ul style={{ margin: "4px 0 0 20px", color: "#c00" }}>
                      {validationErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <textarea
                  className="facebook-connect-textarea"
                  value={form.businessLogicSettings}
                  onChange={(event) => {
                    updateField("businessLogicSettings", event.target.value);
                    setValidationErrors([]);
                  }}
                  placeholder='{
  "discoveryFieldMappings": {
    "b2b_saas": ["productOrServiceWanted", "businessType", ...]
  },
  "behavioralSignalWeights": {
    "high_engagement": 3,
    "urgency": 4
  },
  "engagementThresholds": {
    "hot": 80,
    "warm": 60
  }
}'
                  rows={12}
                  style={{ fontFamily: "monospace", fontSize: "12px" }}
                />
                <small className="facebook-connect-hint">
                  Advanced: Configure discovery fields, behavioral weights, engagement thresholds, follow-up timing, objection patterns, and language detection. Use presets above for quick configuration.
                </small>
              </>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
