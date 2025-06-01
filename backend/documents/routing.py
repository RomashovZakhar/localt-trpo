from django.urls import re_path
from . import consumers
# Убираем SimpleTestConsumer, если он больше не нужен
# from .test_consumer import SimpleTestConsumer 

"""
Маршруты WebSocket для документов.
Эти маршруты будут обработаны Channels через ASGI.
"""

websocket_urlpatterns = [
    # Обновленный URL с префиксом /ws/
    re_path(r'ws/documents/(?P<document_id>\d+)/$', consumers.DocumentConsumer.as_asgi()),
    
    # Старый маршрут для тестирования можно закомментировать или удалить
    # re_path(r'documents/(?P<document_id>\d+)/$', SimpleTestConsumer.as_asgi()),
] 