from django.db import models
from django.conf import settings
from mptt.models import MPTTModel, TreeForeignKey

User = settings.AUTH_USER_MODEL

class Document(MPTTModel):
    """
    Модель документа с древовидной структурой.
    Используем MPTT для эффективной работы с деревом.
    """
    title = models.CharField(max_length=255)
    content = models.JSONField(default=dict)  # Для хранения содержимого EditorJS
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    is_favorite = models.BooleanField(default=False)
    is_root = models.BooleanField(default=False)  # Флаг для обозначения корневого документа (рабочего пространства)
    icon = models.CharField(max_length=10, blank=True, null=True)  # Поле для хранения эмодзи
    
    # MPTT поля для древовидной структуры
    parent = TreeForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    
    class MPTTMeta:
        order_insertion_by = ['title']
    
    def __str__(self):
        return self.title

class AccessRight(models.Model):
    """
    Модель для хранения прав доступа к документам
    """
    EDITOR = 'editor'
    VIEWER = 'viewer'
    ROLE_CHOICES = [
        (EDITOR, 'Редактор'),
        (VIEWER, 'Наблюдатель'),
    ]
    
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='access_rights')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='document_accesses')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=VIEWER)
    include_children = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('document', 'user')
    
    def __str__(self):
        return f"{self.user.email} - {self.get_role_display()} для {self.document.title}"

class DocumentHistory(models.Model):
    """
    Модель для хранения истории изменений документа
    """
    ACTION_EDIT = 'edit'
    ACTION_CREATE = 'create'
    ACTION_VIEW = 'view'
    ACTION_SHARE = 'share'
    ACTION_REVOKE = 'revoke'
    ACTION_TITLE_CHANGE = 'title_change'
    ACTION_NESTED_CREATE = 'nested_create'
    ACTION_TASK_COMPLETE = 'task_complete'
    ACTION_UPDATE_ACCESS = 'update_access'
    
    ACTION_CHOICES = [
        (ACTION_EDIT, 'Редактирование'),
        (ACTION_CREATE, 'Создание'),
        (ACTION_VIEW, 'Просмотр'),
        (ACTION_SHARE, 'Предоставление доступа'),
        (ACTION_REVOKE, 'Отзыв доступа'),
        (ACTION_TITLE_CHANGE, 'Изменение заголовка'),
        (ACTION_NESTED_CREATE, 'Создание вложенного документа'),
        (ACTION_TASK_COMPLETE, 'Завершение задачи'),
        (ACTION_UPDATE_ACCESS, 'Изменение роли'),
    ]
    
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='history')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='document_edits')
    changes = models.JSONField()  # Хранит данные о изменениях
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES, default=ACTION_EDIT)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Изменение {self.document.title} пользователем {self.user.email} в {self.created_at}"
