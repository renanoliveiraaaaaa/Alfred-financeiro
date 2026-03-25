/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
    serverActions: {
      // PDF em base64 aumenta ~33%; margem para faturas maiores
      bodySizeLimit: '12mb',
    },
  },
}

module.exports = nextConfig
