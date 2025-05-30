"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, ClockIcon, UserIcon, Edit, Eye, Share, Trash, Settings } from "lucide-react";
import api from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader } from "@/components/ui/loader";

interface DocumentHistoryEntry {
  id: string;
  document: string;
  document_title: string;
  user_details: {
    id: string;
    username: string;
    email: string;
  };
  changes: any;
  action_type: string;
  action_label: string;
  created_at: string;
}

interface DocumentHistorySidebarProps {
  documentId: string;
  onClose: () => void;
}

export function DocumentHistorySidebar({ documentId, onClose }: DocumentHistorySidebarProps) {
  const [history, setHistory] = useState<DocumentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/documents/${documentId}/history/`);
        setHistory(response.data);
      } catch (err) {
        console.error("Ошибка при загрузке истории:", err);
        setError("Не удалось загрузить историю изменений");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [documentId]);

  // Функция для отображения иконки действия
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "edit":
        return <Edit className="h-4 w-4" />;
      case "create":
        return <Edit className="h-4 w-4" />;
      case "nested_create":
        return <Edit className="h-4 w-4" />;
      case "view":
        return <Eye className="h-4 w-4" />;
      case "share":
        return <Share className="h-4 w-4" />;
      case "revoke":
        return <Trash className="h-4 w-4" />;
      case "title_change":
        return <Settings className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  // Функция для получения даты в формате "X времени назад"
  const getRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ru
      });
    } catch (e) {
      return "неизвестно когда";
    }
  };

  // Функция для отображения подробностей действия
  const getActionDetails = (entry: DocumentHistoryEntry) => {
    const { action_type, changes, user_details } = entry;
    
    switch (action_type) {
      case "edit":
        return `${user_details.username} отредактировал документ`;
      case "create":
        return `${user_details.username} создал документ`;
      case "nested_create":
        if (changes && changes.nested_document_title) {
          return `${user_details.username} создал вложенный документ "${changes.nested_document_title}"`;
        }
        return `${user_details.username} создал вложенный документ`;
      case "view":
        return `${user_details.username} просмотрел документ`;
      case "share":
        if (changes && changes.username) {
          const role = changes.role === "editor" ? "редактором" : "наблюдателем";
          return `${user_details.username} предоставил доступ пользователю ${changes.username} с ролью ${role}`;
        }
        return `${user_details.username} предоставил доступ к документу`;
      case "revoke":
        if (changes && changes.username) {
          return `${user_details.username} отозвал доступ у пользователя ${changes.username}`;
        }
        return `${user_details.username} отозвал доступ к документу`;
      case "title_change":
        return `${user_details.username} изменил название документа`;
      default:
        return `${user_details.username} совершил действие с документом`;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-l w-[400px]">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">История изменений</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8">
          <Loader 
            variant="dots" 
            size="md" 
            text="Загрузка истории..." 
          />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8">
          <p className="text-sm text-muted-foreground">История изменений пуста</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {history.map((entry) => (
              <div key={entry.id} className="flex space-x-4 p-3 rounded-md border">
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(entry.action_type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-sm font-medium">{getActionDetails(entry)}</div>
                  <div className="text-xs text-muted-foreground flex items-center space-x-1">
                    <ClockIcon className="h-3 w-3" />
                    <span>{getRelativeTime(entry.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
} 