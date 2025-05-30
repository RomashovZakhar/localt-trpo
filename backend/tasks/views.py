from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Task, TaskComment
from .serializers import TaskSerializer, TaskCommentSerializer

class TaskViewSet(viewsets.ModelViewSet):
    """
    API endpoint для работы с задачами
    """
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    
    def get_queryset(self):
        """
        Возвращает задачи, доступные текущему пользователю:
        - Задачи в документах, которыми владеет пользователь
        - Задачи в документах, к которым у пользователя есть доступ
        - Задачи, назначенные на пользователя
        """
        user = self.request.user
        
        # Задачи в документах, которыми владеет пользователь
        own_tasks = Q(document__owner=user)
        
        # Задачи в документах, к которым у пользователя есть доступ
        access_tasks = Q(document__access_rights__user=user)
        
        # Задачи, назначенные на пользователя
        assigned_tasks = Q(assigned_to=user)
        
        # Объединяем и исключаем дубликаты
        return Task.objects.filter(own_tasks | access_tasks | assigned_tasks).distinct()
    
    def perform_create(self, serializer):
        """
        Устанавливаем текущего пользователя как создателя при создании задачи
        """
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """
        Изменение статуса задачи
        """
        task = self.get_object()
        status_value = request.data.get('status')
        
        if status_value not in dict(Task.STATUS_CHOICES):
            return Response(
                {"detail": "Недопустимый статус"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        task.status = status_value
        if status_value == Task.DONE:
            from django.utils import timezone
            task.completed_at = timezone.now()
        task.save()
        
        serializer = self.get_serializer(task)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """
        Добавление комментария к задаче
        """
        task = self.get_object()
        
        # Создаем сериализатор для данных запроса
        serializer = TaskCommentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(task=task, user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """
        Получение комментариев к задаче
        """
        task = self.get_object()
        comments = TaskComment.objects.filter(task=task).order_by('-created_at')
        
        page = self.paginate_queryset(comments)
        if page is not None:
            serializer = TaskCommentSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = TaskCommentSerializer(comments, many=True)
        return Response(serializer.data)
