from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Notification

User = get_user_model()

class EmailVerifiedTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Расширенный TokenObtainPairSerializer с проверкой подтверждения email
    """
    def validate(self, attrs):
        # Получаем учетные данные
        email = attrs.get('email')
        
        try:
            # Проверяем, существует ли пользователь
            user = User.objects.get(email=email)
            
            # Проверяем, подтвержден ли email
            if not user.is_email_verified:
                raise serializers.ValidationError(
                    {"detail": "Email не подтвержден. Пожалуйста, подтвердите ваш email перед входом в систему."}
                )
        except User.DoesNotExist:
            pass  # Стандартная валидация выбросит соответствующую ошибку
            
        # Выполняем стандартную валидацию токена
        return super().validate(attrs)

class UserSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели пользователя
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_email_verified', 'telegram_id', 'avatar']
        read_only_fields = ['is_email_verified']

class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для обновления информации о пользователе
    """
    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name']
        
    def validate_username(self, value):
        """
        Проверка уникальности имени пользователя
        """
        user = self.context['request'].user
        
        # Если пользователь не меняет свое имя, проверка не нужна
        if user.username == value:
            return value
            
        # Проверяем, существует ли пользователь с таким именем
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Пользователь с таким именем уже существует")
        
        return value

class NotificationSerializer(serializers.ModelSerializer):
    """
    Сериализатор для уведомлений
    """
    sender_username = serializers.ReadOnlyField(source='sender.username')
    
    class Meta:
        model = Notification
        fields = ['id', 'sender', 'sender_username', 'type', 'content', 'is_read', 'created_at']
        read_only_fields = ['sender', 'type', 'content', 'created_at']

class RegisterSerializer(serializers.ModelSerializer):
    """
    Сериализатор для регистрации пользователей
    """
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Пароли не совпадают"})
        return attrs
    
    def create(self, validated_data):
        # Удаляем password_confirm, так как мы его не сохраняем
        validated_data.pop('password_confirm')
        
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        
        user.set_password(validated_data['password'])
        user.save()
        
        return user

class VerifyEmailSerializer(serializers.Serializer):
    """
    Сериализатор для подтверждения email
    """
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True)

class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Сериализатор для запроса на сброс пароля
    """
    email = serializers.EmailField(required=True)

class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Сериализатор для подтверждения сброса пароля
    """
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Пароли не совпадают"})
        return attrs 