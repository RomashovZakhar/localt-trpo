"use client"

import { Suspense } from 'react'
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Восстановление пароля
          </h1>
          <p className="text-muted-foreground">
            Введите новый пароль
          </p>
        </div>
        <Suspense fallback={<div>Загрузка...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
} 