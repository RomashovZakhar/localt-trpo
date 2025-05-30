from rest_framework import serializers
from .models import Task, TaskComment
from django.contrib.auth import get_user_model
from documents.models import Document

User = get_user_model()

class UserBasicSerializer(serializers.ModelSerializer):
    """
    Базовый сериализатор для пользователя (для использования в других сериализаторах)
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class TaskSerializer(serializers.ModelSerializer):
    """
    Сериализатор для задач
    """
    created_by_details = UserBasicSerializer(source='created_by', read_only=True)
    assigned_to_details = UserBasicSerializer(source='assigned_to', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'status_display', 'created_at', 'updated_at',
            'document', 'created_by', 'created_by_details', 'assigned_to', 'assigned_to_details',
            'due_date', 'completed_at', 'priority'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'completed_at']
    
    def validate_document(self, value):
        """
        Проверяем, что пользователь имеет доступ к документу
        """
        user = self.context['request'].user
        
        # Проверяем, что пользователь владеет документом или имеет к нему доступ
        if value.owner != user and not value.access_rights.filter(user=user).exists():
            raise serializers.ValidationError("У вас нет доступа к этому документу")
        
        return value
    
    def validate_assigned_to(self, value):
        """
        Проверяем, что назначаемый пользователь имеет доступ к документу
        """
        if not value:
            return value
            
        document_id = self.initial_data.get('document')
        if document_id:
            try:
                document = Document.objects.get(id=document_id)
                # Проверяем, что пользователь владеет документом или имеет к нему доступ
                if document.owner != value and not document.access_rights.filter(user=value).exists():
                    raise serializers.ValidationError("Назначаемый пользователь не имеет доступа к этому документу")
            except Document.DoesNotExist:
                pass  # Валидация document_id выполняется отдельно
        
        return value

class TaskCommentSerializer(serializers.ModelSerializer):
    """
    Сериализатор для комментариев к задачам
    """
    user_details = UserBasicSerializer(source='user', read_only=True)
    
    class Meta:
        model = TaskComment
        fields = ['id', 'task', 'user', 'user_details', 'text', 'created_at']
        read_only_fields = ['user', 'created_at']
        extra_kwargs = {
            'task': {'write_only': True}
        } 