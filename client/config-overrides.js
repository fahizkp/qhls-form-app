// config-overrides.js
// Adds Node.js built-in fallbacks so pptxgenjs can be bundled by webpack 5 in CRA

const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve = config.resolve || {};

  // Stub out Node built-ins that pptxgenjs references
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    fs:     false,
    https:  false,
    http:   false,
    path:   false,
    url:    false,
    stream: false,
    zlib:   false,
  };

  config.plugins = [
    ...(config.plugins || []),
    // Rewrite "node:xxx" imports → "xxx"  (webpack 5 doesn't handle node: URIs by default in CRA)
    new webpack.NormalModuleReplacementPlugin(
      /^node:/,
      (resource) => {
        resource.request = resource.request.replace(/^node:/, '');
      }
    ),
  ];

  return config;
};

