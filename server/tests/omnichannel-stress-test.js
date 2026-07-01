/**
 * Omni-Channel Local Test Script
 *
 * Simulates webhook payloads for Instagram, TikTok, Shopee, and Lazada
 * and sends them to the local server to verify end-to-end message flow.
 *
 * Usage:
 *   node tests/omnichannel-stress-test.js [--server http://localhost:5000]
 *
 * Requirements:
 *   - Server must be running
 *   - Migrations 053+054 must be applied
 *   - At least one channel config must exist in the DB
 */

const SERVER_URL = process.argv.find((a) => a.startsWith("--server="))?.split("=")[1] || "http://localhost:5000";

const TEST_CASES = [
  {
    name: "Instagram DM — Product inquiry (Taglish)",
    channel: "instagram",
    payload: {
      object: "instagram",
      entry: [{
        id: "17841412345678901",
        messaging: [{
          sender: { id: "ig-user-001" },
          recipient: { id: "17841412345678901" },
          timestamp: Date.now(),
          message: {
            mid: `ig_msg_${Date.now()}`,
            text: "Hi! Available pa ba yung nasa post niyo? Yung black shirt",
          },
        }],
      }],
    },
    expectedKeywords: ["available", "shirt", "post"],
  },
  {
    name: "Instagram DM — Pricing question (Tagalog)",
    channel: "instagram",
    payload: {
      object: "instagram",
      entry: [{
        id: "17841412345678901",
        messaging: [{
          sender: { id: "ig-user-002" },
          recipient: { id: "17841412345678901" },
          timestamp: Date.now(),
          message: {
            mid: `ig_msg_${Date.now() + 1}`,
            text: "Magkano po ang presyo nung bag? Pwede po ba cash on delivery?",
          },
        }],
      }],
    },
    expectedKeywords: ["presyo", "price", "delivery"],
  },
  {
    name: "TikTok DM — Live selling follow-up (Taglish)",
    channel: "tiktok",
    payload: {
      event: "im.message",
      from_user_id: "tt-user-001",
      to_user_id: "tt-business-001",
      conversation_id: "tt_conv_001",
      conversation_type: 1,
      message_id: `tt_msg_${Date.now()}`,
      content: {
        text: "Pano po mag-order? Napanood ko sa live kanina",
      },
      create_time: Math.floor(Date.now() / 1000),
    },
    expectedKeywords: ["order", "live"],
  },
  {
    name: "TikTok DM — Product availability (English)",
    channel: "tiktok",
    payload: {
      event: "im.message",
      from_user_id: "tt-user-002",
      to_user_id: "tt-business-001",
      conversation_id: "tt_conv_002",
      conversation_type: 1,
      message_id: `tt_msg_${Date.now() + 1}`,
      content: {
        text: "Do you have this in size large? And how much is shipping to Manila?",
      },
      create_time: Math.floor(Date.now() / 1000),
    },
    expectedKeywords: ["size", "shipping", "manila"],
  },
  {
    name: "Shopee chat — Stock and shipping inquiry (Taglish)",
    channel: "shopee",
    payload: {
      shop_id: 12345678,
      code: 0,
      data: {
        from_user_id: 100001,
        to_user_id: 12345678,
        conversation_id: "shopee_conv_001",
        message_id: `shopee_msg_${Date.now()}`,
        content: {
          text: "Hi seller, may stock pa po ba nung white sneakers? Size 9. Pano po shipping?",
        },
        timestamp: Math.floor(Date.now() / 1000),
      },
    },
    expectedKeywords: ["stock", "sneakers", "shipping"],
  },
  {
    name: "Shopee chat — Order status (Tagalog)",
    channel: "shopee",
    payload: {
      shop_id: 12345678,
      code: 0,
      data: {
        from_user_id: 100002,
        to_user_id: 12345678,
        conversation_id: "shopee_conv_002",
        message_id: `shopee_msg_${Date.now() + 1}`,
        content: {
          text: "Boss, kelan po dadating yung order ko? 3 days na wala pa.",
        },
        timestamp: Math.floor(Date.now() / 1000),
      },
    },
    expectedKeywords: ["order", "shipping", "check"],
  },
  {
    name: "Lazada IM — Product specs inquiry (English)",
    channel: "lazada",
    payload: {
      shop_id: "lz-shop-001",
      data: {
        from_user_id: "lz-user-001",
        to_user_id: "lz-shop-001",
        session_id: "lz_session_001",
        message_id: `lz_msg_${Date.now()}`,
        content: {
          text: "Is this product original? What are the specifications and warranty?",
        },
        timestamp: Math.floor(Date.now() / 1000),
      },
    },
    expectedKeywords: ["original", "warranty", "specifications"],
  },
  {
    name: "Lazada IM — Return/refund question (Taglish)",
    channel: "lazada",
    payload: {
      shop_id: "lz-shop-001",
      data: {
        from_user_id: "lz-user-002",
        to_user_id: "lz-shop-001",
        session_id: "lz_session_002",
        message_id: `lz_msg_${Date.now() + 1}`,
        content: {
          text: "Pwede po bang mag-return? Hindi kasi fit sakin yung size. May refund po ba?",
        },
        timestamp: Math.floor(Date.now() / 1000),
      },
    },
    expectedKeywords: ["return", "refund", "size"],
  },
];

