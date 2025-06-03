FROM node:18 AS builder

# Объявляем build arguments
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEBSOCKET_URL
# Устанавливаем ENV переменные из build arguments, используем значения по умолчанию, если ARG не передан
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000/api}
ENV NEXT_PUBLIC_WEBSOCKET_URL=${NEXT_PUBLIC_WEBSOCKET_URL:-ws://localhost:8001}

# Установка рабочей директории
WORKDIR /app

# Копирование package.json и установка зависимостей
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Копирование исходного кода и конфигурационных файлов
COPY . .

# Выводим значения ENV для проверки на этапе сборки
RUN echo "Build-time NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
RUN echo "Build-time NEXT_PUBLIC_WEBSOCKET_URL: $NEXT_PUBLIC_WEBSOCKET_URL"
RUN ls -la *.mjs || true
RUN cat next.config.mjs

# Сборка проекта
RUN npm run build

# Проверяем создание standalone директории
RUN ls -la /app/.next/

# Production-образ
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Также передаем ENV в production-образ из аргументов сборки
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEBSOCKET_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000/api}
ENV NEXT_PUBLIC_WEBSOCKET_URL=${NEXT_PUBLIC_WEBSOCKET_URL:-ws://localhost:8001}

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