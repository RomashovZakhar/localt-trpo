#!/bin/bash

# Сбрасываем потенциальные изменения
git reset --hard

# Загружаем последние изменения
git pull

# Останавливаем и удаляем контейнеры
docker-compose down

# Удаляем volume со статикой, чтобы пересоздать его с нуля
docker volume rm localt-trpo_next_static_volume || true

# Запускаем сервисы заново
docker-compose up -d

# Смотрим логи, чтобы проверить, всё ли в порядке
echo "Ждем 5 секунд для инициализации сервисов..."
sleep 5
echo "==================== ЛОГИ NGINX ===================="
docker-compose logs --tail=20 nginx
echo "==================== ЛОГИ FRONTEND ===================="
docker-compose logs --tail=20 frontend

echo "Все сервисы перезапущены. Проверьте доступность сайта." 