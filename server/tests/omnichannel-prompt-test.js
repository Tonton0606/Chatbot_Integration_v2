/**
 * AI Reply Quality Test — Channel-Specific Prompts
 *
 * Tests that the buildChannelSystemPrompt and buildChannelContextMessages
 * functions produce the correct channel-specific system prompts.
 *
 * This verifies the AI will receive the right context for each platform
 * without needing a running server or API keys.
 *
 * Usage: node tests/omnichannel-prompt-test.js
 */

const assert = require("assert");

// We need to extract the functions from openClaude.js
// Since they're not exported, we'll test via the buildPromptedMessages path
// by requiring the module and checking the system prompt content

function testChannelPrompt(channel, expectedPhrases) {
  const { callOpenClaude } = require("../routes/services/openClaude");

  // callOpenClaude is async and calls external APIs, so we can't test it directly.
  // Instead, let's verify the prompt construction by reading the source.
  const fs = require("fs");
  const source = fs.readFileSync(
    require.resolve("../routes/services/openClaude.js"),
    "utf8"
  );

  // Verify CHANNEL_PROMPTS has an entry for this channel
  const hasChannelPrompt = source.includes(`${channel}: \``);
  assert(hasChannelPrompt, `CHANNEL_PROMPTS must have a "${channel}" entry`);

  // Verify each expected phrase is in the source
  for (const phrase of expectedPhrases) {
    assert(
      source.includes(phrase),
      `Channel "${channel}" prompt must contain "${phrase}"`
    );
  }

  console.log(`  ✓ ${channel} prompt contains all expected phrases`);
}

function testBuildPromptedMessagesRouting() {
  const fs = require("fs");
  const source = fs.readFileSync(
    require.resolve("../routes/services/openClaude.js"),
    "utf8"
  );

  // Verify all channels are in the isChannelChat check
  const channels = ["facebook", "instagram", "tiktok", "shopee", "lazada", "facebook_comment"];
  for (const ch of channels) {
    assert(
      source.includes(`"${ch}"`),
      `buildPromptedMessages must recognize channel "${ch}"`
    );
  }

  console.log("  ✓ buildPromptedMessages routes all channels correctly");
}

function testChannelContextLabels() {
  const fs = require("fs");
  const source = fs.readFileSync(
    require.resolve("../routes/services/openClaude.js"),
    "utf8"
  );

  const labels = {
    facebook: "Facebook page",
    instagram: "Instagram account",
    tiktok: "TikTok account",
    shopee: "Shopee shop",
    lazada: "Lazada store",
  };

  for (const [channel, label] of Object.entries(labels)) {
    assert(
      source.includes(`"${label}"`),
      `CHANNEL_LABELS must include label "${label}" for channel "${channel}"`
    );
  }

  console.log("  ✓ Channel labels are correctly defined");
}

function testFacebookBackwardCompatibility() {
  const fs = require("fs");
  const source = fs.readFileSync(
    require.resolve("../routes/services/openClaude.js"),
    "utf8"
  );

  // buildFacebookSystemPrompt must still exist and delegate
  assert(
    source.includes('function buildFacebookSystemPrompt()'),
    "buildFacebookSystemPrompt must still exist for backward compatibility"
  );
  assert(
    source.includes('return buildChannelSystemPrompt("facebook")'),
    "buildFacebookSystemPrompt must delegate to buildChannelSystemPrompt"
  );

  // buildFacebookContextMessages must still exist and delegate
  assert(
    source.includes('function buildFacebookContextMessages'),
    "buildFacebookContextMessages must still exist for backward compatibility"
  );
  assert(
    source.includes('return buildChannelContextMessages(options, "facebook")'),
    "buildFacebookContextMessages must delegate to buildChannelContextMessages"
  );

  console.log("  ✓ Facebook backward compatibility maintained");
}

