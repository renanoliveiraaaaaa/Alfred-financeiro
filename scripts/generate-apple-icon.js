/**
 * Gera todos os ícones do app (favicon, apple-icon, icon-192, icon-512)
 * a partir da silhueta de smoking Alfred (gravata-borboleta esmeralda).
 *
 * Execute: node scripts/generate-apple-icon.js
 *   ou:    npm run gen:icons
 */
const fs = require('fs')
const path = require('path')

function buildSvg(size) {
  const radius = Math.round(size * 0.2)
  const scale = size / 180
  const tx = size / 2
  const ty = size / 2

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="#0f0f0f" rx="${radius}"/>
      <g transform="translate(${tx} ${ty}) scale(${scale})">
        <path d="M -42 -22 L -10 -8 L 0 56 L -28 24 Z" fill="#f5f5f5"/>
        <path d="M 42 -22 L 10 -8 L 0 56 L 28 24 Z" fill="#f5f5f5"/>
        <path d="M -10 -8 L 10 -8 L 0 56 Z" fill="#fafafa"/>
        <path d="M -22 -28 L -4 -22 L -4 -10 L -22 -16 Z" fill="#10b981"/>
        <path d="M 22 -28 L 4 -22 L 4 -10 L 22 -16 Z" fill="#10b981"/>
        <rect x="-4" y="-24" width="8" height="12" rx="1.5" fill="#0d9668"/>
        <circle cx="0" cy="6" r="2.4" fill="#0f0f0f"/>
        <circle cx="0" cy="20" r="2.4" fill="#0f0f0f"/>
        <circle cx="0" cy="34" r="2.4" fill="#0f0f0f"/>
      </g>
    </svg>
  `.trim()
}

async function main() {
  const sharp = (await import('sharp')).default
  const publicDir = path.join(__dirname, '..', 'public')

  const targets = [
    { name: 'favicon.ico', size: 32 },
    { name: 'apple-icon.png', size: 180 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
  ]

  for (const { name, size } of targets) {
    const svg = buildSvg(size)
    const buffer = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
    fs.writeFileSync(path.join(publicDir, name), buffer)
    console.log(`✓ ${name} (${size}x${size})`)
  }

  console.log('Todos os ícones do Alfred gerados em public/.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
