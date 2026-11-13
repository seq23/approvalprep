const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
const path = require('node:path');
config.watchFolders = [path.resolve(__dirname, '../..')];
if (!config.resolver.assetExts.includes('wasm')) config.resolver.assetExts.push('wasm');
module.exports = config;
