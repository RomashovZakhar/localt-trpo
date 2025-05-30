from django.urls import re_path
from . import consumers
from .test_consumer import SimpleTestConsumer

"""
Маршруты WebSocket для документов.
Эти маршруты будут обработаны Channels через ASGI.
"""

websocket_urlpatterns = [
    # URL без префикса /ws/ для соответствия фронтенду
    re_path(r'documents/(?P<document_id>\d+)/$', consumers.DocumentConsumer.as_asgi()),
    
    # Резервный маршрут для тестирования
    # re_path(r'documents/(?P<document_id>\d+)/$', SimpleTestConsumer.as_asgi()),
] 