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

# Сборка проекта (теперь Next.js должен увидеть правильную ENV)
RUN npm run build

# Создаем URL-кодированные пути для динамических маршрутов
RUN mkdir -p /app/.next/static/chunks/app/documents/%5Bid%5D && \
    find /app/.next/static/chunks/app/documents/[id] -type f -exec cp {} /app/.next/static/chunks/app/documents/%5Bid%5D/ \; || true

# Production-образ
FROM node:18 AS runner

WORKDIR /app

ENV NODE_ENV=production
# Также передаем ENV в production-образ из аргументов сборки
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEBSOCKET_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000/api}
ENV NEXT_PUBLIC_WEBSOCKET_URL=${NEXT_PUBLIC_WEBSOCKET_URL:-ws://localhost:8001}

# Копирование необходимых файлов из стадии сборки
COPY --from=builder /app/package.json .
COPY --from=builder /app/package-lock.json .
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts .

# Установка только production-зависимостей
RUN npm install --only=production --legacy-peer-deps

# Проверяем ENV в production образе
RUN echo "Production NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
RUN echo "Production NEXT_PUBLIC_WEBSOCKET_URL: $NEXT_PUBLIC_WEBSOCKET_URL"
RUN echo "console.log('Production NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);" > /app/env-check.js
RUN echo "console.log('Production NEXT_PUBLIC_WEBSOCKET_URL:', process.env.NEXT_PUBLIC_WEBSOCKET_URL);" >> /app/env-check.js
RUN node /app/env-check.js

# Открываем порт
EXPOSE 3000

# Запуск приложения через standalone сервер
CMD ["node", ".next/standalone/server.js"]

# Убеждаемся, что URL-кодированные пути существуют и в production
RUN mkdir -p /app/.next/static/chunks/app/documents/%5Bid%5D && \
    find /app/.next/static/chunks/app/documents/[id] -type f -exec cp {} /app/.next/static/chunks/app/documents/%5Bid%5D/ \; || true 