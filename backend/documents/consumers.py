import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Document, DocumentHistory
from django.contrib.auth import get_user_model
# Удаляем неправильный импорт
# from django.http.request import parse_cookie
from django.conf import settings
from django.contrib.sessions.models import Session
from django.utils import timezone
import time
import asyncio

# Настройка логирования
logger = logging.getLogger('websocket')

# Функция для парсинга cookie без использования parse_cookie
def parse_cookies(cookie_string):
    if not cookie_string:
        return {}
    cookies = {}
    for cookie in cookie_string.split('; '):
        if '=' in cookie:
            key, value = cookie.split('=', 1)
            cookies[key] = value
    return cookies

User = get_user_model()

class DocumentConsumer(AsyncWebsocketConsumer):
    """
    Простой WebSocket-потребитель для документов
    """
    
    async def connect(self):
        """
        Обработка подключения клиента
        """
        try:
            # Получаем document_id из URL
            self.document_id = self.scope['url_route']['kwargs']['document_id']
            self.room_group_name = f'document_{self.document_id}'
            
            logger.info(f"[WebSocket] Подключение к документу {self.document_id}")
            
            # Получаем параметры URL
            logger.info(f"[WebSocket] Параметры URL: {self.scope.get('url_route', {}).get('kwargs', 'Не указаны')}")
            
            # Проверяем наличие query_string и получаем токен
            query_string = self.scope.get('query_string', b'').decode('utf-8')
            logger.info(f"[WebSocket] Query string: {query_string}")
            
            # Логируем полный scope для отладки
            logger.debug(f"[WebSocket] Полный scope: {self.scope}")
            
            # Логируем все headers
            headers = dict(self.scope.get('headers', []))
            logger.info(f"[WebSocket] Headers: {headers}")
            
            # Хранение информации о курсорах в этом документе
            if not hasattr(self, 'active_cursors'):
                self.active_cursors = {}
            
            # Присоединяемся к группе документа
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            # Принимаем соединение
            await self.accept()
            
            # Отправляем сообщение об успешном подключении
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': f'Подключено к документу {self.document_id}'
            }))
            
            # Запускаем задачу по очистке неактивных курсоров
            asyncio.create_task(self.cleanup_inactive_cursors())
            
            logger.info(f"[WebSocket] Соединение принято для документа {self.document_id}")
            
        except Exception as e:
            logger.error(f"[WebSocket] Ошибка при установке соединения: {str(e)}")
            await self.close()
    
    async def disconnect(self, close_code):
        """
        Обработка отключения клиента
        """
        try:
            logger.info(f"[WebSocket] Отключение от документа {self.document_id}, код: {close_code}")
            
            # Проверяем, есть ли информация о курсоре для этого соединения
            if hasattr(self, 'active_cursors'):
                # Ищем курсоры, принадлежащие этому соединению
                cursor_ids_to_remove = []
                
                # Поскольку нам нужно проверить все курсоры, мы создаем новый список
                for cursor_id, cursor_data in self.active_cursors.items():
                    # В данной реализации у нас нет прямой связи между соединением и cursor_id,
                    # поэтому просто проверим все курсоры и отметим для удаления те, что соответствуют этому соединению
                    cursor_ids_to_remove.append(cursor_id)
                
                # Удаляем курсоры и отправляем уведомления
                for cursor_id in cursor_ids_to_remove:
                    cursor_data = self.active_cursors.pop(cursor_id, None)
                    
                    if cursor_data:
                        logger.info(f"[WebSocket] Удаление курсора {cursor_id} при отключении пользователя {cursor_data.get('username', 'Неизвестно')}")
                        
                        # Отправляем уведомление об отключении курсора
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'cursor_disconnected',
                                'cursor_id': cursor_id,
                                'user_id': cursor_data.get('user_id'),
                                'username': cursor_data.get('username', 'Неизвестно')
                            }
                        )
            
            # Отключаемся от группы
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            logger.info(f"[WebSocket] Соединение закрыто для документа {self.document_id}")
            
        except Exception as e:
            logger.error(f"[WebSocket] Ошибка при отключении: {str(e)}")
            import traceback
            traceback.print_exc()
    
    async def receive(self, text_data):
        """
        Получение сообщения от клиента
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            logger.info(f"[WebSocket] Получено сообщение типа {message_type} для документа {self.document_id}")
            
            # Обрабатываем разные типы сообщений от клиента
            if message_type == 'document_update':
                content = data.get('content')
                sender_id = data.get('sender_id')
                user_id = data.get('user_id')
                username = data.get('username', 'Пользователь')
                
                logger.info(f"[WebSocket] Обновление документа {self.document_id} от пользователя {username}")
                
                # Отправляем всем в группу
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'document_update',
                        'user_id': user_id,
                        'username': username,
                        'content': content,
                        'sender_id': sender_id
                    }
                )
                
            elif message_type == 'cursor_connect':
                user_id = data.get('user_id')
                username = data.get('username', 'Пользователь')
                cursor_id = data.get('cursor_id')
                color = data.get('color')
                
                logger.info(f"[WebSocket] Подключение курсора пользователя {username} к документу {self.document_id}")
                
                await self.process_cursor_connect(data)
                
            elif message_type == 'cursor_update':
                cursor_id = data.get('cursor_id')
                position = data.get('position')
                username = data.get('username', 'Пользователь')
                user_id = data.get('user_id')
                
                logger.info(f"[WebSocket] Обновление позиции курсора пользователя {username}")
                
                await self.process_cursor_update(data)
        
        except json.JSONDecodeError:
            logger.error("[WebSocket] Ошибка декодирования JSON")
        except Exception as e:
            logger.error(f"[WebSocket] Необработанная ошибка: {str(e)}")
    
    # Обработчики сообщений для группы
    
    async def document_update(self, event):
        """
        Отправка обновления документа клиенту
        """
        try:
            await self.send(text_data=json.dumps({
                'type': 'document_update',
                'user_id': event['user_id'],
                'username': event['username'],
                'content': event['content'],
                'sender_id': event['sender_id']
            }))
            logger.info(f"[WebSocket] Отправлено обновление документа {self.document_id} клиенту")
        except Exception as e:
            logger.error(f"[WebSocket] Ошибка при отправке обновления: {str(e)}")
    
    async def cursor_connected(self, event):
        """Отправляет информацию о подключении курсора клиентам"""
        try:
            # Отправляем сообщение клиенту
            await self.send(text_data=json.dumps({
                'type': 'cursor_connected',
                'cursor_id': event['cursor_id'],
                'user_id': event['user_id'],
                'username': event['username'],
                'color': event.get('color', '#FF5252')  # Используем цвет по умолчанию, если не указан
            }))
            
            logger.info(f"[WebSocket] Отправлено сообщение о подключении курсора {event['cursor_id']} для пользователя {event['username']}")
        except Exception as e:
            logger.error(f"[WebSocket] Ошибка при отправке сообщения о подключении курсора: {str(e)}")
            import traceback
            traceback.print_exc()
            
    async def cursor_position_update(self, event):
        """Отправляет информацию о позиции курсора клиентам"""
        try:
            # Отправляем сообщение клиенту
            await self.send(text_data=json.dumps({
                'type': 'cursor_position_update',
                'cursor_id': event['cursor_id'],
                'position': event['position'],
                'user_id': event['user_id'],
                'username': event['username']
            }))
            
            logger.info(f"[WebSocket] Отправлено сообщение о позиции курсора {event['cursor_id']}")
        except Exception as e:
            logger.error(f"[WebSocket] Ошибка при отправке сообщения о позиции курсора: {str(e)}")
            import traceback
            traceback.print_exc()
    
    async def cursor_disconnected(self, event):
        """Отправляет информацию об отключении курсора клиентам"""
        try:
            # Отправляем сообщение клиенту
            await self.send(text_data=json.dumps({
                'type': 'cursor_disconnected',
                'cursor_id': event['cursor_id'],
                'user_id': event.get('user_id'),
                'username': event.get('username', 'Неизвестно')
            }))
            
            logger.info(f"[WebSocket] Отправлено сообщение об отключении курсора {event['cursor_id']}")
        except Exception as e:
            logger.error(f"[WebSocket] Ошибка при отправке сообщения об отключении курсора: {str(e)}")
            import traceback
            traceback.print_exc()

    async def send_active_cursors(self, exclude_cursor_id=None):
        """Отправляет информацию о всех активных курсорах"""
        try:
            # Проверяем, есть ли активные курсоры
            if not hasattr(self, 'active_cursors') or not self.active_cursors:
                return
            
            # Текущее время
            current_time = time.time()
            
            # Отправляем информацию о каждом активном курсоре, кроме исключенного
            for cursor_id, cursor_data in self.active_cursors.items():
                # Пропускаем курсор, который мы хотим исключить (обычно - курсор самого пользователя)
                if cursor_id == exclude_cursor_id:
                    continue
                
                # Пропускаем устаревшие курсоры
                if current_time - cursor_data.get('last_seen', 0) > 10:
                    continue
                
                # Отправляем информацию о курсоре
                await self.send(text_data=json.dumps({
                    'type': 'cursor_active',
                    'cursor_id': cursor_id,
                    'user_id': cursor_data.get('user_id'),
                    'username': cursor_data.get('username', 'Неизвестно'),
                    'position': cursor_data.get('position')
                }))
                
                logger.info(f"[WebSocket] Отправлена информация о курсоре {cursor_id} пользователя {cursor_data.get('username', 'Неизвестно')}")
        except Exception as e:
            logger.error(f"[WebSocket] Ошибка при отправке информации о активных курсорах: {str(e)}")
            import traceback
            traceback.print_exc()
    
    async def cleanup_inactive_cursors(self):
        """Периодически очищает неактивные курсоры"""
        try:
            while True:
                # Ждем 5 секунд перед проверкой
                await asyncio.sleep(5)
                
                # Проверяем, доступен ли объект active_cursors
                if not hasattr(self, 'active_cursors'):
                    continue
                
                # Текущее время
                current_time = time.time()
                
                # Список курсоров для удаления
                cursors_to_remove = []
                
                # Проверяем каждый курсор на активность
                for cursor_id, cursor_data in self.active_cursors.items():
                    # Если курсор не обновлялся более 10 секунд, считаем его неактивным
                    if current_time - cursor_data.get('last_seen', 0) > 10:
                        cursors_to_remove.append(cursor_id)
                
                # Удаляем неактивные курсоры и уведомляем остальных участников
                for cursor_id in cursors_to_remove:
                    cursor_data = self.active_cursors.pop(cursor_id, None)
                    
                    if cursor_data:
                        logger.info(f"[WebSocket] Удаление неактивного курсора {cursor_id} пользователя {cursor_data.get('username', 'Неизвестно')}")
                        
                        # Отправляем уведомление об отключении курсора
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'cursor_disconnected',
                                'cursor_id': cursor_id,
                                'user_id': cursor_data.get('user_id'),
                                'username': cursor_data.get('username', 'Неизвестно')
                            }
                        )
        except asyncio.CancelledError:
            # Задача отменена - корректно завершаем
            logger.info("[WebSocket] Задача очистки курсоров отменена")
        except Exception as e:
            logger.error(f"[WebSocket] Ошибка при очистке неактивных курсоров: {str(e)}")
            import traceback
            traceback.print_exc()

    # Вспомогательные методы для работы с базой данных
    @database_sync_to_async
    def has_access_to_document(self, user_id, document_id):
        """Проверяет, имеет ли пользователь доступ к документу"""
        try:
            document = Document.objects.get(id=document_id)
            user = User.objects.get(id=user_id)
            
            # Проверка на владельца документа
            if document.owner_id == user_id:
                return True
                
            # Проверка на доступ через права доступа
            return document.access_rights.filter(user=user).exists()
        except (Document.DoesNotExist, User.DoesNotExist) as e:
            logger.error(f"Ошибка проверки доступа: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Непредвиденная ошибка при проверке доступа: {str(e)}")
            return False
    
    @database_sync_to_async
    def save_document_content(self, content):
        """Сохраняет содержимое документа и историю изменений"""
        try:
            document = Document.objects.get(id=self.document_id)
            user = User.objects.get(id=self.scope['user'].id)
            
            # Сохраняем предыдущее содержимое для истории
            previous_content = document.content
            
            # Определяем тип действия (если контент пустой, то это создание)
            action_type = DocumentHistory.ACTION_CREATE
            if previous_content and (previous_content.get('blocks') or []):
                action_type = DocumentHistory.ACTION_EDIT
                
                # Проверяем, изменился ли только заголовок
                if previous_content.get('title') != content.get('title') and previous_content.get('blocks') == content.get('blocks'):
                    action_type = DocumentHistory.ACTION_TITLE_CHANGE
            
            # Обновляем содержимое документа
            document.content = content
            document.save()
            
            # Проверяем, нужно ли записывать это в историю
            should_record = True
            
            # Для обычного редактирования делаем ограничение по времени
            if action_type == DocumentHistory.ACTION_EDIT:
                # Не записываем повторные редактирования от того же пользователя с интервалом менее 5 минут
                from django.utils import timezone
                last_edit = DocumentHistory.objects.filter(
                    document=document, 
                    user=user,
                    action_type=DocumentHistory.ACTION_EDIT
                ).order_by('-created_at').first()
                
                if last_edit:
                    # Проверяем, прошло ли 5 минут с момента последнего редактирования
                    time_diff = timezone.now() - last_edit.created_at
                    if time_diff.total_seconds() < 300:  # 5 минут в секундах
                        should_record = False
                        logger.info(f"Пропускаем запись редактирования в WebSocket, прошло меньше 5 минут с последнего")
            
            # Если нужно записать в историю
            if should_record:
                # Создаем запись в истории изменений
                DocumentHistory.objects.create(
                    document=document,
                    user=user,
                    action_type=action_type,
                    changes={
                        'content': content,
                        'user_id': user.id,
                        'username': user.username,
                        'action': action_type
                    }
                )
                logger.info(f"Записано действие {action_type} в историю через WebSocket")
            
            logger.info(f"Документ {self.document_id} успешно обновлен пользователем {user.username}")
            return True
        except Exception as e:
            logger.error(f"Ошибка при сохранении документа {self.document_id}: {str(e)}")
            return False
    
    @database_sync_to_async
    def get_user_from_session(self, scope):
        """Получает пользователя из сессии"""
        try:
            # Получаем cookies из scope
            cookie_string = scope.get('headers', {}).get('cookie', b'').decode('utf-8')
            cookies = parse_cookies(cookie_string)
            
            # Получаем session_key
            session_key = cookies.get(settings.SESSION_COOKIE_NAME)
            if not session_key:
                logger.warning("Сессионная куки не найдена")
                return None
                
            # Находим сессию
            session = Session.objects.filter(
                session_key=session_key,
                expire_date__gt=timezone.now()
            ).first()
            
            if not session:
                logger.warning("Сессия не найдена или истекла")
                return None
                
            # Получаем user_id из сессии
            session_data = session.get_decoded()
            user_id = session_data.get('_auth_user_id')
            
            if not user_id:
                logger.warning("ID пользователя не найден в сессии")
                return None
                
            # Находим пользователя
            user = User.objects.get(id=user_id)
            return user
        except Exception as e:
            logger.error(f"Ошибка при получении пользователя из сессии: {str(e)}")
            return None

    async def process_cursor_connect(self, data):
        """Обработка сообщения о подключении курсора"""
        try:
            # Извлекаем данные о курсоре
            cursor_id = data.get('cursor_id')
            user_id = data.get('user_id')
            username = data.get('username', 'Пользователь')
            color = data.get('color', '#FF5252')  # Используем цвет по умолчанию, если не указан
            
            # Логируем информацию о подключении курсора
            logger.info(f"[WebSocket] Курсор с ID {cursor_id} подключен для пользователя {username} (ID: {user_id})")
            
            # Сохраняем информацию о курсоре
            if not hasattr(self, 'active_cursors'):
                self.active_cursors = {}
            
            # Добавляем курсор в список активных
            self.active_cursors[cursor_id] = {
                'user_id': user_id,
                'username': username,
                'color': color,
                'last_seen': time.time(),
                'connected': True
            }
            
            # Отправляем информацию о подключении курсора всем участникам
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'cursor_connected',
                    'cursor_id': cursor_id,
                    'user_id': user_id,
                    'username': username,
                    'color': color
                }
            )
            
            # Отправляем информацию о всех активных курсорах новому пользователю
            # Делаем это с небольшой задержкой, чтобы клиент успел обработать предыдущие сообщения
            await asyncio.sleep(0.5)
            await self.send_active_cursors(cursor_id)
            
        except Exception as e:
            logger.error(f"[WebSocket] Ошибка при обработке подключения курсора: {str(e)}")
            import traceback
            traceback.print_exc()
    
    async def process_cursor_update(self, data):
        """Обработка сообщения об обновлении позиции курсора"""
        try:
            # Извлекаем данные о курсоре и его позиции
            cursor_id = data.get('cursor_id')
            position = data.get('position')
            user_id = data.get('user_id')
            username = data.get('username', 'Пользователь')
            
            # Логируем информацию об обновлении позиции курсора
            logger.info(f"[WebSocket] Обновление позиции курсора для пользователя {username} (ID курсора: {cursor_id})")
            
            # Обновляем информацию о курсоре в списке активных
            if hasattr(self, 'active_cursors') and cursor_id in self.active_cursors:
                self.active_cursors[cursor_id]['last_seen'] = time.time()
                self.active_cursors[cursor_id]['position'] = position
            
            # Отправляем информацию о позиции курсора всем участникам
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'cursor_position_update',
                    'cursor_id': cursor_id,
                    'position': position,
                    'user_id': user_id,
                    'username': username
                }
            )
        except Exception as e:
            logger.error(f"[WebSocket] Ошибка при обработке обновления позиции курсора: {str(e)}")
            import traceback
            traceback.print_exc()

    async def receive_json(self, content, **kwargs):
        message_type = content.get('type', None)
        
        # Логируем полученное сообщение для отладки
        logger.info(f"[WebSocket] Получено сообщение типа: {message_type}")
        logger.debug(f"[WebSocket] Содержимое сообщения: {content}")
        
        if message_type == 'document_update':
            # Обработка обновления документа...
            await self.document_update(content)
        elif message_type == 'cursor_update':
            # Обработка обновления позиции курсора
            cursor_id = content.get('cursor_id')
            position = content.get('position')
            username = content.get('username', 'Пользователь')
            user_id = content.get('user_id', 'anonymous')
            
            logger.info(f"[WebSocket] Обновление курсора от {username} (ID: {user_id}): {position}")
            
            # Отправляем всем остальным участникам группы
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'cursor_position_update',
                    'cursor_id': cursor_id,
                    'position': position,
                    'username': username,
                    'user_id': user_id,
                    'sender_channel_name': self.channel_name,  # Добавляем для идентификации отправителя
                }
            )
        elif message_type == 'cursor_connect':
            # Обработка подключения курсора
            cursor_id = content.get('cursor_id')
            username = content.get('username', 'Пользователь')
            user_id = content.get('user_id', 'anonymous')
            
            logger.info(f"[WebSocket] Подключение курсора от {username} (ID: {user_id}, Cursor ID: {cursor_id})")
            
            # Отправляем всем остальным участникам группы
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'cursor_connected',
                    'cursor_id': cursor_id,
                    'username': username,
                    'user_id': user_id,
                    'sender_channel_name': self.channel_name,
                }
            )
            
            # Также отправляем текущему пользователю информацию о всех активных курсорах
            # Это можно сделать, сохраняя активные курсоры в кэше или БД
            # Пока просто уведомляем о подключении
        else:
            logger.warning(f"[WebSocket] Получен неизвестный тип сообщения: {message_type}")

    # Обработчик события cursor_position_update
    async def cursor_position_update(self, event):
        # Если это сообщение от текущего клиента, не пересылаем его обратно
        if event.get('sender_channel_name') == self.channel_name:
            logger.debug(f"[WebSocket] Пропускаем пересылку обновления курсора отправителю")
            return
        
        # Отправляем обновление курсора клиенту
        try:
            await self.send_json({
                'type': 'cursor_update',
                'cursor_id': event['cursor_id'],
                'position': event['position'],
                'username': event['username'],
                'user_id': event['user_id']
            })
            logger.debug(f"[WebSocket] Отправлено обновление позиции курсора {event['username']}")
        except Exception as e:
            logger.error(f"[WebSocket] Ошибка при отправке обновления курсора: {str(e)}")

    # Обработчик события cursor_connected
    async def cursor_connected(self, event):
        # Если это сообщение от текущего клиента, не пересылаем его обратно
        if event.get('sender_channel_name') == self.channel_name:
            logger.debug(f"[WebSocket] Пропускаем пересылку подключения курсора отправителю")
            return
        
        # Отправляем уведомление о подключении курсора клиенту
        try:
            await self.send_json({
                'type': 'cursor_connected',
                'cursor_id': event['cursor_id'],
                'username': event['username'],
                'user_id': event['user_id']
            })
            logger.debug(f"[WebSocket] Отправлено уведомление о подключении курсора {event['username']}")
        except Exception as e:
            logger.error(f"[WebSocket] Ошибка при отправке уведомления о подключении курсора: {str(e)}") 