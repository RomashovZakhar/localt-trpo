import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Основные настройки */
  reactStrictMode: true,
  
  /* Настройки для обхода ошибки window undefined */
  compiler: {
    // Отключает серверную обработку ошибок при доступе к window
    styledComponents: true,
  },
  
  /* Webpack конфигурация для явной передачи переменных окружения */
  webpack: (config, { isServer }) => {
    // Выводим переменные окружения во время сборки
    console.log('Webpack NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('Webpack NEXT_PUBLIC_WEBSOCKET_URL:', process.env.NEXT_PUBLIC_WEBSOCKET_URL);
    
    // Определяем DefinePlugin для явного экспорта переменных окружения
    config.plugins.push(
      new config.webpack.DefinePlugin({
        'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(process.env.NEXT_PUBLIC_API_URL),
        'process.env.NEXT_PUBLIC_WEBSOCKET_URL': JSON.stringify(process.env.NEXT_PUBLIC_WEBSOCKET_URL),
      })
    );
    
    return config;
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
};

export default nextConfig;
