/** @type {import('next').NextConfig} */
const nextConfig = {
  // 生产部署使用 standalone 模式，生成的构建可独立运行
  output: "standalone",
  experimental: {},
};

module.exports = nextConfig;
