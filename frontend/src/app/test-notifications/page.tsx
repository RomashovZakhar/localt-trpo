"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth'
import api from '@/lib/api'
import { NotificationDropdown } from '@/components/notifications/notification-dropdown'
import { Button } from '@/components/ui/button'

// Компонент для тестирования уведомлений
export default function NotificationsTest() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log("Запрашиваем уведомления напрямую...")
        const response = await api.get('/users/notifications/')
        console.log("Ответ API:", response.data)
        setNotifications(response.data)
      } catch (error: any) {
        console.error("Ошибка при загрузке уведомлений:", error)
        setError(error.message || "Не удалось загрузить уведомления")
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchNotifications()
    }
  }, [user])

  const handleRefresh = () => {
    if (!user) {
      setError("Необходимо авторизоваться")
      return
    }
    
    const fetchNotifications = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log("Обновляем уведомления...")
        const response = await api.get('/users/notifications/')
        console.log("Ответ API:", response.data)
        setNotifications(response.data)
      } catch (error: any) {
        console.error("Ошибка при загрузке уведомлений:", error)
        setError(error.message || "Не удалось загрузить уведомления")
      } finally {
        setLoading(false)
      }
    }
    
    fetchNotifications()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Тест уведомлений</h1>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Информация о пользователе:</h2>
        {user ? (
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(user, null, 2)}
          </pre>
        ) : (
          <p className="text-red-500">Пользователь не авторизован</p>
        )}
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">
          Компонент уведомлений:
          <Button onClick={handleRefresh} className="ml-4" variant="outline" size="sm">
            Обновить
          </Button>
        </h2>
        <div className="border p-4 flex items-center gap-4">
          <NotificationDropdown />
          <span className="text-gray-500">👈 Нажмите на иконку колокольчика, чтобы проверить уведомления</span>
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Прямой запрос уведомлений:</h2>
        {loading ? (
          <p>Загрузка...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : notifications.length === 0 ? (
          <p className="bg-yellow-100 p-4 rounded">Уведомлений не найдено. Если вы ожидаете видеть здесь уведомления, проверьте, правильно ли настроен сервер.</p>
        ) : (
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(notifications, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
} 