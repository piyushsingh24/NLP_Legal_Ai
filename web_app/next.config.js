/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for pdf-parse and formidable to work in serverless environment
  serverRuntimeConfig: {
    PROJECT_ROOT: __dirname,
  },
};

module.exports = nextConfig;
