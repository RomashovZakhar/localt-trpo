#!/bin/bash

# Скрипт для запуска проекта в production
# Должен выполняться из корневой директории проекта

# Проверяем наличие .env файла
if [ ! -f "backend/.env" ]; then
    echo "Ошибка: Файл .env не найден в директории backend!"
    echo "Скопируйте environment.env.example в backend/.env и настройте переменные окружения."
    exit 1
fi

# Проверяем наличие виртуального окружения
if [ ! -d "backend/venv" ]; then
    echo "Виртуальное окружение не найдено, создаем..."
    cd backend
    python3 -m venv venv
    cd ..
fi

# Активируем виртуальное окружение
echo "Активация виртуального окружения..."
source backend/venv/bin/activate

# Обновляем зависимости
echo "Обновление зависимостей бэкенда..."
cd backend
pip install -r requirements.txt

# Применяем миграции базы данных
echo "Применение миграций базы данных..."
python manage.py migrate

# Собираем статические файлы
echo "Сборка статических файлов Django..."
python manage.py collectstatic --noinput

# Проверяем, запущен ли Redis
echo "Проверка Redis..."
redis-cli ping > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Ошибка: Redis не запущен или недоступен!"
    echo "Запустите Redis перед запуском проекта."
    exit 1
fi

# Возвращаемся в корневую директорию
cd ..

# Проверяем наличие директории node_modules для фронтенда
if [ ! -d "frontend/node_modules" ]; then
    echo "Директория node_modules не найдена, устанавливаем зависимости..."
    cd frontend
    npm install
    cd ..
fi

# Обновление фронтенда и сборка
echo "Обновление и сборка фронтенда..."
cd frontend
npm run build

# Запуск production-сервера для Next.js в фоновом режиме
echo "Запуск production-сервера Next.js..."
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Запуск Django с Gunicorn в фоновом режиме
echo "Запуск Django API с Gunicorn..."
cd backend
gunicorn core.wsgi:application --workers 3 --bind 0.0.0.0:8000 > ../backend.log 2>&1 &
BACKEND_PID=$!

# Запуск Daphne для WebSocket в фоновом режиме
echo "Запуск Daphne для WebSocket..."
daphne -b 0.0.0.0 -p 8001 daphne_startup:application > ../websocket.log 2>&1 &
WEBSOCKET_PID=$!
cd ..

# Сохраняем PID в файлы
echo $FRONTEND_PID > frontend.pid
echo $BACKEND_PID > backend.pid
echo $WEBSOCKET_PID > websocket.pid

echo "Проект успешно запущен!"
echo "Django API: http://localhost:8000"
echo "WebSocket: ws://localhost:8001"
echo "Frontend: http://localhost:3000"
echo "Логи сохранены в: backend.log, websocket.log, frontend.log"
echo "Для остановки используйте: ./production-stop.sh" 