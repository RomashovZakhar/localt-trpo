"use client"

import React from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth'
import { NotificationDropdown } from '@/components/notifications/notification-dropdown'

interface AppHeaderProps {
  onMenuToggle?: () => void
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden" 
        onClick={onMenuToggle}
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      <div className="flex flex-1 items-center justify-end gap-2">
        {/* Другие элементы хедера */}
        <NotificationDropdown />
      </div>
    </header>
  )
} 