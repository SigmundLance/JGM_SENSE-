const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
// This helps Metro find the right version of tslib inside framer-motion
config.resolver.sourceExts.push('mjs'); 

module.exports = config;