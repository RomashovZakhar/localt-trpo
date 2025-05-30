from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from django.db import connection
from .models import Document, AccessRight, DocumentHistory
from .serializers import DocumentSerializer, DocumentDetailSerializer, AccessRightSerializer, DocumentHistorySerializer
import json
import logging
import copy
import datetime
import re

# Настройка логгера
logger = logging.getLogger(__name__)

# Примечание: класс AccessRightViewSet удален, его функциональность перенесена 
# в метод revoke_access в DocumentViewSet для удаления прав доступа

def get_access(user, document, required_roles):
    """
    Функция проверяет, имеет ли пользователь указанные права доступа к документу
    
    Параметры:
    - user: пользователь, для которого проверяем доступ
    - document: документ, к которому проверяем доступ
    - required_roles: список допустимых ролей для доступа
      Возможные роли: 'editor' (может редактировать), 'viewer' (может только просматривать)
      
    Возвращает:
    - True, если пользователь имеет указанную роль или является владельцем
    - False в противном случае
    """
    # Если пользователь - владелец, у него есть все права
    if document.owner == user:
        return True
    
    # Проверяем, есть ли у пользователя требуемые права
    access_right = AccessRight.objects.filter(document=document, user=user).first()
    
    # Если право доступа найдено и роль подходит под требуемые
    if access_right and access_right.role in required_roles:
        return True
        
    # Пользователь не имеет необходимых прав
    return False

