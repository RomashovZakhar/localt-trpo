from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from users.views import UserViewSet, RegisterView, VerifyEmailView, ResendVerificationView, EmailVerifiedTokenObtainPairView, PasswordResetRequestView, PasswordResetConfirmView
from documents.views import DocumentViewSet
from tasks.views import TaskViewSet

# Создаем маршрутизатор
router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    # Маршруты для аутентификации
    path('token/', EmailVerifiedTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend_verification'),
    path('password-reset-request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    
    # Включаем URL-адреса из роутера
    path('', include(router.urls)),
    # Убираем несуществующие импорты
    # path('', include('documents.urls')),
    # path('', include('users.urls')),
] 