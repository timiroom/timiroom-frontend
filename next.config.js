/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: [
    "@tiptap/react",
    "@tiptap/core",
    "@tiptap/starter-kit",
    "@tiptap/extension-bubble-menu",
    "@tiptap/pm",
  ],
};

module.exports = nextConfig;
