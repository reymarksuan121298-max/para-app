const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const srcPath = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\338d32fc-78ef-4c17-abec-a54e8dbb9feb\\para_app_logo_1787119918916.jpg';
const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const mipmapDensities = [
  { folder: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { folder: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { folder: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { folder: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { folder: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

async function generateAdaptiveIcons() {
  for (const d of mipmapDensities) {
    const dir = path.join(resDir, d.folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Legacy standard PNGs
    await sharp(srcPath).resize(d.size, d.size).png().toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(srcPath).resize(d.size, d.size).png().toFile(path.join(dir, 'ic_launcher_round.png'));

    // Adaptive icon foreground PNG
    await sharp(srcPath)
      .resize(d.fgSize, d.fgSize, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 0 } })
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }

  // Drawables
  const drawDir = path.join(resDir, 'drawable');
  if (!fs.existsSync(drawDir)) fs.mkdirSync(drawDir, { recursive: true });
  await sharp(srcPath).resize(512, 512).png().toFile(path.join(drawDir, 'ic_launcher.png'));
  await sharp(srcPath).resize(512, 512).png().toFile(path.join(drawDir, 'ic_launcher_round.png'));
  await sharp(srcPath).resize(512, 512).png().toFile(path.join(drawDir, 'ic_launcher_foreground.png'));

  // Adaptive Icon XML in mipmap-anydpi-v26
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

  // Background color drawable for adaptive icons (#0F172A - Deep Navy)
  const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#0F172A"
        android:pathData="M0,0h108v108h-108z"/>
</vector>
`;
  fs.writeFileSync(path.join(drawDir, 'ic_launcher_background.xml'), bgXml);

  console.log('COMPLETE ADAPTIVE & LEGACY ICONS CREATED SUCCESSFULLY!');
}

generateAdaptiveIcons();
