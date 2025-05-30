import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User } from '@/components/ui/select-users';
import { DeadlineModal } from './deadline-modal';
import { ReminderModal } from './reminder-modal';
import { AssigneesModal } from './assignees-modal';
import { StatisticsModal } from './statistics-modal';

// Типы для статистики
interface TaskStatistics {
  createdAt: string;  // Дата создания задачи
  editorCount: number;  // Количество редакторов
  totalDocuments: number;  // Общее количество документов
  totalTasks: number;  // Общее количество задач
  completedTasks: number;  // Количество выполненных задач
  overdueCount: number;  // Количество просроченных задач
  topContributor?: string;  // Имя самого активного участника
}

// Типы для контекста
export interface TaskModalsContextType {
  openDeadlineModal: (taskId: string, currentDeadline: string | undefined, onSave: (deadline: string) => void) => void;
  openReminderModal: (taskId: string, currentReminder: string | undefined, onSave: (reminder: string) => void) => void;
  openAssigneesModal: (
    taskId: string, 
    currentAssignees: User[], 
    availableUsers: User[], 
    onSave: (assignees: User[]) => void
  ) => void;
  openStatisticsModal: (statistics: TaskStatistics) => void;
}

// Создаем контекст
const TaskModalsContext = createContext<TaskModalsContextType | undefined>(undefined);

// Типы для состояний модальных окон
interface DeadlineModalState {
  isOpen: boolean;
  taskId: string;
  currentDeadline?: string;
  onSave: (deadline: string) => void;
}

interface ReminderModalState {
  isOpen: boolean;
  taskId: string;
  currentReminder?: string;
  onSave: (reminder: string) => void;
}

interface AssigneesModalState {
  isOpen: boolean;
  taskId: string;
  currentAssignees: User[];
  availableUsers: User[];
  onSave: (assignees: User[]) => void;
}

interface StatisticsModalState {
  isOpen: boolean;
  statistics: TaskStatistics;
}

// Компонент-провайдер
interface TaskModalsProviderProps {
  children: ReactNode;
}

export function TaskModalsProvider({ children }: TaskModalsProviderProps) {
  // Состояния модальных окон
  const [deadlineModal, setDeadlineModal] = useState<DeadlineModalState>({
    isOpen: false,
    taskId: '',
    onSave: () => {},
  });

  const [reminderModal, setReminderModal] = useState<ReminderModalState>({
    isOpen: false,
    taskId: '',
    onSave: () => {},
  });

  const [assigneesModal, setAssigneesModal] = useState<AssigneesModalState>({
    isOpen: false,
    taskId: '',
    currentAssignees: [],
    availableUsers: [],
    onSave: () => {},
  });

  const [statisticsModal, setStatisticsModal] = useState<StatisticsModalState>({
    isOpen: false,
    statistics: {
      createdAt: new Date().toISOString(),
      editorCount: 0,
      totalDocuments: 0,
      totalTasks: 0,
      completedTasks: 0,
      overdueCount: 0
    }
  });

  // Методы для открытия модальных окон
  const openDeadlineModal = useCallback((
    taskId: string, 
    currentDeadline?: string, 
    onSave: (deadline: string) => void = () => {}
  ) => {
    setDeadlineModal({
      isOpen: true,
      taskId,
      currentDeadline,
      onSave,
    });
  }, []);

  const openReminderModal = useCallback((
    taskId: string, 
    currentReminder?: string, 
    onSave: (reminder: string) => void = () => {}
  ) => {
    setReminderModal({
      isOpen: true,
      taskId,
      currentReminder,
      onSave,
    });
  }, []);

  const openAssigneesModal = useCallback((
    taskId: string, 
    currentAssignees: User[], 
    availableUsers: User[], 
    onSave: (assignees: User[]) => void = () => {}
  ) => {
    setAssigneesModal({
      isOpen: true,
      taskId,
      currentAssignees,
      availableUsers,
      onSave,
    });
  }, []);

  const openStatisticsModal = useCallback((statistics: TaskStatistics) => {
    setStatisticsModal({
      isOpen: true,
      statistics
    });
  }, []);

  // Методы для закрытия модальных окон
  const closeDeadlineModal = useCallback(() => {
    setDeadlineModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const closeReminderModal = useCallback(() => {
    setReminderModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const closeAssigneesModal = useCallback(() => {
    setAssigneesModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const closeStatisticsModal = useCallback(() => {
    setStatisticsModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Значение контекста
  const contextValue = {
    openDeadlineModal,
    openReminderModal,
    openAssigneesModal,
    openStatisticsModal
  };

  return (
    <TaskModalsContext.Provider value={contextValue}>
      {children}

      {/* Модальные окна */}
      <DeadlineModal
        isOpen={deadlineModal.isOpen}
        onClose={closeDeadlineModal}
        onSave={deadlineModal.onSave}
        currentDeadline={deadlineModal.currentDeadline}
      />

      <ReminderModal
        isOpen={reminderModal.isOpen}
        onClose={closeReminderModal}
        onSave={reminderModal.onSave}
        currentReminder={reminderModal.currentReminder}
      />

      <AssigneesModal
        isOpen={assigneesModal.isOpen}
        onClose={closeAssigneesModal}
        onSave={assigneesModal.onSave}
        currentAssignees={assigneesModal.currentAssignees}
        availableUsers={assigneesModal.availableUsers}
      />

      <StatisticsModal 
        isOpen={statisticsModal.isOpen}
        onClose={closeStatisticsModal}
        statistics={statisticsModal.statistics}
      />
    </TaskModalsContext.Provider>
  );
}

// Хук для использования контекста
export function useTaskModals() {
  const context = useContext(TaskModalsContext);
  
  if (context === undefined) {
    throw new Error('useTaskModals must be used within a TaskModalsProvider');
  }
  
  return context;
} 