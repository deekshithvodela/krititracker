import sharp from 'sharp';
import * as path from 'path';

async function generateIcons() {
  const publicDir = path.resolve(process.cwd(), 'public');

  // SVG representation matching the actual KRITI K-monogram logo
  const svgStandard = (size: number) => {
    const rx = Math.round(size * 0.22);
    const fontSize = Math.round(size * 0.64);
    const textY = Math.round(size * 0.72);
    return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="kritiGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3730a3" />
          <stop offset="100%" stop-color="#4f46e5" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${rx}" fill="url(#kritiGrad)" />
      <text x="${size / 2}" y="${textY}" font-family="Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="${fontSize}" text-anchor="middle" fill="#ffffff" letter-spacing="0.05em">K</text>
    </svg>
  `;
  };

  // Safe-zone maskable version (Safe zone centered within 60% circle on solid gradient canvas)
  const svgMaskable = (size: number) => {
    const fontSize = Math.round(size * 0.48);
    const textY = Math.round(size * 0.66);
    return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="kritiGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3730a3" />
          <stop offset="100%" stop-color="#4f46e5" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#kritiGrad)" />
      <text x="${size / 2}" y="${textY}" font-family="Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="${fontSize}" text-anchor="middle" fill="#ffffff" letter-spacing="0.05em">K</text>
    </svg>
  `;
  };

  console.log('🎨 Generating PWA compliant icons matching actual KRITI logo...');

  // 1. 192x192 Standard Icon
  await sharp(Buffer.from(svgStandard(192)))
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('   ✅ public/pwa-192x192.png');

  // 2. 512x512 Standard Icon
  await sharp(Buffer.from(svgStandard(512)))
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('   ✅ public/pwa-512x512.png');

  // 3. 512x512 Maskable Icon (Safe-zone compliant)
  await sharp(Buffer.from(svgMaskable(512)))
    .png()
    .toFile(path.join(publicDir, 'maskable-icon-512x512.png'));
  console.log('   ✅ public/maskable-icon-512x512.png');

  // 4. Apple Touch Icon (180x180)
  await sharp(Buffer.from(svgStandard(180)))
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('   ✅ public/apple-touch-icon.png');

  // 5. Google Search Central 48x48 Favicon
  await sharp(Buffer.from(svgStandard(48)))
    .png()
    .toFile(path.join(publicDir, 'favicon-48x48.png'));
  console.log('   ✅ public/favicon-48x48.png');

  console.log('✨ All PWA icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
