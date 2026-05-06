/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    config.externals = [
      ...(config.externals || []),
      { "@react-native-async-storage/async-storage": "commonjs @react-native-async-storage/async-storage" },
      { "pino-pretty": "commonjs pino-pretty" },
    ];
    return config;
  },
};

module.exports = nextConfig;
