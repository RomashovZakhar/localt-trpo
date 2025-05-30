"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { TaskModalsProvider, useTaskModals } from "@/components/tasks/task-modals-provider";
import { GlobalTaskModals } from "@/components/tasks/global-task-modals";
import { User } from "@/components/ui/select-users";

// Тестовый компонент для вызова модальных окон
function TestButtons() {
  const taskModals = useTaskModals();
  const [result, setResult] = useState<string>("Результаты будут отображаться здесь");
  
  const handleTestDeadline = () => {
    console.log('handleTestDeadline');
    taskModals.openDeadlineModal(
      'test-task-id',
      new Date().toISOString(),
      (deadline) => {
        console.log('Deadline saved:', deadline);
        setResult(`Сохранен дедлайн: ${deadline || 'Нет дедлайна'}`);
      }
    );
  };
  
  const handleTestReminder = () => {
    console.log('handleTestReminder');
    taskModals.openReminderModal(
      'test-task-id',
      new Date().toISOString(),
      (reminder) => {
        console.log('Reminder saved:', reminder);
        setResult(`Сохранено напоминание: ${reminder || 'Нет напоминания'}`);
      }
    );
  };
  
  const handleTestAssignees = () => {
    console.log('handleTestAssignees');
    const testUsers: User[] = [
      { id: 'user-1', name: 'Иван Иванов', email: 'ivan@example.com' },
      { id: 'user-2', name: 'Петр Петров', email: 'petr@example.com' },
      { id: 'user-3', name: 'Мария Сидорова', email: 'maria@example.com' },
    ];
    
    taskModals.openAssigneesModal(
      'test-task-id',
      [],
      testUsers,
      (assignees) => {
        console.log('Assignees saved:', assignees);
        setResult(`Сохранены ответственные: ${assignees.map(a => a.name).join(', ') || 'Нет ответственных'}`);
      }
    );
  };
  
  const handleTestGlobal = () => {
    console.log('handleTestGlobal');
    console.log('window.__taskModals:', (window as any).__taskModals);
    
    if ((window as any).__taskModals) {
      (window as any).__taskModals.openDeadlineModal(
        'test-task-id',
        new Date().toISOString(),
        (deadline: string) => {
          console.log('Global deadline saved:', deadline);
          setResult(`[Global] Сохранен дедлайн: ${deadline || 'Нет дедлайна'}`);
        }
      );
    } else {
      setResult('window.__taskModals не найден!');
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleTestDeadline}>Тест дедлайна</Button>
        <Button onClick={handleTestReminder}>Тест напоминания</Button>
        <Button onClick={handleTestAssignees}>Тест ответственных</Button>
        <Button onClick={handleTestGlobal}>Тест глобального доступа</Button>
      </div>
      
      <div className="p-4 border rounded-md bg-muted/50">
        <h3 className="font-medium mb-2">Результат:</h3>
        <pre className="whitespace-pre-wrap">{result}</pre>
      </div>
    </div>
  );
}

export default function TestModalsPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Тестирование модальных окон задач</h1>
      
      <TaskModalsProvider>
        <GlobalTaskModals />
        <TestButtons />
      </TaskModalsProvider>
      
      <div className="mt-8 p-4 border rounded-md bg-yellow-50">
        <h2 className="text-lg font-semibold mb-2">Инструкция</h2>
        <p>Эта страница позволяет протестировать модальные окна задач вне контекста редактора документов.</p>
        <p className="mt-2">1. Кнопка "Тест дедлайна" открывает модальное окно выбора дедлайна</p>
        <p>2. Кнопка "Тест напоминания" открывает модальное окно выбора напоминания</p>
        <p>3. Кнопка "Тест ответственных" открывает модальное окно выбора ответственных</p>
        <p>4. Кнопка "Тест глобального доступа" проверяет доступ к модальным окнам через window.__taskModals</p>
      </div>
    </div>
  );
} 