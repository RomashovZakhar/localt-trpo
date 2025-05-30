from rest_framework import serializers
from .models import Document, AccessRight, DocumentHistory
from django.contrib.auth import get_user_model
import json
import logging

# Настройка логгера
logger = logging.getLogger(__name__)

User = get_user_model()

class DocumentSerializer(serializers.ModelSerializer):
    """
    Базовый сериализатор для документов
    """
    owner_username = serializers.ReadOnlyField(source='owner.username')
    
    class Meta:
        model = Document
        fields = ['id', 'title', 'created_at', 'updated_at', 'owner', 'owner_username', 'parent', 'is_favorite', 'icon']
        read_only_fields = ['owner', 'created_at', 'updated_at']

class DocumentDetailSerializer(serializers.ModelSerializer):
    """
    Детальный сериализатор для документа, включающий содержимое
    """
    owner_username = serializers.ReadOnlyField(source='owner.username')
    children = DocumentSerializer(many=True, read_only=True)
    path = serializers.SerializerMethodField()
    is_root = serializers.SerializerMethodField()
    
    def get_path(self, obj):
        """
        Получает путь к документу в древовидной структуре
        """
        ancestors = []
        parent = obj.parent
        
        # Строим путь от корня к текущему документу
        while parent:
            ancestors.insert(0, {
                'id': str(parent.id),
                'title': parent.title
            })
            parent = parent.parent
        
        return ancestors
    
    def get_is_root(self, obj):
        """
        Проверяет, является ли документ корневым
        """
        return obj.parent is None
    
    def to_representation(self, instance):
        """
        Переопределяем метод to_representation для отладки
        """
        # Получаем обычное представление
        representation = super().to_representation(instance)
        
        # Логируем информацию о поле content перед отправкой клиенту
        logger.info(f"TO_REPRESENTATION (Document ID: {instance.id}): content тип {type(instance.content)}, пустой: {not bool(instance.content)}")
        
        # Если content - пустой словарь, проверим исходный объект
        if isinstance(instance.content, dict) and not instance.content:
            logger.warning(f"Пустой словарь content для Document ID: {instance.id}")
        
        return representation
    
    def to_internal_value(self, data):
        """
        Переопределяем метод to_internal_value для отладки и явной обработки content
        """
        # Логируем входящие данные
        logger.info(f"TO_INTERNAL_VALUE: content в запросе: {type(data.get('content'))}")
        
        # Если content есть в данных, логируем его подробнее
        if 'content' in data:
            content_data = data['content']
            logger.info(f"Content тип: {type(content_data)}, пустой: {not bool(content_data)}")
            
            # Преобразуем строку JSON в словарь, если нужно
            if isinstance(content_data, str) and content_data.strip():
                try:
                    data['content'] = json.loads(content_data)
                    logger.info("Преобразовали строку JSON в словарь")
                except json.JSONDecodeError as e:
                    logger.error(f"Ошибка декодирования JSON: {e}")
            
            # Проверяем наличие ключевых полей для EditorJS
            if isinstance(content_data, dict):
                if 'blocks' in content_data:
                    logger.info(f"Найдены блоки в content, количество: {len(content_data.get('blocks', []))}")
                else:
                    logger.warning("В content нет ключа 'blocks'")
        else:
            logger.warning("В запросе отсутствует поле 'content'")
        
        # Вызываем стандартный метод
        return super().to_internal_value(data)
    
    def update(self, instance, validated_data):
        """
        Переопределяем метод update для отладки сохранения content
        """
        logger.info(f"UPDATE (Document ID: {instance.id}): content в validated_data: {type(validated_data.get('content'))}")
        
        if 'content' in validated_data:
            content_data = validated_data['content']
            logger.info(f"Content тип: {type(content_data)}, пустой: {not bool(content_data)}")
            
            # Если content - это словарь, проверяем его структуру
            if isinstance(content_data, dict):
                if 'blocks' in content_data:
                    blocks = content_data.get('blocks', [])
                    logger.info(f"Сохраняем документ с {len(blocks)} блоками")
                else:
                    logger.warning("В сохраняемом content нет ключа 'blocks'")
            else:
                logger.warning(f"Content не является словарем: {type(content_data)}")
        
        # Вызываем стандартный метод update
        updated_instance = super().update(instance, validated_data)
        
        # Логируем результат после сохранения
        logger.info(f"После UPDATE: content тип {type(updated_instance.content)}, пустой: {not bool(updated_instance.content)}")
        
        return updated_instance
    
    class Meta:
        model = Document
        fields = ['id', 'title', 'content', 'created_at', 'updated_at', 'owner', 'owner_username', 'parent', 'children', 'is_favorite', 'path', 'is_root', 'icon']
        read_only_fields = ['owner', 'created_at', 'updated_at', 'path', 'is_root']

class UserBasicSerializer(serializers.ModelSerializer):
    """
    Базовый сериализатор для пользователя (для использования в других сериализаторах)
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class AccessRightSerializer(serializers.ModelSerializer):
    """
    Сериализатор для прав доступа
    """
    user_details = UserBasicSerializer(source='user', read_only=True)
    
    class Meta:
        model = AccessRight
        fields = ['id', 'document', 'user', 'user_details', 'role', 'include_children', 'created_at']
        read_only_fields = ['created_at']
        extra_kwargs = {
            'document': {'write_only': True},
            'user': {'write_only': True}
        }
    
    def validate_user(self, value):
        """
        Проверяем, что пользователь существует и не является владельцем документа
        """
        # Пытаемся получить document_id из URL или из данных запроса
        document_id = None
        
        # Проверяем наличие document_id в контексте (из URL)
        if self.context.get('view'):
            document_id = self.context.get('view').kwargs.get('pk')
            
        # Если нет в контексте, пробуем получить из данных запроса
        if not document_id and 'document' in self.initial_data:
            document_id = self.initial_data.get('document')
        
        if document_id:
            try:
                document = Document.objects.get(id=document_id)
                if document.owner == value:
                    raise serializers.ValidationError("Нельзя предоставить доступ владельцу документа")
                
                # Проверяем, есть ли уже доступ у этого пользователя
                existing_access = AccessRight.objects.filter(document=document, user=value).exists()
                if existing_access:
                    raise serializers.ValidationError("У пользователя уже есть доступ к этому документу")
            except Document.DoesNotExist:
                pass  # Валидация document_id выполняется отдельно
        
        return value

class DocumentHistorySerializer(serializers.ModelSerializer):
    """
    Сериализатор для истории изменений документа
    """
    user_details = UserBasicSerializer(source='user', read_only=True)
    action_label = serializers.CharField(source='get_action_type_display', read_only=True)
    document_title = serializers.CharField(source='document.title', read_only=True)
    
    class Meta:
        model = DocumentHistory
        fields = ['id', 'document', 'document_title', 'user', 'user_details', 'changes', 'action_type', 'action_label', 'created_at']
        read_only_fields = ['created_at'] 