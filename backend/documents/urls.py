from django.urls import path, re_path, include
# AccessRightViewSet больше не используется, функциональность перенесена в DocumentViewSet
from .views import DocumentViewSet
from rest_framework.routers import DefaultRouter

# Создаем маршруты REST API
router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')
# Маршрут access-rights не используется, удален
# router.register(r'access-rights', AccessRightViewSet, basename='access-right')

urlpatterns = [
    path('', include(router.urls)),
] 