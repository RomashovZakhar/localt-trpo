import { useEffect } from 'react';
import { useTaskModals } from './task-modals-provider';

/**
 * Компонент, который инициализирует глобальный доступ к модальным окнам задач
 * Должен быть размещен в дереве компонентов, где доступен контекст TaskModalsProvider
 */
export const GlobalTaskModals = () => {
  const taskModals = useTaskModals();
  
  useEffect(() => {
    console.log('[GlobalTaskModals] Initializing global task modals...');
    
    if (typeof window !== 'undefined') {
      (window as any).__taskModals = taskModals;
      console.log('[GlobalTaskModals] Global task modals initialized', taskModals);
    }
    
    return () => {
      console.log('[GlobalTaskModals] Cleaning up global task modals...');
      if (typeof window !== 'undefined' && (window as any).__taskModals) {
        delete (window as any).__taskModals;
      }
    };
  }, [taskModals]);
  
  return null;
}; 