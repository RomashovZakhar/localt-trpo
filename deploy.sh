#!/bin/bash

# Скрипт для автоматического деплоя проекта Rodnik
# Должен выполняться на production сервере

# Цвета для красивого вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для вывода информации
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# Функция для вывода предупреждений
warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Функция для вывода ошибок
error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка, что скрипт запущен с правами sudo
if [ "$EUID" -ne 0 ]; then
  error "Этот скрипт должен запускаться с правами sudo!"
  exit 1
fi

# Параметры деплоя (можно изменить)
DEPLOY_USER="rodnik"
PROJECT_DIR="/home/$DEPLOY_USER/rodnik"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOG_DIR="/var/log/rodnik"
REPO_URL="https://github.com/your-repo/rodnik.git"

# Создание пользователя для деплоя, если он не существует
if ! id -u $DEPLOY_USER > /dev/null 2>&1; then
    info "Создание пользователя $DEPLOY_USER..."
    adduser --system --group --shell /bin/bash $DEPLOY_USER
    usermod -aG sudo $DEPLOY_USER
fi

# Создание директории для логов
if [ ! -d "$LOG_DIR" ]; then
    info "Создание директории для логов..."
    mkdir -p $LOG_DIR
    chown -R $DEPLOY_USER:$DEPLOY_USER $LOG_DIR
fi

# Проверка наличия Git
if ! command -v git &> /dev/null; then
    info "Установка Git..."
    apt-get update
    apt-get install -y git
fi

# Проверка наличия директории проекта
if [ ! -d "$PROJECT_DIR" ]; then
    info "Клонирование репозитория..."
    mkdir -p $PROJECT_DIR
    chown -R $DEPLOY_USER:$DEPLOY_USER $PROJECT_DIR
    su - $DEPLOY_USER -c "git clone $REPO_URL $PROJECT_DIR"
else
    info "Обновление репозитория..."
    su - $DEPLOY_USER -c "cd $PROJECT_DIR && git pull"
fi

# Установка Python и зависимостей
info "Установка Python и зависимостей..."
apt-get update
apt-get install -y python3 python3-pip python3-venv python3-dev build-essential libpq-dev

# Установка PostgreSQL и Redis
info "Установка PostgreSQL и Redis..."
apt-get install -y postgresql postgresql-contrib redis-server

# Установка Node.js
if ! command -v node &> /dev/null; then
    info "Установка Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Установка Nginx
info "Установка Nginx..."
apt-get install -y nginx

# Создание виртуального окружения и установка зависимостей бэкенда
info "Настройка бэкенда..."
if [ ! -d "$BACKEND_DIR/venv" ]; then
    su - $DEPLOY_USER -c "python3 -m venv $BACKEND_DIR/venv"
fi
su - $DEPLOY_USER -c "cd $BACKEND_DIR && source venv/bin/activate && pip install -r requirements.txt"

# Проверка наличия .env файла
if [ ! -f "$BACKEND_DIR/.env" ]; then
    warn "Файл .env не найден, создаем из шаблона..."
    if [ -f "$PROJECT_DIR/environment.env.example" ]; then
        su - $DEPLOY_USER -c "cp $PROJECT_DIR/environment.env.example $BACKEND_DIR/.env"
        warn "Создан файл .env из шаблона. Пожалуйста, отредактируйте его с нужными настройками!"
    else
        error "Файл шаблона environment.env.example не найден!"
        exit 1
    fi
fi

# Настройка бэкенда
info "Применение миграций и сбор статических файлов..."
su - $DEPLOY_USER -c "cd $BACKEND_DIR && source venv/bin/activate && python manage.py migrate && python manage.py collectstatic --noinput"

# Установка зависимостей фронтенда и сборка
info "Настройка фронтенда..."
su - $DEPLOY_USER -c "cd $FRONTEND_DIR && npm install && npm run build"

# Создание .env.local для фронтенда
if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    warn "Файл .env.local не найден, создаем из шаблона..."
    if [ -f "$PROJECT_DIR/environment.env.example" ]; then
        su - $DEPLOY_USER -c "cp $PROJECT_DIR/environment.env.example $FRONTEND_DIR/.env.local"
        warn "Создан файл .env.local из шаблона. Пожалуйста, отредактируйте его с нужными настройками!"
    fi
fi

# Настройка Supervisor
info "Настройка Supervisor..."
apt-get install -y supervisor

# Копирование конфигурации supervisor
if [ -f "$PROJECT_DIR/supervisor/rodnik.conf" ]; then
    envsubst < "$PROJECT_DIR/supervisor/rodnik.conf" > /etc/supervisor/conf.d/rodnik.conf
    supervisorctl reread
    supervisorctl update
else
    error "Файл конфигурации supervisor/rodnik.conf не найден!"
fi

# Настройка Nginx
info "Настройка Nginx..."
if [ -f "$PROJECT_DIR/nginx/nginx.conf" ]; then
    # Создаем директории для SSL если они не существуют
    mkdir -p /etc/nginx/ssl
    
    # Копируем конфигурацию Nginx
    cp "$PROJECT_DIR/nginx/nginx.conf" /etc/nginx/sites-available/rodnik.conf
    
    # Делаем символическую ссылку
    if [ ! -L /etc/nginx/sites-enabled/rodnik.conf ]; then
        ln -s /etc/nginx/sites-available/rodnik.conf /etc/nginx/sites-enabled/
    fi
    
    # Удаляем default конфигурацию
    if [ -L /etc/nginx/sites-enabled/default ]; then
        rm /etc/nginx/sites-enabled/default
    fi
    
    # Проверяем конфигурацию и перезапускаем Nginx
    nginx -t && systemctl restart nginx
else
    error "Файл конфигурации nginx/nginx.conf не найден!"
fi

# Установка Let's Encrypt (опционально)
info "Установка Let's Encrypt..."
apt-get install -y certbot python3-certbot-nginx

# Вывод информации
info "Деплой проекта Rodnik завершен!"
info "Django API: http://localhost:8000"
info "WebSocket: ws://localhost:8001"
info "Frontend: http://localhost:3000"
info "Проверьте, что все сервисы запущены:"
supervisorctl status

# Предложение настроить SSL
echo ""
echo "Для настройки SSL-сертификата выполните:"
echo "sudo certbot --nginx -d ваш_домен.com -d www.ваш_домен.com" 