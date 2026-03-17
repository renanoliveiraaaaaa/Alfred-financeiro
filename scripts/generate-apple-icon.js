/**
 * Gera apple-icon.png (180x180) para iOS - formato obrigatório para Add to Home Screen.
 * Execute: node scripts/generate-apple-icon.js
 */
const fs = require('fs')
const path = require('path')

async function main() {
  const sharp = (await import('sharp')).default

  // Cartola (top hat) estilo Alfred — silhueta de mordomo
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
      <rect width="180" height="180" fill="#0f0f0f" rx="36"/>
      <g transform="translate(90 95)" fill="#e2b42d">
        <!-- Aba da cartola (elipse) -->
        <ellipse cx="0" cy="22" rx="38" ry="6"/>
        <!-- Copa da cartola (retângulo arredondado) -->
        <rect x="-28" y="-42" width="56" height="64" rx="4" ry="4"/>
        <!-- Topo plano (destaque) -->
        <rect x="-26" y="-44" width="52" height="6" rx="2" fill="#d4a010"/>
      </g>
    </svg>
  `.trim()

  const png = await sharp(Buffer.from(svg))
    .png()
    .toBuffer()

  const outPath = path.join(__dirname, '..', 'public', 'apple-icon.png')
  fs.writeFileSync(outPath, png)
  console.log('✓ apple-icon.png gerado em public/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
