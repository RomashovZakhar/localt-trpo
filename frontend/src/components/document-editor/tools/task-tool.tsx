import React from 'react';
import { Calendar, Clock, Trash2, Users, Bell, UserCheck, AlertCircle } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import api from '@/lib/api';
import axios from 'axios';

// Определяем пользовательские типы для инструмента
interface API {
  blocks: {
    update: (blockIndex: string, data: Record<string, unknown>) => void;
    delete: () => void;
    getCurrentBlockIndex: () => string | number;
  };
}

interface User {
  id: string;
  name: string;
}

interface BlockToolData {
  text: string;
  checked: boolean;
  expanded: boolean;
  description?: string;
  deadline?: string;  // ISO формат даты
  reminder?: string;  // ISO формат даты
  assignees?: User[];  // Ответственные
}

interface BlockTool {
  save: () => unknown;
  render: () => HTMLElement;
}

interface TaskStatistics {
  createdAt: string;  // Дата создания задачи
  editorCount: number;  // Количество редакторов
  totalDocuments: number;  // Общее количество документов
  totalTasks: number;  // Общее количество задач
  completedTasks: number;  // Количество выполненных задач
  overdueCount: number;  // Количество просроченных задач
  topContributor?: string;  // Имя самого активного участника
}

export default class TaskTool implements BlockTool {
  private api: API;
  private readOnly: boolean;
  private data: BlockToolData;
  private _element: HTMLElement;
  private _wrapper: HTMLElement;
  private _lastExpandedState: boolean | undefined;
  private _outsideClickHandler: ((e: MouseEvent) => void) | null = null;

  static get toolbox() {
    return {
      title: 'Задача',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M6 9L8 11L12 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };
  }
  
  // Указываем EditorJS, что этот блок не должен дублироваться при клике
  static get enableLineBreaks() {
    return true;
  }
  
  // Указываем EditorJS, что этот блок является самостоятельным и не должен трактоваться как параграф
  static get isBlock() {
    return true;
  }
  
  // Отключаем инлайн тулбар для этого блока
  static get disableInlineToolbar() {
    return true;
  }

  constructor({ api, data, readOnly }: { api: API; data: BlockToolData; readOnly: boolean }) {
    this.api = api;
    this.readOnly = readOnly;
    this.data = {
      text: data.text || '',
      checked: data.checked || false,
      description: data.description || '',
      deadline: data.deadline || '',
      assignees: data.assignees || [],
      reminder: data.reminder || '',
      expanded: data.expanded || false
    };

    this._element = document.createElement('div');
    this._wrapper = document.createElement('div');
  }

  static get sanitize() {
    return {
      text: true,
      checked: false,
      description: true,
      deadline: true,
      assignees: true,
      reminder: true,
      expanded: false
    };
  }

