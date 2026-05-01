#!/usr/bin/env node

/**
 * Generates app icons for all platforms from a master SVG.
 *
 * Usage:
 *   npm install --save-dev sharp png-to-ico
 *   node scripts/generate-icons.js
 *
 * Outputs:
 *   build/icon.png          — 1024x1024 master icon (used by electron-builder for Win/Mac conversion)
 *   build/icon.ico          — Windows icon for NSIS/MSI packaging
 *   build/icons/NxN.png     — Sized PNGs for Linux (16–512)
 */

const sharp = require("sharp");
const pngToIco = require("png-to-ico");
const fs = require("fs");
const path = require("path");

// -- Master SVG: database cylinder on blue rounded-rect background ----------

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1E40AF"/>
    </linearGradient>
    <linearGradient id="cyl" x1="340" y1="260" x2="684" y2="764" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e0e7ff"/>
    </linearGradient>
  </defs>

  <!-- Background rounded rect -->
  <rect width="1024" height="1024" rx="184" fill="url(#bg)"/>

  <!-- Database cylinder -->
  <!-- Body -->
  <path d="
    M 340 360
    L 340 664
    Q 340 764, 512 764
    Q 684 764, 684 664
    L 684 360
  " fill="url(#cyl)" opacity="0.95"/>

  <!-- Top ellipse -->
  <ellipse cx="512" cy="360" rx="172" ry="80" fill="url(#cyl)" opacity="0.95"/>

  <!-- Top ellipse rim (darker) -->
  <ellipse cx="512" cy="360" rx="172" ry="80" fill="none" stroke="#1E40AF" stroke-width="6" opacity="0.2"/>

  <!-- Middle line -->
  <path d="M 340 500 Q 340 580, 512 580 Q 684 580, 684 500"
        fill="none" stroke="#1E40AF" stroke-width="5" opacity="0.18"/>

  <!-- Bottom ellipse rim -->
  <path d="M 340 664 Q 340 764, 512 764 Q 684 764, 684 664"
        fill="none" stroke="#1E40AF" stroke-width="6" opacity="0.2"/>

  <!-- Side lines (subtle) -->
  <line x1="340" y1="360" x2="340" y2="664" stroke="#1E40AF" stroke-width="6" opacity="0.15"/>
  <line x1="684" y1="360" x2="684" y2="664" stroke="#1E40AF" stroke-width="6" opacity="0.15"/>
</svg>
`.trim();

const LINUX_SIZES = [16, 32, 48, 64, 128, 256, 512];
const BUILD_DIR = path.resolve(__dirname, "..", "build");
const ICONS_DIR = path.join(BUILD_DIR, "icons");

async function main() {
    // Ensure directories exist
    fs.mkdirSync(ICONS_DIR, { recursive: true });

    const svgBuffer = Buffer.from(SVG);

    // 1. Master 1024x1024 icon
    await sharp(svgBuffer).resize(1024, 1024).png().toFile(path.join(BUILD_DIR, "icon.png"));
    console.log("  build/icon.png (1024x1024)");

    // 2. Windows .ico bundle (multi-resolution)
    const icoSizes = [16, 24, 32, 48, 64, 128, 256];
    const icoBuffers = await Promise.all(
      icoSizes.map((size) => sharp(svgBuffer).resize(size, size).png().toBuffer()),
    );
    const ico = await pngToIco(icoBuffers);
    fs.writeFileSync(path.join(BUILD_DIR, "icon.ico"), ico);
    console.log("  build/icon.ico (16-256)");

    // 3. Sized PNGs for Linux
    for (const size of LINUX_SIZES) {
        const outPath = path.join(ICONS_DIR, `${size}x${size}.png`);
        await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
        console.log(`  build/icons/${size}x${size}.png`);
    }

    console.log("\nDone. Icon assets generated for Windows, Linux, and macOS packaging.");
}

main().catch((err) => {
    console.error("Icon generation failed:", err);
    process.exit(1);
});
