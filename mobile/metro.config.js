const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.maxWorkers = 1;

// Watch the repo-root shared/ folder so Metro picks up changes outside mobile/.
config.watchFolders = [path.resolve(__dirname, '../shared')];

// Resolve node_modules from the mobile project only (avoids accidentally pulling
// from a non-existent root node_modules).
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
