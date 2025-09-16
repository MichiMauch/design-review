/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['sqlite3'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'sqlite3': 'commonjs sqlite3'
      });
    }
    return config;
  }
};

module.exports = nextConfig;
