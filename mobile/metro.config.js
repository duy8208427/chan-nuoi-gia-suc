// Cho phép app mobile import code thuần TS dùng chung với bản web (../src, ../data, ../public/ponds).
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");
const sep = "[\\\\/]";
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\\/]/g, sep);

const config = getDefaultConfig(projectRoot);

config.watchFolders = [repoRoot];
// File dùng chung nằm ngoài thư mục mobile vẫn tìm package trong mobile/node_modules.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.blockList = [
  new RegExp(`^${escape(path.join(repoRoot, "node_modules"))}${sep}.*`),
  new RegExp(`^${escape(path.join(repoRoot, "dist"))}${sep}.*`),
  new RegExp(`^${escape(path.join(projectRoot, "android"))}${sep}.*`),
  new RegExp(`^${escape(path.join(projectRoot, "ios"))}${sep}.*`),
];

module.exports = config;
