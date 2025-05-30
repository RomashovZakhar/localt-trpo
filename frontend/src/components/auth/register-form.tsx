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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import api from "@/lib/api"

export function RegisterForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState<boolean>(false)
  const [registrationData, setRegistrationData] = useState<{
    email: string;
    password: string;
  } | null>(null)
  const [otp, setOtp] = useState<string>("")

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const username = formData.get("username") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const passwordConfirm = formData.get("passwordConfirm") as string

    if (password !== passwordConfirm) {
      setError("Пароли не совпадают")
      setIsLoading(false)
      return
    }

    try {
      const response = await api.post("/register/", {
        username,
        email,
        password,
        password_confirm: passwordConfirm,
      })

      const data = response.data
      
      // Сохраняем данные для подтверждения email
      setRegistrationData({
        email: data.email,
        password,
      })
      
      setOtpSent(true)
    } catch (error: any) {
      console.error("Ошибка регистрации:", error)
      
      // Более детальная обработка ошибок
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          // Если сервер вернул объект с ошибками
          const errorMsg = Object.entries(error.response.data)
            .map(([field, errors]) => {
              if (Array.isArray(errors)) {
                return `${field}: ${errors.join(', ')}`;
              }
              return `${field}: ${errors}`;
            })
            .join('; ');
          setError(errorMsg);
        } else if (error.response.data.detail) {
          // Если есть поле detail
          setError(error.response.data.detail);
        } else {
          // Для других случаев
          setError('Произошла ошибка при регистрации');
        }
      } else {
        setError('Произошла ошибка при соединении с сервером');
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function onVerifySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!registrationData) return
    
    setIsLoading(true)
    setError(null)

    // Используем otp из состояния

    try {
      // Верификация email
      await api.post("/verify-email/", {
        email: registrationData.email,
        otp,
      })

      // После успешной верификации - автоматический вход
      try {
        console.log("Выполняем автовход после успешной регистрации...");
        
        const loginResponse = await api.post("/token/", {
          email: registrationData.email,
          password: registrationData.password,
        });

        // Сохраняем токены
        localStorage.setItem("accessToken", loginResponse.data.access);
        localStorage.setItem("refreshToken", loginResponse.data.refresh);
        
        // После входа проверяем, есть ли корневой документ
        console.log("Перед переходом к документу проверяем наличие корневых документов");
        
        // Делаем задержку, чтобы гарантировать, что все ранее созданные документы попадут в выборку
        setTimeout(async () => {
          try {
            // Запрашиваем список корневых документов
            const docsResponse = await api.get("/documents/?root=true");
            console.log("Ответ API при запросе корневых документов после регистрации:", docsResponse.data);
            
            if (Array.isArray(docsResponse.data) && docsResponse.data.length > 0) {
              // Если есть корневые документы, берем самый старый
              const sortedDocs = [...docsResponse.data].sort((a, b) => {
                const idA = parseInt(a.id);
                const idB = parseInt(b.id);
                return idA - idB;  // От меньшего к большему
              });
              
              const rootDocId = sortedDocs[0].id;
              console.log(`Переходим к корневому документу с ID ${rootDocId} после регистрации`);
              router.push(`/documents/${rootDocId}`);
            } else if (docsResponse.data && docsResponse.data.id) {
              // Если получили один документ
              const rootDocId = docsResponse.data.id;
              console.log(`Переходим к корневому документу с ID ${rootDocId} после регистрации`);
              router.push(`/documents/${rootDocId}`);
            } else {
              // Если нет корневых документов, идем на главную
              console.log("Корневые документы не найдены, перенаправляем на главную страницу");
              router.push("/");
            }
          } catch (error) {
            console.error("Ошибка при получении корневых документов:", error);
            router.push("/");
          }
        }, 1000); // Добавляем задержку в 1 секунду
      } catch (loginError) {
        console.error("Не удалось автоматически войти:", loginError);
        // В случае ошибки автовхода, перенаправляем на страницу входа
        router.push("/login");
      }
    } catch (error: any) {
      console.error("Ошибка подтверждения email:", error);
      setError(error.response?.data?.detail || "Неверный код подтверждения");
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {otpSent ? "Подтверждение Email" : "Регистрация"}
          </CardTitle>
          <CardDescription className="text-center">
            {otpSent
              ? "Введите код подтверждения, отправленный на ваш email"
              : "Создайте новый аккаунт"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {otpSent ? (
            <form onSubmit={onVerifySubmit}>
              <div className="flex flex-col gap-6">
                {error && (
                  <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
                    {error}
                  </div>
                )}
                <div className="grid gap-2 text-center items-center justify-center">
                  <Label htmlFor="otp">Код подтверждения</Label>
                  <InputOTP 
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    disabled={isLoading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Подтверждение..." : "Подтвердить Email"}
                </Button>
                <div className="text-center">
                  <button 
                    type="button" 
                    className="text-sm text-primary hover:underline" 
                    disabled={isLoading}
                    onClick={async () => {
                      if (!registrationData) return;
                      
                      setIsLoading(true);
                      setError(null);
                      
                      try {
                        await api.post("/resend-verification/", {
                          email: registrationData.email
                        });
                        setError("Новый код подтверждения отправлен на ваш email.");
                      } catch (error: any) {
                        console.error("Ошибка при повторной отправке кода:", error);
                        setError(error.response?.data?.detail || "Не удалось отправить код повторно.");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  >
                    Отправить код повторно
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="flex flex-col gap-6">
                {error && (
                  <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
                    {error}
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="username">Имя пользователя</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    required
                    disabled={isLoading}
                  />
                </div>
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
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="passwordConfirm">Подтверждение пароля</Label>
                  <Input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type="password"
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Регистрация..." : "Зарегистрироваться"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Уже есть аккаунт?{" "}
                <Link href="/login" className="underline underline-offset-4">
                  Войти
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 