const analyze = require("./analyze");
const securityScan = require("./securityScan");
const dockerHealth = require("./dockerHealth");
const supabaseAudit = require("./supabaseAudit");
const fixRiskyCode = require("./fixRiskyCode");

module.exports = async function router(command, target) {
  console.log(`🧠 Shannon CLI`);
  console.log(`Command: ${command}`);
  console.log(`Target: ${target}\n`);

  switch (command) {
    case "analyze":
      return analyze(target);

    case "security-scan":
      return securityScan(target);

    case "docker-health":
      return dockerHealth(target);

    case "supabase-audit":
      return supabaseAudit(target);

    case "fix-risky-code":
      return fixRiskyCode(target);

    default:
      console.log("❌ Unknown command:", command);
  }
};
