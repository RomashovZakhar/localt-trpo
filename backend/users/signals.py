from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from documents.models import Document
from django.contrib.auth import get_user_model

User = get_user_model()

@receiver(post_save, sender=User)
def create_root_document(sender, instance, created, **kwargs):
    if created:
        # Проверяем, есть ли уже корневой документ для пользователя
        if not Document.objects.filter(owner=instance, is_root=True).exists():
            Document.objects.create(
                owner=instance,
                title="Мой первый документ",
                content={
                    "time": 0,
                    "version": "2.27.0",
                    "blocks": [
                        {"type": "header", "data": {"text": "Добро пожаловать!", "level": 2}},
                        {"type": "paragraph", "data": {"text": "Это ваш корневой документ. Здесь вы можете создавать иерархию, как в Notion."}},
                        {"type": "paragraph", "data": {"text": "Удачи в работе с вашими документами!"}}
                    ]
                },
                is_root=True
            ) 