"""
Файл запуска ASGI с Daphne для поддержки WebSocket

Используется как: daphne -p 8000 startup:application
"""

import os
import django
import logging

# Настраиваем логирование
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger('startup')

# Устанавливаем настройки Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
logger.info("Инициализация Django...")
django.setup()
logger.info("Django инициализирован")

# Импортируем application после настройки Django
from channels.routing import get_default_application
logger.info("Получение ASGI application...")
application = get_default_application()
logger.info("ASGI application готов") 