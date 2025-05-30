import * as React from "react"
import { Check, ChevronsUpDown, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Тип для представления пользователя
export interface User {
  id: string
  name: string
  email?: string
  avatar?: string
}

interface SelectUsersProps {
  users: User[] // Список всех доступных пользователей
  selectedUsers: User[] // Список выбранных пользователей
  onSelectionChange: (users: User[]) => void // Callback при изменении выбора
  placeholder?: string
  className?: string
}

export function SelectUsers({
  users,
  selectedUsers,
  onSelectionChange,
  placeholder = "Выберите ответственных",
  className,
}: SelectUsersProps) {
  const [open, setOpen] = React.useState(false)

  const toggleUser = (user: User) => {
    const isSelected = selectedUsers.some((u) => u.id === user.id)
    
    if (isSelected) {
      onSelectionChange(selectedUsers.filter((u) => u.id !== user.id))
    } else {
      onSelectionChange([...selectedUsers, user])
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between",
            !selectedUsers.length && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            {selectedUsers.length > 0
              ? `Выбрано: ${selectedUsers.length}`
              : placeholder}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Выберите ответственных</DialogTitle>
        </DialogHeader>
        <div className="max-h-72 overflow-auto p-2">
          {users.map((user) => (
            <div
              key={user.id}
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                selectedUsers.some((u) => u.id === user.id) &&
                  "bg-accent text-accent-foreground"
              )}
              onClick={() => toggleUser(user)}
            >
              {user.avatar && (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="mr-2 h-5 w-5 rounded-full"
                />
              )}
              <span>{user.name}</span>
              {selectedUsers.some((u) => u.id === user.id) && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </div>
          ))}
          {users.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              Нет доступных пользователей
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 