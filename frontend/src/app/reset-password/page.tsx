"use client"

import { Suspense } from 'react'
import { ResetPasswordForm } from "@/components/auth"

export default function ResetPasswordPage() {
  return (
    <div className="flex h-screen">
      <div className="m-auto w-full max-w-md p-8">
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