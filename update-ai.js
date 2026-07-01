const fs = require('fs');
const file = 'server/routes/services/ai.js';
let content = fs.readFileSync(file, 'utf8');

const replacement = `
    let result = null, source = "", useModel = "";

    const fallbacks = [
      {
        id: "gemini",
        model: "gemini-2.5-flash",
        execute: async () => {
          if (!process.env.GEMINI_MARKET_RESEARCH_KEY) throw new Error("No Gemini key");
          const res = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${process.env.GEMINI_MARKET_RESEARCH_KEY}\`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: sysMsg + "\\n\\n" + userMsg }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
            })
          });
          if (!res.ok) throw new Error("Gemini API error: " + await res.text());
          const json = await res.json();
          return json.candidates[0].content.parts[0].text;
        }
      },
      {
        id: "groq",
        model: "llama-3.3-70b-versatile",
        execute: async () => {
          if (!process.env.GROQ_MARKET_RESEARCH_KEY) throw new Error("No Groq key");
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: \`Bearer \${process.env.GROQ_MARKET_RESEARCH_KEY}\`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [{ role: "system", content: sysMsg }, { role: "user", content: userMsg }],
              temperature: 0.3, max_tokens: 2000
            })
          });
          if (!res.ok) throw new Error("Groq API error");
          const json = await res.json();
          return json.choices[0].message.content;
        }
      },
      {
        id: "deepseek",
        model: "deepseek-chat",
        execute: async () => {
          if (!process.env.DEEPSEEK_MARKET_RESEARCH_KEY) throw new Error("No DeepSeek key");
          const res = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: { Authorization: \`Bearer \${process.env.DEEPSEEK_MARKET_RESEARCH_KEY}\`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages: [{ role: "system", content: sysMsg }, { role: "user", content: userMsg }],
              temperature: 0.3, max_tokens: 2000
            })
          });
          if (!res.ok) throw new Error("DeepSeek API error");
          const json = await res.json();
          return json.choices[0].message.content;
        }
      },
      {
        id: "nvidia_deepseek_flash",
        model: "deepseek-ai/deepseek-v4-flash",
        execute: async () => {
          if (!process.env.NVAPI_DEEPSEEK_FLASH_KEY) throw new Error("No NVAPI key");
          const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: \`Bearer \${process.env.NVAPI_DEEPSEEK_FLASH_KEY}\`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "deepseek-ai/deepseek-v4-flash",
              messages: [{ role: "system", content: sysMsg }, { role: "user", content: userMsg }],
              temperature: 0.3, max_tokens: 2000,
              extra_body: { chat_template_kwargs: { thinking: false } }
            })
          });
          if (!res.ok) throw new Error("Nvidia DeepSeek Flash API error");
          const json = await res.json();
          return json.choices[0].message.content;
        }
      },
      {
        id: "nvidia_deepseek_pro",
        model: "deepseek-ai/deepseek-v4-pro",
        execute: async () => {
          if (!process.env.NVAPI_DEEPSEEK_PRO_KEY) throw new Error("No NVAPI key");
          const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: \`Bearer \${process.env.NVAPI_DEEPSEEK_PRO_KEY}\`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "deepseek-ai/deepseek-v4-pro",
              messages: [{ role: "system", content: sysMsg }, { role: "user", content: userMsg }],
              temperature: 0.3, max_tokens: 2000,
              extra_body: { chat_template_kwargs: { thinking: false } }
            })
          });
          if (!res.ok) throw new Error("Nvidia DeepSeek Pro API error");
          const json = await res.json();
          return json.choices[0].message.content;
        }
      },
      {
        id: "nvidia_qwen",
        model: "qwen/qwen3-next-80b-a3b-instruct",
        execute: async () => {
          if (!process.env.NVAPI_QWEN3_NEXT_KEY) throw new Error("No NVAPI key");
          const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: \`Bearer \${process.env.NVAPI_QWEN3_NEXT_KEY}\`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "qwen/qwen3-next-80b-a3b-instruct",
              messages: [{ role: "system", content: sysMsg }, { role: "user", content: userMsg }],
              temperature: 0.3, max_tokens: 2000
            })
          });
          if (!res.ok) throw new Error("Nvidia Qwen API error");
          const json = await res.json();
          return json.choices[0].message.content;
        }
      }
    ];

    let lastError = null;
    for (const fb of fallbacks) {
      try {
        result = await fb.execute();
        source = fb.id;
        useModel = fb.model;
        break; 
      } catch (e) {
        lastError = e;
        logger.warn(\`[Market Research] Fallback \${fb.id} failed:\`, e.message);
      }
    }

    if (!result) {
      throw new Error("All AI market research fallback providers failed. Last error: " + (lastError?.message || "Unknown error"));
    }
`;

const startIndex = content.indexOf('    let result, source, useModel;');
const endIndex = content.indexOf('    ok(res, { report: safeJson(result)');

if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex) + replacement + content.slice(endIndex);
  fs.writeFileSync(file, content);
  console.log("Replaced successfully");
} else {
  console.log("Could not find start or end index");
}
