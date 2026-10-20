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
  // 기본 보안 헤더: 다른 사이트의 iframe 안에 넣기(클릭재킹), MIME 추측, 리퍼러 전체 노출을 막고 HTTPS를 고정한다.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
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
