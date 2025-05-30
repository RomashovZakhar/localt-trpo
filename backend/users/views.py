from django.shortcuts import render
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import UserSerializer, RegisterSerializer, VerifyEmailSerializer, UserUpdateSerializer, NotificationSerializer, EmailVerifiedTokenObtainPairSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer
from .models import Notification
from .email_service import send_verification_email, send_password_reset_email
import random
import string
import logging

# Настройка логера
logger = logging.getLogger(__name__)

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint для пользователей
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_permissions(self):
        """
        Переопределяем разрешения в зависимости от действия
        """
        if self.action == 'create':
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Endpoint для получения текущего пользователя
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put', 'patch'], permission_classes=[IsAuthenticated])
    def update_profile(self, request):
        """
        Endpoint для обновления профиля текущего пользователя
        """
        user = request.user
        serializer = UserUpdateSerializer(user, data=request.data, partial=True, context={'request': request})
        
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Пользователь ID {user.id} обновил свой профиль")
            
            # Возвращаем обновленные данные пользователя с полным сериализатором
            updated_serializer = UserSerializer(user)
            return Response(updated_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def connect_telegram(self, request, pk=None):
        """
        Подключение Telegram к аккаунту
        """
        if str(request.user.id) != pk:
            return Response(
                {"detail": "Вы можете изменять только свой профиль"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        telegram_id = request.data.get('telegram_id')
        if not telegram_id:
            return Response(
                {"detail": "Telegram ID не предоставлен"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        user.telegram_id = telegram_id
        user.save()
        
        logger.info(f"Пользователь ID {user.id} подключил Telegram ID {telegram_id}")
        return Response({"detail": "Telegram успешно подключен"})
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def toggle_telegram_notifications(self, request):
        """
        Включение/отключение уведомлений в Telegram
        """
        user = request.user
        
        # Проверяем, что пользователь подключил Telegram
        if not user.telegram_id:
            return Response(
                {"detail": "Сначала подключите Telegram"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Получаем настройки из запроса
        # В реальном проекте здесь нужно использовать модель настроек пользователя
        tasks_notifications = request.data.get('tasks_notifications')
        invites_notifications = request.data.get('invites_notifications')
        
        # Временная заглушка - в реальности здесь будет сохранение в БД
        logger.info(f"Пользователь ID {user.id} изменил настройки уведомлений: "
                   f"задачи - {tasks_notifications}, приглашения - {invites_notifications}")
        
        return Response({
            "detail": "Настройки уведомлений обновлены",
            "tasks_notifications": tasks_notifications,
            "invites_notifications": invites_notifications
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def notifications(self, request):
        """
        Получение списка уведомлений текущего пользователя
        """
        notifications = Notification.objects.filter(recipient=request.user)
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def mark_as_read(self, request, pk=None):
        """
        Отметка уведомления как прочитанного
        """
        try:
            notification = Notification.objects.get(id=pk, recipient=request.user)
            notification.is_read = True
            notification.save()
            return Response({'status': 'success'})
        except Notification.DoesNotExist:
            return Response(
                {"detail": "Уведомление не найдено"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def check_email(self, request):
        """
        Проверяет, существует ли пользователь с указанным email
        """
        email = request.query_params.get('email')
        logger.info(f"Проверка email: {email}")
        
        if not email:
            logger.error("Email не указан в запросе")
            return Response(
                {"detail": "Email не указан"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            logger.info(f"Найден пользователь: ID {user.id}, email {user.email}")
            
            # Не возвращаем все данные пользователя из соображений безопасности
            return Response({
                "exists": True,
                "user_id": user.id
            })
        except User.DoesNotExist:
            logger.warning(f"Пользователь с email {email} не найден")
            return Response({
                "exists": False,
                "user_id": None
            })

class RegisterView(generics.CreateAPIView):
    """
    API endpoint для регистрации новых пользователей
    """
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Создаем пользователя
        user = serializer.save()
        
        # Генерируем OTP-код для верификации email
        otp = ''.join(random.choices(string.digits, k=6))
        user.set_verification_code(otp)
        
        logger.info(f"Создан новый пользователь: {user.email}")
        
        # Отправляем письмо верификации
        send_verification_email(user, otp)
        
        return Response({
            "detail": "Пользователь создан. Проверьте email для подтверждения.",
            "email": user.email,
        }, status=status.HTTP_201_CREATED)

class VerifyEmailView(generics.GenericAPIView):
    """
    API endpoint для подтверждения email
    """
    permission_classes = [AllowAny]
    serializer_class = VerifyEmailSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']
        
        try:
            user = User.objects.get(email=email)
            
            # Проверяем код верификации
            if user.is_verification_code_valid(otp):
                user.is_email_verified = True
                user.otp = None  # Удаляем код верификации после использования
                user.otp_created_at = None
                user.save()
                
                logger.info(f"Пользователь {email} подтвердил свой email")
                return Response({"detail": "Email успешно подтвержден."}, status=status.HTTP_200_OK)
            else:
                logger.warning(f"Неверный или устаревший код верификации для {email}")
                return Response({"detail": "Неверный или устаревший код подтверждения."}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            logger.warning(f"Попытка верификации для несуществующего пользователя: {email}")
            return Response({"detail": "Пользователь не найден."}, status=status.HTTP_404_NOT_FOUND)

class ResendVerificationView(generics.GenericAPIView):
    """
    API endpoint для повторной отправки кода верификации
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response({"detail": "Email не указан."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            
            # Если email уже подтвержден
            if user.is_email_verified:
                return Response({"detail": "Email уже подтвержден."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Генерируем новый OTP-код
            otp = ''.join(random.choices(string.digits, k=6))
            user.set_verification_code(otp)
            
            # Отправляем письмо верификации
            send_verification_email(user, otp)
            
            logger.info(f"Повторная отправка кода верификации для {email}")
            return Response({"detail": "Код подтверждения отправлен повторно."}, status=status.HTTP_200_OK)
        
        except User.DoesNotExist:
            logger.warning(f"Попытка повторной отправки кода для несуществующего пользователя: {email}")
            return Response({"detail": "Пользователь не найден."}, status=status.HTTP_404_NOT_FOUND)

class EmailVerifiedTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailVerifiedTokenObtainPairSerializer

class PasswordResetRequestView(generics.GenericAPIView):
    """
    API endpoint для запроса сброса пароля
    """
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email=email)
            
            # Генерируем OTP-код для сброса пароля
            otp = ''.join(random.choices(string.digits, k=6))
            user.set_verification_code(otp)
            
            # Отправляем письмо для сброса пароля
            send_password_reset_email(user, otp)
            
            logger.info(f"Запрос на сброс пароля для {email}")
            return Response({"detail": "Инструкции по сбросу пароля отправлены на ваш email."}, status=status.HTTP_200_OK)
        
        except User.DoesNotExist:
            # Для безопасности возвращаем успешный ответ даже если пользователь не найден
            logger.warning(f"Запрос на сброс пароля для несуществующего пользователя: {email}")
            return Response({"detail": "Если указанный email зарегистрирован в системе, инструкции по сбросу пароля будут отправлены."}, status=status.HTTP_200_OK)

class PasswordResetConfirmView(generics.GenericAPIView):
    """
    API endpoint для подтверждения сброса пароля и установки нового пароля
    """
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']
        password = serializer.validated_data['password']
        
        try:
            user = User.objects.get(email=email)
            
            # Проверяем код верификации
            if user.is_verification_code_valid(otp):
                # Устанавливаем новый пароль
                user.set_password(password)
                
                # Автоматически подтверждаем email, если он еще не подтвержден
                if not user.is_email_verified:
                    user.is_email_verified = True
                    logger.info(f"Email автоматически подтвержден в процессе сброса пароля для {email}")
                
                # Очищаем OTP-код
                user.otp = None
                user.otp_created_at = None
                user.save()
                
                logger.info(f"Пароль успешно сброшен для пользователя {email}")
                return Response({"detail": "Пароль успешно сброшен."}, status=status.HTTP_200_OK)
            else:
                logger.warning(f"Неверный или устаревший код для сброса пароля для {email}")
                return Response({"detail": "Неверный или устаревший код подтверждения."}, status=status.HTTP_400_BAD_REQUEST)
        
        except User.DoesNotExist:
            logger.warning(f"Попытка сброса пароля для несуществующего пользователя: {email}")
            return Response({"detail": "Пользователь не найден."}, status=status.HTTP_404_NOT_FOUND)
