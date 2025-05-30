from django.db import models
from django.conf import settings
from documents.models import Document

User = settings.AUTH_USER_MODEL

class Task(models.Model):
    """
    Модель задачи, которая может быть привязана к документу
    """
    TODO = 'todo'
    IN_PROGRESS = 'in_progress'
    DONE = 'done'
    ARCHIVED = 'archived'
    
    STATUS_CHOICES = [
        (TODO, 'К выполнению'),
        (IN_PROGRESS, 'В процессе'),
        (DONE, 'Выполнено'),
        (ARCHIVED, 'Архивировано'),
    ]
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=TODO)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Связи
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='tasks')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tasks')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    
    # Даты
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Приоритет
    priority = models.PositiveSmallIntegerField(default=1)  # 1 - низкий, 2 - средний, 3 - высокий
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['priority', 'due_date', 'created_at']

class TaskComment(models.Model):
    """
    Комментарии к задачам
    """
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='task_comments')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Комментарий к {self.task.title} от {self.user.email}"
