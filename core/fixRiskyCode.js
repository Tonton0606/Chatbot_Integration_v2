const glob = require("glob");
const fs = require("fs");

module.exports = function fixRiskyCode(target) {
  console.log("🔥 Risk Scan:", target);

  const files = glob.sync(`${target}/server/**/*.js`, {
    ignore: ["**/node_modules/**"]
  });

  files.forEach(file => {
    const content = fs.readFileSync(file, "utf8");

    if (content.includes("console.log")) {
      console.log("⚠️ Replace console.log → logger:", file);
    }

    if (content.includes("console.error")) {
      console.log("⚠️ Replace console.error → logger.error:", file);
    }
  });

  console.log("\n✅ Risk scan complete");
};
