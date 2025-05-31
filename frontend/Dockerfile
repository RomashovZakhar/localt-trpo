FROM node:18 AS builder

# Объявляем build argument
ARG NEXT_PUBLIC_API_URL
# Устанавливаем ENV переменную из build argument, используем значение по умолчанию, если ARG не передан
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000/api}

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

# Выводим значение ENV для проверки на этапе сборки
RUN echo "Build-time NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"

# Сборка проекта (теперь Next.js должен увидеть правильную ENV)
RUN npm run build

# Production-образ
FROM node:18 AS runner

WORKDIR /app

ENV NODE_ENV=production
# Также передаем ENV в production-образ из аргумента сборки
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000/api}

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