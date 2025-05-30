"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth'
import api from '@/lib/api'
import { NotificationDropdown } from '@/components/notifications/notification-dropdown'

// Компонент для тестирования уведомлений
export default function NotificationsTest() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true)
        console.log("Запрашиваем уведомления напрямую...")
        const response = await api.get('/users/notifications/')
        console.log("Ответ API:", response.data)
        setNotifications(response.data)
      } catch (error) {
        console.error("Ошибка при загрузке уведомлений:", error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchNotifications()
    }
  }, [user])

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
          <p>Пользователь не авторизован</p>
        )}
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Компонент уведомлений:</h2>
        <div className="border p-4 flex justify-center items-center">
          <NotificationDropdown />
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Прямой запрос уведомлений:</h2>
        {loading ? (
          <p>Загрузка...</p>
        ) : (
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(notifications, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
} 