"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import api from "@/lib/api"

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Получаем параметры из URL, если они есть
  const emailParam = searchParams.get('email')
  const codeParam = searchParams.get('code')
  
  const [email, setEmail] = useState<string>(emailParam || '')
  const [otp, setOtp] = useState<string>(codeParam || '')
  const [password, setPassword] = useState<string>('')
  const [passwordConfirm, setPasswordConfirm] = useState<string>('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    // Валидация формы
    if (password !== passwordConfirm) {
      setError("Пароли не совпадают")
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Пароль должен содержать не менее 8 символов")
      setIsLoading(false)
      return
    }

    try {
      const response = await api.post("/password-reset-confirm/", {
        email,
        otp,
        password,
        password_confirm: passwordConfirm,
      })

      setSuccess("Пароль успешно изменен. Ваш email подтвержден, и вы можете войти в систему с новым паролем. Перенаправление на страницу входа...")
      
      // Перенаправляем на страницу входа через 3 секунды
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error: any) {
      console.error("Ошибка сброса пароля:", error)
      setError(error.response?.data?.detail || "Произошла ошибка при сбросе пароля")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Сброс пароля</CardTitle>
          <CardDescription>
            Введите новый пароль и код подтверждения из письма.
            {!success && <span className="mt-2 block text-xs text-slate-500">Если ваш email не был подтвержден, он будет автоматически подтвержден после сброса пароля.</span>}
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
                  disabled={isLoading || !!success || !!emailParam}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="otp">Код подтверждения</Label>
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={isLoading || !!success}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="password">Новый пароль</Label>
                <Input
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  disabled={isLoading || !!success}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="passwordConfirm">Подтверждение пароля</Label>
                <Input
                  id="passwordConfirm"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  type="password"
                  required
                  disabled={isLoading || !!success}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !!success || !email || !otp || !password || !passwordConfirm}
              >
                {isLoading ? "Сохранение..." : "Сохранить новый пароль"}
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