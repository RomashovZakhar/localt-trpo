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

# Создаем скрипт для исправления статических файлов
RUN echo '#!/bin/bash\n\
echo "Создание URL-кодированных путей для динамических маршрутов..."\n\
\n\
# Поиск всех каталогов с квадратными скобками в названии\n\
find /app/.next/static -type d -name "\\[*\\]" | while read dir; do\n\
  # Получаем имя каталога\n\
  dirname=$(basename "$dir")\n\
  # Получаем родительский каталог\n\
  parent=$(dirname "$dir")\n\
  # Создаем URL-кодированное имя\n\
  encoded_name=$(echo "$dirname" | sed "s/\\[/%5B/g" | sed "s/\\]/%5D/g")\n\
  # Создаем новый каталог с URL-кодированным именем\n\
  mkdir -p "${parent}/${encoded_name}"\n\
  # Копируем содержимое\n\
  echo "Копирование из ${dir} в ${parent}/${encoded_name}"\n\
  cp -r "${dir}"/* "${parent}/${encoded_name}/" 2>/dev/null || true\n\
done\n\
\n\
# Специально обрабатываем [id] в documents, так как это критичный маршрут\n\
mkdir -p /app/.next/static/chunks/app/documents/%5Bid%5D\n\
cp -r /app/.next/static/chunks/app/documents/\\[id\\]/* /app/.next/static/chunks/app/documents/%5Bid%5D/ 2>/dev/null || true\n\
echo "Копирование завершено"\n\
' > /app/fix-static-files.sh && chmod +x /app/fix-static-files.sh

# Запуск приложения через standalone сервер, но сначала запускаем наш скрипт исправления
CMD ["/bin/sh", "-c", "/app/fix-static-files.sh && node .next/standalone/server.js"]

# Убеждаемся, что URL-кодированные пути существуют и в production
RUN mkdir -p /app/.next/static/chunks/app/documents/%5Bid%5D && \
    find /app/.next/static/chunks/app/documents/[id] -type f -exec cp {} /app/.next/static/chunks/app/documents/%5Bid%5D/ \; || true 