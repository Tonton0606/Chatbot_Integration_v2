const glob = require("glob");
const fs = require("fs");

module.exports = function analyze(target) {
  console.log("🔍 Analyze:", target);

  const files = glob.sync(`${target}/**/*.js`, { ignore: ["**/node_modules/**"] });
  console.log(`Found ${files.length} JS files.`);

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n").length;
    console.log(`  ${file} — ${lines} lines`);
  });
};
