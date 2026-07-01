const glob = require("glob");
const fs = require("fs");

module.exports = function supabaseAudit(target) {
  console.log("🧠 Supabase Audit:", target);

  const files = glob.sync(`${target}/server/**/*.js`, {
    ignore: ["**/node_modules/**"]
  });

  let issues = 0;

  files.forEach(file => {
    const content = fs.readFileSync(file, "utf8");

    if (content.includes("select('*')")) {
      console.log("⚠️ Unsafe select(*):", file);
      issues++;
    }

    if (content.includes(".from(") && !content.includes("workspace_id")) {
      console.log("🔴 Missing workspace scoping:", file);
      issues++;
    }
  });

  console.log("\n📊 Supabase audit issues:", issues);
};
