"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import api from "@/lib/api"

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const response = await api.post("/token/", {
        email,
        password,
      })

      // Сохраняем токены в localStorage
      localStorage.setItem("accessToken", response.data.access)
      localStorage.setItem("refreshToken", response.data.refresh)
      
      // Получаем информацию о пользователе
      const userResponse = await api.get('/users/me/')
      
      if (userResponse.data.is_email_verified) {
        // Если email подтвержден, перенаправляем на главную страницу
        router.push("/")
      } else {
        // Если email не подтвержден, перенаправляем на страницу верификации
        router.push("/verify-email")
      }
    } catch (error: any) {
      console.error("Ошибка входа:", error)
      if (error.response?.status === 401 || error.response?.status === 400) {
        setError("Неверный email или пароль")
      } else if (error.response?.data?.detail) {
        setError(error.response.data.detail)
      } else {
        setError("Произошла ошибка при входе. Попробуйте снова.")
      }
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Вход</CardTitle>
          <CardDescription>
            Введите свой email и пароль для входа
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <div className="flex flex-col gap-6">
              {error && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Пароль</Label>
                  <Link href="/forgot-password" className="text-sm underline underline-offset-4 hover:text-primary">
                    Забыли пароль?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Вход..." : "Войти"}
              </Button>
              
              <div className="mt-4 text-center text-sm">
                Нет аккаунта?{" "}
                <Link href="/register" className="underline underline-offset-4">
                  Зарегистрироваться
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 