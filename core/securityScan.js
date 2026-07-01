const glob = require("glob");
const fs = require("fs");

module.exports = function securityScan(target) {
  console.log("🔐 Security Scan Running on:", target);

  const files = glob.sync(`${target}/**/*.js`, {
    ignore: ["**/node_modules/**", "**/client/**"]
  });

  let issues = 0;

  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, "utf8");

      if (content.includes("console.log")) {
        console.log("⚠️ console.log found:", file);
        issues++;
      }

      if (content.includes("eval(")) {
        console.log("🚨 eval() usage:", file);
        issues++;
      }

      if (content.includes("process.env") && content.toLowerCase().includes("secret")) {
        console.log("🔴 Possible secret exposure:", file);
        issues++;
      }
    } catch (e) {}
  });

  console.log("\n✅ Security scan complete. Issues:", issues);
};
