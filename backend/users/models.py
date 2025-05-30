from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import datetime

class User(AbstractUser):
    """
    Кастомная модель пользователя с дополнительными полями
    """
    email = models.EmailField(_('email address'), unique=True)
    telegram_id = models.CharField(max_length=255, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_email_verified = models.BooleanField(default=False)
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(null=True, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return self.email
    
    def set_verification_code(self, code):
        """
        Устанавливает код верификации и время его создания
        """
        self.otp = code
        self.otp_created_at = timezone.now()
        self.save()
    
    def is_verification_code_valid(self, code):
        """
        Проверяет, действителен ли код верификации
        """
        # Проверка на совпадение кода
        if self.otp != code:
            return False
        
        # Проверка на истечение срока действия (30 минут)
        if self.otp_created_at is None:
            return False
        
        expiration_time = self.otp_created_at + datetime.timedelta(minutes=30)
        return timezone.now() <= expiration_time

class Notification(models.Model):
    """
    Модель для хранения уведомлений пользователей
    """
    DOCUMENT_INVITATION = 'document_invitation'
    NOTIFICATION_TYPES = [
        (DOCUMENT_INVITATION, 'Приглашение к документу'),
    ]
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications')
    type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    content = models.JSONField(default=dict)  # Для хранения доп. информации (ID документа, название и т.д.)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Уведомление для {self.recipient.username} от {self.sender.username} ({self.type})"
