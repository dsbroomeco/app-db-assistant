const fs = require("fs");
const path = require("path");

const rootPackagePath = path.join(__dirname, "..", "package.json");
const downloadPagePath = path.join(
  __dirname,
  "..",
  "website",
  "src",
  "app",
  "download",
  "page.tsx",
);

const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, "utf-8"));
const version = rootPackage.version;

const original = fs.readFileSync(downloadPagePath, "utf-8");
const updated = original.replace(
  /const CURRENT_VERSION = "[^"]+";/,
  `const CURRENT_VERSION = "${version}";`,
);

if (updated !== original) {
  fs.writeFileSync(downloadPagePath, updated, "utf-8");
  console.log(`Synced website download version to ${version}`);
} else {
  console.log(`Website download version already ${version}`);
}