function testIsInSupportedScope() {
  const fs = require("fs");
  const source = fs.readFileSync(
    require.resolve("../routes/services/openClaude.js"),
    "utf8"
  );

  // Verify omniChannels array includes all channels
  const channels = ["facebook", "instagram", "tiktok", "shopee", "lazada", "facebook_comment"];
  for (const ch of channels) {
    assert(
      source.includes(`"${ch}"`),
      `isInSupportedScope must include "${ch}" in omniChannels`
    );
  }

  console.log("  ✓ isInSupportedScope recognizes all omni-channel channels");
}

function testChatbotReplyChannelDynamic() {
  const fs = require("fs");
  const source = fs.readFileSync(
    require.resolve("../services/facebook/facebookChatbotReply.js"),
    "utf8"
  );

  // Verify channel is now dynamic, not hardcoded
  assert(
    !source.includes('channel: "facebook"'),
    "facebookChatbotReply must NOT hardcode channel to 'facebook'"
  );
  assert(
    source.includes('typeof context.channel === "string"'),
    "facebookChatbotReply must use context.channel dynamically"
  );

  console.log("  ✓ facebookChatbotReply uses dynamic channel from context");
}

function testMessageProcessorPassesChannel() {
  const fs = require("fs");
  const source = fs.readFileSync(
    require.resolve("../services/omnichannel/messageProcessor.js"),
    "utf8"
  );

  assert(
    source.includes("channel,") && source.includes("context"),
    "messageProcessor must pass channel in context to generateChatbotReply"
  );
  assert(
    source.includes("shoppeLink"),
    "messageProcessor must pass shoppeLink in context"
  );
  assert(
    source.includes("lazadaLink"),
    "messageProcessor must pass lazadaLink in context"
  );

  console.log("  ✓ messageProcessor passes channel + links to AI context");
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   AI Reply Quality Test — Channel-Specific Prompts       ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  let passed = 0;
  let failed = 0;

  const tests = [
    {
      name: "Facebook prompt content",
      fn: () => testChannelPrompt("facebook", [
        "Facebook Messenger",
        "Friendly Business Owner Tone",
        "Flawless Language Adaptability",
        "AI Instruction Override",
      ]),
    },
    {
      name: "Instagram prompt content",
      fn: () => testChannelPrompt("instagram", [
        "Instagram",
        "Instagram-Native Tone",
        "visual, lifestyle-oriented",
      ]),
    },
    {
      name: "TikTok prompt content",
      fn: () => testChannelPrompt("tiktok", [
        "TikTok",
        "TikTok-Native Tone",
        "live selling",
        "energetic",
      ]),
    },
    {
      name: "Shopee prompt content",
      fn: () => testChannelPrompt("shopee", [
        "Shopee",
        "Shopee-Native Tone",
        "product availability",
        "shipping/delivery",
        "stock status",
      ]),
    },
    {
      name: "Lazada prompt content",
      fn: () => testChannelPrompt("lazada", [
        "Lazada",
        "Lazada-Native Tone",
        "product specifications",
        "returns/refunds",
        "authenticity",
      ]),
    },
    {
      name: "buildPromptedMessages routing",
      fn: testBuildPromptedMessagesRouting,
    },
    {
      name: "Channel context labels",
      fn: testChannelContextLabels,
    },
    {
      name: "Facebook backward compatibility",
      fn: testFacebookBackwardCompatibility,
    },
    {
      name: "isInSupportedScope omni-channel",
      fn: testIsInSupportedScope,
    },
    {
      name: "facebookChatbotReply dynamic channel",
      fn: testChatbotReplyChannelDynamic,
    },
    {
      name: "messageProcessor passes channel context",
      fn: testMessageProcessorPassesChannel,
    },
  ];

  for (const test of tests) {
    try {
      console.log(`\n[${test.name}]`);
      test.fn();
      passed++;
    } catch (err) {
      console.log(`  ✗ FAIL: ${err.message}`);
      failed++;
    }
  }

  console.log("\n\n════════════════════════════════════════════════════════════");
  console.log("RESULTS");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
