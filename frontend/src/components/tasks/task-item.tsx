import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

interface TaskItemProps {
  id: string;
  documentId: string;
  isCompleted: boolean;
  onToggle?: (id: string, isCompleted: boolean) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ id, documentId, isCompleted, onToggle }) => {
  const [localIsCompleted, setLocalIsCompleted] = useState(isCompleted);
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleTaskCompletion = async () => {
    try {
      setIsUpdating(true);
      
      // Вызываем API метод для изменения статуса
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/documents/${documentId}/toggle_task/`,
        {
          task_id: id,
          is_completed: !localIsCompleted
        },
        {
          withCredentials: true
        }
      );
      
      // После успешного обновления статуса в API, обновляем локальное состояние
      setLocalIsCompleted(!localIsCompleted);
      
      // Уведомляем родительский компонент об изменении
      if (onToggle) {
        onToggle(id, !localIsCompleted);
      }
    } catch (error) {
      console.error("Error toggling task completion:", error);
      toast.error("Не удалось обновить статус задачи");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="task-item">
      <input 
        type="checkbox" 
        checked={localIsCompleted}
        onChange={toggleTaskCompletion}
        disabled={isUpdating}
      />
      <span className={localIsCompleted ? "completed" : ""}>
        {/* Содержимое задачи */}
      </span>
    </div>
  );
};

export default TaskItem; 