class DocumentViewSet(viewsets.ModelViewSet):
    """
    API endpoint для работы с документами
    """
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    
    def get_permissions(self):
        """
        Настраиваем разрешения в зависимости от действия
        Для всех действий требуется аутентификация
        """
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        """
        Возвращает разные сериализаторы в зависимости от действия
        """
        if self.action == 'retrieve':
            return DocumentDetailSerializer
        return DocumentSerializer
    
    def get_queryset(self):
        """
        Возвращает документы, доступные текущему пользователю
        """
        user = self.request.user
        
        # Проверяем параметр root для получения корневых документов
        root = self.request.query_params.get('root', None)
        if root and root.lower() == 'true':
            # Сначала проверяем, есть ли документы с явным флагом is_root=True
            root_docs = Document.objects.filter(owner=user, is_root=True)
            if root_docs.exists():
                # Возвращаем документы с флагом is_root=True
                return root_docs
            
            # Если таких нет, возвращаем документы с parent=None
            return Document.objects.filter(owner=user, parent=None).order_by('id')
        
        # Документы, которые пользователь создал
        own_documents = Q(owner=user)
        
        # Документы, к которым у пользователя есть прямой доступ
        direct_access = Q(access_rights__user=user)
        
        # Документы, к которым у пользователя есть доступ через родительский документ
        # Сначала находим права доступа с include_children=True
        parent_access_rights = AccessRight.objects.filter(
            user=user, 
            include_children=True
        ).values_list('document__id', flat=True)
        
        # Находим все дочерние документы этих родительских документов
        children_access = Q()
        if parent_access_rights:
            # Строим фильтр для всех родительских документов
            children_access = Q(parent__id__in=parent_access_rights)
            
            # Для всех уровней вложенности можно сделать через рекурсивный запрос,
            # но это требует более сложной реализации с CTE (Common Table Expressions)
            # Это простое решение для одного уровня вложенности
        
        # Объединяем фильтры и исключаем дубликаты
        return Document.objects.filter(own_documents | direct_access | children_access).distinct()
    
    @action(detail=False, methods=['get'])
    def favorites(self, request):
        """
        Получение списка избранных документов пользователя
        """
        user = request.user
        
        # Получаем документы, отмеченные как избранные для текущего пользователя
        favorite_docs = Document.objects.filter(
            owner=user,
            is_favorite=True
        ).order_by('title')
        
        logger.info(f"Получены избранные документы для пользователя {user.id}, найдено: {favorite_docs.count()}")
        
        # Используем базовый сериализатор для списка документов
        serializer = self.get_serializer(favorite_docs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_favorite(self, request, pk=None):
        """
        Добавление/удаление документа из избранного
        """
        document = self.get_object()
        document.is_favorite = not document.is_favorite
        document.save()
        
        # Логируем действие
        action_type = "добавлен в избранное" if document.is_favorite else "удален из избранного"
        logger.info(f"Документ {document.id} {action_type} пользователем {request.user.id}")
        
        serializer = self.get_serializer(document)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Поиск документов по названию
        """
        query = request.query_params.get('q', '')
        if not query:
            return Response([])
        
        # Поиск документов по названию
        user = request.user
        found_docs = Document.objects.filter(
            Q(owner=user) | Q(access_rights__user=user),
            title__icontains=query
        ).distinct().order_by('title')
        
        logger.info(f"Поиск документов по запросу '{query}', найдено: {found_docs.count()}")
        
        serializer = self.get_serializer(found_docs, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """
        Полностью переопределяем метод создания документа для правильной обработки контента
        """
        logger.info("Создание нового документа...")
        
        # Получаем данные из запроса
        data = copy.deepcopy(request.data)
        
        # Логируем информацию о запросе на создание
        if 'content' in data:
            content_data = data['content']
            logger.info(f"content в запросе на создание: тип {type(content_data)}, пустой: {not bool(content_data)}")
            
            if isinstance(content_data, dict):
                logger.info(f"Ключи в content при создании: {', '.join(content_data.keys())}")
                if 'blocks' in content_data:
                    blocks = content_data.get('blocks', [])
                    logger.info(f"Блоков в запросе: {len(blocks)}")
        else:
            logger.warning("В запросе нет поля content")
        
        # Проверяем, является ли документ корневым
        is_root = data.get('is_root', False)
        if is_root:
            # Проверяем, существует ли уже корневой документ
            existing_root = Document.objects.filter(owner=request.user, is_root=True).first()
            if existing_root:
                # Если уже есть корневой документ, отменяем флаг is_root
                data['is_root'] = False
                logger.info(f"Попытка создать второй корневой документ для пользователя {request.user.id}: отменено")
        
        # Обрабатываем документы верхнего уровня
        parent = data.get('parent', None)
        if parent is None and not is_root:
            # Проверяем, есть ли уже корневой документ
            existing_root = Document.objects.filter(owner=request.user, is_root=True).first()
            if not existing_root:
                # Если нет явного корневого документа, проверяем документы верхнего уровня
                root_docs = Document.objects.filter(owner=request.user, parent=None)
                if not root_docs.exists():
                    # Если нет других документов верхнего уровня, помечаем этот как корневой
                    data['is_root'] = True
                    logger.info(f"Автоматически установлен флаг is_root=True для документа пользователя {request.user.id}")
        
        # Извлекаем content для ручного сохранения
        content = None
        if 'content' in data:
            content = data['content']
            # Проверяем формат контента
            if isinstance(content, str):
                try:
                    content = json.loads(content)
                    logger.info("Преобразовали строку JSON в объект")
                except json.JSONDecodeError as e:
                    logger.error(f"Ошибка декодирования JSON: {e}")
        
        # Создаем сериализатор для валидации данных
        serializer = self.get_serializer(data=data)
        
        if not serializer.is_valid():
            logger.error(f"Ошибка валидации: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Создаем новый документ с минимальными данными
        serializer.validated_data['owner'] = request.user
        
        # Сохраняем объект, исключая поле content
        if 'content' in serializer.validated_data:
            # Временно убираем content, чтобы сохранить его отдельно
            del serializer.validated_data['content']
        
        # Создаем документ с базовыми полями
        document = Document.objects.create(**serializer.validated_data)
        logger.info(f"Создан документ ID: {document.id}")
        
        # Теперь напрямую сохраняем content
        if content is not None:
            document.content = content
            document.save(update_fields=['content'])
            logger.info(f"Напрямую сохранили content для документа ID: {document.id}")
            
            # Проверяем результат
            saved_document = Document.objects.get(id=document.id)
            logger.info(f"Content после прямого сохранения: тип {type(saved_document.content)}, пустой: {not bool(saved_document.content)}")
            
            if isinstance(saved_document.content, dict):
                logger.info(f"Ключи в content: {', '.join(saved_document.content.keys())}")
                if 'blocks' in saved_document.content:
                    blocks = saved_document.content.get('blocks', [])
                    logger.info(f"Блоков после сохранения: {len(blocks)}")
        
        # Записываем в историю создание документа
        DocumentHistory.objects.create(
            document=document,
            user=request.user,
            action_type=DocumentHistory.ACTION_CREATE,
            changes={
                'content': document.content,
                'user_id': request.user.id,
                'username': request.user.username,
                'title': document.title
            }
        )
        
        # Если это вложенный документ (есть parent_id), записываем это в историю родительского документа
        if document.parent:
            try:
                parent_document = Document.objects.get(id=document.parent.id)
                
                # Записываем в историю родительского документа создание вложенного документа
                DocumentHistory.objects.create(
                    document=parent_document,
                    user=request.user,
                    action_type=DocumentHistory.ACTION_NESTED_CREATE,
                    changes={
                        'nested_document_id': str(document.id),
                        'nested_document_title': document.title,
                        'user_id': request.user.id,
                        'username': request.user.username,
                        'is_nested': True
                    }
                )
                logger.info(f"Записано создание вложенного документа {document.id} в историю родительского документа {parent_document.id}")
            except Exception as e:
                logger.error(f"Ошибка при записи создания вложенного документа в историю: {str(e)}")
        
        # Возвращаем ответ с созданным документом
        serializer = self.get_serializer(document)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """
        Переопределяем метод update для правильного сохранения content
        """
        logger.info(f"UPDATE запрос для документа ID: {kwargs.get('pk')}")
        
        # Получаем объект документа перед обработкой данных
        instance = self.get_object()
        
        # Проверяем права доступа - только владелец и редакторы могут редактировать документ
        if not get_access(request.user, instance, ['editor']):
            return Response(
                {"detail": "У вас нет прав для редактирования этого документа"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Создаем глубокую копию данных запроса
        mutable_data = copy.deepcopy(request.data)
        
        # Проверяем наличие контента в запросе
        if 'content' in mutable_data:
            content_data = mutable_data['content']
            logger.info(f"Тип content в запросе: {type(content_data)}")
            
            # Проверка и обработка content
            if isinstance(content_data, str):
                try:
                    content_data = json.loads(content_data)
                    mutable_data['content'] = content_data
                    logger.info("Преобразовали строку JSON в объект")
                except json.JSONDecodeError as e:
                    logger.error(f"Ошибка декодирования JSON: {e}")
            
            # Если content - словарь, логируем его ключи
            if isinstance(content_data, dict):
                logger.info(f"Ключи в content: {', '.join(content_data.keys())}")
                
                if 'blocks' in content_data:
                    blocks = content_data.get('blocks', [])
                    logger.info(f"Найдено {len(blocks)} блоков в словаре content")
        
        # Получаем объект документа
        instance = self.get_object()
        
        # Сохраняем предыдущее состояние для определения типа изменения
        previous_title = instance.title
        previous_content = instance.content
        
        # Проверка текущего содержимого
        logger.info(f"Текущий content: тип {type(instance.content)}, пустой: {not bool(instance.content)}")
        
        # Создаем сериализатор с нашими данными
        serializer = self.get_serializer(instance, data=mutable_data, partial=True)
        
        if serializer.is_valid():
            # Перед сохранением явно устанавливаем content, если он есть в запросе
            if 'content' in mutable_data and isinstance(mutable_data['content'], dict):
                # Экстренное исправление: сохраняем content напрямую, минуя сериализатор
                instance.content = mutable_data['content']
                instance.save()
                logger.info(f"Сохранили content напрямую в модель. Размер: {len(json.dumps(instance.content))}")
            
            # Проверяем наличие поля icon в запросе и обновляем его
            if 'icon' in mutable_data:
                instance.icon = mutable_data['icon']
                instance.save()
                logger.info(f"Сохранили icon напрямую в модель: {instance.icon}")
            
            # Сохраняем остальные поля через сериализатор
            serializer.save()
            
            # Проверяем результат сохранения
            updated_instance = self.get_object()
            logger.info(f"После сохранения: content тип {type(updated_instance.content)}, пустой: {not bool(updated_instance.content)}")
            
            # Определяем тип изменения
            action_type = DocumentHistory.ACTION_EDIT
            
            # Если изменился только заголовок
            if 'title' in mutable_data and previous_title != mutable_data['title'] and previous_content == updated_instance.content:
                action_type = DocumentHistory.ACTION_TITLE_CHANGE
            
            # Проверяем, нужно ли записывать это в историю
            should_record = True
            
            # Для обычного редактирования (не изменение заголовка) делаем ограничение по времени
            if action_type == DocumentHistory.ACTION_EDIT:
                # Не записываем повторные редактирования от того же пользователя с интервалом менее 5 минут
                from django.utils import timezone
                last_edit = DocumentHistory.objects.filter(
                    document=updated_instance, 
                    user=request.user,
                    action_type=DocumentHistory.ACTION_EDIT
                ).order_by('-created_at').first()
                
                if last_edit:
                    # Проверяем, прошло ли 5 минут с момента последнего редактирования
                    time_diff = timezone.now() - last_edit.created_at
                    if time_diff.total_seconds() < 300:  # 5 минут в секундах
                        should_record = False
                        logger.info(f"Пропускаем запись редактирования, прошло меньше 5 минут с последнего")
            
            # Если нужно записать в историю
            if should_record:
                # Записываем в историю изменений
                DocumentHistory.objects.create(
                    document=updated_instance,
                    user=request.user,
                    action_type=action_type,
                    changes={
                        'content': updated_instance.content,
                        'user_id': request.user.id,
                        'username': request.user.username,
                        'action': action_type
                    }
                )
                logger.info(f"Записано действие {action_type} в историю")
            
            return Response(serializer.data)
        
        logger.error(f"Ошибка валидации: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """
        Предоставление доступа к документу другому пользователю
        """
        document = self.get_object()
        
        # Проверяем, является ли текущий пользователь владельцем документа
        if document.owner != request.user:
            return Response(
                {"detail": "Только владелец документа может предоставлять доступ"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Выводим полученные данные для отладки
        logger.info(f"Получены данные для предоставления доступа: {request.data}")
        
        # Проверяем наличие поля user в данных
        if 'user' not in request.data:
            logger.error("Отсутствует поле 'user' в запросе")
            return Response(
                {"user": "Это поле обязательно"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Базовая проверка формата ID пользователя
        try:
            user_id = request.data['user']
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            # Пытаемся преобразовать ID в правильный формат
            user_id = int(user_id) if isinstance(user_id, str) and user_id.isdigit() else user_id
            
            # Обновляем данные запроса с корректным типом ID и явно добавляем ID документа
            mutable_data = request.data.copy()
            mutable_data['user'] = user_id
            
            # Убедимся, что document_id передан и совпадает с URL
            if 'document' not in mutable_data or str(mutable_data['document']) != str(pk):
                mutable_data['document'] = pk
                logger.info(f"Добавлен document_id в запрос: {pk}")
            
        except (ValueError, TypeError):
            logger.error(f"Неверный формат ID пользователя: {request.data['user']}")
            return Response(
                {"user": "Неверный формат ID пользователя"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаем сериализатор для данных запроса с правильным контекстом
        serializer = AccessRightSerializer(data=mutable_data, context={'view': self})
        if serializer.is_valid():
            access_right = serializer.save(document=document)
            
            # Импортируем модель Notification
            from users.models import Notification
            
            # Создаем уведомление для пользователя
            Notification.objects.create(
                recipient=access_right.user,
                sender=request.user,
                type=Notification.DOCUMENT_INVITATION,
                content={
                    'document_id': str(document.id),
                    'document_title': document.title,
                    'role': access_right.role,
                    'include_children': access_right.include_children
                }
            )
            
            # Записываем в историю предоставление доступа
            DocumentHistory.objects.create(
                document=document,
                user=request.user,
                action_type=DocumentHistory.ACTION_SHARE,
                changes={
                    'user_id': access_right.user.id,
                    'username': access_right.user.username,
                    'role': access_right.role,
                    'include_children': access_right.include_children
                }
            )
            
            logger.info(f"Предоставлен доступ к документу ID {document.id} пользователю {access_right.user.email}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        # Подробно логируем ошибки валидации
        logger.error(f"Ошибка валидации при предоставлении доступа: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def access_rights(self, request, pk=None):
        """
        Получение списка прав доступа к документу
        """
        document = self.get_object()
        
        # Проверяем, является ли текущий пользователь владельцем документа
        if document.owner != request.user:
            return Response(
                {"detail": "Только владелец документа может просматривать права доступа"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        access_rights = AccessRight.objects.filter(document=document)
        serializer = AccessRightSerializer(access_rights, many=True)
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'], url_path='access_rights/(?P<access_id>[^/.]+)')
    def revoke_access(self, request, pk=None, access_id=None):
        """
        Отзыв права доступа к документу
        """
        document = self.get_object()
        
        # Проверяем, является ли текущий пользователь владельцем документа
        if document.owner != request.user:
            return Response(
                {"detail": "Только владелец документа может отозвать доступ"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Ищем право доступа по ID
            access_right = AccessRight.objects.get(id=access_id, document=document)
            
            # Сохраняем информацию о пользователе для истории
            user_id = access_right.user.id
            username = access_right.user.username
            role = access_right.role
            
            # Удаляем доступ
            access_right.delete()
            
            # Записываем в историю отзыв доступа
            DocumentHistory.objects.create(
                document=document,
                user=request.user,
                action_type=DocumentHistory.ACTION_REVOKE,
                changes={
                    'user_id': user_id,
                    'username': username,
                    'role': role
                }
            )
            
            logger.info(f"Отозван доступ к документу ID {document.id} у пользователя {username}")
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except AccessRight.DoesNotExist:
            return Response(
                {"detail": "Право доступа не найдено"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def shared_with_me(self, request):
        """
        Получение списка документов, к которым у пользователя есть доступ, но владельцем которых он не является
        """
        user = request.user
        
        # Документы, к которым у пользователя есть доступ через права доступа, но владельцем которых он не является
        shared_documents = Document.objects.filter(
            access_rights__user=user
        ).exclude(
            owner=user
        ).select_related('owner').distinct()
        
        serializer = self.get_serializer(shared_documents, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Получение истории изменений документа
        """
        document = self.get_object()
        
        # Получаем историю изменений документа
        history = DocumentHistory.objects.filter(document=document).order_by('-created_at')
        
        # Сериализуем результаты
        serializer = DocumentHistorySerializer(history, many=True)
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def my_role(self, request, pk=None):
        """
        Получение роли текущего пользователя для документа
        """
        document = self.get_object()
        user = request.user
        
        # Если пользователь - владелец документа
        if document.owner == user:
            return Response({"role": "owner"})
        
        # Проверяем права доступа пользователя к документу
        access_right = AccessRight.objects.filter(document=document, user=user).first()
        if access_right:
            return Response({"role": access_right.role})
        
        # Проверяем права доступа через родительские документы
        parent = document.parent
        while parent:
            parent_access = AccessRight.objects.filter(
                document=parent,
                user=user,
                include_children=True
            ).first()
            
            if parent_access:
                return Response({"role": parent_access.role})
                
            # Если владелец родителя - текущий пользователь
            if parent.owner == user:
                return Response({"role": "owner"})
                
            # Переходим к следующему родителю
            parent = parent.parent
        
        # Если роль не найдена
        return Response(
            {"detail": "У вас нет прав доступа к этому документу"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    @action(detail=True, methods=['post'])
    def validate_edit(self, request, pk=None):
        """
        Валидация прав редактирования для текущего пользователя
        """
        document = self.get_object()
        user = request.user
        
        # Проверяем, имеет ли пользователь права редактирования
        if get_access(user, document, ['editor']):
            return Response({"can_edit": True})
        
        return Response(
            {"detail": "У вас нет прав на редактирование этого документа"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    def retrieve(self, request, *args, **kwargs):
        """
        Получение документа по ID с записью действия просмотра
        """
        # Стандартное получение объекта
        instance = self.get_object()
        
        # Проверяем права доступа - пользователь должен быть владельцем, редактором или наблюдателем
        is_owner = instance.owner == request.user
        access_right = AccessRight.objects.filter(document=instance, user=request.user).first()
        
        # Если пользователь не владелец и у него нет прав доступа
        if not is_owner and not access_right:
            return Response(
                {"detail": "У вас нет прав для просмотра этого документа"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Если используем вложенные документы, нужно проверить права на родительский документ
        if not is_owner and instance.parent and access_right and not access_right.include_children:
            # Проверяем, есть ли явное право доступа к родителю с include_children=True
            has_parent_access = False
            parent = instance.parent
            
            while parent and not has_parent_access:
                # Проверяем прямой доступ к родителю с include_children=True
                parent_access = AccessRight.objects.filter(
                    document=parent,
                    user=request.user,
                    include_children=True
                ).exists()
                
                # Если нашли доступ с include_children=True
                if parent_access:
                    has_parent_access = True
                    break
                    
                # Проверяем, является ли пользователь владельцем родителя
                if parent.owner == request.user:
                    has_parent_access = True
                    break
                    
                # Переходим к следующему родителю вверх по дереву
                parent = parent.parent
            
            # Если нет прав на иерархию вложенных документов
            if not has_parent_access:
                return Response(
                    {"detail": "У вас нет прав для просмотра этого вложенного документа"},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        serializer = self.get_serializer(instance)
        
        # Записываем в историю просмотр документа
        try:
            # Не записываем повторные просмотры от того же пользователя с интервалом менее 30 минут
            last_view = DocumentHistory.objects.filter(
                document=instance, 
                user=request.user,
                action_type=DocumentHistory.ACTION_VIEW
            ).order_by('-created_at').first()
            
            should_record = True
            if last_view:
                # Проверяем, прошло ли достаточно времени с момента последнего просмотра
                from django.utils import timezone
                time_diff = timezone.now() - last_view.created_at
                if time_diff.total_seconds() < 1800:  # 30 минут в секундах
                    should_record = False
            
            if should_record:
                DocumentHistory.objects.create(
                    document=instance,
                    user=request.user,
                    action_type=DocumentHistory.ACTION_VIEW,
                    changes={
                        'user_id': request.user.id,
                        'username': request.user.username
                    }
                )
        except Exception as e:
            # В случае ошибки просто логируем и продолжаем
            logger.error(f"Ошибка при записи просмотра документа: {str(e)}")
            
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """
        Получение статистических данных о документе
        """
        document = self.get_object()
        user = request.user
        
        # Проверяем, есть ли у пользователя доступ к документу
        if document.owner != user and not AccessRight.objects.filter(document=document, user=user).exists():
            return Response({"detail": "У вас нет доступа к этому документу"}, status=status.HTTP_403_FORBIDDEN)
        
        # Логируем ID документа и его структуру
        logger.info(f"Получение статистики для документа ID: {document.id}")
        
        # Получаем дату создания документа
        created_at = document.created_at
        
        # Получаем количество редакторов
        editors_count = AccessRight.objects.filter(document=document, role=AccessRight.EDITOR).count()
        if document.owner != user:  # Владелец также является редактором
            editors_count += 1
            
        # Рекурсивно получаем все вложенные документы
        def get_nested_documents(doc_id):
            # Находим прямые дочерние документы
            children = Document.objects.filter(parent_id=doc_id)
            result = list(children)
            
            # Рекурсивно обходим дерево
            for child in children:
                result.extend(get_nested_documents(child.id))
                
            return result
                
        nested_docs = get_nested_documents(document.id)
        nested_docs_count = len(nested_docs)
        
        # Собираем все ID документов для дальнейшей обработки
        all_doc_ids = [document.id] + [doc.id for doc in nested_docs]
        
        # Прямой анализ JSON для точного подсчета задач
        def analyze_document_tasks(doc):
            """Прямой анализ JSON для подсчета всех задач и выполненных задач"""
            if not doc.content:
                logger.info(f"Документ {doc.id} не содержит контента")
                return 0, 0
            
            # Преобразуем контент в JSON-строку и в словарь для различных типов анализа
            try:
                content_str = json.dumps(doc.content)
                content_dict = doc.content if isinstance(doc.content, dict) else {}
            except Exception as e:
                logger.error(f"Ошибка преобразования content в JSON: {e}")
                return 0, 0
            
            logger.info(f"Анализ документа {doc.id}, размер JSON: {len(content_str)} байт")
            
            # Получаем блоки документа
            blocks = content_dict.get('blocks', [])
            logger.info(f"Документ содержит {len(blocks)} блоков")
            
            # Прямой перебор блоков для точного подсчета
            total_tasks = 0
            completed_tasks = 0
            
            for block in blocks:
                block_type = block.get('type')
                block_id = block.get('id', 'no-id')
                
                # Для блоков типа 'list' со стилем 'checklist'
                if block_type == 'list':
                    data = block.get('data', {})
                    style = data.get('style')
                    
                    if style == 'checklist':
                        items = data.get('items', [])
                        item_count = len(items)
                        logger.info(f"Найден list-checklist с {item_count} элементами, ID={block_id}")
                        
                        # Учитываем каждый элемент как отдельную задачу
                        for i, item in enumerate(items):
                            total_tasks += 1
                            item_str = json.dumps(item) if isinstance(item, dict) else str(item)
                            
                            # Проверяем, отмечен ли элемент
                            checked = False
                            # Проверяем все возможные варианты хранения статуса "выполнено"
                            if isinstance(item, dict):
                                # Прямая проверка на checked = true/True
                                if item.get('checked') is True or str(item.get('checked')).lower() == 'true':
                                    checked = True
                                    logger.info(f"Элемент {i} отмечен через checked=true: {item}")
                                # Проверка на наличие HTML-класса в content или text
                                elif isinstance(item.get('content'), str) and 'cdx-list__checkbox--checked' in item.get('content'):
                                    checked = True
                                    logger.info(f"Элемент {i} отмечен через HTML класс в content: {item.get('content')[:50]}...")
                                elif isinstance(item.get('text'), str) and 'cdx-list__checkbox--checked' in item.get('text'):
                                    checked = True
                                    logger.info(f"Элемент {i} отмечен через HTML класс в text: {item.get('text')[:50]}...")
                            # Если item - строка, проверяем наличие HTML-класса
                            elif isinstance(item, str) and 'cdx-list__checkbox--checked' in item:
                                checked = True
                                logger.info(f"Элемент {i} отмечен через HTML класс в строке: {item[:50]}...")
                            
                            # Общая проверка на любые признаки в JSON-строке
                            if not checked and ('"checked":true' in item_str or '"checked": true' in item_str or 
                                                'cdx-list__checkbox--checked' in item_str or 'checked="true"' in item_str):
                                checked = True
                                logger.info(f"Элемент {i} отмечен через поиск в JSON-строке: {item_str[:50]}...")
                                
                            if checked:
                                completed_tasks += 1
                                logger.info(f"Элемент {i} УЧТЕН как выполненный")
                            else:
                                logger.info(f"Элемент {i} НЕ отмечен как выполненный: {item_str[:50]}...")
                
                # Для блоков типа 'checklist'
                elif block_type == 'checklist':
                    data = block.get('data', {})
                    items = data.get('items', [])
                    item_count = len(items)
                    logger.info(f"Найден checklist с {item_count} элементами, ID={block_id}")
                    
                    # Учитываем каждый элемент как отдельную задачу
                    for i, item in enumerate(items):
                        total_tasks += 1
                        item_str = json.dumps(item) if isinstance(item, dict) else str(item)
                        
                        # Проверяем, отмечен ли элемент
                        checked = False
                        # Проверяем все возможные варианты хранения статуса "выполнено"
                        if isinstance(item, dict):
                            # Прямая проверка на checked = true/True
                            if item.get('checked') is True or str(item.get('checked')).lower() == 'true':
                                checked = True
                                logger.info(f"Элемент чеклиста {i} отмечен через checked=true: {item}")
                            # Проверка на наличие HTML-класса в content или text
                            elif isinstance(item.get('content'), str) and 'cdx-list__checkbox--checked' in item.get('content'):
                                checked = True
                                logger.info(f"Элемент чеклиста {i} отмечен через HTML класс в content")
                            elif isinstance(item.get('text'), str) and 'cdx-list__checkbox--checked' in item.get('text'):
                                checked = True
                                logger.info(f"Элемент чеклиста {i} отмечен через HTML класс в text")
                        # Если item - строка, проверяем наличие HTML-класса
                        elif isinstance(item, str) and 'cdx-list__checkbox--checked' in item:
                            checked = True
                            logger.info(f"Элемент чеклиста {i} отмечен через HTML класс в строке")
                        
                        # Общая проверка на любые признаки в JSON-строке
                        if not checked and ('"checked":true' in item_str or '"checked": true' in item_str or 
                                            'cdx-list__checkbox--checked' in item_str or 'checked="true"' in item_str):
                            checked = True
                            logger.info(f"Элемент чеклиста {i} отмечен через поиск в JSON-строке")
                            
                        if checked:
                            completed_tasks += 1
                            logger.info(f"Элемент чеклиста {i} УЧТЕН как выполненный")
                        else:
                            logger.info(f"Элемент чеклиста {i} НЕ отмечен как выполненный: {item_str[:50]}...")
                
                # Для блоков типа 'task'
                elif block_type == 'task':
                    total_tasks += 1
                    data = block.get('data', {})
                    is_completed = data.get('is_completed', False)
                    
                    if is_completed:
                        completed_tasks += 1
            
            # Если прямой перебор блоков не дал результатов, используем анализ через регулярные выражения
            if total_tasks == 0:
                logger.info("Прямой перебор блоков не нашел задач, пробуем регулярные выражения")
                
                # Подсчет маркеров выполненных задач
                
                # Ищем блоки типа "list" со стилем "checklist"
                list_checklist_pattern = r'"type"\s*:\s*"list".*?"style"\s*:\s*"checklist"'
                list_checklists = re.findall(list_checklist_pattern, content_str)
                list_checklists_count = len(list_checklists)
                
                # Ищем блоки типа "checklist"
                checklist_pattern = r'"type"\s*:\s*"checklist"'
                checklists = re.findall(checklist_pattern, content_str)
                checklists_count = len(checklists)
                
                # Ищем массивы items в JSON
                items_pattern = r'"items"\s*:\s*\[(.*?)\]'
                items_matches = re.findall(items_pattern, content_str, re.DOTALL)
                
                # Подсчитываем элементы в найденных массивах items
                items_count = 0
                checked_items = 0
                
                for items_match in items_matches:
                    # Подсчет элементов (объектов или строк)
                    items = re.findall(r'({[^{}]*}|"[^"]*")', items_match)
                    items_count += len(items)
                    
                    # Подсчет отмеченных элементов
                    for i, item in enumerate(items):
                        item_is_checked = False
                        # Проверяем все возможные варианты отметки в JSON
                        if '"checked":true' in item or '"checked": true' in item:
                            item_is_checked = True
                            logger.info(f"Regex: элемент {i} отмечен через checked:true")
                        elif 'cdx-list__checkbox--checked' in item:
                            item_is_checked = True
                            logger.info(f"Regex: элемент {i} отмечен через CSS класс")
                        elif 'checked="true"' in item:
                            item_is_checked = True
                            logger.info(f"Regex: элемент {i} отмечен через HTML атрибут")
                        elif '"checked":"true"' in item:
                            item_is_checked = True
                            logger.info(f"Regex: элемент {i} отмечен через checked:'true' (строка)")
                        
                        if item_is_checked:
                            checked_items += 1
                            logger.info(f"Regex: элемент {i} УЧТЕН как выполненный")
                        else:
                            logger.info(f"Regex: элемент {i} НЕ отмечен как выполненный: {item[:50]}...")
                
                # Финальный подсчет задач через регулярные выражения
                if items_count > 0:
                    total_tasks = items_count
                    completed_tasks = checked_items
                else:
                    # Используем оценку, если не смогли найти элементы
                    total_tasks = (list_checklists_count + checklists_count) * 3
                    
                    # Ищем элементы с "checked":true для оценки выполненных задач
                    pattern_checked = r'"checked"\s*:\s*true'
                    checked_items = re.findall(pattern_checked, content_str)
                    completed_tasks = len(checked_items)
            
            # В любом случае, корректируем результаты
            if total_tasks < completed_tasks:
                total_tasks = completed_tasks
            
            logger.info(f"ИТОГ по документу {doc.id}: всего задач: {total_tasks}, выполнено: {completed_tasks}")
            return total_tasks, completed_tasks
        
        # Подсчитываем задачи во всех документах
        total_tasks = 0
        total_completed_tasks = 0
        
        # Текущий документ
        doc_tasks, doc_completed = analyze_document_tasks(document)
        total_tasks += doc_tasks
        total_completed_tasks += doc_completed
        
        # Вложенные документы
        for doc in nested_docs:
            doc_tasks, doc_completed = analyze_document_tasks(doc)
            total_tasks += doc_tasks
            total_completed_tasks += doc_completed
        
        # Логируем итоговые результаты
        logger.info(f"ВСЕГО по всем документам - задач: {total_tasks}, выполнено: {total_completed_tasks}")
        
        # Находим самого активного пользователя (по количеству закрытых задач)
        most_active_user = None
        
        # Проверяем, что есть история изменений с закрытием задач
        task_completions = DocumentHistory.objects.filter(
            document_id__in=all_doc_ids,
            action_type=DocumentHistory.ACTION_TASK_COMPLETE
        ).values('user__username').annotate(count=Count('id')).order_by('-count').first()
        
        if task_completions:
            most_active_user = task_completions['user__username']
        
        # Вычисляем процент выполнения задач
        completion_percentage = 0
        if total_tasks > 0:
            completion_percentage = round((total_completed_tasks / total_tasks) * 100)
            
        # Формируем ответ
        result = {
            'created_at': created_at.isoformat(),
            'editor_count': editors_count,
            'nested_documents_count': nested_docs_count,
            'tasks_count': total_tasks,
            'completed_tasks_count': total_completed_tasks,
            'completion_percentage': completion_percentage,
            'most_active_user': most_active_user
        }
        
        return Response(result)

    @action(detail=True, methods=['post'])
    def toggle_task(self, request, pk=None):
        """
        Метод для изменения статуса задачи (завершена/не завершена)
        """
        document = self.get_object()
        
        # Проверяем права доступа - только редакторы могут изменять задачи
        # Для наблюдателей нужно добавить ограничение
        is_owner = document.owner == request.user
        access_right = AccessRight.objects.filter(document=document, user=request.user).first()
        
        # Наблюдатели не могут менять задачи, им запрещен доступ
        if not is_owner and (not access_right or access_right.role != AccessRight.EDITOR):
            return Response({'detail': 'У вас нет прав для изменения задач в этом документе'}, 
                            status=status.HTTP_403_FORBIDDEN)
        
        try:
            data = request.data
            task_id = data.get('task_id')
            is_completed = data.get('is_completed')
            checklist_item_index = data.get('checklist_item_index')  # Индекс пункта для checklist
            
            if task_id is None or is_completed is None:
                return Response({'detail': 'Не указаны обязательные параметры'}, status=status.HTTP_400_BAD_REQUEST)
            
            document_data = document.content
            updated = False
            
            def update_task(blocks):
                nonlocal updated
                for block in blocks:
                    # Обрабатываем блоки типа task
                    if block.get('type') == 'task' and block.get('id') == task_id:
                        block['data']['is_completed'] = is_completed
                        updated = True
                        return True
                    # Обрабатываем блоки типа list для чеклистов
                    elif block.get('type') == 'list' and block.get('id') == task_id:
                        data = block.get('data', {})
                        # Проверяем, является ли список чеклистом
                        if data.get('style') == 'checklist':
                            # Если указан индекс элемента
                            if checklist_item_index is not None and isinstance(checklist_item_index, int):
                                items = data.get('items', [])
                                if 0 <= checklist_item_index < len(items):
                                    if isinstance(items[checklist_item_index], dict):
                                        items[checklist_item_index]['checked'] = is_completed
                                    else:
                                        # Если элемент - строка, заменяем его на объект
                                        items[checklist_item_index] = {
                                            'text': items[checklist_item_index] if isinstance(items[checklist_item_index], str) else '',
                                            'checked': is_completed
                                        }
                                    updated = True
                                    return True
                            # Если индекс не указан, обновляем все элементы
                            else:
                                items = data.get('items', [])
                                for i, item in enumerate(items):
                                    if isinstance(item, dict):
                                        item['checked'] = is_completed
                                    else:
                                        # Если элемент - строка, заменяем его на объект
                                        items[i] = {
                                            'text': item if isinstance(item, str) else '',
                                            'checked': is_completed
                                        }
                                updated = True
                                return True
                    # Обрабатываем блоки типа checklist
                    elif block.get('type') == 'checklist' and block.get('id') == task_id:
                        # Если указан индекс элемента в checklist
                        if checklist_item_index is not None and isinstance(checklist_item_index, int):
                            items = block.get('data', {}).get('items', [])
                            if 0 <= checklist_item_index < len(items):
                                items[checklist_item_index]['checked'] = is_completed
                                updated = True
                                return True
                        # Если индекс не указан, пытаемся обновить все элементы (для обратной совместимости)
                        else:
                            items = block.get('data', {}).get('items', [])
                            for item in items:
                                item['checked'] = is_completed
                            updated = True
                            return True
                    # Обрабатываем вложенные документы
                    elif block.get('type') == 'nested-document':
                        try:
                            nested_doc = Document.objects.get(id=block.get('data', {}).get('id'))
                            nested_content = nested_doc.content
                            if update_task(nested_content.get('blocks', [])):
                                nested_doc.content = nested_content
                                nested_doc.save()
                                return True
                        except Document.DoesNotExist:
                            pass
                return False
            
            update_task(document_data.get('blocks', []))
            
            if updated:
                document.save()
                
                # Запись в историю документа
                action_type = DocumentHistory.ACTION_TASK_COMPLETE if is_completed else DocumentHistory.ACTION_EDIT
                DocumentHistory.objects.create(
                    document=document,
                    user=request.user,
                    action_type=action_type,
                    changes={
                        'task_id': task_id,
                        'is_completed': is_completed,
                        'checklist_item_index': checklist_item_index
                    }
                )
                
                return Response({'detail': 'Статус задачи обновлен'})
            else:
                return Response({'detail': 'Задача не найдена'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'detail': f'Ошибка при обновлении статуса задачи: {str(e)}'}, 
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='access_rights/(?P<access_id>[^/.]+)/update')
    def update_access(self, request, pk=None, access_id=None):
        """
        Обновление права доступа к документу (изменение роли)
        """
        document = self.get_object()
        
        # Проверяем, является ли текущий пользователь владельцем документа
        if document.owner != request.user:
            return Response(
                {"detail": "Только владелец документа может изменять права доступа"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Ищем право доступа по ID
            access_right = AccessRight.objects.get(id=access_id, document=document)
            
            # Получаем новую роль из запроса
            new_role = request.data.get('role')
            if not new_role:
                return Response(
                    {"role": "Это поле обязательно"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Проверяем, что роль допустимая
            if new_role not in ['viewer', 'editor']:
                return Response(
                    {"role": "Недопустимая роль. Используйте 'viewer' или 'editor'"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Сохраняем старую роль для истории
            old_role = access_right.role
            
            # Обновляем роль
            access_right.role = new_role
            access_right.save()
            
            # Записываем в историю изменение роли
            DocumentHistory.objects.create(
                document=document,
                user=request.user,
                action_type=DocumentHistory.ACTION_UPDATE_ACCESS,
                changes={
                    'user_id': access_right.user.id,
                    'username': access_right.user.username,
                    'old_role': old_role,
                    'new_role': new_role
                }
            )
            
            logger.info(f"Изменена роль для доступа к документу ID {document.id} у пользователя {access_right.user.username} с {old_role} на {new_role}")
            
            # Возвращаем обновленный объект
            serializer = AccessRightSerializer(access_right)
            return Response(serializer.data)
            
        except AccessRight.DoesNotExist:
            return Response(
                {"detail": "Право доступа не найдено"},
                status=status.HTTP_404_NOT_FOUND
            )
