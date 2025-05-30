/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Основные настройки */
  reactStrictMode: true,
  
  /* Настройки для обхода ошибки window undefined */
  compiler: {
    // Отключает серверную обработку ошибок при доступе к window
    styledComponents: true,
  },
  
  /* Оптимизация изображений */
  images: {
    domains: ['localhost'],
    // Добавьте сюда домены production сервера, например:
    // domains: ['localhost', 'example.com', 'cdn.example.com'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  /* Настройки для API */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL 
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*` 
          : 'http://localhost:8000/api/:path*', // Fallback
      },
    ];
  },

  /* Переменные окружения */
  env: {
    // Эти переменные также должны быть добавлены через .env.local файл
    NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8001',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },

  /* Настройки выходной директории для статики */
  output: 'standalone',
  
  /* Добавление HTTP/2 заголовков */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  /* Отключение проверки типов при сборке */
  typescript: {
    // !! ВНИМАНИЕ !!
    // Отключение проверки типов опасно для production.
    // Убедитесь, что вы понимаете последствия.
    ignoreBuildErrors: true,
  },
};

export default nextConfig; 