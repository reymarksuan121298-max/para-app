const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const masterIconSrc = 'C:/Users/Reymark Suan/.gemini/antigravity-ide/brain/a90225b4-8238-48a4-8748-71398733d297/tricycle_app_icon_1791263666629.jpg';
const assetsDir = path.join(__dirname, '..', 'src', 'assets');
const appIconAsset = path.join(assetsDir, 'app_icon.png');
const logoAsset = path.join(assetsDir, 'logo.png');
const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const mipmapDensities = [
  { folder: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { folder: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { folder: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { folder: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { folder: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

async function generateAdaptiveIcons() {
  console.log('Starting app icon generation from:', masterIconSrc);

  if (!fs.existsSync(masterIconSrc)) {
    throw new Error('Master icon source not found: ' + masterIconSrc);
  }

  // 1. Save master icon to src/assets
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  await sharp(masterIconSrc)
    .resize(1024, 1024)
    .png()
    .toFile(appIconAsset);
  console.log('Saved master app icon to:', appIconAsset);

  // Also update logo.png for Login screen
  await sharp(masterIconSrc)
    .resize(512, 512)
    .png()
    .toFile(logoAsset);
  console.log('Updated logo asset at:', logoAsset);

  // 2. Generate icons for each mipmap density
  for (const d of mipmapDensities) {
    const dir = path.join(resDir, d.folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Standard launcher icon (squircle / square)
    await sharp(masterIconSrc)
      .resize(d.size, d.size)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // Round launcher icon (circular clipped)
    const circleMask = Buffer.from(
      `<svg width="${d.size}" height="${d.size}"><circle cx="${d.size / 2}" cy="${d.size / 2}" r="${d.size / 2}" fill="#000"/></svg>`
    );

    await sharp(masterIconSrc)
      .resize(d.size, d.size)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // Adaptive icon foreground (fitted with padding for safe zone ~72dp inside 108dp)
    // 72 / 108 = 0.666
    const innerSize = Math.round(d.fgSize * 0.72);
    const innerPadding = Math.round((d.fgSize - innerSize) / 2);

    const innerIconBuffer = await sharp(masterIconSrc)
      .resize(innerSize, innerSize)
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: d.fgSize,
        height: d.fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: innerIconBuffer, top: innerPadding, left: innerPadding }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`Generated ${d.folder}: ic_launcher, ic_launcher_round, ic_launcher_foreground`);
  }

  // 3. Drawables fallback
  const drawDir = path.join(resDir, 'drawable');
  if (!fs.existsSync(drawDir)) fs.mkdirSync(drawDir, { recursive: true });

  await sharp(masterIconSrc).resize(512, 512).png().toFile(path.join(drawDir, 'ic_launcher.png'));

  const drawCircleMask = Buffer.from(
    `<svg width="512" height="512"><circle cx="256" cy="256" r="256" fill="#000"/></svg>`
  );
  await sharp(masterIconSrc)
    .resize(512, 512)
    .composite([{ input: drawCircleMask, blend: 'dest-in' }])
    .png()
    .toFile(path.join(drawDir, 'ic_launcher_round.png'));

  await sharp(masterIconSrc).resize(512, 512).png().toFile(path.join(drawDir, 'ic_launcher_foreground.png'));

  // 4. Adaptive Icon XML in mipmap-anydpi-v26
  const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true });

  const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), xmlContent);
  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), xmlContent);

  // 5. Background color drawable for adaptive icons (#FFFFFF clean white background)
  const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M0,0h108v108h-108z"/>
</vector>
`;
  fs.writeFileSync(path.join(drawDir, 'ic_launcher_background.xml'), bgXml);

  console.log('✅ COMPLETE ADAPTIVE & LEGACY ICONS CREATED SUCCESSFULLY!');
}

generateAdaptiveIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
