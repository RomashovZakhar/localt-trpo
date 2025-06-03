FROM node:18 AS builder

# Объявляем build arguments
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEBSOCKET_URL
# Устанавливаем ENV переменные из build arguments, используем значения по умолчанию, если ARG не передан
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000/api}
ENV NEXT_PUBLIC_WEBSOCKET_URL=${NEXT_PUBLIC_WEBSOCKET_URL:-ws://localhost:8001}

# Установка рабочей директории
WORKDIR /app

# Копирование package.json и lock-файла
COPY package.json package-lock.json ./

# Удаляем node_modules и lock-файл на всякий случай
RUN rm -rf node_modules package-lock.json

# Установка зависимостей
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Копирование исходного кода
COPY . .

# Выводим значения ENV для проверки на этапе сборки
RUN echo "Build-time NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
RUN echo "Build-time NEXT_PUBLIC_WEBSOCKET_URL: $NEXT_PUBLIC_WEBSOCKET_URL"

# Создаем файл для проверки переменных окружения
RUN echo "console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);" > /app/env-check.js
RUN echo "console.log('NEXT_PUBLIC_WEBSOCKET_URL:', process.env.NEXT_PUBLIC_WEBSOCKET_URL);" >> /app/env-check.js
RUN node /app/env-check.js

# Убедимся что у нас есть next.config.js с настройкой output: 'standalone'
RUN if [ ! -f "next.config.js" ] && [ -f "next.config.ts" ]; then \
      echo "/** @type {import('next').NextConfig} */ module.exports = { output: 'standalone', ...require('./next.config.ts').default };" > next.config.js; \
    fi

RUN if [ ! -f "next.config.js" ] && [ ! -f "next.config.ts" ]; then \
      echo "/** @type {import('next').NextConfig} */ module.exports = { output: 'standalone' };" > next.config.js; \
    fi

# Сборка проекта (теперь Next.js должен увидеть правильную ENV)
RUN npm run build

# Проверяем создание standalone директории
RUN ls -la /app/.next/ || true

# Обработка динамических маршрутов: создаем директории для URL-кодированных путей и копируем файлы, если они существуют
# Создаем директорию для URL-кодированного пути независимо от наличия исходных файлов
RUN mkdir -p /app/.next/static/chunks/app/documents/%5Bid%5D

# Безопасная проверка наличия директории и копирование файлов, если они существуют
RUN ls -la /app/.next/static/chunks/app/documents/ || true
RUN if [ -d "/app/.next/static/chunks/app/documents/[id]" ] && [ "$(ls -A /app/.next/static/chunks/app/documents/[id] 2>/dev/null)" ]; then \
      cp -r /app/.next/static/chunks/app/documents/[id]/* /app/.next/static/chunks/app/documents/%5Bid%5D/ 2>/dev/null || true; \
    fi

# Production-образ
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Также передаем ENV в production-образ из аргументов сборки
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEBSOCKET_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000/api}
ENV NEXT_PUBLIC_WEBSOCKET_URL=${NEXT_PUBLIC_WEBSOCKET_URL:-ws://localhost:8001}

# Установка только необходимых пакетов
RUN apk add --no-cache bash

# Копирование необходимых файлов из стадии сборки
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./

# Проверяем ENV в production образе
RUN echo "Production NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
RUN echo "Production NEXT_PUBLIC_WEBSOCKET_URL: $NEXT_PUBLIC_WEBSOCKET_URL"

# Открываем порт
EXPOSE 3000

# Запуск приложения через standalone сервер
CMD ["node", "server.js"] 