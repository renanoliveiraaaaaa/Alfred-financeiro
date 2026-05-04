/**
 * Gera icon-192.png e icon-512.png para o PWA manifest.
 * Execute: node scripts/generate-pwa-icons.js
 */
const fs = require('fs')
const path = require('path')

function buildSvg(size) {
  const rx = Math.round(size * 0.2) // border-radius proporcional
  const scale = size / 180
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#0f0f0f" rx="${rx}"/>
  <g transform="translate(${size / 2} ${size * 0.527}) scale(${scale})" fill="#e2b42d">
    <ellipse cx="0" cy="22" rx="38" ry="6"/>
    <rect x="-28" y="-42" width="56" height="64" rx="4" ry="4"/>
    <rect x="-26" y="-44" width="52" height="6" rx="2" fill="#d4a010"/>
  </g>
</svg>`.trim()
}

async function main() {
  const sharp = (await import('sharp')).default
  const publicDir = path.join(__dirname, '..', 'public')

  for (const size of [192, 512]) {
    const svg = buildSvg(size)
    const outPath = path.join(publicDir, `icon-${size}.png`)
    await sharp(Buffer.from(svg)).png().toFile(outPath)
    console.log(`✅  Gerado: public/icon-${size}.png`)
  }
}

main().catch((err) => {
  console.error('Erro ao gerar ícones:', err)
  process.exit(1)
})
