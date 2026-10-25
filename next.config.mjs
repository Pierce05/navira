/** Static export: there is no backend, by design (PRD §12). */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, 'sharp$': false, 'onnxruntime-node$': false };
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, canvas: false };
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};
export default nextConfig;
