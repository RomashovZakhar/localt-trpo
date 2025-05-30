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

interface DeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deadline: string) => void;
  currentDeadline?: string;
}

export function DeadlineModal({ 
  isOpen, 
  onClose, 
  onSave, 
  currentDeadline 
}: DeadlineModalProps) {
  // Парсим текущий дедлайн, если он существует
  const [date, setDate] = useState<Date | undefined>(
    currentDeadline ? new Date(currentDeadline) : undefined
  );

  // При изменении currentDeadline обновляем состояние
  useEffect(() => {
    if (currentDeadline) {
      try {
        setDate(new Date(currentDeadline));
      } catch (e) {
        setDate(undefined);
      }
    } else {
      setDate(undefined);
    }
  }, [currentDeadline]);

  // Обработчик сохранения
  const handleSave = () => {
    if (date) {
      onSave(format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")); // ISO формат для сохранения
    } else {
      onSave(''); // Очистить дедлайн
    }
    onClose();
  };

  // Обработчик удаления дедлайна
  const handleClear = () => {
    setDate(undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Установить дедлайн</DialogTitle>
          <DialogDescription>
            Выберите дату и время, к которым задача должна быть выполнена.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <DateTimePicker 
            date={date} 
            setDate={setDate} 
            placeholder="Выберите дату и время дедлайна"
          />
          
          {date && (
            <div className="mt-4 text-sm text-muted-foreground">
              Выбранный дедлайн: {format(date, 'PPP в HH:mm', { locale: ru })}
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
              Удалить дедлайн
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