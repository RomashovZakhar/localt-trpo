FROM node:18-alpine AS builder

# Установка рабочей директории
WORKDIR /app

# Установка зависимостей
COPY package.json package-lock.json ./
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка проекта
RUN npm run build

# Production-образ
FROM node:18-alpine AS runner

WORKDIR /app

# Переменные окружения (можно переопределить при запуске контейнера)
ENV NODE_ENV=production

# Копирование необходимых файлов из стадии сборки
COPY --from=builder /app/package.json .
COPY --from=builder /app/package-lock.json .
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts .

# Установка только production-зависимостей
RUN npm ci --only=production

# Открываем порт
EXPOSE 3000

# Запуск приложения
CMD ["npm", "start"] 