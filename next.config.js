/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost',          port: '9000' },
      { protocol: 'https', hostname: 'minio.timiroom.kro.kr' },
    ],
  },
  transpilePackages: [
    "@tiptap/react",
    "@tiptap/core",
    "@tiptap/starter-kit",
    "@tiptap/extension-bubble-menu",
    "@tiptap/pm",
  ],
};

module.exports = nextConfig;
