from django.contrib import admin
from .models import Document, AccessRight, DocumentHistory
from mptt.admin import MPTTModelAdmin, DraggableMPTTAdmin
import json
from django.utils.html import format_html

class AccessRightInline(admin.TabularInline):
    model = AccessRight
    extra = 1

class DocumentHistoryInline(admin.TabularInline):
    model = DocumentHistory
    extra = 0
    readonly_fields = ['user', 'changes', 'created_at']
    max_num = 5
    
class DocumentAdmin(DraggableMPTTAdmin):
    list_display = ['tree_actions', 'indented_title', 'id', 'owner', 'created_at', 'updated_at', 'is_favorite', 'is_root']
    list_display_links = ['indented_title']  # Делаем indented_title кликабельным для перехода к редактированию
    list_filter = ['is_favorite', 'is_root', 'created_at', 'updated_at']
    search_fields = ['title', 'owner__username', 'owner__email']
    raw_id_fields = ['owner', 'parent']
    date_hierarchy = 'created_at'
    inlines = [AccessRightInline, DocumentHistoryInline]
    readonly_fields = ['raw_content', 'debug_info']  # Добавляем простые поля для отображения
    
    # Дополнительные свойства для DraggableMPTTAdmin
    mptt_indent_field = "title"
    
    def indented_title(self, instance):
        """Возвращает заголовок с отступом для отображения в админке"""
        return instance.title
    indented_title.short_description = 'Title'
    
    def debug_info(self, instance):
        """Базовая отладочная информация о поле content"""
        try:
            content_data = instance.content
            debug_text = []
            
            # Тип данных
            debug_text.append(f"Тип данных: {type(content_data).__name__}")
            
            # Проверка на пустоту
            is_empty = False
            if content_data is None:
                is_empty = True
                debug_text.append("Значение: None")
            elif isinstance(content_data, dict) and not content_data:
                is_empty = True
                debug_text.append("Значение: пустой словарь {}")
            
            # Информация о размере и структуре
            if not is_empty and isinstance(content_data, dict):
                debug_text.append(f"Ключи в словаре: {', '.join(content_data.keys())}")
                if 'blocks' in content_data:
                    blocks = content_data.get('blocks', [])
                    debug_text.append(f"Количество блоков: {len(blocks)}")
                    if blocks:
                        # Показываем информацию о первых 3 блоках
                        for i, block in enumerate(blocks[:3]):
                            if i >= 3:
                                break
                            block_type = block.get('type', 'неизвестный')
                            debug_text.append(f"  - Блок #{i+1}: {block_type}")
            
            return "\n".join(debug_text)
        except Exception as e:
            return f"Ошибка при отладке: {e}"
    
    debug_info.short_description = 'Отладочная информация'
    
    def raw_content(self, instance):
        """Отображение сырого содержимого документа для диагностики"""
        try:
            return str(instance.content)
        except Exception as e:
            return f"Ошибка при отображении содержимого: {e}"
    
    raw_content.short_description = 'Необработанное содержимое'
    
    # Изменяем набор полей для отображения в админке
    fieldsets = (
        (None, {
            'fields': ('title', 'owner', 'parent', 'is_favorite', 'is_root')
        }),
        ('Диагностика содержимого', {
            'fields': ('debug_info', 'raw_content'),
            'classes': ('collapse',),
        }),
    )
    
    # Исключаем исходное поле content из формы
    exclude = ('content',)

class AccessRightAdmin(admin.ModelAdmin):
    list_display = ['id', 'document', 'user', 'role', 'include_children', 'created_at']
    list_filter = ['role', 'include_children', 'created_at']
    search_fields = ['document__title', 'user__username', 'user__email']
    raw_id_fields = ['document', 'user']

class DocumentHistoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'document', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['document__title', 'user__username', 'user__email']
    raw_id_fields = ['document', 'user']

# Регистрируем модели для админки
admin.site.register(Document, DocumentAdmin)
admin.site.register(AccessRight, AccessRightAdmin)
admin.site.register(DocumentHistory, DocumentHistoryAdmin)
