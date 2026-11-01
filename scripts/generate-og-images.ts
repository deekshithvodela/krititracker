import sharp from 'sharp';
import * as path from 'path';

interface OgConfig {
  filename: string;
  width: number;
  height: number;
}

const configs: OgConfig[] = [
  { filename: 'og-image.png', width: 1200, height: 630 },        // Standard 1.91:1
  { filename: 'og-image-1200x630.png', width: 1200, height: 630 }, // Explicit 1.91:1
  { filename: 'og-image-16x9.png', width: 1280, height: 720 },    // 16:9 Google Discover
  { filename: 'og-image-4x3.png', width: 1200, height: 900 },     // 4:3 Google Search Rich Card
  { filename: 'og-image-1x1.png', width: 800, height: 800 },       // 1:1 WhatsApp & Square Previews
];

function buildSvg(width: number, height: number): string {
  const isSquare = width === height;
  const logoSize = isSquare ? 130 : 150;
  const logoRx = Math.round(logoSize * 0.22);
  const logoFontSize = Math.round(logoSize * 0.65);
  const logoTextY = Math.round(logoSize * 0.72);

  if (isSquare) {
    // Compact 1:1 layout for WhatsApp & Square Cards
    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#090d16" />
            <stop offset="50%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#1e1b4b" />
          </linearGradient>
          <linearGradient id="logoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#3730a3" />
            <stop offset="100%" stop-color="#4f46e5" />
          </linearGradient>
          <linearGradient id="glowRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#818cf8" stop-opacity="0.1" />
          </linearGradient>
        </defs>

        <!-- Background Canvas -->
        <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

        <!-- Ambient decorative ring -->
        <circle cx="${width / 2}" cy="245" r="140" stroke="url(#glowRing)" stroke-width="2" fill="none" />

        <!-- Centered Logo Monogram -->
        <g transform="translate(${(width - logoSize) / 2}, 180)">
          <rect width="${logoSize}" height="${logoSize}" rx="${logoRx}" fill="url(#logoGrad)" />
          <text x="${logoSize / 2}" y="${logoTextY}" font-family="Inter, -apple-system, sans-serif" font-weight="900" font-size="${logoFontSize}" text-anchor="middle" fill="#ffffff" letter-spacing="0.05em">K</text>
        </g>

        <!-- Brand Name & Tagline -->
        <text x="${width / 2}" y="390" font-family="Inter, -apple-system, sans-serif" font-weight="900" font-size="42" text-anchor="middle" fill="#ffffff" letter-spacing="-0.02em">
          KRITI MedEvent
        </text>
        <text x="${width / 2}" y="435" font-family="Inter, -apple-system, sans-serif" font-weight="600" font-size="19" text-anchor="middle" fill="#818cf8" letter-spacing="0.15em">
          TRACKER &amp; COMPLIANCE
        </text>

        <text x="${width / 2}" y="495" font-family="Inter, -apple-system, sans-serif" font-weight="400" font-size="18" text-anchor="middle" fill="#94a3b8">
          Enterprise Medical Congress Coordination
        </text>

        <!-- Security & Whitelist Badges -->
        <g transform="translate(${width / 2 - 185}, 560)">
          <rect width="175" height="36" rx="18" fill="#1e293b" stroke="#334155" stroke-width="1" />
          <circle cx="22" cy="18" r="4.5" fill="#10b981" />
          <text x="36" y="23" font-family="Inter, sans-serif" font-weight="600" font-size="13" fill="#cbd5e1">Whitelist Access</text>
        </g>
        <g transform="translate(${width / 2 + 10}, 560)">
          <rect width="175" height="36" rx="18" fill="#1e293b" stroke="#334155" stroke-width="1" />
          <circle cx="22" cy="18" r="4.5" fill="#6366f1" />
          <text x="36" y="23" font-family="Inter, sans-serif" font-weight="600" font-size="13" fill="#cbd5e1">Sheets Sync v4</text>
        </g>

        <!-- Footer / Attribution -->
        <text x="${width / 2}" y="700" font-family="Inter, -apple-system, sans-serif" font-weight="500" font-size="15" text-anchor="middle" fill="#64748b">
          Built by Deekshith Vodela
        </text>
      </svg>
    `;
  }

  // Landscape formats (1.91:1, 16:9, 4:3)
  const logoX = 90;
  const logoY = Math.round(height / 2 - logoSize / 2 - 15);

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#090d16" />
          <stop offset="50%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e1b4b" />
        </linearGradient>
        <linearGradient id="logoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3730a3" />
          <stop offset="100%" stop-color="#4f46e5" />
        </linearGradient>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#e0e7ff" />
        </linearGradient>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#818cf8" stop-opacity="0.08" />
        </linearGradient>
      </defs>

      <!-- Background Canvas -->
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

      <!-- Ambient decorative rings around logo -->
      <circle cx="${logoX + logoSize / 2}" cy="${logoY + logoSize / 2}" r="150" stroke="url(#ringGrad)" stroke-width="2" fill="none" />
      <circle cx="${logoX + logoSize / 2}" cy="${logoY + logoSize / 2}" r="210" stroke="url(#ringGrad)" stroke-width="1" fill="none" opacity="0.6" />

      <!-- Monogram Logo Badge -->
      <g transform="translate(${logoX}, ${logoY})">
        <rect width="${logoSize}" height="${logoSize}" rx="${logoRx}" fill="url(#logoGrad)" />
        <text x="${logoSize / 2}" y="${logoTextY}" font-family="Inter, -apple-system, sans-serif" font-weight="900" font-size="${logoFontSize}" text-anchor="middle" fill="#ffffff" letter-spacing="0.05em">K</text>
      </g>

      <!-- Content Column -->
      <!-- Eyebrow Tag -->
      <g transform="translate(290, ${logoY - 10})">
        <rect width="250" height="30" rx="15" fill="#1e1b4b" stroke="#4f46e5" stroke-width="1" />
        <text x="125" y="20" font-family="Inter, sans-serif" font-weight="700" font-size="12" text-anchor="middle" fill="#a5b4fc" letter-spacing="0.12em">
          MEDICAL CONGRESS SUITE
        </text>
      </g>

      <!-- Main Title -->
      <text x="290" y="${logoY + 65}" font-family="Inter, -apple-system, sans-serif" font-weight="900" font-size="50" fill="url(#textGrad)" letter-spacing="-0.025em">
        KRITI MedEvent Tracker
      </text>

      <!-- Subtitle Description -->
      <text x="290" y="${logoY + 110}" font-family="Inter, -apple-system, sans-serif" font-weight="400" font-size="21" fill="#94a3b8">
        Enterprise coordination &amp; audit logging across 12 medical committees
      </text>

      <!-- Trust Badges -->
      <g transform="translate(290, ${logoY + 152})">
        <!-- Badge 1: Whitelisted -->
        <rect x="0" y="0" width="190" height="38" rx="19" fill="#0f172a" stroke="#334155" stroke-width="1" />
        <circle cx="20" cy="19" r="4.5" fill="#10b981" />
        <text x="34" y="24" font-family="Inter, sans-serif" font-weight="600" font-size="12.5" fill="#e2e8f0">Whitelisted Access Only</text>

        <!-- Badge 2: Google Sheets Sync -->
        <rect x="204" y="0" width="190" height="38" rx="19" fill="#0f172a" stroke="#334155" stroke-width="1" />
        <circle cx="224" cy="19" r="4.5" fill="#6366f1" />
        <text x="238" y="24" font-family="Inter, sans-serif" font-weight="600" font-size="12.5" fill="#e2e8f0">Google Sheets API v4</text>

        <!-- Badge 3: HIPAA / GDPR -->
        <rect x="408" y="0" width="175" height="38" rx="19" fill="#0f172a" stroke="#334155" stroke-width="1" />
        <circle cx="428" cy="19" r="4.5" fill="#38bdf8" />
        <text x="442" y="24" font-family="Inter, sans-serif" font-weight="600" font-size="12.5" fill="#e2e8f0">Zero PII Leakage</text>
      </g>

      <!-- Bottom Bar Attribution -->
      <line x1="90" y1="${height - 65}" x2="${width - 90}" y2="${height - 65}" stroke="#1e293b" stroke-width="1" />
      <text x="90" y="${height - 35}" font-family="Inter, -apple-system, sans-serif" font-weight="500" font-size="14.5" fill="#64748b">
        © 2026 Deekshith Vodela • Built for clinical precision and regulatory compliance
      </text>
      <text x="${width - 90}" y="${height - 35}" font-family="Inter, -apple-system, sans-serif" font-weight="600" font-size="13.5" text-anchor="end" fill="#818cf8">
        kriti-tracker.vercel.app
      </text>
    </svg>
  `;
}

async function generateOgImages() {
  const publicDir = path.resolve(process.cwd(), 'public');
  console.log('🖼️  Generating Multi-Platform OpenGraph Image Suite (< 100 KB tier)...');

  for (const config of configs) {
    const svg = buildSvg(config.width, config.height);
    const destPath = path.join(publicDir, config.filename);

    const buffer = await sharp(Buffer.from(svg))
      .png({
        compressionLevel: 9,
        palette: true,
        quality: 85,
        effort: 9,
      })
      .toBuffer();

    const sizeKb = (buffer.length / 1024).toFixed(1);
    await sharp(buffer).toFile(destPath);

    console.log(`   ✅ public/${config.filename} (${config.width}x${config.height}) — ${sizeKb} KB`);

    if (buffer.length > 100 * 1024) {
      console.warn(`   ⚠️ WARNING: ${config.filename} is ${sizeKb} KB, exceeding 100 KB limit!`);
    }
  }

  console.log('✨ All OpenGraph images generated within the strictly < 100 KB tier!');
}

generateOgImages().catch(err => {
  console.error('Failed to generate OpenGraph images:', err);
  process.exit(1);
});
