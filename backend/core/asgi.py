"""
ASGI config for core project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import documents.routing

# Максимально простая конфигурация ASGI
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter(
        documents.routing.websocket_urlpatterns
    ),
})
