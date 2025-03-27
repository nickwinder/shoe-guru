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
  webpack(config) {
    config.externals = [...config.externals, 'hnswlib-node'];  // by adding this line, solved the import
    return config;
  },
};

module.exports = nextConfig;
