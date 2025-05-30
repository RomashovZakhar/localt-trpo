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

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [email, setEmail] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await api.post("/password-reset-request/", {
        email,
      })

      setSuccess(
        "Инструкции по сбросу пароля отправлены на указанную почту. Проверьте свой почтовый ящик и следуйте инструкциям в письме."
      )
    } catch (error: any) {
      console.error("Ошибка запроса сброса пароля:", error)
      // Для безопасности всегда показываем успешный ответ, даже если email не существует
      setSuccess(
        "Если указанный email зарегистрирован в системе, инструкции по сбросу пароля будут отправлены."
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Восстановление пароля</CardTitle>
          <CardDescription>
            Введите email, на который зарегистрирована ваша учетная запись
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
              
              {success && (
                <div className="bg-green-100 text-green-800 p-3 rounded-md text-sm">
                  {success}
                </div>
              )}
              
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="m@example.com"
                  required
                  disabled={isLoading || !!success}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !!success}
              >
                {isLoading ? "Отправка..." : "Отправить инструкцию"}
              </Button>
              
              <div className="mt-4 text-center text-sm">
                <Link href="/login" className="underline underline-offset-4">
                  Вернуться к входу
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 