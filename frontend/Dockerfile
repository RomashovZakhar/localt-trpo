FROM node:18 AS builder

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

# Сборка проекта
RUN npm run build

# Production-образ
FROM node:18 AS runner

WORKDIR /app

ENV NODE_ENV=production

# Копирование необходимых файлов из стадии сборки
COPY --from=builder /app/package.json .
COPY --from=builder /app/package-lock.json .
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts .

# Установка только production-зависимостей
RUN npm install --only=production --legacy-peer-deps

# Открываем порт
EXPOSE 3000

# Запуск приложения через standalone сервер
CMD ["node", ".next/standalone/server.js"] 