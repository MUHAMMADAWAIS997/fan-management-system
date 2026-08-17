const fs = require("fs");
const path = require("path");

function copy(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[Copy Assets] Warning: Source path ${src} does not exist.`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log(`[Copy Assets] Successfully copied ${src} -> ${dest}`);
}

copy(".next/static", ".next/standalone/.next/static");
copy("public", ".next/standalone/public");

console.log("[Copy Assets] Standalone assets copying completed.");