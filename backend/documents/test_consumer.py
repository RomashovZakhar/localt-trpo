import json
import logging
from channels.generic.websocket import WebsocketConsumer
import time

logger = logging.getLogger(__name__)

class SimpleTestConsumer(WebsocketConsumer):
    """
    Предельно простой WebSocket-потребитель для тестирования
    """
    
    def connect(self):
        try:
            # Извлекаем ID документа из URL
            self.document_id = self.scope['url_route']['kwargs']['document_id']
            
            # Логируем попытку подключения
            logger.info(f"[TEST] Попытка подключения к документу {self.document_id}")
            
            # Принимаем соединение - критический шаг
            self.accept()
            
            logger.info(f"[TEST] Соединение установлено")
            
            # Отправляем подтверждение подключения клиенту
            self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'Тестовое соединение установлено',
                'document_id': self.document_id
            }))
        except Exception as e:
            logger.error(f"[TEST] Ошибка при подключении: {str(e)}")
    
    def disconnect(self, close_code):
        logger.info(f"[TEST] Отключение с кодом {close_code}")
    
    def receive(self, text_data):
        try:
            logger.info(f"[TEST] Получено сообщение: {text_data}")
            
            # Просто отправляем эхо обратно
            self.send(text_data=json.dumps({
                'type': 'echo',
                'received': text_data,
                'timestamp': str(time.time())
            }))
        except Exception as e:
            logger.error(f"[TEST] Ошибка обработки сообщения: {str(e)}") 