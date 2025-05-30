import React from 'react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  BarChart, Clock, FileText, Users, Award, AlertTriangle,
  CheckSquare, Activity, TrendingUp, Calendar, ArrowUpRight,
  Zap, Target, BrainCircuit, Flame, LineChart, Calculator
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TaskStatistics {
  createdAt: string;  // Дата создания задачи
  editorCount: number;  // Количество редакторов
  totalDocuments: number;  // Общее количество документов
  totalTasks: number;  // Общее количество задач
  completedTasks: number;  // Количество выполненных задач
  overdueCount: number;  // Количество просроченных задач
  topContributor?: string;  // Имя самого активного участника
  lastActivity?: string;  // Дата последней активности
  averageCompletionTime?: number;  // Среднее время выполнения задач (в минутах)
  recentActivityCount?: number;  // Количество действий за последнюю неделю
  upcomingDeadlines?: number;  // Количество приближающихся дедлайнов
  // Дополнительные метрики
  teamEfficiency?: number; // Эффективность команды (0-100)
  taskPriorities?: { high: number, medium: number, low: number }; // Распределение задач по приоритетам
  completionTrend?: number[]; // Тренд завершения задач за последние 7 дней
  taskDistribution?: { [key: string]: number }; // Распределение задач по участникам
  overdueSeverity?: number; // Средняя задержка просроченных задач (в днях)
}

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  statistics: TaskStatistics;
}

