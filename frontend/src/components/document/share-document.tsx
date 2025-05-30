"use client";

import { useState, useEffect } from "react";
import { Share2, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import api from "@/lib/api";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

// Для закрытия Select после выбора "Удалить доступ"
const forceCloseSelect = () => {
  // Пытаемся вручную закрыть Select, находя его элементы в DOM
  // Проверяем атрибут data-state="open" для определения открытого Select
  const openSelects = document.querySelectorAll('[data-state="open"]');
  openSelects.forEach(select => {
    // Создаем и отправляем keydown событие Escape
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true
    });
    select.dispatchEvent(escapeEvent);
  });
  
  // Альтернативный подход - по таймауту кликаем вне элемента
  setTimeout(() => {
    document.body.click();
  }, 10);
};

// Локальный хук для авторизации
const useAuth = () => {
  // Временное решение - мокаем хук, если его нет
  return {
    user: {
      id: "1", // Предполагаем, что у текущего пользователя всегда есть доступ
      username: "CurrentUser"
    }
  };
};

interface ShareDocumentProps {
  documentId: string;
}

interface UserWithAccess {
  id: string;
  user_details: {
    id: string;
    username: string;
    email: string;
  };
  role: string;
  include_children: boolean;
}

export function ShareDocument({ documentId }: ShareDocumentProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [includeChildren, setIncludeChildren] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [accessList, setAccessList] = useState<UserWithAccess[]>([]);
  const [documentOwner, setDocumentOwner] = useState<{id: string, username: string} | null>(null);
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState<{id: string, username: string}>(
    user || { id: "1", username: "CurrentUser" }
  );
  const [loadingAccessList, setLoadingAccessList] = useState(false);

  // Получаем список пользователей с доступом при открытии попапа
  useEffect(() => {
    if (open) {
      fetchAccessList();
    }
  }, [open, documentId]);

  // Обновляем текущего пользователя, когда получаем данные о владельце
  useEffect(() => {
    if (documentOwner) {
      // Для демонстрации считаем текущего пользователя владельцем
      setCurrentUser(documentOwner);
    }
  }, [documentOwner]);

  // Функция для получения списка пользователей с доступом
  const fetchAccessList = async () => {
    setLoadingAccessList(true);
    
    try {
      console.log(`Запрашиваем список прав доступа для документа ${documentId}...`);
      
      // Получаем список прав доступа
      const response = await api.get(`/documents/${documentId}/access_rights/`);
      console.log(`Получен список доступов:`, response.data);
      setAccessList(response.data);
      
      // Получаем информацию о владельце документа
      const docResponse = await api.get(`/documents/${documentId}/`);
      console.log(`Получена информация о документе:`, docResponse.data);
      
      const fetchedOwner = {
        id: docResponse.data.owner,
        username: docResponse.data.owner_username
      };
      
      setDocumentOwner(fetchedOwner);
      
    } catch (error: any) {
      console.error("Ошибка при получении списка доступов:", error);
      
      if (error.response) {
        if (error.response.status === 403) {
          toast.error("У вас нет прав для просмотра списка доступов");
        } else {
          toast.error("Не удалось загрузить список пользователей с доступом");
        }
      } else {
        toast.error("Ошибка соединения с сервером");
      }
      
    } finally {
      setLoadingAccessList(false);
    }
  };

  const handleShare = async () => {
    if (!email.trim()) {
      toast.error("Введите email пользователя");
      return;
    }

    setIsLoading(true);

    try {
      // Проверяем, существует ли пользователь с таким email
      console.log("Проверяем email:", email);
      
      const checkUserResponse = await api.get(`/users/check_email/?email=${encodeURIComponent(email)}`);
      console.log("Ответ от check_email:", checkUserResponse.data);
      
      // Убедимся, что пользователь найден
      if (!checkUserResponse.data.exists || !checkUserResponse.data.user_id) {
        toast.error("Пользователь с таким email не найден");
        setIsLoading(false);
        return;
      }
      
      const userId = checkUserResponse.data.user_id;
      const username = checkUserResponse.data.username || email.split('@')[0];
      
      // Проверяем, существует ли уже доступ для этого пользователя
      const existingAccess = accessList.find(
        access => access.user_details.id === userId || access.user_details.email === email
      );
      
      if (existingAccess) {
        toast.error("У пользователя уже есть доступ к этому документу");
        setIsLoading(false);
        return;
      }
      
      // Формируем данные для запроса
      const shareData = {
        user: userId,
        document: documentId,
        role,
        include_children: includeChildren
      };
      
      console.log("Отправляем запрос на предоставление доступа:", shareData);
      
      // Отправляем запрос на предоставление доступа
      const response = await api.post(`/documents/${documentId}/share/`, shareData);
      console.log("Ответ сервера:", response.data);
      
      // Сбрасываем поле ввода email
      setEmail("");
      
      // Добавляем задержку и обновляем список с сервера для подтверждения
      setTimeout(() => {
        fetchAccessList();
        toast.success(`Приглашение отправлено пользователю ${username}`);
        setIsLoading(false);
      }, 500);
      
    } catch (error: any) {
      console.error("Ошибка при предоставлении доступа:", error);
      
      let errorMessage = "Не удалось предоставить доступ к документу";
      
      // Проверяем, есть ли у нас подробности об ошибке API
      if (error.response) {
        console.error("Статус ошибки:", error.response.status);
        console.error("Данные ошибки:", error.response.data);
        
        if (error.response.data.user) {
          errorMessage = `Ошибка: ${error.response.data.user}`;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data === 'object') {
          const messages = Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ");
          if (messages) errorMessage = `Ошибка: ${messages}`;
        }
      }
      
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  // Функция для изменения роли пользователя
  const handleRoleChange = async (accessId: string, newRole: string) => {
    // Специальное значение "remove" для удаления доступа
    if (newRole === "remove") {
      // Немедленно вызываем функцию удаления доступа
      handleRemoveAccess(accessId);
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Находим текущий доступ для логирования
      const currentAccess = accessList.find(item => item.id === accessId);
      if (!currentAccess) {
        toast.error("Пользователь не найден");
        setIsLoading(false);
        return;
      }
      
      console.log(`Попытка изменения роли для доступа с ID ${accessId} на ${newRole}`);
      
      // Используем правильный URL для изменения роли
      // Правильный URL: /documents/{documentId}/access_rights/{accessId}/update/
      const response = await api.post(`/documents/${documentId}/access_rights/${accessId}/update/`, {
        role: newRole
      });
      
      console.log("Успешный ответ API на изменение роли:", response.data);
      
      // Обновляем локальный список
      const updatedList = accessList.map(item => 
        item.id === accessId ? { ...item, role: newRole } : item
      );
      setAccessList(updatedList);
      
      // Добавляем задержку для лучшего UX
      setTimeout(() => {
        // После успешного изменения запросим актуальные данные с сервера
        fetchAccessList();
        
        toast.success(`Роль пользователя ${currentAccess.user_details.username} изменена на "${getRoleName(newRole)}"`);
        setIsLoading(false);
      }, 500);
      
    } catch (error: any) {
      console.error("Ошибка при изменении роли:", error);
      
      let errorMessage = "Не удалось изменить роль пользователя";
      
      // Проверяем, есть ли у нас подробности об ошибке API
      if (error.response) {
        console.error("Статус ошибки:", error.response.status);
        console.error("Данные ошибки:", error.response.data);
        console.error("Заголовки ответа:", error.response.headers);
        
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data === 'object') {
          const messages = Object.values(error.response.data).flat().join(", ");
          if (messages) errorMessage = messages;
        }
      }
      
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  // Функция для удаления доступа пользователя
  const handleRemoveAccess = async (accessId: string) => {
    try {
      // Сначала получаем данные пользователя для сообщения
      const userToRemove = accessList.find(item => item.id === accessId);
      if (!userToRemove) {
        toast.error("Пользователь не найден");
        return;
      }
      
      const username = userToRemove.user_details.username || "Пользователь";
      
      // Закрываем выпадающий список
      forceCloseSelect();
      
      setIsLoading(true);
      
      // URL может быть неправильным - проверим документацию API
      console.log(`Попытка удаления доступа с ID ${accessId} для документа ${documentId}`);
      
      // Используем правильный URL для удаления права доступа
      const response = await api.delete(`/documents/${documentId}/access_rights/${accessId}/`);
      console.log("Успешный ответ API на удаление:", response.data);
      
      // Обновляем локальный список, удаляя пользователя
      const updatedList = accessList.filter(item => item.id !== accessId);
      setAccessList(updatedList);
      
      // Показываем небольшую задержку, чтобы визуально подтвердить, что действие обрабатывается
      setTimeout(() => {
        // После успешного удаления обновляем список с сервера для подтверждения
        fetchAccessList();
        
        toast.success(`Доступ для пользователя ${username} отозван`);
        setIsLoading(false);
      }, 500);
      
    } catch (error: any) {
      console.error("Ошибка при отзыве доступа:", error);
      
      let errorMessage = "Не удалось отозвать доступ";
      
      // Проверяем, есть ли у нас подробности об ошибке API
      if (error.response) {
        console.error("Статус ошибки:", error.response.status);
        console.error("Данные ошибки:", error.response.data);
        console.error("Заголовки ответа:", error.response.headers);
        
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data === 'object') {
          const messages = Object.values(error.response.data).flat().join(", ");
          if (messages) errorMessage = messages;
        }
      }
      
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  // Проверка прав пользователя для выполнения действий
  const canManageRole = (currentUserRole: string, targetUserRole: string, targetUserId: string) => {
    // Нельзя изменить права владельца документа
    if (documentOwner && targetUserId === documentOwner.id) {
      return false;
    }
  
    // Если пользователь владелец документа
    if (currentUser.id === documentOwner?.id) {
      // Владелец может менять роли всех пользователей
      return true;
    }
    
    // Если пользователь редактор
    if (currentUserRole === "editor") {
      // Редактор может управлять только наблюдателями
      return targetUserRole === "viewer";
    }
    
    // Наблюдатель не может менять роли
    return false;
  };

  // Получение локализованного названия роли
  const getRoleName = (role: string) => {
    switch (role) {
      case "owner":
        return "Владелец";
      case "editor":
        return "Редактор";
      case "viewer":
        return "Наблюдатель";
      default:
        return role;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Share2 className="h-4 w-4" />
          <span>Поделиться</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Настройки доступа</h4>
            <p className="text-sm text-muted-foreground">
              Настройте параметры доступа для пользователя
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email">Email пользователя</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="role">Роль</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Наблюдатель</SelectItem>
                <SelectItem value="editor">Редактор</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="child-docs">Вложенные документы</Label>
              <p className="text-xs text-muted-foreground">
                Предоставить доступ ко всем вложенным документам
              </p>
            </div>
            <Switch
              id="child-docs"
              checked={includeChildren}
              onCheckedChange={setIncludeChildren}
            />
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleShare} 
            disabled={isLoading || !email.trim()}
          >
            {isLoading ? "Отправка..." : "Отправить приглашение"}
          </Button>
          
          {/* Список пользователей с доступом */}
          {(accessList.length > 0 || documentOwner) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Пользователи с доступом</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {/* Владелец документа */}
                  {documentOwner && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{documentOwner.username}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">Владелец</span>
                    </div>
                  )}
                  
                  {/* Список пользователей с доступом */}
                  {accessList.map((access) => (
                    <div key={access.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{access.user_details.username}</span>
                      </div>
                      {canManageRole(currentUser.id === documentOwner?.id ? "owner" : 
                                    accessList.find(a => a.user_details.id === currentUser.id)?.role || "viewer", 
                                    access.role, access.user_details.id) ? (
                        <Select 
                          value={access.role}
                          onValueChange={(newRole) => handleRoleChange(access.id, newRole)}
                          onOpenChange={(open) => {
                            // Если закрыли Select и выбрано значение "remove", значит пользователь выбрал "Удалить доступ"
                            if (!open && access.role === "remove") {
                              // Восстанавливаем предыдущее значение, чтобы избежать отображения "remove"
                              const previousRole = accessList.find(item => item.id === access.id)?.role || "viewer";
                              setAccessList(prevList => 
                                prevList.map(item => 
                                  item.id === access.id ? { ...item, role: previousRole } : item
                                )
                              );
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 w-[150px] bg-secondary/50 hover:bg-secondary/70 transition-colors">
                            <SelectValue>
                              {getRoleName(access.role)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent align="end">
                            {access.role !== "editor" && (
                              <SelectItem value="editor">{getRoleName("editor")}</SelectItem>
                            )}
                            {access.role !== "viewer" && (
                              <SelectItem value="viewer">{getRoleName("viewer")}</SelectItem>
                            )}
                            <SelectItem 
                              value="remove" 
                              className="text-red-500 focus:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              Удалить доступ
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">{getRoleName(access.role)}</span>
                      )}
                    </div>
                  ))}
                  
                  {loadingAccessList && (
                    <div className="flex justify-center py-2">
                      <span className="text-sm text-muted-foreground">Загрузка...</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
} 