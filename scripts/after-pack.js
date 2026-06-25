// electron-builder strips `node_modules` from `extraResources`, but the Next.js
// standalone server needs its bundled node_modules (incl. the Prisma client and
// query engines). Copy it into the packed resources/standalone after packaging.

const fs = require("fs");
const path = require("path");

exports.default = async function afterPack(context) {
  const { appOutDir, packager } = context;
  const root = path.join(__dirname, "..");
  const srcNodeModules = path.join(root, ".next", "standalone", "node_modules");

  if (!fs.existsSync(srcNodeModules)) {
    throw new Error(
      `[after-pack] standalone node_modules not found: ${srcNodeModules}. ` +
        "Run `npm run desktop:prepare` first.",
    );
  }

  const platform = packager.platform.name; // "windows" | "linux" | "mac"
  const resourcesDir =
    platform === "mac"
      ? path.join(
          appOutDir,
          `${packager.appInfo.productFilename}.app`,
          "Contents",
          "Resources",
        )
      : path.join(appOutDir, "resources");

  const dest = path.join(resourcesDir, "standalone", "node_modules");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(srcNodeModules, dest, { recursive: true });
  console.log(`[after-pack] copied standalone node_modules -> ${dest}`);
};
