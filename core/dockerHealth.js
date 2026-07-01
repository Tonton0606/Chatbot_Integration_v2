const fs = require("fs");

module.exports = function dockerHealth(target) {
  console.log("🐳 Docker Health Scan:", target);

  const file = `${target}/docker-compose.yml`;

  if (!fs.existsSync(file)) {
    console.log("❌ docker-compose.yml not found");
    return;
  }

  const content = fs.readFileSync(file, "utf8");

  let score = 100;

  if (!content.includes("healthcheck")) {
    console.log("⚠️ Missing healthchecks");
    score -= 20;
  }

  if (!content.includes("restart:")) {
    console.log("⚠️ Missing restart policy");
    score -= 10;
  }

  if (!content.includes("memory:")) {
    console.log("⚠️ Missing resource limits");
    score -= 10;
  }

  console.log("\n📊 Docker Health Score:", score + "/100");
};
