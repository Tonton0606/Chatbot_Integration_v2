/**
 * Test Suite for Facebook Chatbot CSR + Sales Agent Improvements
 * Tests objection handling, follow-up automation, and behavioral triggers
 */

// Mock dependencies
const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Import modules to test
const {
  detectObjectionType,
  buildObjectionResponse,
  shouldHandleObjection,
} = require('../facebookObjectionHandling');

const {
  detectBehavioralSignals,
  calculateEngagementScore,
  determineLeadTemperature,
  detectBuyingIntent,
  generateBehavioralInsights,
  predictNextBestAction,
} = require('../facebookBehavioralTriggers');

const {
  determineFollowUpSequence,
  shouldSendFollowUp,
  checkFollowUpNeeded,
} = require('../facebookFollowUpAutomation');

describe('Objection Handling System', () => {
  const mockCompactReply = (text) => text;
  const mockPageConfig = {
    pageName: 'Test Business',
    productServices: 'Automation, CRM, Chatbot',
    productServicePriceRanges: 'Starter: ₱5,000\nPro: ₱15,000',
    websiteLink: 'https://test.com',
  };
  const mockPageIntelligence = {
    rawCustomerMessage: 'Mahal po eh',
  };
  const mockData = {
    pendingLeadData: {
      productOrServiceWanted: 'Automation',
      businessType: 'E-commerce',
    },
  };

  describe('detectObjectionType', () => {
    test('detects price objections', () => {
      expect(detectObjectionType('Mahal po eh')).toBe('price_objection');
      expect(detectObjectionType('Expensive yata')).toBe('price_objection');
      expect(detectObjectionType('Wala kaming pondo')).toBe('price_objection');
      expect(detectObjectionType('Di ko afford')).toBe('price_objection');
    });

    test('detects stalling objections', () => {
      expect(detectObjectionType("I'll think about it")).toBe('stall_objection');
      expect(detectObjectionType('Mamaya na lang')).toBe('stall_objection');
      expect(detectObjectionType('I\'ll get back to you')).toBe('stall_objection');
    });

    test('detects details request', () => {
      expect(detectObjectionType('Send details please')).toBe('details_request');
      expect(detectObjectionType('Email me the info')).toBe('details_request');
      expect(detectObjectionType('Paki send ng brochure')).toBe('details_request');
    });

    test('detects trust objections', () => {
      expect(detectObjectionType('Legit ba to?')).toBe('trust_objection');
      expect(detectObjectionType('May scam ba dito?')).toBe('trust_objection');
      expect(detectObjectionType('Trustworthy ba kayo?')).toBe('trust_objection');
    });

    test('detects competitor objections', () => {
      expect(detectObjectionType('May mas mura sa iba')).toBe('competitor_objection');
      expect(detectObjectionType('I-check ko muna ibang option')).toBe('competitor_objection');
    });

    test('detects timing objections', () => {
      expect(detectObjectionType('Not ready pa kami')).toBe('timing_objection');
      expect(detectObjectionType('Busy kami ngayon')).toBe('timing_objection');
    });

    test('detects authority objections', () => {
      expect(detectObjectionType('Ask my partner first')).toBe('authority_objection');
      expect(detectObjectionType('Kumonsulta muna ako sa boss')).toBe('authority_objection');
    });

    test('returns null for non-objections', () => {
      expect(detectObjectionType('Hello')).toBeNull();
      expect(detectObjectionType('Salamat')).toBeNull();
      expect(detectObjectionType('Oo')).toBeNull();
    });
  });

  describe('buildObjectionResponse', () => {
    test('builds price objection response', () => {
      const response = buildObjectionResponse({
        objectionType: 'price_objection',
        pageConfig: mockPageConfig,
        pageIntelligence: mockPageIntelligence,
        data: mockData,
        compactFacebookReply: mockCompactReply,
      });

      expect(response).toContain('budget');
      expect(response).toContain('FREE consultation');
      expect(response).toContain('option');
    });

    test('builds trust objection response', () => {
      const response = buildObjectionResponse({
        objectionType: 'trust_objection',
        pageConfig: mockPageConfig,
        pageIntelligence: { rawCustomerMessage: 'Legit ba to?' },
        data: mockData,
        compactFacebookReply: mockCompactReply,
      });

      expect(response).toContain('50+ businesses');
      expect(response).toContain('transparent');
      expect(response).toContain('FREE demo');
    });

    test('builds stall objection response', () => {
      const response = buildObjectionResponse({
        objectionType: 'stall_objection',
        pageConfig: mockPageConfig,
        pageIntelligence: { rawCustomerMessage: "I'll think about it" },
        data: mockData,
        compactFacebookReply: mockCompactReply,
      });

      expect(response).toContain('priority list');
      expect(response).toContain('follow-up');
    });

    test('returns null for unknown objection type', () => {
      const response = buildObjectionResponse({
        objectionType: 'unknown_type',
        pageConfig: mockPageConfig,
        pageIntelligence: mockPageIntelligence,
        data: mockData,
        compactFacebookReply: mockCompactReply,
      });

      expect(response).toBeNull();
    });
  });

  describe('shouldHandleObjection', () => {
    test('handles objections for unknown intent', () => {
      const intentResult = { intent: 'unknown', confidence: 0.35 };
      expect(shouldHandleObjection(intentResult, 'Mahal po eh')).toBe(true);
    });

    test('skips objections for specific intents', () => {
      const affirmativeIntent = { intent: 'affirmative_response', confidence: 0.82 };
      expect(shouldHandleObjection(affirmativeIntent, 'Mahal po eh')).toBe(false);
    });

    test('skips objections for human requests', () => {
      const humanIntent = { intent: 'human_request', confidence: 0.9 };
      expect(shouldHandleObjection(humanIntent, 'Mahal po eh')).toBe(false);
    });
  });
});

