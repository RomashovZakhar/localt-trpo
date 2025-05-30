import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/date-time-picker';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reminder: string) => void;
  currentReminder?: string;
}

export function ReminderModal({ 
  isOpen, 
  onClose, 
  onSave, 
  currentReminder 
}: ReminderModalProps) {
  // Парсим текущее напоминание, если оно существует
  const [date, setDate] = useState<Date | undefined>(
    currentReminder ? new Date(currentReminder) : undefined
  );

  // При изменении currentReminder обновляем состояние
  useEffect(() => {
    if (currentReminder) {
      try {
        setDate(new Date(currentReminder));
      } catch (e) {
        setDate(undefined);
      }
    } else {
      setDate(undefined);
    }
  }, [currentReminder]);

  // Обработчик сохранения
  const handleSave = () => {
    if (date) {
      onSave(format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")); // ISO формат для сохранения
    } else {
      onSave(''); // Очистить напоминание
    }
    onClose();
  };

  // Обработчик удаления напоминания
  const handleClear = () => {
    setDate(undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Установить напоминание</DialogTitle>
          <DialogDescription>
            Выберите дату и время, когда вы хотите получить напоминание о задаче.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <DateTimePicker 
            date={date} 
            setDate={setDate} 
            placeholder="Выберите дату и время напоминания"
          />
          
          {date && (
            <div className="mt-4 text-sm text-muted-foreground">
              Напоминание установлено на: {format(date, 'PPP в HH:mm', { locale: ru })}
            </div>
          )}
        </div>

        <DialogFooter>
          {date && (
            <Button
              variant="outline"
              onClick={handleClear}
              className="mr-auto"
            >
              Удалить напоминание
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 