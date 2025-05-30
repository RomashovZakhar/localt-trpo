# Инструкции по деплою проекта Rodnik

Этот документ содержит пошаговые инструкции по деплою проекта Rodnik на production сервер.

## Требования

- VPS или выделенный сервер с ОС Linux (Ubuntu 20.04 или новее)
- Минимум 2 ГБ ОЗУ
- 20 ГБ дискового пространства
- PostgreSQL 12+
- Redis 6+
- Nginx
- Supervisor
- Docker (опционально)

## Шаг 1: Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install -y python3 python3-pip python3-venv nginx supervisor redis-server postgresql postgresql-contrib

# Создание пользователя для приложения
sudo adduser rodnik

# Добавление пользователя в нужные группы
sudo usermod -aG sudo rodnik
```

## Шаг 2: Настройка PostgreSQL

```bash
# Вход в PostgreSQL
sudo -u postgres psql

# Создание базы данных и пользователя
CREATE DATABASE notion_things_db;
CREATE USER rodnik_user WITH PASSWORD 'ваш_надежный_пароль';
ALTER ROLE rodnik_user SET client_encoding TO 'utf8';
ALTER ROLE rodnik_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE rodnik_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE notion_things_db TO rodnik_user;
\q
```

## Шаг 3: Настройка Redis

Redis должен быть уже установлен. Проверьте его работу:

```bash
sudo systemctl status redis-server
```

Если нужно настроить Redis для удаленного доступа, отредактируйте конфигурационный файл:

```bash
sudo nano /etc/redis/redis.conf
```

## Шаг 4: Клонирование репозитория и установка зависимостей

```bash
# Вход под пользователем rodnik
su - rodnik

# Клонирование репозитория
git clone https://github.com/your-repo/rodnik.git
cd rodnik

# Создание и активация виртуального окружения для бэкенда
cd backend
python3 -m venv venv
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt

# Создание .env файла
cp ../environment.env.example .env
nano .env  # Отредактируйте файл с вашими настройками
```

## Шаг 5: Настройка Django

```bash
# Применение миграций
python manage.py migrate

# Сбор статических файлов
python manage.py collectstatic --no-input

# Создание суперпользователя
python manage.py createsuperuser
```

## Шаг 6: Настройка фронтенда

```bash
# Переход в директорию фронтенда
cd ../frontend

# Установка зависимостей
npm install

# Создание .env.local файла
cp ../.environment.env.example .env.local
nano .env.local  # Отредактируйте файл с вашими настройками

# Сборка проекта
npm run build
```

## Шаг 7: Настройка Nginx

Создайте файл конфигурации Nginx:

```bash
sudo nano /etc/nginx/sites-available/rodnik
```

Содержимое файла:

```nginx
server {
    listen 80;
    server_name ваш_домен.com www.ваш_домен.com;

    # Перенаправление на HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ваш_домен.com www.ваш_домен.com;

    ssl_certificate /etc/letsencrypt/live/ваш_домен.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ваш_домен.com/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Django API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Django static files
    location /static/ {
        alias /home/rodnik/rodnik/backend/staticfiles/;
    }

    # Django media files
    location /media/ {
        alias /home/rodnik/rodnik/backend/media/;
    }

    # WebSocket для Channels
    location /documents/ {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/rodnik /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Шаг 8: Настройка SSL с Let's Encrypt

```bash
# Установка certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение SSL сертификата
sudo certbot --nginx -d ваш_домен.com -d www.ваш_домен.com
```

## Шаг 9: Настройка Supervisor

Создайте файлы конфигурации для Supervisor:

Django API (WSGI):
```bash
sudo nano /etc/supervisor/conf.d/rodnik-api.conf
```

```ini
[program:rodnik-api]
command=/home/rodnik/rodnik/backend/venv/bin/gunicorn core.wsgi:application --workers 3 --bind 127.0.0.1:8000
directory=/home/rodnik/rodnik/backend
user=rodnik
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/rodnik-api.log
environment=DJANGO_SETTINGS_MODULE="core.settings"
```

Django Channels (ASGI):
```bash
sudo nano /etc/supervisor/conf.d/rodnik-channels.conf
```

```ini
[program:rodnik-channels]
command=/home/rodnik/rodnik/backend/venv/bin/daphne -b 127.0.0.1 -p 8001 daphne_startup:application
directory=/home/rodnik/rodnik/backend
user=rodnik
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/rodnik-channels.log
environment=DJANGO_SETTINGS_MODULE="core.settings"
```

Frontend (Next.js):
```bash
sudo nano /etc/supervisor/conf.d/rodnik-frontend.conf
```

```ini
[program:rodnik-frontend]
command=npm start
directory=/home/rodnik/rodnik/frontend
user=rodnik
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/rodnik-frontend.log
environment=NODE_ENV="production"
```

Обновите Supervisor:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status
```

## Шаг 10: Мониторинг и логирование

### Настройка Sentry

1. Зарегистрируйтесь на https://sentry.io/
2. Создайте проект для Django и Next.js
3. Добавьте DSN в файлы .env

## Шаг 11: Тестирование и запуск

Убедитесь, что все сервисы запущены и работают:

```bash
sudo supervisorctl status
```

Проверьте логи:

```bash
sudo tail -f /var/log/rodnik-api.log
sudo tail -f /var/log/rodnik-channels.log
sudo tail -f /var/log/rodnik-frontend.log
```

## Альтернативный метод: деплой с использованием Docker

Можно также развернуть приложение с использованием Docker и Docker Compose. Для этого создайте следующие файлы:

### Dockerfile для бэкенда

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput

EXPOSE 8000
EXPOSE 8001

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "core.wsgi:application"]
```

### Dockerfile для фронтенда

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3'

services:
  db:
    image: postgres:12
    volumes:
      - postgres_data:/var/lib/postgresql/data/
    env_file:
      - .env
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_DB=${POSTGRES_DB}
    ports:
      - "5432:5432"

  redis:
    image: redis:6
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    volumes:
      - ./backend:/app
    depends_on:
      - db
      - redis
    env_file:
      - .env
    environment:
      - USE_POSTGRES=True
      - USE_REDIS=True
      - REDIS_HOST=redis
      - POSTGRES_HOST=db
    ports:
      - "8000:8000"

  daphne:
    build: ./backend
    command: daphne -b 0.0.0.0 -p 8001 daphne_startup:application
    volumes:
      - ./backend:/app
    depends_on:
      - db
      - redis
    env_file:
      - .env
    environment:
      - USE_POSTGRES=True
      - USE_REDIS=True
      - REDIS_HOST=redis
      - POSTGRES_HOST=db
    ports:
      - "8001:8001"

  frontend:
    build: ./frontend
    volumes:
      - ./frontend:/app
    depends_on:
      - backend
      - daphne
    env_file:
      - .env
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

## Безопасность

- Регулярно обновляйте все пакеты и зависимости
- Настройте файрвол (ufw)
- Используйте fail2ban для защиты от брутфорс-атак
- Настройте резервное копирование базы данных 