describe('Behavioral Trigger System', () => {
  describe('detectBehavioralSignals', () => {
    test('detects high engagement signals', () => {
      const signals = detectBehavioralSignals('I\'m interested in your automation', []);
      const highEngagement = signals.find(s => s.type === 'high_engagement');
      expect(highEngagement).toBeDefined();
      expect(highEngagement.strength).toBeGreaterThan(0);
    });

    test('detects urgency signals', () => {
      const signals = detectBehavioralSignals('I need this ASAP!', []);
      const urgency = signals.find(s => s.type === 'urgency');
      expect(urgency).toBeDefined();
      expect(urgency.strength).toBeGreaterThan(0);
    });

    test('detects trust building signals', () => {
      const signals = detectBehavioralSignals('Can you provide testimonials?', []);
      const trust = signals.find(s => s.type === 'trust_building');
      expect(trust).toBeDefined();
    });

    test('detects contact ready signals', () => {
      const signals = detectBehavioralSignals('What\'s your phone number?', []);
      const contactReady = signals.find(s => s.type === 'contact_ready');
      expect(contactReady).toBeDefined();
    });

    test('returns empty array for no signals', () => {
      const signals = detectBehavioralSignals('hm?', []);
      expect(signals.length).toBe(0);
    });

    test('sorts signals by strength', () => {
      const signals = detectBehavioralSignals('I need this urgently! Call me now!', []);
      expect(signals[0].strength).toBeGreaterThanOrEqual(signals[signals.length - 1].strength);
    });
  });

  describe('calculateEngagementScore', () => {
    test('calculates base score from message count', () => {
      const signals = [];
      const score = calculateEngagementScore(signals, 10, 0);
      expect(score).toBeGreaterThan(0);
    });

    test('adds signal strength to score', () => {
      const signals = [{ type: 'high_engagement', strength: 5, matchedPatterns: [] }];
      const score = calculateEngagementScore(signals, 0, 0);
      expect(score).toBe(5);
    });

    test('caps score at 100', () => {
      const signals = [
        { type: 'urgency', strength: 10, matchedPatterns: [] },
        { type: 'high_engagement', strength: 10, matchedPatterns: [] },
        { type: 'contact_ready', strength: 10, matchedPatterns: [] },
      ];
      const score = calculateEngagementScore(signals, 50, 10000);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('bonus for fast response time', () => {
      const signals = [{ type: 'high_engagement', strength: 5, matchedPatterns: [] }];
      const fastScore = calculateEngagementScore(signals, 5, 15000); // 15 seconds
      const slowScore = calculateEngagementScore(signals, 5, 120000); // 2 minutes
      expect(fastScore).toBeGreaterThan(slowScore);
    });
  });

  describe('determineLeadTemperature', () => {
    test('returns hot for score >= 80', () => {
      expect(determineLeadTemperature(85, [])).toBe('hot');
      expect(determineLeadTemperature(90, [])).toBe('hot');
    });

    test('returns warm for score >= 60', () => {
      expect(determineLeadTemperature(65, [])).toBe('warm');
      expect(determineLeadTemperature(75, [])).toBe('warm');
    });

    test('returns interested for score >= 40', () => {
      expect(determineLeadTemperature(45, [])).toBe('interested');
      expect(determineLeadTemperature(55, [])).toBe('interested');
    });

    test('returns curious for score >= 20', () => {
      expect(determineLeadTemperature(25, [])).toBe('curious');
      expect(determineLeadTemperature(35, [])).toBe('curious');
    });

    test('returns cold for score < 20', () => {
      expect(determineLeadTemperature(15, [])).toBe('cold');
      expect(determineLeadTemperature(5, [])).toBe('cold');
    });
  });

  describe('detectBuyingIntent', () => {
    test('detects ready_to_buy intent', () => {
      const signals = [
        { type: 'high_engagement', strength: 5 },
        { type: 'urgency', strength: 5 },
        { type: 'contact_ready', strength: 5 },
      ];
      const flowData = { leadScore: 80, pendingLeadData: { phone: '09123456789' } };
      expect(detectBuyingIntent(signals, flowData)).toBe('ready_to_buy');
    });

    test('detects considering intent', () => {
      const signals = [{ type: 'decision_stage', strength: 3 }];
      const flowData = { leadScore: 50 };
      expect(detectBuyingIntent(signals, flowData)).toBe('considering');
    });

    test('detects interested intent', () => {
      const signals = [{ type: 'high_engagement', strength: 3 }];
      const flowData = { leadScore: 30 };
      expect(detectBuyingIntent(signals, flowData)).toBe('interested');
    });

    test('detects browsing intent', () => {
      const signals = [];
      const flowData = { leadScore: 10 };
      expect(detectBuyingIntent(signals, flowData)).toBe('browsing');
    });
  });

  describe('predictNextBestAction', () => {
    test('recommends accelerate for hot leads', () => {
      const signals = [{ type: 'urgency', strength: 5 }];
      const flowData = { leadScore: 85, leadPriority: 'hot' };
      const prediction = predictNextBestAction({
        signals,
        flowData,
        pageConfig: {},
      });

      expect(prediction.action).toBe('accelerate_to_close');
      expect(prediction.recommendedStep).toBe('request_contact_or_demo');
    });

    test('recommends build_trust for trust signals', () => {
      const signals = [{ type: 'trust_building', strength: 3 }];
      const flowData = { leadScore: 40 };
      const prediction = predictNextBestAction({
        signals,
        flowData,
        pageConfig: {},
      });

      expect(prediction.action).toBe('build_trust');
      expect(prediction.recommendedStep).toBe('share_social_proof');
    });

    test('recommends qualify for new leads', () => {
      const signals = [];
      const flowData = { leadScore: 10, currentState: 'new' };
      const prediction = predictNextBestAction({
        signals,
        flowData,
        pageConfig: {},
      });

      expect(prediction.action).toBe('qualify');
      expect(prediction.recommendedStep).toBe('ask_discovery_questions');
    });
  });
});

describe('Follow-Up Automation System', () => {
  describe('determineFollowUpSequence', () => {
    test('returns hot_lead for high score', () => {
      const leadData = {};
      const flowData = { leadScore: 85, leadPriority: 'hot' };
      expect(determineFollowUpSequence(leadData, flowData)).toBe('hot_lead');
    });

    test('returns demo_scheduled for demo choice', () => {
      const leadData = {};
      const flowData = { ctaChoice: 'demo', currentState: 'awaiting_demo_schedule' };
      expect(determineFollowUpSequence(leadData, flowData)).toBe('demo_scheduled');
    });

    test('returns interested_but_stalled for stall objection', () => {
      const leadData = {};
      const flowData = { intent: 'stall_objection', ctaChoice: 'not_now' };
      expect(determineFollowUpSequence(leadData, flowData)).toBe('interested_but_stalled');
    });

    test('returns new_lead as default', () => {
      const leadData = {};
      const flowData = { leadScore: 30, leadPriority: 'cold' };
      expect(determineFollowUpSequence(leadData, flowData)).toBe('new_lead');
    });
  });

  describe('shouldSendFollowUp', () => {
    test('returns false for human handoff', () => {
      const followUpSequence = 'new_lead';
      const currentStageIndex = 0;
      const conversationStatus = 'human_handoff';
      const lastMessageAt = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 mins ago

      expect(
        shouldSendFollowUp({
          lastMessageAt,
          followUpSequence,
          currentStageIndex,
          conversationStatus,
        })
      ).toBe(false);
    });

    test('returns false for closed conversation', () => {
      const followUpSequence = 'new_lead';
      const currentStageIndex = 0;
      const conversationStatus = 'closed';
      const lastMessageAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      expect(
        shouldSendFollowUp({
          lastMessageAt,
          followUpSequence,
          currentStageIndex,
          conversationStatus,
        })
      ).toBe(false);
    });

    test('returns true when delay has passed', () => {
      const followUpSequence = 'new_lead';
      const currentStageIndex = 0; // 5 minute delay
      const conversationStatus = 'active';
      const lastMessageAt = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 mins ago

      expect(
        shouldSendFollowUp({
          lastMessageAt,
          followUpSequence,
          currentStageIndex,
          conversationStatus,
        })
      ).toBe(true);
    });

    test('returns false when delay has not passed', () => {
      const followUpSequence = 'new_lead';
      const currentStageIndex = 1; // 1 hour delay
      const conversationStatus = 'active';
      const lastMessageAt = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 mins ago

      expect(
        shouldSendFollowUp({
          lastMessageAt,
          followUpSequence,
          currentStageIndex,
          conversationStatus,
        })
      ).toBe(false);
    });
  });

  describe('checkFollowUpNeeded', () => {
    test('returns null for low lead score', () => {
      const conversation = {
        metadata: {
          flowData: { leadScore: 10 },
        },
        last_message_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        conversation_status: 'active',
      };

      expect(checkFollowUpNeeded(conversation)).toBeNull();
    });

    test('returns follow-up info for qualified lead', () => {
      const conversation = {
        metadata: {
          flowData: { leadScore: 50, leadPriority: 'warm' },
        },
        last_message_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        conversation_status: 'active',
      };

      const result = checkFollowUpNeeded(conversation);
      expect(result).not.toBeNull();
      expect(result.sequence).toBe('new_lead');
      expect(result.stageIndex).toBe(0);
      expect(result.template).toBe('new_lead_initial');
    });

    test('returns null for fresh conversation', () => {
      const conversation = {
        metadata: {
          flowData: { leadScore: 50 },
        },
        last_message_at: new Date().toISOString(),
        conversation_status: 'active',
      };

      expect(checkFollowUpNeeded(conversation)).toBeNull();
    });
  });
});

describe('Integration Tests', () => {
  test('objection handling integrates with behavioral signals', () => {
    const text = 'Mahal po eh, pero kailangan ko na';
    const objectionType = detectObjectionType(text);
    const signals = detectBehavioralSignals(text, []);

    expect(objectionType).toBe('price_objection');
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.some(s => s.type === 'objection')).toBe(true);
  });

  test('behavioral signals trigger appropriate follow-up sequence', () => {
    const flowData = {
      leadScore: 85,
      leadPriority: 'hot',
      intent: 'automation_interest',
    };

    const sequence = determineFollowUpSequence({}, flowData);
    expect(sequence).toBe('hot_lead');
  });

  test('engagement score correlates with lead temperature', () => {
    const hotSignals = [
      { type: 'urgency', strength: 5, matchedPatterns: [] },
      { type: 'high_engagement', strength: 5, matchedPatterns: [] },
    ];
    const hotScore = calculateEngagementScore(hotSignals, 10, 15000);
    expect(determineLeadTemperature(hotScore, hotSignals)).toBe('hot');

    const coldSignals = [];
    const coldScore = calculateEngagementScore(coldSignals, 1, 0);
    expect(determineLeadTemperature(coldScore, coldSignals)).toBe('cold');
  });
});

describe('Edge Cases', () => {
  test('handles empty text gracefully', () => {
    expect(detectObjectionType('')).toBeNull();
    expect(detectBehavioralSignals('', [])).toEqual([]);
  });

  test('handles null/undefined inputs', () => {
    expect(detectObjectionType(null)).toBeNull();
    expect(detectBehavioralSignals(null, [])).toEqual([]);
  });

  test('handles mixed language input', () => {
    const text = 'Magkano po? How much?';
    const objectionType = detectObjectionType(text);
    expect(objectionType).toBe('price_objection');
  });

  test('handles case-insensitive detection', () => {
    expect(detectObjectionType('MAHAL PO EH')).toBe('price_objection');
    expect(detectObjectionType('Mahal Po Eh')).toBe('price_objection');
    expect(detectObjectionType('mahal po eh')).toBe('price_objection');
  });
});

const {
  shouldAutoReply,
  buildCommentReplies,
} = require('../facebookCommentAutomation');

describe('Comment Automation System', () => {
  describe('shouldAutoReply', () => {
    test('is off unless the page toggle is enabled', () => {
      expect(shouldAutoReply('how much', { commentAutomationEnabled: false })).toBe(false);
      expect(shouldAutoReply('how much', {})).toBe(false);
    });

    test('replies to all comments when no keyword filter is set', () => {
      expect(shouldAutoReply('nice post', { commentAutomationEnabled: true })).toBe(true);
    });

    test('respects the keyword filter', () => {
      const settings = { commentAutomationEnabled: true, commentKeywordFilter: 'price, interested' };
      expect(shouldAutoReply('whats the price po', settings)).toBe(true);
      expect(shouldAutoReply('nice post', settings)).toBe(false);
    });

    test('handles empty/blank comments', () => {
      expect(shouldAutoReply('', { commentAutomationEnabled: true })).toBe(false);
      expect(shouldAutoReply(null, { commentAutomationEnabled: true })).toBe(false);
    });
  });

  describe('buildCommentReplies', () => {
    test('returns a public reply and a private DM opener', () => {
      const r = buildCommentReplies({
        commentText: 'magkano po?',
        pageConfig: { pageName: 'FitLife' },
        pageSettings: {},
      });
      expect(typeof r.publicReply).toBe('string');
      expect(r.publicReply.length).toBeGreaterThan(0);
      expect(r.privateReply).toContain('FitLife');
    });

    test('uses a custom public reply template when provided', () => {
      const r = buildCommentReplies({
        commentText: 'interested',
        pageConfig: { pageName: 'FitLife' },
        pageSettings: { commentReplyTemplate: 'DM sent! 📩' },
      });
      expect(r.publicReply).toBe('DM sent! 📩');
    });
  });
});

const {
  parseReferral,
  deriveInquirySource,
  isAdReferral,
  buildAdContextGreeting,
  buildReferralQuickReplies,
} = require('../facebookReferralContext');

describe('Referral / Ad Context', () => {
  const adEvent = {
    message: { text: 'hi' },
    referral: { ref: 'pricing_promo', ad_id: '12345', source: 'ADS', type: 'OPEN_THREAD' },
  };

  test('parses referral from all event shapes', () => {
    expect(parseReferral(adEvent).adId).toBe('12345');
    expect(parseReferral({ postback: { referral: { ref: 'x', source: 'SHORTLINK' } } }).ref).toBe('x');
    expect(parseReferral({ message: { text: 'hello' } })).toBeNull();
  });

  test('derives a CRM source tag', () => {
    expect(deriveInquirySource(parseReferral(adEvent))).toBe('facebook_ad:12345');
    expect(deriveInquirySource({ source: 'SHORTLINK', ref: 'promo' })).toBe('m.me:promo');
    expect(deriveInquirySource(null)).toBe('');
  });

  test('flags ad referrals as higher intent', () => {
    expect(isAdReferral(parseReferral(adEvent))).toBe(true);
    expect(isAdReferral({ source: 'SHORTLINK' })).toBe(false);
  });

  test('builds a natural ad-context opener (not for organic)', () => {
    const opener = buildAdContextGreeting({
      referral: parseReferral(adEvent),
      pageConfig: { pageName: 'FitLife' },
      incomingText: 'hi',
    });
    expect(opener).toContain('ad');
    expect(buildAdContextGreeting({ referral: null })).toBeNull();
  });

  test('leads quick replies with the inferred topic', () => {
    const qrs = buildReferralQuickReplies(parseReferral(adEvent));
    expect(qrs[0].payload).toBe('pricing');
  });
});

const { naturalizeReply } = require('../facebookReplyNaturalizer');

describe('Reply Naturalizer', () => {
  const draft = 'What product are you interested in? 😊';

  test('rewrites wording when the LLM returns a valid reply', async () => {
    const out = await naturalizeReply({
      draft,
      generateChatbotReply: async () => 'Ano pong product ang gusto ninyo? 😊',
    });
    expect(out).toBe('Ano pong product ang gusto ninyo? 😊');
  });

  test('falls back to the draft when the rewrite drops a required question', async () => {
    const out = await naturalizeReply({ draft, generateChatbotReply: async () => 'Great, thanks!' });
    expect(out).toBe(draft);
  });

  test('preserves exact wording for confirmation/pricing stages', async () => {
    const out = await naturalizeReply({
      draft,
      stage: 'awaiting_lead_confirmation',
      generateChatbotReply: async () => 'rewritten',
    });
    expect(out).toBe(draft);
  });

  test('can be disabled via env flag', async () => {
    const out = await naturalizeReply({
      draft,
      env: { FB_NATURALIZE_REPLIES: 'false' },
      generateChatbotReply: async () => 'x',
    });
    expect(out).toBe(draft);
  });

  test('falls back on provider refusal or errors', async () => {
    expect(await naturalizeReply({ draft, generateChatbotReply: async () => 'I can only help with: CRM' })).toBe(draft);
    expect(await naturalizeReply({ draft, generateChatbotReply: async () => { throw new Error('x'); } })).toBe(draft);
  });
});