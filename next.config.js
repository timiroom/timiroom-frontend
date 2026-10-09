/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    // 서버 측 이미지 최적화 API(/_next/image)를 끈다. Next 14에는 이 API의 원격 코드 실행·DoS 권고가
    // 패치되지 않았고, 이미지는 원본 주소에서 그대로 불러와도 충분하다.
    unoptimized: true,
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
