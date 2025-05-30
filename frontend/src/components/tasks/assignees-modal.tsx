import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User } from '@/components/ui/select-users';
import { Check, X } from 'lucide-react';

interface AssigneesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assignees: User[]) => void;
  currentAssignees: User[];
  availableUsers: User[];
}

export function AssigneesModal({
  isOpen,
  onClose,
  onSave,
  currentAssignees = [],
  availableUsers = [],
}: AssigneesModalProps) {
  // Состояние выбранных пользователей
  const [selectedUsers, setSelectedUsers] = useState<User[]>(currentAssignees);

  // Обновляем внутреннее состояние при изменении внешних данных
  useEffect(() => {
    setSelectedUsers(currentAssignees);
  }, [currentAssignees, isOpen]);

  // Обработчик выбора/отмены пользователя
  const toggleUser = (user: User) => {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  // Обработчик сохранения
  const handleSave = () => {
    onSave(selectedUsers);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Назначить ответственных</DialogTitle>
          <DialogDescription>
            Выберите пользователей, ответственных за выполнение задачи.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {availableUsers.length > 0 ? (
              availableUsers.map(user => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent transition-colors ${
                    selectedUsers.some(u => u.id === user.id) ? 'bg-accent/50' : ''
                  }`}
                  onClick={() => toggleUser(user)}
                >
                  <div className="flex items-center gap-2">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {user.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{user.name}</div>
                      {user.email && (
                        <div className="text-xs text-muted-foreground">
                          {user.email}
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedUsers.some(u => u.id === user.id) ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Нет доступных пользователей
              </div>
            )}
          </div>

          {selectedUsers.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Выбранные пользователи:</div>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1 bg-accent/50 rounded-full px-3 py-1 text-sm"
                  >
                    <span>{user.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleUser(user);
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 