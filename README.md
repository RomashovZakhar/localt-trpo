# Rodnik

Платформа управления документами, задачами и командной работой. Наш проект – совмещение лучших практик Notion и Things 3. Мы делаем платформу для управления документами и совместной работы в команде, которая сочетает в себе интуитивно понятные возможности редактирования документов, как в Notion, и эффективное управление задачами, как в Things 3.

## Основной функционал

1. Редактор документов
2. Древовидная структура документов (каждый документ, кроме корневого, вложен в другой документ)
3. Управление задачами внутри документов
4. Совместное редактирование документов в режиме реального времени
5. Уведомление о задачах в телеграм
6. Анализ производительности проекта на основе статистики о задачах

## Технологический стек

### Серверная часть
- Django – веб-фрейворк на python для разработки серверной части
- Django Channels – расширение для работы с websocket и асинхронным кодом
- PostgreSQL – реляционная база данных для хранения пользовательских данных, документов и задач
- Redis – для кэширования и поддержки функций реального времени
- WebSocket – для совместной работы

### Внешний интерфейс
- React – базовый фреймворк для создания UI
- TypeScript – строготипизированный язык для уменьшения ошибок
- React Router – для маршрутизации и навигации на стороне клиента
- shadcn/ui – библиотека красивых UI-компонентов
- Editor.js – решения для текстового редактора

## Требования
- Python 3.11+
- Node.js 18+
- PostgreSQL
- Redis

## Подробная инструкция по установке и запуску

### Установка PostgreSQL

#### Windows

