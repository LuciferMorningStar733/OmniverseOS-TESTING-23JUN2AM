module.exports = {
    webpack: {
      configure: (webpackConfig) => {
        const eslintPlugin = webpackConfig.plugins.find(
          (p) => p.constructor.name === 'ESLintWebpackPlugin'
        );
        if (eslintPlugin) {
          eslintPlugin.options.cache = false;
        }
        return webpackConfig;
      },
    },
  };
  