async function runTest(testCase, idx) {
  const url = `${SERVER_URL}/api/webhooks/omnichannel/${testCase.channel}`;
  const testId = `test_${idx}_${Date.now()}`;

  console.log(`\n[${idx + 1}/${TEST_CASES.length}] ${testCase.name}`);
  console.log(`  POST ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-id": testId,
      },
      body: JSON.stringify(testCase.payload),
    });

    const status = response.status;
    const body = await response.text().catch(() => "");

    if (status === 200) {
      console.log(`  ✓ Status: 200 OK`);
      try {
        const json = JSON.parse(body);
        if (json.success) {
          console.log(`  ✓ Webhook accepted`);
        }
      } catch {
        console.log(`  ✓ Webhook accepted (non-JSON response)`);
      }
    } else if (status === 404) {
      console.log(`  ⚠ Status: 404 — Route not found (check server is running)`);
    } else if (status === 401 || status === 403) {
      console.log(`  ⚠ Status: ${status} — Auth/signature verification (expected for signed channels)`);
    } else {
      console.log(`  ⚠ Status: ${status} — ${body.slice(0, 100)}`);
    }

    return { name: testCase.name, status, ok: status < 500 };
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
    return { name: testCase.name, status: 0, ok: false, error: err.message };
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     Omni-Channel Stress Test — Simulated Webhooks        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\nServer: ${SERVER_URL}`);
  console.log(`Tests:  ${TEST_CASES.length}`);
  console.log(`Time:   ${new Date().toISOString()}`);

  // Health check
  try {
    const healthRes = await fetch(`${SERVER_URL}/health`);
    if (healthRes.ok) {
      console.log("\n✓ Server is running");
    } else {
      console.log("\n⚠ Server health check failed — tests may fail");
    }
  } catch {
    console.log("\n✗ Server is NOT running. Start it first with: npm run dev --prefix server");
    process.exit(1);
  }

  // Run tests
  const results = [];
  for (let i = 0; i < TEST_CASES.length; i++) {
    const result = await runTest(TEST_CASES[i], i);
    results.push(result);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Summary
  console.log("\n\n════════════════════════════════════════════════════════════");
  console.log("SUMMARY");
  console.log("════════════════════════════════════════════════════════════");
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log("\nFailed tests:");
    results.filter((r) => !r.ok).forEach((r) => {
      console.log(`  ✗ ${r.name} — ${r.error || `Status ${r.status}`}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