1. Скачайте установщик PostgreSQL с [официального сайта](https://www.postgresql.org/download/windows/)
2. Запустите установщик и следуйте инструкциям:
   - Выберите компоненты для установки (обязательно включите PostgreSQL Server и pgAdmin)
   - Укажите директорию для установки (по умолчанию `C:\Program Files\PostgreSQL\[версия]`)
   - Задайте пароль для пользователя postgres (запомните его!)
   - Укажите порт (по умолчанию 5432)
   - Выберите локаль (можно оставить по умолчанию)
3. После установки добавьте путь к исполняемым файлам PostgreSQL в переменную PATH:
   - Нажмите правой кнопкой мыши на "Этот компьютер" и выберите "Свойства"
   - Выберите "Дополнительные параметры системы" → "Переменные среды"
   - В разделе "Системные переменные" найдите переменную "Path" и нажмите "Изменить"
   - Нажмите "Создать" и добавьте путь: `C:\Program Files\PostgreSQL\[версия]\bin` (или ваш путь установки)
   - Нажмите "ОК" во всех окнах

#### MacOS

1. Установите PostgreSQL с помощью Homebrew:
   ```bash
   brew install postgresql
   ```
2. Запустите PostgreSQL:
   ```bash
   brew services start postgresql
   ```

### Создание базы данных

#### Windows

1. Откройте командную строку (cmd.exe) или Git Bash (рекомендуется)
2. Выполните следующую команду:
   ```bash
   createdb -U postgres notion_things_db
   ```
   Когда будет запрошен пароль, введите пароль, который вы задали при установке PostgreSQL.

#### MacOS

1. Откройте терминал
2. Выполните следующую команду:
   ```bash
   createdb notion_things_db
   ```

### Клонирование репозитория

```bash
# Клонирование репозитория
git clone https://github.com/yourusername/notion-things-clone.git
cd notion-things-clone
```

### Настройка бэкенда

#### Windows

1. Создайте и активируйте виртуальное окружение:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate
   ```

2. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```

3. Настройте подключение к базе данных в файле `backend/core/settings.py`:
   ```python
   DATABASES = {
       "default": {
           "ENGINE": "django.db.backends.postgresql",
           "NAME": "notion_things_db",
           "USER": "postgres",
           "PASSWORD": "ваш_пароль",  # Замените на пароль, который вы задали при установке
           "HOST": "localhost",
           "PORT": "5432",
       }
   }
   ```

4. Примените миграции:
   ```bash
   python manage.py migrate
   ```

5. Создайте суперпользователя:
   ```bash
   python manage.py createsuperuser
   ```

6. Запустите Django сервер:
   ```bash
   python manage.py runserver
   ```

7. В отдельном окне терминала запустите Daphne для WebSocket:
   ```bash
   cd backend
   venv\Scripts\activate
   daphne -p 8001 daphne_startup:application
   ```

#### MacOS

1. Создайте и активируйте виртуальное окружение:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   ```

2. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```

3. Настройте подключение к базе данных в файле `backend/core/settings.py`:
   ```python
   DATABASES = {
       "default": {
           "ENGINE": "django.db.backends.postgresql",
           "NAME": "notion_things_db",
           "USER": "postgres",  # На MacOS может быть ваше имя пользователя
           "PASSWORD": "ваш_пароль",  # Если вы устанавливали через Homebrew, пароль может не требоваться
           "HOST": "localhost",
           "PORT": "5432",
       }
   }
   ```

4. Примените миграции:
   ```bash
   python manage.py migrate
   ```

5. Создайте суперпользователя:
   ```bash
   python manage.py createsuperuser
   ```

6. Запустите Django сервер:
   ```bash
   python manage.py runserver
   ```

7. В отдельном окне терминала запустите Daphne для WebSocket:
   ```bash
   cd backend
   source venv/bin/activate
   daphne -p 8001 daphne_startup:application
   ```

### Настройка фронтенда

#### Windows и MacOS

1. Перейдите в директорию фронтенда:
   ```bash
   cd frontend
   ```

2. Установите зависимости:
   ```bash
   npm install
   ```

3. Запустите сервер разработки:
   ```bash
   npm run dev
   ```

## Проверка работы приложения

1. Откройте страницу http://localhost:3000
2. Войдите в систему
3. Откройте документ
4. В другом браузере (или режиме инкогнито) повторите шаги 1-3 с другим пользователем
5. Измените документ в одном окне и наблюдайте изменения в другом окне

## Структура проекта

```
notion-things-clone/
├── backend/              # Django бэкенд
│   ├── api/              # API приложение
│   ├── core/             # Основные настройки проекта
│   ├── documents/        # Приложение для работы с документами
│   ├── tasks/            # Приложение для работы с задачами
│   ├── users/            # Приложение для работы с пользователями
│   └── venv/             # Виртуальное окружение Python
├── frontend/             # React фронтенд
│   ├── public/           # Статические файлы
│   └── src/              # Исходный код
│       ├── app/          # Страницы приложения
│       ├── components/   # React компоненты
│       └── lib/          # Утилиты и хелперы
└── documentation/        # Документация проекта
```

## Решение проблем

### Windows

1. **Проблемы с PostgreSQL**:
   - Убедитесь, что служба PostgreSQL запущена: Панель управления → Администрирование → Службы → PostgreSQL
   - Проверьте подключение: `psql -U postgres -d notion_things_db`

2. **Проблемы с Redis**:
   - Убедитесь, что Redis сервер запущен
   - Проверьте подключение: `redis-cli ping` (должен ответить "PONG")

3. **Проблемы с командной строкой PowerShell**:
   - Используйте обычную командную строку (cmd.exe) или Git Bash вместо PowerShell для работы с PostgreSQL

### MacOS

1. **Проблемы с PostgreSQL**:
   - Проверьте статус: `brew services list`
   - Перезапустите сервис: `brew services restart postgresql`
   - Проверьте подключение: `psql -d notion_things_db`

2. **Проблемы с Redis**:
   - Проверьте статус: `brew services list`
   - Перезапустите сервис: `brew services restart redis`
   - Проверьте подключение: `redis-cli ping` (должен ответить "PONG")

## Лицензия

MIT 


