// Allow the browser to reach the API host named by NEXT_PUBLIC_API_URL.
// Derived at build time so CSP tracks HOST_ADDR instead of hardcoding an origin.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
let apiOrigin = 'http://localhost:3001';
try {
  apiOrigin = new URL(apiUrl).origin;
} catch {
  // Fall back to the localhost default if NEXT_PUBLIC_API_URL is malformed.
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true, // Enable gzip compression
  // Self-contained server bundle for the Docker image (node server.js).
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; frame-src 'self' blob: data:; connect-src 'self' ${apiOrigin} http://localhost:3001 http://localhost:3000 ws: wss:;`
          }
        ]
      }
    ];
  },
  eslint: {
    // Lint runs in CI/dev; don't let style warnings fail the production image build.
    ignoreDuringBuilds: true,
  },
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
};

module.exports = nextConfig;
