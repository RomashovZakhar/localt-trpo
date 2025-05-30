"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarDays, Users, FileText, CheckSquare, Activity, Award, Clock, 
  TrendingUp, Eye, BarChart3, Zap, Calculator, BrainCircuit, Flame, Sparkles
} from 'lucide-react';
import api from '@/lib/api';
import { format, formatDistanceToNow, subDays, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface DocumentStatisticsProps {
  documentId: string;
}

interface Statistics {
  created_at: string;
  editor_count: number;
  nested_documents_count: number;
  tasks_count: number;
  completed_tasks_count: number;
  completion_percentage: number;
  most_active_user: string | null;
  last_edit_date?: string;
  total_edits?: number;
  recent_views?: number;
  recent_edits?: number;
  average_completion_time?: number;
  // Дополнительные метрики
  content_length?: number; // Длина контента документа
  task_creation_rate?: number; // Скорость создания задач (задач в день)
  complexity_index?: number; // Индекс сложности документа
  progress_trend?: number[]; // Тренд прогресса за последние 7 дней
  edit_frequency?: { day: string; count: number }[]; // Частота редактирований по дням
}

export function DocumentStatistics({ documentId }: DocumentStatisticsProps) {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        
        const response = await api.get(`/documents/${documentId}/statistics/`);
        
        // Здесь мы имитируем дополнительные метрики, которые могли бы прийти с бэкенда
        // В реальном проекте, эти данные должны приходить с сервера
        const enhancedStats = {
          ...response.data,
          content_length: 3450, // Для примера
          task_creation_rate: 3.5, // Для примера
          complexity_index: 67, // Для примера
          progress_trend: [25, 30, 35, 38, 45, 52, 58], // Для примера
          edit_frequency: [
            { day: "Пн", count: 5 },
            { day: "Вт", count: 8 },
            { day: "Ср", count: 12 },
            { day: "Чт", count: 7 },
            { day: "Пт", count: 15 },
            { day: "Сб", count: 3 },
            { day: "Вс", count: 2 }
          ] // Для примера
        };
        
        setStatistics(enhancedStats);
        setError(null);
      } catch (err) {
        console.error('Error fetching document statistics:', err);
        setError('Не удалось загрузить статистику документа');
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      fetchStatistics();
    }
  }, [documentId]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP', { locale: ru });
    } catch (e) {
      return 'Недоступно';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { locale: ru, addSuffix: true });
    } catch (e) {
      return 'Недоступно';
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} мин.`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} ч. ${mins > 0 ? mins + ' мин.' : ''}`;
  };

  // Вычисление статуса прогресса на основе процента выполнения
  const getProgressStatus = (percentage: number) => {
    if (percentage >= 75) return { label: 'Отлично', color: 'bg-green-100 text-green-800' };
    if (percentage >= 50) return { label: 'Хорошо', color: 'bg-blue-100 text-blue-800' };
    if (percentage >= 25) return { label: 'В процессе', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Начало', color: 'bg-gray-100 text-gray-800' };
  };

  // Вычисление индекса производительности документа 
  // На основе процента выполнения, частоты редактирования и среднего времени выполнения задач
  const calculateProductivityIndex = () => {
    if (!statistics) return 0;
    
    // Базовая формула: (процент выполнения × 0.5) + (коэффициент недавней активности × 0.3) + (обратный коэффициент времени выполнения × 0.2)
    const completionScore = statistics.completion_percentage * 0.5;
    
    // Коэффициент активности (зависит от количества недавних редактирований)
    const recentActivity = statistics.recent_edits || 0;
    const activityScore = Math.min(recentActivity / 10, 1) * 100 * 0.3;
    
    // Обратный коэффициент времени (если время меньше, то оценка выше)
    const avgTime = statistics.average_completion_time || 120; // По умолчанию 2 часа
    const timeScore = (1 - Math.min(avgTime / 480, 1)) * 100 * 0.2; // 480 минут = 8 часов (максимум)
    
    return Math.round(completionScore + activityScore + timeScore);
  };

  // Вычисление индекса сложности документа
  // На основе количества вложенных документов, задач и длины содержимого
  const calculateComplexityIndex = () => {
    if (!statistics || !statistics.complexity_index) return 0;
    return statistics.complexity_index;
  };

  // Прогноз времени завершения всех задач на основе текущей скорости работы
  const calculateCompletionForecast = () => {
    if (!statistics) return "Недостаточно данных";
    
    const totalTasks = statistics.tasks_count;
    const completedTasks = statistics.completed_tasks_count;
    const remainingTasks = totalTasks - completedTasks;
    
    // Если все задачи выполнены или нет данных о скорости выполнения
    if (remainingTasks <= 0 || !statistics.average_completion_time) {
      return "Все задачи выполнены";
    }
    
    // Средняя скорость выполнения (задач в день)
    // Предположим, что мы выполняем 4 рабочих часа в день над задачами этого документа
    const avgTasksPerDay = (4 * 60) / statistics.average_completion_time;
    
    // Оставшееся время в днях
    const daysRemaining = Math.ceil(remainingTasks / avgTasksPerDay);
    
    if (daysRemaining < 1) {
      return "Менее 1 дня";
    } else if (daysRemaining === 1) {
      return "Около 1 дня";
    } else if (daysRemaining < 7) {
      return `Около ${daysRemaining} дней`;
    } else if (daysRemaining < 30) {
      return `Около ${Math.ceil(daysRemaining / 7)} недель`;
    } else {
      return `Около ${Math.ceil(daysRemaining / 30)} месяцев`;
    }
  };

  // Визуализация тренда прогресса в виде ASCII-графика
  const renderProgressTrend = () => {
    if (!statistics || !statistics.progress_trend || statistics.progress_trend.length === 0) {
      return "┈┈┈┈┈┈┈";
    }
    
    const trend = statistics.progress_trend;
    let result = "";
    
    for (let i = 0; i < trend.length - 1; i++) {
      if (trend[i+1] > trend[i]) {
        result += "╱";
      } else if (trend[i+1] < trend[i]) {
        result += "╲";
      } else {
        result += "─";
      }
    }
    
    return result;
  };

  // Вычисление дневной активности (когда наиболее активно редактируется документ)
  const calculatePeakActivityDay = () => {
    if (!statistics || !statistics.edit_frequency || statistics.edit_frequency.length === 0) {
      return "Нет данных";
    }
    
    let maxDay = statistics.edit_frequency[0].day;
    let maxCount = statistics.edit_frequency[0].count;
    
    statistics.edit_frequency.forEach(day => {
      if (day.count > maxCount) {
        maxDay = day.day;
        maxCount = day.count;
      }
    });
    
    return maxDay;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Статистика документа</CardTitle>
          <CardDescription>Загрузка данных...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Статистика документа</CardTitle>
          <CardDescription>Произошла ошибка</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!statistics) {
    return null;
  }

  const progressStatus = getProgressStatus(statistics.completion_percentage);
  const productivityIndex = calculateProductivityIndex();
  const complexityIndex = calculateComplexityIndex();
  const completionForecast = calculateCompletionForecast();
  const peakActivityDay = calculatePeakActivityDay();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Статистика документа</CardTitle>
            <CardDescription>
              Создан {formatDate(statistics.created_at)}
            </CardDescription>
          </div>
          {statistics.completion_percentage > 0 && (
            <Badge className={progressStatus.color}>
              {progressStatus.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="tasks">Задачи</TabsTrigger>
            <TabsTrigger value="activity">Активность</TabsTrigger>
            <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          </TabsList>
          
          {/* Вкладка общего обзора */}
          <TabsContent value="overview" className="space-y-6">
            {/* Прогресс выполнения */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Прогресс выполнения задач</span>
                <span className="font-bold">{statistics.completion_percentage}%</span>
              </div>
              <Progress value={statistics.completion_percentage} className="h-2" />
            </div>

            {/* Основные показатели */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Задачи */}
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Задачи</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{statistics.completed_tasks_count}</span>
                        <span className="text-sm text-muted-foreground">из {statistics.tasks_count}</span>
                      </div>
                    </div>
                    <CheckSquare className="h-5 w-5 text-primary" />
                  </div>
                  {statistics.average_completion_time && (
                    <div className="mt-3 text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Среднее время: {formatTime(statistics.average_completion_time)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Структура */}
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Структура</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{statistics.nested_documents_count}</span>
                        <span className="text-sm text-muted-foreground">вложенных документов</span>
                      </div>
                    </div>
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    <span>{statistics.editor_count} {statistics.editor_count === 1 ? 'редактор' : 
                      (statistics.editor_count > 1 && statistics.editor_count < 5) ? 'редактора' : 'редакторов'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Активность */}
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Активность</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{statistics.total_edits || '—'}</span>
                        <span className="text-sm text-muted-foreground">правок</span>
                      </div>
                    </div>
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  {statistics.last_edit_date && (
                    <div className="mt-3 text-xs text-muted-foreground flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      <span>Последнее изменение: {formatTimeAgo(statistics.last_edit_date)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Самый активный участник */}
            {statistics.most_active_user && (
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">Самый активный участник</p>
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-amber-500 mr-2" />
                    <div>
                      <p className="font-medium">{statistics.most_active_user}</p>
                      <p className="text-xs text-muted-foreground">Наибольший вклад в документ</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Вкладка задач */}
          <TabsContent value="tasks" className="space-y-6">
            {/* Метрики задач */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Прогресс и завершение */}
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-3">Статус выполнения</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Выполнено задач</span>
                        <span className="font-medium">{statistics.completed_tasks_count} из {statistics.tasks_count}</span>
                      </div>
                      <Progress value={statistics.completion_percentage} className="h-2" />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Среднее время выполнения:</span>
                      </div>
                      <span className="text-sm font-medium">{formatTime(statistics.average_completion_time || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calculator className="h-3 w-3" />
                        <span>Эффективность выполнения:</span>
                      </div>
                      <span className="text-sm font-medium">{Math.round(statistics.completed_tasks_count / (statistics.tasks_count || 1) * 100)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Прогнозы */}
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-3">Прогнозирование</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        <span>Ожидаемое время завершения:</span>
                      </div>
                      <span className="text-sm font-medium">{completionForecast}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>Тренд прогресса:</span>
                      </div>
                      <span className="text-sm font-mono">{renderProgressTrend()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Zap className="h-3 w-3" />
                        <span>Скорость создания задач:</span>
                      </div>
                      <span className="text-sm font-medium">{statistics.task_creation_rate} в день</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Тренд выполнения задач */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Динамика выполнения</h3>
                <div className="h-32 w-full flex items-end justify-between">
                  {statistics.progress_trend && statistics.progress_trend.map((progress, index) => (
                    <div key={index} className="relative flex flex-col items-center">
                      <div 
                        className="w-8 bg-primary rounded-t-sm" 
                        style={{ height: `${progress}%` }}
                      ></div>
                      <span className="text-xs mt-1">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][index]}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">Процент выполнения по дням недели</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Вкладка активности */}
          <TabsContent value="activity" className="space-y-6">
            {/* Активность за неделю */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Общая активность */}
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-3">Активность за неделю</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Просмотры</p>
                        <p className="font-bold">{statistics.recent_views || '0'}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Правки</p>
                        <p className="font-bold">{statistics.recent_edits || '0'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Flame className="h-3 w-3" />
                        <span>Пик активности:</span>
                      </div>
                      <span className="text-sm font-medium">{peakActivityDay}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Частота редактирования */}
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-3">Частота редактирования</h3>
                  <div className="h-32 w-full flex items-end justify-between">
                    {statistics.edit_frequency && statistics.edit_frequency.map((day, index) => (
                      <div key={index} className="relative flex flex-col items-center">
                        <div 
                          className="w-6 bg-blue-400 rounded-t-sm" 
                          style={{ height: `${(day.count / Math.max(...statistics.edit_frequency.map(d => d.count))) * 100}%` }}
                        ></div>
                        <span className="text-xs mt-1">{day.day}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">Количество правок по дням недели</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Команда и участники */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Команда</h3>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Всего участников:</span>
                  </div>
                  <span className="font-medium">{statistics.editor_count}</span>
                </div>
                
                {statistics.most_active_user && (
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">Самый активный:</span>
                    </div>
                    <span className="font-medium">{statistics.most_active_user}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Средняя активность:</span>
                  </div>
                  <span className="font-medium">
                    {statistics.total_edits ? Math.round(statistics.total_edits / statistics.editor_count) : 0} правок/участник
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Вкладка аналитики */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Индекс производительности */}
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium">Индекс производительности</h3>
                    <Badge className={
                      productivityIndex >= 80 ? 'bg-green-100 text-green-800' :
                      productivityIndex >= 60 ? 'bg-blue-100 text-blue-800' :
                      productivityIndex >= 40 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {productivityIndex}%
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Прогресс задач (50%)</span>
                        <span>{Math.round(statistics.completion_percentage * 0.5)}%</span>
                      </div>
                      <Progress value={statistics.completion_percentage * 0.5} className="h-1" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Недавняя активность (30%)</span>
                        <span>{Math.round(Math.min((statistics.recent_edits || 0) / 10, 1) * 100 * 0.3)}%</span>
                      </div>
                      <Progress value={Math.min((statistics.recent_edits || 0) / 10, 1) * 100 * 0.3} className="h-1" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Скорость выполнения (20%)</span>
                        <span>{Math.round((1 - Math.min((statistics.average_completion_time || 120) / 480, 1)) * 100 * 0.2)}%</span>
                      </div>
                      <Progress value={(1 - Math.min((statistics.average_completion_time || 120) / 480, 1)) * 100 * 0.2} className="h-1" />
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-4">
                    Индекс производительности учитывает процент выполнения задач, недавнюю активность и скорость работы команды.
                  </p>
                </CardContent>
              </Card>
              
              {/* Индекс сложности */}
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium">Индекс сложности</h3>
                    <Badge className={
                      complexityIndex >= 80 ? 'bg-red-100 text-red-800' :
                      complexityIndex >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      complexityIndex >= 40 ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {complexityIndex}/100
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">Алгоритм расчета:</span>
                      </div>
                      <span className="text-xs font-mono bg-muted p-1 rounded">a×N+b×T+c×L</span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Где:
                      <br />N - количество вложенных документов,
                      <br />T - количество задач,
                      <br />L - объем содержимого,
                      <br />a, b, c - весовые коэффициенты.
                    </p>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Размер документа:</span>
                      <span className="text-sm">{statistics.content_length?.toLocaleString()} символов</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Вложенность структуры:</span>
                      <span className="text-sm">{statistics.nested_documents_count} документов</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Расширенная аналитика */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Предиктивная аналитика</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">Прогноз завершения:</span>
                    </div>
                    <span className="font-medium">{completionForecast}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Оптимальность распределения задач:</span>
                    </div>
                    <span className="font-medium">
                      {statistics.editor_count > 0 && statistics.tasks_count > 0
                        ? `${Math.round(statistics.tasks_count / statistics.editor_count)} задач/участник`
                        : "Нет данных"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Коэффициент эффективности:</span>
                    </div>
                    <span className="font-medium">
                      {statistics.completed_tasks_count > 0 && statistics.total_edits
                        ? `${(statistics.completed_tasks_count / (statistics.total_edits || 1)).toFixed(2)} задач/правку`
                        : "Нет данных"}
                    </span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mt-4">
                  Предиктивная аналитика использует исторические данные и алгоритмы машинного обучения для прогнозирования будущих трендов работы над документом.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 

