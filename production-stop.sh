#!/bin/bash

# Скрипт для остановки проекта в production
# Должен выполняться из корневой директории проекта

echo "Остановка проекта..."

# Остановка фронтенда
if [ -f "frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "Остановка Next.js сервера (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
    else
        echo "Next.js сервер не запущен или уже остановлен"
    fi
    rm frontend.pid
else
    echo "Файл frontend.pid не найден"
fi

# Остановка Django API
if [ -f "backend.pid" ]; then
    BACKEND_PID=$(cat backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "Остановка Django API сервера (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
    else
        echo "Django API сервер не запущен или уже остановлен"
    fi
    rm backend.pid
else
    echo "Файл backend.pid не найден"
fi

# Остановка WebSocket сервера
if [ -f "websocket.pid" ]; then
    WEBSOCKET_PID=$(cat websocket.pid)
    if kill -0 $WEBSOCKET_PID 2>/dev/null; then
        echo "Остановка WebSocket сервера (PID: $WEBSOCKET_PID)..."
        kill $WEBSOCKET_PID
    else
        echo "WebSocket сервер не запущен или уже остановлен"
    fi
    rm websocket.pid
else
    echo "Файл websocket.pid не найден"
fi

echo "Проект остановлен!" 