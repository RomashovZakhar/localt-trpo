FROM python:3.10-slim

# Установка рабочей директории
WORKDIR /app

# Установка зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование проекта
COPY . .

# Создание директорий для статических и медиа файлов
RUN mkdir -p staticfiles media

# Запуск команды collectstatic
RUN python manage.py collectstatic --noinput

# Переменные окружения для production
ENV DJANGO_DEBUG=False
ENV USE_POSTGRES=True
ENV USE_REDIS=True

# Открываем порты
EXPOSE 8000
EXPOSE 8001

# Запуск приложения с Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "core.wsgi:application", "--workers", "3"] 