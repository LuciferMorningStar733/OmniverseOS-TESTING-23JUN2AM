const path = require('path');
const fs   = require('fs');

module.exports = {
  // Pass cache: false directly when CRACO constructs eslint-webpack-plugin
  eslint: {
    enable: true,
    pluginOptions: {
      cache: false,
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      // Belt-and-suspenders: delete any Vercel-restored ESLint cache before webpack runs
      const cacheDir = path.join(__dirname, 'node_modules', '.cache', 'eslint-webpack-plugin');
      try { fs.rmSync(cacheDir, { recursive: true, force: true }); } catch (_) {}
      return webpackConfig;
    },
  },
};
