const fs = require("fs");
const path = require("path");

exports.default = async function (context) {
  const appOutDir = context.appOutDir;
  const targetStandaloneDir = path.join(appOutDir, "resources", "standalone");
  const sourceStandaloneDir = path.join(context.packager.info.projectDir, ".next", "standalone");

  console.log(`[AfterPack] Copying standalone server from ${sourceStandaloneDir} -> ${targetStandaloneDir}...`);

  if (!fs.existsSync(sourceStandaloneDir)) {
    throw new Error(`[AfterPack] Standalone directory not found at ${sourceStandaloneDir}`);
  }

  if (fs.existsSync(targetStandaloneDir)) {
    fs.rmSync(targetStandaloneDir, { recursive: true, force: true });
  }

  fs.mkdirSync(targetStandaloneDir, { recursive: true });

  // 1. Copy entire standalone directory with dereferencing
  fs.cpSync(sourceStandaloneDir, targetStandaloneDir, {
    recursive: true,
    force: true,
    dereference: true,
  });

  // 2. Flatten pnpm virtual store node_modules into top-level node_modules
  const pnpmNodeModulesDir = path.join(sourceStandaloneDir, "node_modules", ".pnpm", "node_modules");
  const targetNodeModulesDir = path.join(targetStandaloneDir, "node_modules");

  if (fs.existsSync(pnpmNodeModulesDir)) {
    console.log(`[AfterPack] Flattening pnpm virtual node_modules from ${pnpmNodeModulesDir} -> ${targetNodeModulesDir}...`);
    const entries = fs.readdirSync(pnpmNodeModulesDir);
    for (const entry of entries) {
      const srcPath = path.join(pnpmNodeModulesDir, entry);
      const destPath = path.join(targetNodeModulesDir, entry);
      fs.cpSync(srcPath, destPath, {
        recursive: true,
        force: true,
        dereference: true,
      });
      console.log(`[AfterPack] Flattened dependency: ${entry}`);
    }
  }

  console.log(`[AfterPack] Standalone server successfully prepared at ${targetStandaloneDir}`);
};