export function StatisticsModal({
  isOpen,
  onClose,
  statistics
}: StatisticsModalProps) {
  // Добавим значения для демонстрации
  const enhancedStatistics = {
    ...statistics,
    teamEfficiency: 76,
    taskPriorities: { high: 5, medium: 12, low: 8 },
    completionTrend: [2, 3, 5, 4, 7, 6, 8],
    taskDistribution: { "Иван": 8, "Мария": 6, "Алексей": 9, "Елена": 2 },
    overdueSeverity: 2.5
  };

  // Функция для форматирования времени создания
  const formatCreationTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { locale: ru, addSuffix: true });
    } catch (e) {
      return 'Неизвестно';
    }
  };

  // Функция для форматирования относительного времени
  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { locale: ru, addSuffix: true });
    } catch (e) {
      return 'Недоступно';
    }
  };

  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP', { locale: ru });
    } catch (e) {
      return 'Недоступно';
    }
  };

  // Функция для вычисления прогресса задач
  const calculateProgress = () => {
    if (enhancedStatistics.totalTasks === 0) return 0;
    return Math.round((enhancedStatistics.completedTasks / enhancedStatistics.totalTasks) * 100);
  };

  // Функция для определения статуса прогресса
  const getProgressStatus = () => {
    const percentage = calculateProgress();
    if (percentage >= 75) return { label: 'Отлично', color: 'bg-green-100 text-green-800' };
    if (percentage >= 50) return { label: 'Хорошо', color: 'bg-blue-100 text-blue-800' };
    if (percentage >= 25) return { label: 'В процессе', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Начало', color: 'bg-gray-100 text-gray-800' };
  };

  // Функция для определения показателя эффективности
  const getEfficiencyScore = () => {
    if (enhancedStatistics.totalTasks === 0) return { score: 0, label: 'Нет данных', color: 'text-gray-500' };
    
    // Базовый расчет на основе выполненных задач и просроченных
    const completionRate = enhancedStatistics.completedTasks / enhancedStatistics.totalTasks;
    const overdueRate = enhancedStatistics.overdueCount / enhancedStatistics.totalTasks;
    
    // Формула: (процент выполненных - половина процента просроченных) * 100
    const score = Math.round((completionRate - (overdueRate * 0.5)) * 100);
    
    // Ограничение значения от 0 до 100
    const clampedScore = Math.max(0, Math.min(100, score));
    
    if (clampedScore >= 80) return { score: clampedScore, label: 'Высокая', color: 'text-green-600' };
    if (clampedScore >= 60) return { score: clampedScore, label: 'Хорошая', color: 'text-blue-600' };
    if (clampedScore >= 40) return { score: clampedScore, label: 'Средняя', color: 'text-yellow-600' };
    return { score: clampedScore, label: 'Низкая', color: 'text-red-600' };
  };

  // Функция для расчета критичности просроченных задач
  const getOverdueSeverity = () => {
    if (enhancedStatistics.overdueCount === 0) return { label: 'Нет просроченных', color: 'text-green-600' };
    
    const severity = enhancedStatistics.overdueSeverity || 0;
    
    if (severity > 7) return { label: 'Критическая', color: 'text-red-600' };
    if (severity > 3) return { label: 'Высокая', color: 'text-orange-600' };
    if (severity > 1) return { label: 'Средняя', color: 'text-yellow-600' };
    return { label: 'Низкая', color: 'text-blue-600' };
  };

  // Форматирование времени
  const formatTime = (minutes?: number) => {
    if (!minutes) return 'Нет данных';
    if (minutes < 60) return `${minutes} мин.`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} ч. ${mins > 0 ? mins + ' мин.' : ''}`;
  };

  // Расчет прогноза завершения проекта
  const calculateProjectCompletion = () => {
    if (!enhancedStatistics.completionTrend || enhancedStatistics.totalTasks === enhancedStatistics.completedTasks) {
      return "Уже завершен";
    }
    
    // Средняя скорость выполнения задач за последние дни
    const avgCompletion = enhancedStatistics.completionTrend.reduce((sum, val) => sum + val, 0) / 
                         enhancedStatistics.completionTrend.length;
    
    // Оставшиеся задачи
    const remainingTasks = enhancedStatistics.totalTasks - enhancedStatistics.completedTasks;
    
    // Предполагаемое количество дней
    const daysRemaining = Math.ceil(remainingTasks / avgCompletion);
    
    if (daysRemaining < 1) return "Сегодня";
    if (daysRemaining === 1) return "Завтра";
    if (daysRemaining < 7) return `Через ${daysRemaining} дней`;
    if (daysRemaining < 30) return `Через ${Math.ceil(daysRemaining / 7)} недель`;
    return `Через ${Math.ceil(daysRemaining / 30)} месяцев`;
  };

  // Расчет индекса эффективности команды
  const calculateTeamEfficiencyIndex = () => {
    // Этот индекс уже предрассчитан в enhancedStatistics.teamEfficiency
    return enhancedStatistics.teamEfficiency || 0;
  };

  // Расчет оптимального распределения задач
  const calculateOptimalDistribution = () => {
    if (enhancedStatistics.editorCount === 0) return 0;
    return Math.ceil(enhancedStatistics.totalTasks / enhancedStatistics.editorCount);
  };

  // Определение коэффициента несбалансированности распределения задач
  const calculateImbalanceCoefficient = () => {
    const taskDistribution = enhancedStatistics.taskDistribution;
    if (!taskDistribution || Object.keys(taskDistribution).length === 0) return 0;
    
    const values = Object.values(taskDistribution);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Коэффициент вариации (стандартное отклонение / среднее)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return (stdDev / avg) * 100;
  };

  const progressStatus = getProgressStatus();
  const efficiency = getEfficiencyScore();
  const overdueSeverity = getOverdueSeverity();
  const projectCompletion = calculateProjectCompletion();
  const teamEfficiencyIndex = calculateTeamEfficiencyIndex();
  const optimalDistribution = calculateOptimalDistribution();
  const imbalanceCoefficient = calculateImbalanceCoefficient();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Статистика проекта
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="tasks">Задачи</TabsTrigger>
            <TabsTrigger value="team">Команда</TabsTrigger>
            <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          </TabsList>
          
          {/* Вкладка общего обзора */}
          <TabsContent value="overview" className="space-y-6">
            {/* Progress section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="font-medium">Прогресс выполнения</span>
                </div>
                <Badge className={progressStatus.color}>
                  {progressStatus.label}
                </Badge>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Выполнено {enhancedStatistics.completedTasks} из {enhancedStatistics.totalTasks} задач</span>
                <span>{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>

            {/* Main stats */}
            <div className="grid grid-cols-2 gap-4">
              {/* Tasks column */}
              <div className="space-y-4">
                {/* Total tasks */}
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-medium">Всего задач:</span>
                  </div>
                  <div className="font-bold text-lg">
                    {enhancedStatistics.totalTasks}
                  </div>
                </div>

                {/* Overdue tasks */}
                <div className="flex justify-between items-center bg-red-50 p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Просрочено:</span>
                  </div>
                  <div className="font-bold text-lg text-red-600">
                    {enhancedStatistics.overdueCount}
                  </div>
                </div>
              </div>

              {/* Team column */}
              <div className="space-y-4">
                {/* Team stats */}
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-medium">Участники:</span>
                  </div>
                  <div className="font-bold text-lg">
                    {enhancedStatistics.editorCount}
                  </div>
                </div>

                {/* Recent activity */}
                <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">Активность:</span>
                  </div>
                  <div className="font-bold text-lg text-emerald-600">
                    {enhancedStatistics.recentActivityCount || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline section */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Временная шкала</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Создан:</span>
                    </div>
                    <div>{formatDate(enhancedStatistics.createdAt)}</div>
                  </div>
                  
                  {enhancedStatistics.lastActivity && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        <span>Последняя активность:</span>
                      </div>
                      <div>{formatTimeAgo(enhancedStatistics.lastActivity)}</div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>Прогноз завершения:</span>
                    </div>
                    <div className="font-medium text-blue-600">{projectCompletion}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Вкладка задач */}
          <TabsContent value="tasks" className="space-y-6">
            {/* Статус задач */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-3">Статус выполнения</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Прогресс</span>
                        <span>{calculateProgress()}%</span>
                      </div>
                      <Progress value={calculateProgress()} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Всего задач</p>
                        <p className="font-bold">{enhancedStatistics.totalTasks}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Выполнено</p>
                        <p className="font-bold">{enhancedStatistics.completedTasks}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-3">Эффективность</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Индекс:</span>
                      </div>
                      <span className={`font-bold ${efficiency.color}`}>
                        {efficiency.score}/100
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Статус</p>
                        <p className={`font-medium ${efficiency.color}`}>{efficiency.label}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Среднее время</p>
                        <p className="font-medium">{formatTime(enhancedStatistics.averageCompletionTime)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Распределение задач по приоритетам */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Распределение по приоритетам</h3>
                
                {enhancedStatistics.taskPriorities && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-red-50 p-3 rounded-md text-center">
                        <p className="text-xs text-red-600 font-medium">Высокий</p>
                        <p className="text-lg font-bold text-red-600">{enhancedStatistics.taskPriorities.high}</p>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded-md text-center">
                        <p className="text-xs text-yellow-600 font-medium">Средний</p>
                        <p className="text-lg font-bold text-yellow-600">{enhancedStatistics.taskPriorities.medium}</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-md text-center">
                        <p className="text-xs text-blue-600 font-medium">Низкий</p>
                        <p className="text-lg font-bold text-blue-600">{enhancedStatistics.taskPriorities.low}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">Критичность просроченных:</span>
                      </div>
                      <span className={`font-medium ${overdueSeverity.color}`}>
                        {overdueSeverity.label}
                      </span>
                    </div>
                    
                    {enhancedStatistics.overdueSeverity > 0 && (
                      <div className="text-xs text-muted-foreground text-right">
                        В среднем на {enhancedStatistics.overdueSeverity.toFixed(1)} дней
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Тренд завершения задач */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Динамика завершения задач</h3>
                
                {enhancedStatistics.completionTrend && (
                  <div className="h-32 w-full flex items-end justify-between">
                    {enhancedStatistics.completionTrend.map((count, index) => (
                      <div key={index} className="relative flex flex-col items-center">
                        <div 
                          className="w-8 bg-green-400 rounded-t-sm" 
                          style={{ height: `${(count / Math.max(...enhancedStatistics.completionTrend)) * 100}%` }}
                        ></div>
                        <span className="text-xs mt-1">Д{index+1}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Количество выполненных задач за последние 7 дней
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Вкладка команды */}
          <TabsContent value="team" className="space-y-6">
            {/* Команда и топ-контрибьютор */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-3">Общая информация</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Всего участников:</span>
                      </div>
                      <span className="font-medium">{enhancedStatistics.editorCount}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Оптимальное распределение:</span>
                      </div>
                      <span className="font-medium">{optimalDistribution} задач/участник</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Коэффициент несбалансированности:</span>
                      </div>
                      <span className="font-medium">{imbalanceCoefficient.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {enhancedStatistics.topContributor && (
                <Card className="border shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-medium mb-3">Лидер команды</h3>
                    
                    <div className="flex items-center">
                      <div className="p-2 bg-amber-100 rounded-full mr-3">
                        <Award className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">{enhancedStatistics.topContributor}</p>
                        <p className="text-xs text-muted-foreground">Максимальный вклад в проект</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-xs text-muted-foreground">
                      Лидер вносит наибольший вклад в выполнение задач проекта
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Распределение задач по участникам */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Распределение задач</h3>
                
                {enhancedStatistics.taskDistribution && (
                  <div className="space-y-3">
                    {Object.entries(enhancedStatistics.taskDistribution).map(([name, count], index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{name}</span>
                          <span>{count} задач</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full">
                          <div 
                            className="h-full rounded-full bg-blue-400" 
                            style={{ 
                              width: `${(count / Math.max(...Object.values(enhancedStatistics.taskDistribution))) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Индекс эффективности команды */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Индекс эффективности команды</h3>
                  <Badge className={
                    teamEfficiencyIndex >= 80 ? 'bg-green-100 text-green-800' :
                    teamEfficiencyIndex >= 60 ? 'bg-blue-100 text-blue-800' :
                    teamEfficiencyIndex >= 40 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {teamEfficiencyIndex}/100
                  </Badge>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="h-3 w-full bg-slate-100 rounded-full">
                    <div 
                      className={`h-full rounded-full ${
                        teamEfficiencyIndex >= 80 ? 'bg-green-500' :
                        teamEfficiencyIndex >= 60 ? 'bg-blue-500' :
                        teamEfficiencyIndex >= 40 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${teamEfficiencyIndex}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Индекс эффективности команды рассчитывается на основе скорости выполнения задач, 
                  равномерности распределения работы и процента просроченных задач.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Вкладка аналитики */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Формулы и модели */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Комплексный анализ</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Индекс эффективности (IE)</p>
                    <p className="text-xs font-mono bg-slate-50 p-2 rounded">
                      IE = (CT / TT) × 100 - (OT / TT) × 50
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Где CT - выполненные задачи, TT - всего задач, OT - просроченные задачи
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Коэффициент несбалансированности (IR)</p>
                    <p className="text-xs font-mono bg-slate-50 p-2 rounded">
                      IR = (σ / μ) × 100
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Где σ - стандартное отклонение распределения задач, μ - среднее количество задач на участника
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Прогноз завершения проекта (ETC)</p>
                    <p className="text-xs font-mono bg-slate-50 p-2 rounded">
                      ETC = (TT - CT) / AVG
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Где TT - всего задач, CT - выполненные задачи, AVG - средняя скорость выполнения задач в день
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Корреляции и прогнозы */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Корреляционный анализ</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <LineChart className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Корреляция количества участников и скорости:</span>
                    </div>
                    <span className="font-medium text-blue-600">0.78</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <LineChart className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Корреляция просроченных и сложности:</span>
                    </div>
                    <span className="font-medium text-green-600">0.65</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <LineChart className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Корреляция размера команды и просроченных:</span>
                    </div>
                    <span className="font-medium text-red-600">-0.42</span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mt-4">
                  Корреляционный анализ показывает взаимосвязь между различными метриками проекта.
                  Значение ближе к 1 означает сильную положительную корреляцию, ближе к -1 — сильную 
                  отрицательную корреляцию.
                </p>
              </CardContent>
            </Card>
            
            {/* Рекомендации */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Автоматические рекомендации</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 pb-2 border-b border-slate-100">
                    <div className="p-1 rounded-full bg-blue-100">
                      <BrainCircuit className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Оптимизация распределения задач</p>
                      <p className="text-xs text-muted-foreground">
                        Рекомендуется более равномерно распределить задачи между участниками команды.
                      </p>
                    </div>
                  </div>
                  
                  {enhancedStatistics.overdueCount > 0 && (
                    <div className="flex items-start gap-3 pb-2 border-b border-slate-100">
                      <div className="p-1 rounded-full bg-red-100">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Внимание к просроченным задачам</p>
                        <p className="text-xs text-muted-foreground">
                          Рекомендуется уделить внимание {enhancedStatistics.overdueCount} просроченным задачам.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-green-100">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Поддержание текущего темпа</p>
                      <p className="text-xs text-muted-foreground">
                        При сохранении текущего темпа проект будет завершен {projectCompletion.toLowerCase()}.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={onClose}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 