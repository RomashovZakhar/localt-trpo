"use client";

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Notification {
  id: string;
  sender_username: string;
  type: string;
  content: {
    document_id: string;
    document_title: string;
    role: string;
  };
  is_read: boolean;
  created_at: string;
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Загрузка уведомлений
  useEffect(() => {
    fetchNotifications();
    
    // Периодическая проверка новых уведомлений
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      console.log("Запрашиваем уведомления...");
      const response = await api.get('/users/notifications/');
      console.log("Получен ответ с уведомлениями:", response.data);
      setNotifications(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке уведомлений:', error);
    } finally {
      setLoading(false);
    }
  };

  // Обработка принятия приглашения
  const handleAcceptInvitation = async (notification: Notification) => {
    try {
      // Отмечаем уведомление как прочитанное
      console.log("Отмечаем уведомление как прочитанное:", notification.id);
      await api.post(`/users/${notification.id}/mark_as_read/`);
      
      // Обновляем список уведомлений
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      ));
      
      // Отправляем событие о принятии приглашения для обновления списка совместных документов
      const invitationAcceptedEvent = {
        documentId: notification.content.document_id,
        title: notification.content.document_title,
        role: notification.content.role,
        timestamp: new Date().getTime()
      };
      
      // Сохраняем в localStorage для синхронизации с другими компонентами
      localStorage.setItem('invitation_accepted', JSON.stringify(invitationAcceptedEvent));
      
      // Вызываем событие storage вручную для текущей вкладки
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'invitation_accepted',
        newValue: JSON.stringify(invitationAcceptedEvent)
      }));
      
      // Переходим к документу
      router.push(`/documents/${notification.content.document_id}`);
      
      toast.success('Приглашение принято');
    } catch (error) {
      console.error('Ошибка при принятии приглашения:', error);
      toast.error('Не удалось принять приглашение');
    }
  };
  
  // Обработка отклонения приглашения
  const handleDeclineInvitation = async (notification: Notification) => {
    try {
      // Отмечаем уведомление как прочитанное
      console.log("Отмечаем уведомление как прочитанное:", notification.id);
      await api.post(`/users/${notification.id}/mark_as_read/`);
      
      // Обновляем список уведомлений
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      ));
      
      toast.info('Приглашение отклонено');
    } catch (error) {
      console.error('Ошибка при отклонении приглашения:', error);
      toast.error('Не удалось отклонить приглашение');
    }
  };

  // Количество непрочитанных уведомлений
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] h-[18px] text-xs flex items-center justify-center"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2 text-sm font-medium border-b">
          Уведомления
        </div>
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Загрузка...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            У вас нет уведомлений
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-3 border-b last:border-b-0 ${notification.is_read ? 'opacity-70' : ''}`}
              >
                {notification.type === 'document_invitation' && (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">{notification.sender_username}</span> приглашает вас к документу <span className="font-medium">{notification.content.document_title}</span> в качестве {notification.content.role === 'editor' ? 'редактора' : 'наблюдателя'}.
                    </div>
                    {!notification.is_read && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="default" 
                          onClick={() => handleAcceptInvitation(notification)}
                        >
                          Принять
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDeclineInvitation(notification)}
                        >
                          Отклонить
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 