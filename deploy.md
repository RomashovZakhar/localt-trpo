Конечно! Вот самая подробная и пошаговая инструкция по деплою твоего проекта (Django + Next.js + Docker Compose) на VPS от Selectel. Я учту все нюансы, которые вижу в твоём коде и инфраструктуре.

---

# **Пошаговая инструкция по деплою на Selectel**

---

## **1. Регистрация и создание VPS**

1. Перейди на [https://my.selectel.ru/](https://my.selectel.ru/) и зарегистрируйся.
2. Пополни баланс (можно картой, ЮMoney и др.).
3. В панели выбери "Облачные серверы" → "Создать сервер".
4. Выбери:
   - Облако: Public Cloud (или VPS/VDS)
   - Операционная система: Ubuntu 22.04 LTS (или 20.04)
   - Размер: 2 vCPU, 4 ГБ RAM, 40+ ГБ SSD (можно больше)
   - Локация: Москва или Санкт-Петербург
   - Публичный IP: обязательно добавить!
5. Создай сервер и дождись, когда он будет готов.
6. Скачай или создай SSH-ключ (или задай пароль для root/ubuntu).

---

## **2. Открытие портов (Firewall)**

1. В панели управления Selectel найди раздел "Сетевые настройки" → "Группы безопасности" (или "Firewall").
2. Убедись, что для твоего сервера разрешены входящие порты:
   - 22 (SSH)
   - 80 (HTTP)
   - 443 (HTTPS)
   - (опционально: 8000, 8001 — для тестов)
3. Если нужно — создай новую группу безопасности и привяжи её к серверу.

---

## **3. Подключение к серверу**

1. Открой терминал на своём компьютере.
2. Подключись по SSH:
   ```bash
   ssh ubuntu@<ТВОЙ_IP>
   ```
   или, если root:
   ```bash
   ssh root@<ТВОЙ_IP>
   ```
   (или с ключом: `ssh -i путь_к_ключу ubuntu@<ТВОЙ_IP>`)

---

## **4. Установка Docker и Docker Compose**

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
sudo usermod -aG docker $USER
# Выйди из SSH и зайди снова, чтобы применились права группы docker
```

**Docker Compose:**
```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

---

## **5. Клонирование проекта**

```bash
sudo apt install git -y
git clone <URL_ТВОЕГО_РЕПОЗИТОРИЯ>
cd <имя_папки_проекта>
```

---

## **6. Настройка переменных окружения**

1. Скопируй файл окружения:
   ```bash
   cp environment.env.example environment.env
   ```
2. Открой и отредактируй:
   ```bash
   nano environment.env
   ```
   - Впиши:
     ```
     DJANGO_ALLOWED_HOSTS=<ТВОЙ_IP>,<ТВОЙ_ДОМЕН>
     FRONTEND_URL=https://<ТВОЙ_ДОМЕН>
     CORS_ALLOWED_ORIGINS=https://<ТВОЙ_ДОМЕН>,http://<ТВОЙ_ДОМЕН>
     NEXT_PUBLIC_WEBSOCKET_URL=wss://<ТВОЙ_ДОМЕН>
     NEXT_PUBLIC_API_URL=https://<ТВОЙ_ДОМЕН>
     ```
   - Проверь пароли к БД, email и т.д.

---

## **7. Настройка docker-compose.yml**

**В твоём проекте всё уже настроено правильно!**  
Порты проброшены, nginx проксирует фронт и бэкенд, healthcheck прописан.

---

## **8. Запуск проекта**

```bash
docker-compose build
docker-compose up -d
```

Проверь статус:
```bash
docker-compose ps
```

---

## **9. Миграции и создание суперпользователя**

```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

---

## **10. Проверка работы**

- Открой в браузере:  
  http://<ТВОЙ_IP>  
  или  
  http://<ТВОЙ_ДОМЕН>
- Должна открыться твоя страница (если видишь "Welcome to nginx" — останови системный nginx: `sudo systemctl stop nginx`).

---

## **11. Настройка домена**

1. В панели управления доменом (например, reg.ru) создай A-запись:
   - Имя: @
   - Значение: <ТВОЙ_IP>
2. Подожди 5–30 минут, пока обновится DNS.

---

## **12. Настройка SSL (Let's Encrypt)**

1. Останови nginx-контейнер:
   ```bash
   docker-compose stop nginx
   ```
2. Установи certbot:
   ```bash
   sudo apt install certbot
   ```
3. Получи сертификат:
   ```bash
   sudo certbot certonly --standalone -d <ТВОЙ_ДОМЕН>
   ```
   Сертификаты будут в `/etc/letsencrypt/live/<ТВОЙ_ДОМЕН>/`

4. В docker-compose.yml для nginx пропиши монтирование сертификатов:
   ```yaml
   volumes:
     - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
     - static_volume:/var/www/static
     - media_volume:/var/www/media
     - /etc/letsencrypt/live/<ТВОЙ_ДОМЕН>/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro
     - /etc/letsencrypt/live/<ТВОЙ_ДОМЕН>/privkey.pem:/etc/nginx/ssl/privkey.pem:ro
   ```
5. В nginx.conf раскомментируй и настрой блок server для 443 (SSL).

6. Запусти nginx снова:
   ```bash
   docker-compose up -d nginx
   ```

---

## **13. Проверка HTTPS**

- Открой https://<ТВОЙ_ДОМЕН>  
- Должен быть зелёный замок.

---

## **14. Автоматизация продления сертификата**

Добавь в cron:
```bash
sudo crontab -e
```
И вставь строку:
```
0 3 * * * certbot renew --pre-hook "docker-compose stop nginx" --post-hook "docker-compose up -d nginx"
```

---

## **15. Готово!**

- Сайт работает по домену и по HTTPS.
- WebSocket и API работают через nginx.
- Всё управляется через docker-compose.

---

### **Если что-то не работает:**
- Проверь логи:  
  ```bash
  docker-compose logs nginx
  docker-compose logs backend
  docker-compose logs frontend
  ```
- Проверь проброс портов и firewall.
- Если видишь "Welcome to nginx" — останови системный nginx (`sudo systemctl stop nginx`).

---

**Если потребуется — помогу с любым шагом, просто напиши!**  
Ты сможешь развернуть свой проект на Selectel за 30–60 минут по этой инструкции.  
Удачи!



# Пошаговая инструкция по деплою проекта в VK Cloud

## Подготовительный этап

### Шаг 1: Регистрация в VK Cloud
1. Откройте браузер и перейдите на сайт [VK Cloud](https://mcs.mail.ru/)
2. Нажмите кнопку "Регистрация" в правом верхнем углу
3. Заполните все необходимые поля
4. Подтвердите адрес электронной почты, перейдя по ссылке в письме
5. Войдите в аккаунт, используя свои учетные данные

### Шаг 2: Создание проекта в VK Cloud
1. На главной странице нажмите кнопку "Создать проект"
2. Введите название проекта, например, "rodnik-app"
3. Выберите "Публичный облачный проект"
4. Нажмите "Создать"

### Шаг 3: Пополнение баланса проекта
1. В меню слева перейдите в раздел "Баланс"
2. Нажмите "Пополнить счет"
3. Выберите удобный способ оплаты (карта или ЮMoney)
4. Внесите минимальную сумму (обычно от 1000 рублей)
5. Завершите оплату

## Настройка окружения

### Шаг 4: Подготовка окружения для деплоя
1. Откройте файл `environment.env.example` в корне проекта
2. Создайте новый файл `environment.env` на его основе
3. Заполните все необходимые переменные окружения:

```
# Основные настройки
DEBUG=0
SECRET_KEY=замените_на_случайную_строку
ALLOWED_HOSTS=вставьте_домен_или_ip

# База данных
DB_NAME=rodnik_db
DB_USER=postgres
DB_PASSWORD=надежный_пароль
DB_HOST=db
DB_PORT=5432

# WebSocket настройки
WEBSOCKET_URL=ws://ваш_домен:8001
NEXT_PUBLIC_WEBSOCKET_URL=wss://ваш_домен/ws
NEXT_PUBLIC_API_URL=https://ваш_домен
```

## Настройка VK Cloud для развертывания проекта

### Шаг 5: Создание виртуальной машины
1. В меню VK Cloud перейдите в "Виртуальные машины" → "Создать"
2. Настройте параметры:
   - Имя: rodnik-server
   - Зона доступности: любая удобная
   - Операционная система: Ubuntu 20.04
   - Тип диска: SSD
   - Размер диска: 40 ГБ
   - Конфигурация: 2 vCPU, 4 ГБ RAM
3. Создайте или используйте существующую SSH-пару ключей
4. Нажмите "Создать"

### Шаг 6: Настройка сетевого доступа
1. В меню выберите "Сеть" → "Плавающие IP"
2. Назначьте плавающий IP вашей виртуальной машине
3. Перейдите в "Группы безопасности" → выберите вашу ВМ
4. Добавьте правила для входящего трафика:
   - HTTP (порт 80)
   - HTTPS (порт 443)
   - SSH (порт 22)
   - WebSocket (порт 8001)

## Подключение к серверу и установка необходимого ПО

### Шаг 7: Подключение к серверу
1. Откройте терминал на вашем компьютере
2. Введите команду:
   ```
   ssh -i путь_к_вашему_ssh_ключу ubuntu@ваш_плавающий_IP
   ```
3. Подтвердите подключение, если появится сообщение о fingerprint

### Шаг 8: Установка Docker и Docker Compose
1. Обновите список пакетов:
   ```
   sudo apt update && sudo apt upgrade -y
   ```

2. Установите необходимые пакеты:
   ```
   sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
   ```

3. Добавьте ключ GPG для Docker:
   ```
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
   ```

4. Добавьте репозиторий Docker:
   ```
   sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
   ```

5. Установите Docker:
   ```
   sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io
   ```

6. Установите Docker Compose:
   ```
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   ```

7. Сделайте Docker Compose исполняемым:
   ```
   sudo chmod +x /usr/local/bin/docker-compose
   ```

8. Добавьте текущего пользователя в группу docker:
   ```
   sudo usermod -aG docker $USER
   ```

9. Перезагрузите сессию или сервер:
   ```
   newgrp docker
   ```

## Загрузка и настройка проекта

### Шаг 9: Клонирование проекта на сервер
1. Установите git:
   ```
   sudo apt install git -y
   ```

2. Клонируйте репозиторий (замените на URL вашего репозитория):
   ```
   git clone https://github.com/ваш_пользователь/deploy-trpo.git
   ```

3. Перейдите в директорию проекта:
   ```
   cd deploy-trpo
   ```

### Шаг 10: Настройка файлов проекта
1. Скопируйте файл environment.env.example в environment.env:
   ```
   cp environment.env.example environment.env
   ```

2. Отредактируйте файл environment.env с помощью nano:
   ```
   nano environment.env
   ```

3. Заполните все необходимые переменные окружения, используя данные, указанные в шаге 4
4. Сохраните изменения: Ctrl+O, затем Enter, и выйдите: Ctrl+X

## Запуск проекта с помощью Docker Compose

### Шаг 11: Настройка и запуск Docker Compose
1. Изучите и при необходимости отредактируйте docker-compose.yml:
   ```
   nano docker-compose.yml
   ```

2. Убедитесь, что все настройки сервисов (backend, frontend, nginx, db, websocket) соответствуют вашим требованиям

3. Соберите и запустите контейнеры с помощью Docker Compose:
   ```
   docker-compose up -d
   ```

4. Проверьте, что все контейнеры запущены:
   ```
   docker-compose ps
   ```

### Шаг 12: Инициализация базы данных
1. Выполните миграции базы данных:
   ```
   docker-compose exec backend python manage.py migrate
   ```

2. Создайте суперпользователя для административного доступа:
   ```
   docker-compose exec backend python manage.py createsuperuser
   ```

3. Следуйте инструкциям на экране для создания аккаунта администратора

## Настройка Nginx и SSL

### Шаг 13: Настройка домена
1. Приобретите домен через любого регистратора доменов
2. Настройте A-запись, указывающую на плавающий IP вашего сервера в VK Cloud

### Шаг 14: Настройка SSL с помощью Certbot
1. Установите Certbot и плагин Nginx:
   ```
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. Получите SSL-сертификат:
   ```
   sudo certbot --nginx -d ваш_домен
   ```

3. Следуйте инструкциям Certbot для получения и установки сертификата
4. Certbot автоматически настроит Nginx для использования SSL

### Шаг 15: Проверка настройки Nginx
1. Проверьте конфигурацию Nginx:
   ```
   sudo nginx -t
   ```

2. Если конфигурация корректна, перезапустите Nginx:
   ```
   sudo systemctl restart nginx
   ```

## Проверка работоспособности проекта

### Шаг 16: Проверка работы сайта
1. Откройте браузер и перейдите по адресу `https://ваш_домен`
2. Убедитесь, что сайт загружается корректно
3. Проверьте функциональность WebSocket, открыв документ с совместным редактированием
4. Проверьте все основные функции приложения

### Шаг 17: Настройка мониторинга и автоматического перезапуска
1. Создайте скрипт для проверки работоспособности сервисов:
   ```
   nano /home/ubuntu/check_services.sh
   ```

2. Добавьте следующий код:
   ```bash
   #!/bin/bash
   cd /home/ubuntu/deploy-trpo
   docker-compose ps | grep -q "Exit" && docker-compose restart
   ```

3. Сделайте скрипт исполняемым:
   ```
   chmod +x /home/ubuntu/check_services.sh
   ```

4. Добавьте задачу в cron для регулярной проверки:
   ```
   crontab -e
   ```

5. Добавьте следующую строку для запуска проверки каждые 5 минут:
   ```
   */5 * * * * /home/ubuntu/check_services.sh
   ```

## Настройка резервного копирования

### Шаг 18: Настройка резервного копирования базы данных
1. Создайте скрипт для резервного копирования:
   ```
   nano /home/ubuntu/backup.sh
   ```

2. Добавьте следующий код:
   ```bash
   #!/bin/bash
   BACKUP_DIR="/home/ubuntu/backups"
   DATE=$(date +%Y-%m-%d_%H-%M-%S)
   mkdir -p $BACKUP_DIR
   
   # Backup PostgreSQL database
   cd /home/ubuntu/deploy-trpo
   docker-compose exec -T db pg_dump -U postgres rodnik_db > $BACKUP_DIR/rodnik_db_$DATE.sql
   
   # Delete backups older than 7 days
   find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -delete
   ```

3. Сделайте скрипт исполняемым:
   ```
   chmod +x /home/ubuntu/backup.sh
   ```

4. Добавьте задачу в cron для ежедневного резервного копирования:
   ```
   crontab -e
   ```

5. Добавьте строку для запуска резервного копирования каждый день в 2 часа ночи:
   ```
   0 2 * * * /home/ubuntu/backup.sh
   ```

## Заключение

### Шаг 19: Проверка и тестирование
1. Проверьте работу всех функций приложения:
   - Регистрация и авторизация пользователей
   - Создание и редактирование документов
   - Работа WebSocket для совместного редактирования
   - Загрузка изображений и других медиафайлов

2. Убедитесь, что все сервисы работают корректно:
   ```
   docker-compose logs
   ```

Поздравляю! Вы успешно развернули проект Rodnik на платформе VK Cloud. Теперь ваше приложение доступно по адресу `https://ваш_домен` и готово к использованию.