  render() {
    try {
      this._element.classList.add('task-tool');
      // Добавляем атрибуты, которые сообщают EditorJS, что это специальный блок
      this._element.dataset.skipActionsCheck = 'true';
      this._element.dataset.noFocus = 'true';
      this._element.draggable = false;
      
      const taskHeader = document.createElement('div');
      taskHeader.classList.add('task-header');
      taskHeader.draggable = false;
      
      // Обработчик для разворачивания/сворачивания задачи при клике на фрейм
      this._element.addEventListener('click', (e) => {
        // Проверяем, что клик не был на чекбоксе или редактируемом тексте
        const target = e.target as HTMLElement;
        const isCheckbox = target.closest('.task-checkbox');
        const isTextEditing = target.closest('.task-text') && document.activeElement === target.closest('.task-text');
        // Проверяем, был ли клик внутри блока деталей
        const isTaskDetails = target.closest('.task-details') !== null;
        // Проверяем, был ли клик на заголовке
        const isTaskHeader = target.closest('.task-header') !== null;
        
        // Если клик не на чекбоксе, не на редактируемом тексте, не внутри блока деталей,
        // и задача ещё не развернута, разворачиваем её
        if (!isCheckbox && !isTextEditing && !isTaskDetails && (!this.data.expanded || !isTaskHeader)) {
          e.stopPropagation();
          e.preventDefault();
          // Если задача не развернута, разворачиваем её
          if (!this.data.expanded) {
            this.data.expanded = true;
            this.updateRender();
            this.updateData();
          }
          // Если задача развернута и клик не на заголовке, сворачиваем её
          else if (!isTaskHeader) {
            this.data.expanded = false;
            this.updateRender();
            this.updateData();
          }
        }
      }, true);
      
      // Создаем чекбокс
      const checkbox = document.createElement('div');
      checkbox.classList.add('task-checkbox');
      
      // Создаем внутренний элемент чекбокса с уникальными классами
      const checkboxCheck = document.createElement('span');
      checkboxCheck.classList.add('task-checkbox-check');
      checkbox.appendChild(checkboxCheck);
      
      // Добавляем класс для отмеченного состояния
      if (this.data.checked) {
        checkbox.classList.add('task-checkbox-checked');
      }
      
      // Останавливаем всплытие события на всех возможных фазах
      checkbox.onpointerdown = (e) => {
        if (e) e.stopPropagation();
      };
      
      checkbox.onmousedown = (e) => {
        if (e) e.stopPropagation();
      };
      
      checkbox.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        try {
          // Получаем ID документа из URL 
          const pathSegments = window.location.pathname.split('/');
          const documentId = pathSegments[pathSegments.length - 1];
          
          // Вызываем API метод для изменения статуса задачи
          await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/documents/${documentId}/toggle_task/`,
            {
              task_id: this.api.blocks.getCurrentBlockIndex(), // ID блока
              is_completed: !this.data.checked
            },
            {
              withCredentials: true
            }
          );
          
          // После успешного обновления статуса в API, обновляем локальное состояние
          this.data.checked = !this.data.checked;
          this.updateRender();
          this.updateData();
        } catch (error) {
          console.error("Error toggling task completion:", error);
          // Отображаем ошибку в консоли, но все равно меняем состояние локально,
          // чтобы не нарушать UX
          this.data.checked = !this.data.checked;
          this.updateRender();
          this.updateData();
        }
      };
      
      // Также делаем его не перетаскиваемым
      checkbox.draggable = false;
      
      // Создаем текстовое поле для названия задачи
      const taskText = document.createElement('div');
      taskText.classList.add('task-text');
      if (this.data.checked) {
        taskText.classList.add('task-text-completed');
      }
      // Делаем текст редактируемым только когда задача раскрыта
      taskText.contentEditable = !this.readOnly && this.data.expanded ? 'true' : 'false';
      taskText.innerHTML = this.data.text || '';
      
      // Предотвращаем создание новых задач при нажатии Enter
      taskText.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        return true;
      };
      
      // Обработчик для сохранения текста при потере фокуса
      taskText.onblur = () => {
        this.data.text = taskText.innerHTML;
        this.updateData();
      };
      
      // Предотвращаем обработку кликов только когда задача раскрыта
      taskText.onclick = (e) => {
        if (this.data.expanded && document.activeElement !== taskText) {
          e.stopPropagation();
        }
      };
      
      // Также делаем его не перетаскиваемым
      taskText.draggable = false;
      
      taskHeader.appendChild(checkbox);
      taskHeader.appendChild(taskText);
      
      this._element.appendChild(taskHeader);
      
      // Создаем блок деталей задачи
      const taskDetails = document.createElement('div');
      taskDetails.classList.add('task-details');
      
      // Если задача раскрыта, показываем детали
      if (this.data.expanded) {
        // Добавляем обработчик клика вне задачи, если его еще нет
        if (!this._outsideClickHandler) {
          this._outsideClickHandler = this.handleOutsideClick.bind(this);
          document.addEventListener('click', this._outsideClickHandler);
        }
        
        // Добавляем класс для анимации
        setTimeout(() => {
          taskDetails.classList.add('task-details-expanded');
        }, 10);
        
        // Создаем поле для описания
        const taskDescription = document.createElement('div');
        taskDescription.classList.add('task-description');
        taskDescription.contentEditable = !this.readOnly ? 'true' : 'false';
        taskDescription.dataset.placeholder = 'Добавить описание...';
        taskDescription.innerHTML = this.data.description || '';
        
        taskDescription.addEventListener('blur', (event) => {
          if (taskDescription && taskDescription.innerHTML !== undefined) {
            this.data.description = taskDescription.innerHTML;
            this.updateData();
          }
        });
        
        // Создаем панель с кнопками
        const taskControls = document.createElement('div');
        taskControls.classList.add('task-controls');
        
        // Кнопка для дедлайна
        const deadlineButton = document.createElement('button');
        deadlineButton.classList.add('task-control-btn');
        deadlineButton.title = 'Установить дедлайн';
        deadlineButton.innerHTML = this.renderIcon(Calendar);
        
        if (this.data.deadline) {
          const deadlineLabel = document.createElement('span');
          deadlineLabel.textContent = this.formatDate(this.data.deadline);
          deadlineButton.appendChild(deadlineLabel);
        }
        
        // Обработчик для кнопки дедлайна
        deadlineButton.addEventListener('click', (e: Event) => {
          e.stopPropagation();
          console.log('Клик по кнопке дедлайна');
          
          // Используем внешнюю функцию (провайдер модальных окон)
          if (typeof window !== 'undefined' && (window as any).__taskModals) {
            console.log('window.__taskModals найден:', (window as any).__taskModals);
            
            try {
              // Вызываем открытие модального окна дедлайна
              (window as any).__taskModals.openDeadlineModal(
                'current-task-id', // ID задачи
                this.data.deadline, // Текущий дедлайн
                (newDeadline: string) => {
                  // Callback для сохранения результата
                  console.log('Сохраняем новый дедлайн:', newDeadline);
                  if (newDeadline) {
                    this.data.deadline = newDeadline;
                  } else {
                    this.data.deadline = undefined;
                  }
                  this.updateRender();
                  this.updateData();
                }
              );
            } catch (error) {
              console.error('Ошибка при открытии модального окна дедлайна:', error);
              alert('Произошла ошибка при открытии модального окна. Попробуйте позже.');
            }
          } else {
            console.error('window.__taskModals не найден');
            alert('Модальное окно выбора даты недоступно. Обратитесь к администратору.');
          }
        });
        
        // Кнопка для назначения ответственных
        const assignButton = document.createElement('button');
        assignButton.classList.add('task-control-btn');
        assignButton.innerHTML = this.renderIcon(UserCheck);
        assignButton.title = 'Назначить ответственных';
        
        // Показываем текущих ответственных
        const assignText = document.createElement('span');
        if (this.data.assignees && this.data.assignees.length > 0) {
          assignText.textContent = `Ответственных: ${this.data.assignees.length}`;
        } else {
          assignText.textContent = 'Ответственные';
        }
        assignButton.appendChild(assignText);
        
        // Обработчик для кнопки ответственных
        assignButton.addEventListener('click', async (e: Event) => {
          e.stopPropagation();
          console.log('Клик по кнопке ответственных');
          
          // Используем внешнюю функцию (провайдер модальных окон)
          if (typeof window !== 'undefined' && (window as any).__taskModals) {
            console.log('window.__taskModals найден:', (window as any).__taskModals);
            
            try {
              // Используем фиктивные данные для упрощения
              const availableUsers = [
                { id: 'user-1', name: 'Иван Иванов', email: 'ivan@example.com' },
                { id: 'user-2', name: 'Петр Петров', email: 'petr@example.com' },
                { id: 'user-3', name: 'Мария Сидорова', email: 'maria@example.com' },
              ];
              
              // Вызываем открытие модального окна выбора ответственных
              (window as any).__taskModals.openAssigneesModal(
                'current-task-id', // ID задачи
                this.data.assignees || [], // Текущие ответственные
                availableUsers, // Доступные пользователи
                (newAssignees: User[]) => {
                  // Callback для сохранения результата
                  console.log('Сохраняем новых ответственных:', newAssignees);
                  this.data.assignees = newAssignees;
                  this.updateRender();
                  this.updateData();
                }
              );
            } catch (error) {
              console.error('Ошибка при открытии модального окна ответственных:', error);
              alert('Произошла ошибка при открытии модального окна. Попробуйте позже.');
            }
          } else {
            console.error('window.__taskModals не найден');
            alert('Модальное окно выбора ответственных недоступно. Обратитесь к администратору.');
          }
        });
        
        // Кнопка для напоминания
        const reminderButton = document.createElement('button');
        reminderButton.classList.add('task-control-btn');
        reminderButton.title = 'Установить напоминание';
        reminderButton.innerHTML = this.renderIcon(Bell);
        
        if (this.data.reminder) {
          const reminderLabel = document.createElement('span');
          reminderLabel.textContent = this.formatDate(this.data.reminder);
          reminderButton.appendChild(reminderLabel);
        }
        
        // Обработчик для кнопки напоминания
        reminderButton.addEventListener('click', (e: Event) => {
          e.stopPropagation();
          console.log('Клик по кнопке напоминания');
          
          // Используем внешнюю функцию (провайдер модальных окон)
          if (typeof window !== 'undefined' && (window as any).__taskModals) {
            console.log('window.__taskModals найден:', (window as any).__taskModals);
            
            try {
              // Вызываем открытие модального окна напоминания
              (window as any).__taskModals.openReminderModal(
                'current-task-id', // ID задачи
                this.data.reminder, // Текущее напоминание
                (newReminder: string) => {
                  // Callback для сохранения результата
                  console.log('Сохраняем новое напоминание:', newReminder);
                  if (newReminder) {
                    this.data.reminder = newReminder;
                  } else {
                    this.data.reminder = undefined;
                  }
                  this.updateRender();
                  this.updateData();
                }
              );
            } catch (error) {
              console.error('Ошибка при открытии модального окна напоминания:', error);
              alert('Произошла ошибка при открытии модального окна. Попробуйте позже.');
            }
          } else {
            console.error('window.__taskModals не найден');
            alert('Модальное окно выбора даты напоминания недоступно. Обратитесь к администратору.');
          }
        });
        
        // Кнопка для удаления
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('task-control-btn', 'task-delete-btn');
        deleteButton.title = 'Удалить задачу';
        deleteButton.innerHTML = this.renderIcon(Trash2);
        
        deleteButton.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
            this.api.blocks.delete();
          }
        });
        
        // Добавляем все кнопки к панели управления
        taskControls.appendChild(deadlineButton);
        taskControls.appendChild(assignButton);
        taskControls.appendChild(reminderButton);
        taskControls.appendChild(deleteButton);
        
        // Добавляем все элементы к деталям задачи
        taskDetails.appendChild(taskDescription);
        taskDetails.appendChild(taskControls);
      }
      
      // Добавляем блок деталей всегда, но разворачиваем только если expanded === true
      this._element.appendChild(taskDetails);
      
      // Стили для компонента
      this.injectStyles();
      
      return this._element;
    } catch (error) {
      console.error('Ошибка при рендеринге компонента задачи:', error);
      // Создаем простой элемент для отображения ошибки
      const errorElement = document.createElement('div');
      errorElement.classList.add('task-tool-error');
      errorElement.style.padding = '16px';
      errorElement.style.backgroundColor = '#FFF0F0';
      errorElement.style.border = '1px solid #FFD0D0';
      errorElement.style.borderRadius = '8px';
      errorElement.style.color = '#FF0000';
      errorElement.innerHTML = `<p>Ошибка при отображении задачи: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}</p>`;
      
      return errorElement;
    }
  }

  // Обновление рендера при изменении состояния
  updateRender() {
    // Если меняется только состояние чекбокса, обновляем только нужные элементы без полной перерисовки
    const checkbox = this._element.querySelector('.task-checkbox');
    const taskText = this._element.querySelector('.task-text');
    
    if (checkbox && taskText) {
      // Обновляем чекбокс
      if (this.data.checked) {
        checkbox.classList.add('task-checkbox-checked');
      } else {
        checkbox.classList.remove('task-checkbox-checked');
      }
      
      // Обновляем стиль текста
      if (this.data.checked) {
        taskText.classList.add('task-text-completed');
      } else {
        taskText.classList.remove('task-text-completed');
      }
      
      // Обновляем редактируемость текста в зависимости от состояния развернутости
      (taskText as HTMLElement).contentEditable = !this.readOnly && this.data.expanded ? 'true' : 'false';
    }
    
    // Обновляем состояние дедлайна
    const deadlineButton = this._element.querySelector('.task-control-btn[title="Установить дедлайн"]');
    if (deadlineButton) {
      // Очищаем существующую метку дедлайна
      const existingLabel = deadlineButton.querySelector('span');
      if (existingLabel) {
        existingLabel.remove();
      }
      
      // Добавляем новую метку, если дедлайн установлен
      if (this.data.deadline) {
        const deadlineLabel = document.createElement('span');
        deadlineLabel.textContent = this.formatDate(this.data.deadline);
        deadlineButton.appendChild(deadlineLabel);
      }
    }
    
    // Обновляем состояние напоминания
    const reminderButton = this._element.querySelector('.task-control-btn[title="Установить напоминание"]');
    if (reminderButton) {
      // Очищаем существующую метку напоминания
      const existingLabel = reminderButton.querySelector('span');
      if (existingLabel) {
        existingLabel.remove();
      }
      
      // Добавляем новую метку, если напоминание установлено
      if (this.data.reminder) {
        const reminderLabel = document.createElement('span');
        reminderLabel.textContent = this.formatDate(this.data.reminder);
        reminderButton.appendChild(reminderLabel);
      }
    }
    
    // Обновляем информацию о назначенных ответственных
    const assignButton = this._element.querySelector('.task-control-btn[title="Назначить ответственных"]');
    if (assignButton) {
      // Очищаем существующую метку
      const existingLabel = assignButton.querySelector('span');
      if (existingLabel) {
        existingLabel.remove();
      }
      
      // Добавляем новую метку с информацией о количестве ответственных
      const assignText = document.createElement('span');
      if (this.data.assignees && this.data.assignees.length > 0) {
        assignText.textContent = `Ответственных: ${this.data.assignees.length}`;
      } else {
        assignText.textContent = 'Ответственные';
      }
      assignButton.appendChild(assignText);
    }
    
    // Обновляем состояние развернутости без полной перерисовки
    const taskDetails = this._element.querySelector('.task-details');
    if (taskDetails) {
      if (this.data.expanded) {
        // Добавляем обработчик клика вне задачи, если его еще нет
        if (!this._outsideClickHandler) {
          this._outsideClickHandler = this.handleOutsideClick.bind(this);
          document.addEventListener('click', this._outsideClickHandler);
        }
        
        // Небольшая задержка для анимации
        setTimeout(() => {
          taskDetails.classList.add('task-details-expanded');
        }, 10);
        
        // Если детали еще не созданы, создаем их
        if (taskDetails.children.length === 0) {
          // Создаем поле для описания
          const taskDescription = document.createElement('div');
          taskDescription.classList.add('task-description');
          taskDescription.contentEditable = !this.readOnly ? 'true' : 'false';
          taskDescription.dataset.placeholder = 'Добавить описание...';
          taskDescription.innerHTML = this.data.description || '';
          
          taskDescription.addEventListener('blur', (event) => {
            if (taskDescription && taskDescription.innerHTML !== undefined) {
              this.data.description = taskDescription.innerHTML;
              this.updateData();
            }
          });
          
          // Создаем панель с кнопками
          const taskControls = document.createElement('div');
          taskControls.classList.add('task-controls');
          
          // Кнопка для дедлайна
          const deadlineButton = document.createElement('button');
          deadlineButton.classList.add('task-control-btn');
          deadlineButton.title = 'Установить дедлайн';
          deadlineButton.innerHTML = this.renderIcon(Calendar);
          
          if (this.data.deadline) {
            const deadlineLabel = document.createElement('span');
            deadlineLabel.textContent = this.formatDate(this.data.deadline);
            deadlineButton.appendChild(deadlineLabel);
          }
          
          // Кнопка для назначения ответственных
          const assignButton = document.createElement('button');
          assignButton.classList.add('task-control-btn');
          assignButton.innerHTML = this.renderIcon(UserCheck);
          assignButton.title = 'Назначить ответственных';
          
          const assignText = document.createElement('span');
          if (this.data.assignees && this.data.assignees.length > 0) {
            assignText.textContent = `Ответственных: ${this.data.assignees.length}`;
          } else {
            assignText.textContent = 'Ответственные';
          }
          assignButton.appendChild(assignText);
          
          // Кнопка для напоминания
          const reminderButton = document.createElement('button');
          reminderButton.classList.add('task-control-btn');
          reminderButton.title = 'Установить напоминание';
          reminderButton.innerHTML = this.renderIcon(Bell);
          
          if (this.data.reminder) {
            const reminderLabel = document.createElement('span');
            reminderLabel.textContent = this.formatDate(this.data.reminder);
            reminderButton.appendChild(reminderLabel);
          }
          
          // Кнопка для удаления
          const deleteButton = document.createElement('button');
          deleteButton.classList.add('task-control-btn', 'task-delete-btn');
          deleteButton.title = 'Удалить задачу';
          deleteButton.innerHTML = this.renderIcon(Trash2);
          
          deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
              this.api.blocks.delete();
            }
          });
          
          // Добавляем все кнопки к панели управления
          taskControls.appendChild(deadlineButton);
          taskControls.appendChild(assignButton);
          taskControls.appendChild(reminderButton);
          taskControls.appendChild(deleteButton);
          
          // Добавляем все элементы к деталям задачи
          taskDetails.appendChild(taskDescription);
          taskDetails.appendChild(taskControls);
        }
      } else {
        // Удаляем обработчик клика вне задачи, если он есть
        if (this._outsideClickHandler) {
          document.removeEventListener('click', this._outsideClickHandler);
          this._outsideClickHandler = null;
        }
        
        taskDetails.classList.remove('task-details-expanded');
      }
    }
  }

  // Обработчик клика вне задачи
  private handleOutsideClick(e: MouseEvent) {
    // Сначала проверяем, если клик был внутри задачи, не делаем ничего
    if (this._element && this._element.contains(e.target as Node)) {
      return; // Клик внутри задачи, не закрываем
    }
    
    // Если клик был вне задачи, проверяем исключения
    const target = e.target as HTMLElement;
    
    // Игнорируем если клик был на диалоге, меню или модальном окне
    const isOnModalOrDialog = 
      target.closest('dialog') || 
      target.closest('[role="dialog"]') || 
      target.closest('[role="menu"]') || 
      target.closest('.modal') ||
      target.closest('.popup');
    
    // Проверяем, не происходит ли сейчас редактирование текста где-то
    const isActiveEditing = document.activeElement && 
      (document.activeElement.tagName === 'INPUT' || 
       document.activeElement.tagName === 'TEXTAREA' ||
       (document.activeElement as HTMLElement).contentEditable === 'true');
    
    // Проверяем, не был ли клик на календаре или другом компоненте выбора даты
    const isOnDatePicker = 
      target.closest('.date-picker') || 
      target.closest('.calendar') || 
      target.closest('.datepicker');
    
    // Если клик не на модальном элементе и нет активного редактирования, тогда закрываем
    if (!isOnModalOrDialog && !isActiveEditing && !isOnDatePicker) {
      // Если задача развернута, сворачиваем её
      if (this.data.expanded) {
        this.data.expanded = false;
        this.updateRender();
        this.updateData();
      }
    }
  }

  // Метод для сохранения данных
  save() {
    return {
      text: this.data.text,
      checked: this.data.checked,
      expanded: this.data.expanded,
      description: this.data.description,
      deadline: this.data.deadline,
      reminder: this.data.reminder,
      assignees: this.data.assignees || []
    };
  }

  // Метод для обновления данных в API
  updateData() {
    // Обновляем блок данных в EditorJS
    const blockIndex = this.api.blocks.getCurrentBlockIndex();
    this.api.blocks.update(blockIndex.toString(), this.data as unknown as Record<string, unknown>);
  }

  // Метод для рендеринга иконок кнопок
  renderIcon(icon: any, size = 16) {
    try {
      // Создаем SVG напрямую вместо использования метода toSVG()
      const iconSvgMap = {
        [Calendar.name]: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3" ry="3"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
        [Clock.name]: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
        [UserCheck.name]: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>',
        [Bell.name]: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
        [Trash2.name]: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>'
      };
      
      const svg = iconSvgMap[icon.name] || '';
      return `<div style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">${svg}</div>`;
    } catch (error) {
      console.error('Ошибка при рендеринге иконки:', error);
      return '';
    }
  }

