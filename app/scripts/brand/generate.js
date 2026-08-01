const sharp = require('sharp');
const path = require('path');

const ACCENT = '#c05f3a';
const CREAM = '#faf7f2';
const SPLASH_BG = '#2a201a';

// Herradura: centro (512,471) r=281.6 en lienzo 1024x1024, abierta hacia abajo
// (large-arc-flag=1, sweep-flag=0 -> verificado visualmente, ver combo-10.png)
function horseshoePath(strokeWidthRatio = 0.22) {
  const cx = 512, cy = 471, r = 281.6;
  const a1 = (45 * Math.PI) / 180;
  const a2 = (135 * Math.PI) / 180;
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
  const sw = Math.round(1024 * strokeWidthRatio);
  return { d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 1 0 ${x2.toFixed(1)} ${y2.toFixed(1)}`, sw };
}

function markSvg({ bg, stroke, size = 1024 }) {
  const { d, sw } = horseshoePath();
  return `<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ''}
    <path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" />
  </svg>`;
}

const OUT = path.join(__dirname, '..', '..', 'assets');

async function main() {
  // App icon (iOS/general): opaco, SIN transparencia (obligatorio en iOS)
  await sharp(Buffer.from(markSvg({ bg: ACCENT, stroke: CREAM })))
    .flatten({ background: ACCENT })
    .png()
    .toFile(path.join(OUT, 'icon.png'));

  // Android adaptive icon: foreground con marca (transparente), background plano
  await sharp(Buffer.from(markSvg({ bg: null, stroke: CREAM })))
    .png()
    .toFile(path.join(OUT, 'android-icon-foreground.png'));

  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: ACCENT } })
    .png()
    .toFile(path.join(OUT, 'android-icon-background.png'));

  // Android 13+ monochrome (forma en blanco, alpha = silueta)
  await sharp(Buffer.from(markSvg({ bg: null, stroke: '#ffffff' })))
    .png()
    .toFile(path.join(OUT, 'android-icon-monochrome.png'));

  // Splash: marca centrada, transparente (se compone sobre backgroundColor en app.json)
  await sharp(Buffer.from(markSvg({ bg: null, stroke: CREAM })))
    .png()
    .toFile(path.join(OUT, 'splash-icon.png'));

  // Favicon web
  await sharp(Buffer.from(markSvg({ bg: ACCENT, stroke: CREAM, size: 196 })))
    .resize(196, 196)
    .flatten({ background: ACCENT })
    .png()
    .toFile(path.join(OUT, 'favicon.png'));

  console.log('Iconos generados en', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
