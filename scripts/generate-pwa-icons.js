const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
const iconsDir = path.join(publicDir, "icons");
const logoPath = path.join(publicDir, "logo.png");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcon(size, filename, maskable = false) {
  const outputPath = path.join(iconsDir, filename);
  const padding = maskable ? Math.round(size * 0.1) : 0;
  const imageSize = size - padding * 2;

  await sharp(logoPath)
    .resize(imageSize, imageSize, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toFile(outputPath);

  console.log(`✅ Generated ${outputPath}`);
}

async function main() {
  if (!fs.existsSync(logoPath)) {
    console.error(`❌ Logo not found at ${logoPath}`);
    process.exit(1);
  }

  await generateIcon(192, "icon-192x192.png");
  await generateIcon(512, "icon-512x512.png");
  await generateIcon(180, "apple-touch-icon.png");
  await generateIcon(512, "maskable-icon-512x512.png", true);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