  // Метод для получения списка пользователей документа
  async getDocumentUsers() {
    try {
      // Возвращаем тестовые данные для упрощения
      return [
        { id: 'user-1', name: 'Иван Иванов', email: 'ivan@example.com' },
        { id: 'user-2', name: 'Петр Петров', email: 'petr@example.com' },
        { id: 'user-3', name: 'Мария Сидорова', email: 'maria@example.com' },
      ];
    } catch (error) {
      console.error("Ошибка при получении списка пользователей:", error);
      return [];
    }
  }

  // Инжект стилей для компонента
  injectStyles() {
    if (typeof document === 'undefined') return;
    
    if (!document.querySelector('#task-tool-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'task-tool-styles';
      styleElement.textContent = `
        .task-tool {
          margin: 16px 0;
          font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          border-radius: 8px;
          background-color: rgba(255, 255, 255, 0.4);
          border: 1px solid rgba(0, 0, 0, 0.05);
          overflow: hidden;
          cursor: pointer;
          transition: background-color 0.15s ease, border-color 0.3s ease, transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.2s ease;
          will-change: transform, opacity;
        }
        
        .task-tool:hover {
          background-color: rgba(0, 0, 0, 0.015);
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
        }
        
        .task-tool:active {
          transform: translateY(0);
        }
        
        .dark .task-tool {
          background-color: rgba(30, 30, 30, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .dark .task-tool:hover {
          background-color: rgba(255, 255, 255, 0.02);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }
        
        .task-header {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
          position: relative;
          user-select: none;
        }
        
        .task-header:hover {
          background-color: rgba(0, 0, 0, 0.03);
        }
        
        .dark .task-header:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
        
        .task-header:after {
          content: '';
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%) rotate(0deg);
          width: 14px;
          height: 14px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238A8A8A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: center;
          opacity: 0.6;
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        }
        
        .dark .task-header:after {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23AAAAAA' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        }
        
        .task-tool:has(.task-details-expanded) .task-header:after {
          transform: translateY(-50%) rotate(180deg);
          opacity: 0.9;
        }
        
        .task-checkbox {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
          flex-shrink: 0;
          cursor: pointer;
          width: 20px;
          height: 20px;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
          width: 16px;
          height: 16px;
          border: 1px solid rgba(0, 0, 0, 0.25);
          border-radius: 3px;
          background-color: #fff;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        
        .dark .task-checkbox {
          border-color: rgba(255, 255, 255, 0.25);
          background-color: rgba(255, 255, 255, 0.05);
        }
        
        .task-checkbox:hover {
          transform: scale(1.1);
          border-color: rgba(0, 0, 0, 0.4);
        }
        
        .dark .task-checkbox:hover {
          border-color: rgba(255, 255, 255, 0.4);
        }
        
        .task-checkbox-checked {
          background-color: #007AFF;
          border-color: #007AFF;
        }
        
        .task-checkbox-checked:hover {
          background-color: #0068D6;
          border-color: #0068D6;
        }
        
        .dark .task-checkbox-checked {
          background-color: #0A84FF;
          border-color: #0A84FF;
        }
        
        .dark .task-checkbox-checked:hover {
          background-color: #0070D6;
          border-color: #0070D6;
        }
        
        .task-checkbox-check {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          opacity: 0;
          background-position: center;
          background-repeat: no-repeat;
          background-size: 10px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='8' viewBox='0 0 10 8' fill='none'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M9.70704 0.292923C10.0975 0.683446 10.0975 1.31661 9.70704 1.70713L3.70704 7.70713C3.31652 8.09766 2.68335 8.09766 2.29283 7.70713L0.292831 5.70713C-0.0976909 5.31661 -0.0976909 4.68345 0.292831 4.29292C0.683352 3.9024 1.31652 3.9024 1.70704 4.29292L3.00004 5.58586L8.29283 0.292923C8.68335 -0.0975985 9.31652 -0.0975985 9.70704 0.292923Z' fill='white'/%3E%3C/svg%3E");
          transition: opacity 0.15s ease;
        }
        
        .task-checkbox-checked .task-checkbox-check {
          opacity: 1;
        }
        
        .task-text {
          flex: 1;
          font-size: 15px;
          line-height: 1.4;
          outline: none;
          text-decoration: none;
          word-break: break-word;
          color: #000;
          font-weight: 400;
          padding: 2px 0;
          margin-right: 28px; /* Оставляем место для стрелки */
          transition: color 0.2s ease;
        }
        
        /* Стиль для неразвернутого состояния, чтобы было понятно что текст нельзя редактировать */
        .task-tool:not(:has(.task-details-expanded)) .task-text {
          cursor: pointer;
        }
        
        /* Стиль для развернутого состояния */
        .task-tool:has(.task-details-expanded) .task-text {
          cursor: text;
        }
        
        .dark .task-text {
          color: #FFF;
        }
        
        .task-details {
          padding: 0px 16px 0px 48px;
          margin-top: 0;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transform: translateY(-8px);
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        }
      
        
        .task-details-expanded {
          padding: 16px 16px 16px 48px;
          max-height: 500px;
          opacity: 1;
          transform: translateY(0);
        }
        
        .task-description {
          font-size: 14px;
          color: #6F6F6F;
          line-height: 1.5;
          margin: 0px 0 20px 0;
          outline: none;
          min-height: 21px;
          padding: 0;
          transition: opacity 0.3s ease;
        }
        
        .dark .task-description {
          color: #A0A0A0;
        }
        
        .task-description:empty:before {
          content: attr(data-placeholder);
          color: #B8B8B8;
          opacity: 0.8;
        }
        
        .dark .task-description:empty:before {
          color: #666;
        }
        
        .task-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        
        .task-control-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #6F6F6F;
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.05);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .dark .task-control-btn {
          color: #A0A0A0;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        
        .task-control-btn:hover {
          background: rgba(0, 0, 0, 0.07);
          color: #000;
          border-color: rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }
        
        .dark .task-control-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #FFF;
          border-color: rgba(255, 255, 255, 0.12);
        }
        
        .task-control-btn:active {
          transform: translateY(0px);
        }
        
        .task-control-btn span {
          font-size: 12.5px;
          white-space: nowrap;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .task-delete-btn {
          margin-left: auto;
          color: #FF3B30;
          opacity: 0.8;
        }
        
        .task-delete-btn:hover {
          color: #FF3B30;
          opacity: 1;
          background: rgba(255, 59, 48, 0.1);
        }
        
        .task-text-completed {
          text-decoration: line-through;
          color: #8E8E93 !important;
          opacity: 0.7;
          transition: color 0.2s ease, opacity 0.2s ease, text-decoration 0.2s ease;
        }
        
        .dark .task-text-completed {
          color: #8E8E93 !important;
        }
      `;
      document.head.appendChild(styleElement);
    }
  }

  // Метод для форматирования даты
  private formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      // Не используем локализацию, а просто форматируем дату
      return formatDate(date, 'dd.MM.yyyy HH:mm');
    } catch (e) {
      return '';
    }
  }
} 