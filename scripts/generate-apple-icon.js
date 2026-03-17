/**
 * Gera apple-icon.png (180x180) para iOS - formato obrigatório para Add to Home Screen.
 * Execute: node scripts/generate-apple-icon.js
 */
const fs = require('fs')
const path = require('path')

async function main() {
  const sharp = (await import('sharp')).default

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
      <rect width="180" height="180" fill="#0f0f0f" rx="36"/>
      <text x="90" y="120" font-size="80" text-anchor="middle" fill="#e2b42d" font-family="system-ui,sans-serif" font-weight="bold">A</text>
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
