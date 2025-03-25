/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure Next.js to use the src directory
  reactStrictMode: true,
  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

module.exports = nextConfig;
