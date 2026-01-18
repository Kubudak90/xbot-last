/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone build for Docker
  output: 'standalone',

  // External packages for server components
  experimental: {
    serverComponentsExternalPackages: ['playwright'],
  },

  // Disable powered by header
  poweredByHeader: false,

  // Strict mode for React
  reactStrictMode: true,

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
