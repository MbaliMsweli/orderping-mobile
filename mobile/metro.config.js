const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.maxWorkers = 1;

// Watch the shared/ folder (lives under orderflow-ai/ so Vercel can deploy it) so Metro
// picks up changes outside mobile/.
config.watchFolders = [path.resolve(__dirname, '../orderflow-ai/shared')];

// Resolve node_modules from the mobile project only (avoids accidentally pulling
// from a non-existent root node_modules).
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
