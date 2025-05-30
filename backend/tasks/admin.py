from django.contrib import admin
from .models import Task, TaskComment

class TaskCommentInline(admin.TabularInline):
    model = TaskComment
    extra = 1

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'document', 'created_by', 'assigned_to', 'due_date', 'completed_at', 'priority']
    list_filter = ['status', 'priority', 'created_at', 'updated_at', 'due_date', 'completed_at']
    search_fields = ['title', 'description', 'document__title']
    inlines = [TaskCommentInline]

@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ['task', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['task__title', 'user__email', 'text']
