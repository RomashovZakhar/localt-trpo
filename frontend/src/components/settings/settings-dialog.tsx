"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import api from '@/lib/api'

export function SettingsDialog() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  
  // Состояние для формы профиля
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Состояние для настроек уведомлений
  const [telegramConnected, setTelegramConnected] = useState(false)
  const [taskNotifications, setTaskNotifications] = useState(false)
  const [inviteNotifications, setInviteNotifications] = useState(false)
  
  // Загружаем данные пользователя в форму
  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
      setTelegramConnected(!!user.telegram_id)
    }
  }, [user])
  
  // Обработчик события для открытия модального окна
  useEffect(() => {
    const handleOpenSettings = () => setOpen(true)
    window.addEventListener('open-settings', handleOpenSettings)
    
    return () => {
      window.removeEventListener('open-settings', handleOpenSettings)
    }
  }, [])
  
  // Обработчик отправки формы профиля
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})
    
    try {
      // Отправляем данные на сервер
      const response = await api.put('/users/update_profile/', {
        username,
        first_name: firstName,
        last_name: lastName
      })
      
      // Показываем сообщение об успехе
      toast.success('Профиль успешно обновлен')
      
      // Закрываем модальное окно
      setOpen(false)
    } catch (error: any) {
      console.error('Ошибка при обновлении профиля:', error)
      
      // Обрабатываем ошибки валидации
      if (error.response && error.response.data) {
        setErrors(error.response.data)
        
        // Показываем сообщение об ошибке username, если она есть
        if (error.response.data.username) {
          toast.error(error.response.data.username)
        } else {
          toast.error('Не удалось обновить профиль')
        }
      } else {
        toast.error('Ошибка соединения с сервером')
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Обработчик подключения телеграма
  const handleConnectTelegram = () => {
    // Временная заглушка
    toast.info('Функция подключения Telegram будет реализована позже')
  }
  
  // Обработчик включения/отключения уведомлений
  const handleToggleNotifications = async (type: 'tasks' | 'invites', value: boolean) => {
    if (!telegramConnected) {
      toast.error('Сначала подключите Telegram')
      return
    }
    
    try {
      if (type === 'tasks') {
        setTaskNotifications(value)
      } else {
        setInviteNotifications(value)
      }
      
      // Отправляем новые настройки на сервер
      await api.post('/users/toggle_telegram_notifications/', {
        tasks_notifications: type === 'tasks' ? value : taskNotifications,
        invites_notifications: type === 'invites' ? value : inviteNotifications
      })
      
      toast.success('Настройки уведомлений обновлены')
    } catch (error) {
      console.error('Ошибка при обновлении настроек уведомлений:', error)
      
      // Восстанавливаем предыдущие значения
      if (type === 'tasks') {
        setTaskNotifications(!value)
      } else {
        setInviteNotifications(!value)
      }
      
      toast.error('Не удалось обновить настройки уведомлений')
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Настройки</DialogTitle>
          <DialogDescription>
            Управление вашим профилем и настройками приложения
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Профиль</TabsTrigger>
            <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          </TabsList>
          
          {/* Вкладка Профиль */}
          <TabsContent value="profile">
            <form onSubmit={handleProfileSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    Имя пользователя
                  </Label>
                  <Input 
                    id="username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    className="col-span-3" 
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input 
                    id="email" 
                    value={user?.email || ''} 
                    className="col-span-3"
                    disabled
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="firstName" className="text-right">
                    Имя
                  </Label>
                  <Input 
                    id="firstName" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="lastName" className="text-right">
                    Фамилия
                  </Label>
                  <Input 
                    id="lastName" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          
          {/* Вкладка Уведомления */}
          <TabsContent value="notifications">
            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Телеграм</h3>
                  <p className="text-sm text-muted-foreground">
                    {telegramConnected 
                      ? 'Телеграм подключен' 
                      : 'Подключите телеграм для получения уведомлений'}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleConnectTelegram}
                >
                  {telegramConnected ? 'Переподключить' : 'Подключить'}
                </Button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <h3 className="font-medium">Уведомления о задачах</h3>
                  <p className="text-sm text-muted-foreground">
                    Получать уведомления о новых и просроченных задачах
                  </p>
                </div>
                <Switch 
                  checked={taskNotifications}
                  onCheckedChange={(checked) => handleToggleNotifications('tasks', checked)}
                  disabled={!telegramConnected}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <h3 className="font-medium">Уведомления о приглашениях</h3>
                  <p className="text-sm text-muted-foreground">
                    Получать уведомления о приглашениях к документам
                  </p>
                </div>
                <Switch 
                  checked={inviteNotifications}
                  onCheckedChange={(checked) => handleToggleNotifications('invites', checked)}
                  disabled={!telegramConnected}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 