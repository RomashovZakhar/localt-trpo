"use client"

import * as React from "react"
import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { AppSidebar } from "@/components/layout"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { DocumentEditor } from "@/components/document-editor"
import api from "@/lib/api"
import { 
  Star,
  Share, 
  MoreHorizontal,
  ChevronRight,
  BarChart3,
  Trash,
  PanelLeft,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ShareDocument } from "@/components/document/share-document"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset
} from "@/components/ui/sidebar"
import { DocumentHistorySidebar } from "@/components/document/document-history-sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DocumentStatistics } from "@/components/document-statistics/document-statistics"
import { Loader } from "@/components/ui/loader"

// Тип для документа
interface Document {
  id: string;
  title: string;
  content: any;
  parent: string | null;
  path?: Array<{ id: string; title: string; icon?: string }>;
  is_favorite?: boolean;
  is_root?: boolean;
  icon?: string;
}

export default function DocumentPage() {
  const params = useParams()
  const id = params.id as string
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState<string>("")
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{id: string, title: string, icon?: string}>>([])
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isNewDocument = useRef(false);
  const initialLoadDone = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);

  useEffect(() => {
    setDocument(null);
    setLoading(true);
    setBreadcrumbs([]);
    setTitle("");
    initialLoadDone.current = false;
    
    const fetchDocument = async () => {
      try {
        const response = await api.get(`/documents/${id}/`);
        const documentData = response.data;
        
        console.log('Загружен документ:', documentData);
        
        setDocument(documentData);
        setTitle(documentData.title || "");
        
        const isNewlyCreated = documentData.created_at && 
          ((new Date().getTime() - new Date(documentData.created_at).getTime()) / 1000 < 5) && 
          (!documentData.content || !documentData.content.blocks || documentData.content.blocks.length === 0);
        
        isNewDocument.current = isNewlyCreated;
        
        let documentPath: Array<{id: string, title: string, icon?: string}> = [];
        
        if (documentData.path && Array.isArray(documentData.path)) {
          documentPath = documentData.path;
        } else if (documentData.parent) {
          try {
            const parentResponse = await api.get(`/documents/${documentData.parent}/`);
            const parentData = parentResponse.data;
            
            documentPath.push({
              id: parentData.id,
              title: parentData.title || "Без названия",
              icon: parentData.icon
            });
          } catch (parentErr) {
            console.warn("Не удалось загрузить родительский документ:", parentErr);
          }
        }
        
        documentPath.push({
          id: documentData.id,
          title: documentData.title || "Без названия",
          icon: documentData.icon
        });
        
        setBreadcrumbs(documentPath);
        
        initialLoadDone.current = true;
      } catch (err) {
        console.error('Ошибка при загрузке документа:', err);
        setError("Не удалось загрузить документ");
        toast.error("Не удалось загрузить документ");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  useEffect(() => {
    if (!loading && isNewDocument.current && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [loading]);

  // Обновляет названия документов в других документах, где он упоминается как ссылка
  const updateDocumentReferences = async (documentId: string, newTitle: string) => {
    try {
      // Проверяем, есть ли родитель у текущего документа
      if (!document?.parent) return;
      
      console.log('Обновление ссылок на документ:', documentId, 'с новым названием:', newTitle);
      
      // Загружаем родительский документ
      const parentResponse = await api.get(`/documents/${document.parent}/`);
      const parentDoc = parentResponse.data;
      
      // Если у родителя нет контента, нечего обновлять
      if (!parentDoc.content || !parentDoc.content.blocks) return;
      
      let updated = false;
      
      // Проходим по блокам родительского документа и ищем ссылки на текущий документ
      if (Array.isArray(parentDoc.content.blocks)) {
        for (let i = 0; i < parentDoc.content.blocks.length; i++) {
          const block = parentDoc.content.blocks[i];
          
          // Проверяем, является ли блок ссылкой на документ и совпадает ли ID
          if (block.type === 'nestedDocument' && 
              block.data && 
              typeof block.data === 'object' && 
              'id' in block.data && 
              block.data.id === documentId) {
            
            console.log('Найдена ссылка для обновления в блоке:', i, 'текущий заголовок:', block.data.title);
            
            // Обновляем заголовок документа в блоке
            block.data.title = newTitle;
            updated = true;
            
            console.log('Заголовок обновлен на:', newTitle);
          }
        }
      }
      
      // Если нашли и обновили ссылки, сохраняем родительский документ
      if (updated) {
        // Создаем копию объекта content, чтобы быть уверенным что все изменения будут учтены
        const updatedContent = JSON.parse(JSON.stringify(parentDoc.content));
        
        const updateResponse = await api.put(`/documents/${document.parent}/`, {
          content: updatedContent,
          title: parentDoc.title,
          parent: parentDoc.parent
        });
        
        if (updateResponse.status === 200) {
          console.log('Обновлены ссылки на документ в родительском документе');
          
          // Принудительно обновляем родительский документ для всех открытых вкладок
          try {
            // Генерируем событие для принудительного обновления редактора в других вкладках
            const refreshEvent = new CustomEvent('document_refresh', {
              detail: { documentId: document.parent }
            });
            window.dispatchEvent(refreshEvent);
            
            // Сохраняем информацию в localStorage для межвкладочного обновления
            localStorage.setItem('document_refresh', JSON.stringify({
              documentId: document.parent,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.error('Ошибка при отправке события обновления:', e);
          }
        } else {
          console.error('Ошибка при обновлении родительского документа, статус:', updateResponse.status);
        }
      } else {
        console.log('Ссылки на документ не найдены в родительском документе');
      }
    } catch (err) {
      console.error('Ошибка при обновлении ссылок на документ:', err);
    }
  };

  // Удаляет ссылки на документ из родительского документа
  const removeDocumentReferences = async (documentId: string) => {
    try {
      // Проверяем, есть ли родитель у текущего документа
      if (!document?.parent) return;
      
      // Загружаем родительский документ
      const parentResponse = await api.get(`/documents/${document.parent}/`);
      const parentDoc = parentResponse.data;
      
      // Если у родителя нет контента, нечего обновлять
      if (!parentDoc.content || !parentDoc.content.blocks) return;
      
      let updated = false;
      let updatedBlocks = [];
      
      // Проходим по блокам родительского документа и исключаем ссылки на удаляемый документ
      if (Array.isArray(parentDoc.content.blocks)) {
        updatedBlocks = parentDoc.content.blocks.filter((block: any) => {
          // Если блок - ссылка на удаляемый документ, его нужно исключить
          if (block.type === 'nestedDocument' && block.data && block.data.id === documentId) {
            updated = true;
            return false; // Исключаем блок из массива
          }
          return true; // Оставляем все остальные блоки
        });
      }
      
      // Если нашли и удалили ссылки, сохраняем родительский документ
      if (updated) {
        // Обновляем блоки в родительском документе
        parentDoc.content.blocks = updatedBlocks;
        
        await api.put(`/documents/${document.parent}/`, {
          content: parentDoc.content,
          title: parentDoc.title,
          parent: parentDoc.parent
        });
        
        console.log('Удалены ссылки на документ из родительского документа');
      }
    } catch (err) {
      console.error('Ошибка при удалении ссылок на документ:', err);
    }
  };

  // Обновление документа
  const handleDocumentChange = (updatedDoc: Document) => {
    // Обновляем документ в состоянии
    setDocument(updatedDoc);
    
    // Если изменился заголовок документа
    if (updatedDoc.title !== title) {
      setTitle(updatedDoc.title);
      
      // Обновляем хлебные крошки
      const updatedBreadcrumbs = breadcrumbs.map(item => 
        item.id === updatedDoc.id 
          ? { ...item, title: updatedDoc.title } 
          : item
      );
      
      setBreadcrumbs(updatedBreadcrumbs);
      
      // Обновляем ссылки на документ в родительском документе НЕМЕДЛЕННО
      // Не ждем дебаунса для критичного обновления
      updateDocumentReferences(updatedDoc.id, updatedDoc.title);
    }
    
    // После начальной загрузки документа сохраняем все изменения на сервере
    if (initialLoadDone.current) {
      // Очищаем предыдущий таймаут, если он был
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Таймаут для дебаунсинга сохранения
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          // Отправляем обновленные данные на сервер
          const saveResponse = await api.put(`/documents/${updatedDoc.id}/`, {
            title: updatedDoc.title,
            content: updatedDoc.content,
            parent: updatedDoc.parent,
            icon: updatedDoc.icon
          });
          
          console.log('Документ успешно сохранен на сервере:', saveResponse.status);
          
          // Дополнительно обновляем ссылки после сохранения, чтобы гарантировать синхронизацию
          if (updatedDoc.title !== title && document?.parent) {
            updateDocumentReferences(updatedDoc.id, updatedDoc.title);
          }
        } catch (saveErr) {
          console.error('Ошибка при сохранении документа:', saveErr);
        }
      }, 1000);
    }
  };

  const toggleFavorite = async () => {
    if (!document) return

    try {
      // Обновляем UI локально
      const newFavoriteState = !document.is_favorite
      setDocument({ ...document, is_favorite: newFavoriteState })

      // Отправляем запрос на сервер
      await api.post(`/documents/${document.id}/toggle_favorite/`, {})

      // Показываем сообщение
      toast(newFavoriteState ? "Добавлено в избранное" : "Удалено из избранного")
      
      // Обновляем список избранных в localStorage для синхронизации с сайдбаром
      const favoriteUpdatedEvent = {
        documentId: document.id,
        title: document.title,
        isFavorite: newFavoriteState,
        timestamp: new Date().getTime()
      }
      localStorage.setItem('favorite_document_updated', JSON.stringify(favoriteUpdatedEvent))
      
      // Вызываем событие storage вручную для текущей вкладки
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'favorite_document_updated',
        newValue: JSON.stringify(favoriteUpdatedEvent)
      }))
    } catch (err) {
      // В случае ошибки восстанавливаем предыдущее состояние
      setDocument({ ...document, is_favorite: document.is_favorite })
      toast.error("Не удалось изменить статус избранного")
    }
  }

  const shareDocument = () => {
    navigator.clipboard.writeText(window.location.href)
    toast("Ссылка скопирована", {
      description: "Теперь вы можете поделиться документом"
    })
  }

  const deleteDocument = async () => {
    if (!document) return;
    
    // Проверяем, является ли документ корневым
    const isRootDocument = document.parent === null && document.is_root === true;
    
    if (isRootDocument) {
      toast.error("Корневой документ нельзя удалить");
      return;
    }
    
    // Запрашиваем подтверждение пользователя
    if (!window.confirm("Вы уверены, что хотите удалить этот документ?")) return;

    try {
      // Сначала удаляем ссылки на документ из родительского документа
      await removeDocumentReferences(document.id);
      
      // Затем удаляем сам документ
      await api.delete(`/documents/${document.id}/`);
      
      // Редирект на родительский документ или корневой документ
      if (document.parent) {
        window.location.href = `/documents/${document.parent}`;
      } else {
        window.location.href = `/documents`;
      }
    } catch (err) {
      toast.error("Не удалось удалить документ");
    }
  };

  // Обработчик изменения заголовка
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!document) return;
    
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    // Обновляем документ с новым заголовком
    if (document) {
      const updatedDoc = { ...document, title: newTitle };
      handleDocumentChange(updatedDoc);
      
      // Оповещаем другие вкладки об изменении заголовка через localStorage
      try {
        const event = {
          id: document.id,
          title: newTitle,
          timestamp: new Date().getTime()
        };
        localStorage.setItem(`document_title_update_${document.id}`, JSON.stringify(event));
        // Триггер событие storage вручную для текущей вкладки
        window.dispatchEvent(new StorageEvent('storage', {
          key: `document_title_update_${document.id}`,
          newValue: JSON.stringify(event)
        }));
      } catch (err) {
        console.error('Ошибка при сохранении обновления заголовка в localStorage:', err);
      }
    }
  };

  // Обработка обновлений иконки из других вкладок
  useEffect(() => {
    const handleIconUpdate = (event: StorageEvent) => {
      if (event.key === `document_icon_update_${id}` && event.newValue && document) {
        try {
          const data = JSON.parse(event.newValue);
          if (data.documentId === id && data.icon) {
            // Обновляем иконку документа в текущем состоянии
            setDocument(prevDoc => {
              if (!prevDoc) return prevDoc;
              return { ...prevDoc, icon: data.icon };
            });
          }
        } catch (err) {
          console.error('Ошибка при обработке обновления иконки:', err);
        }
      }
    };
    
    window.addEventListener('storage', handleIconUpdate);
    return () => {
      window.removeEventListener('storage', handleIconUpdate);
    };
  }, [id, document]);

  // Функция для усечения текста с многоточием
  const truncateText = (text: string, maxLength: number = 25) => {
    if (!text) return "Без названия";
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  // Функция для "умного" отображения хлебных крошек
  const renderSmartBreadcrumbs = (items: Array<{id: string, title: string, icon?: string}>) => {
    if (items.length <= 3) {
      // Если элементов мало, показываем все
      return items.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 && <BreadcrumbSeparator />}
          {renderBreadcrumbItem(item, index === items.length - 1)}
        </React.Fragment>
      ));
    } else {
      // Показываем первый элемент, эллипсис и последние 2 элемента
      const firstItem = items[0];
      const lastItems = items.slice(-2);
      const hiddenItems = items.slice(1, -2);
      
      return (
        <>
          {renderBreadcrumbItem(firstItem, false)}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span title={`Скрытые элементы: ${hiddenItems.map(i => i.title).join(', ')}`}>
              <BreadcrumbEllipsis />
            </span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {lastItems.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <BreadcrumbSeparator />}
              {renderBreadcrumbItem(item, index === lastItems.length - 1)}
            </React.Fragment>
          ))}
        </>
      );
    }
  };
  
  // Функция для рендеринга отдельного элемента хлебных крошек
  const renderBreadcrumbItem = (item: {id: string, title: string, icon?: string}, isCurrentPage: boolean) => {
    const truncatedTitle = truncateText(item.title);
    
    return isCurrentPage ? (
      <BreadcrumbItem>
        <BreadcrumbPage title={item.title}>
          {item.icon && (
            <span className="mr-1">{item.icon}</span>
          )}
          {truncatedTitle}
        </BreadcrumbPage>
      </BreadcrumbItem>
    ) : (
      <BreadcrumbItem>
        <BreadcrumbLink href={`/documents/${item.id}`} title={item.title}>
          {item.icon && (
            <span className="mr-1">{item.icon}</span>
          )}
          {truncatedTitle}
        </BreadcrumbLink>
      </BreadcrumbItem>
    );
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen">
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-col items-center justify-center min-h-screen">
              <Loader 
                variant="spinner"
                size="md"
                text="Загрузка документа..."
              />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    )
  }

  if (error || !document) {
    return (
      <SidebarProvider>
        <div className="flex h-screen">
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-col items-center justify-center min-h-screen">
              <p className="text-lg text-red-500">{error || "Документ не найден"}</p>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <Button variant="ghost" size="icon" asChild>
              <SidebarTrigger>
                <PanelLeft className="h-4 w-4" />
              </SidebarTrigger>
            </Button>
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {renderSmartBreadcrumbs(breadcrumbs)}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center gap-2 ml-auto">
              <ShareDocument documentId={document.id} />

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFavorite}
                className={cn(
                  document.is_favorite && "text-yellow-500"
                )}
              >
                <Star 
                  className="h-4 w-4" 
                  fill={document.is_favorite ? "currentColor" : "none"}
                />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistorySidebar(!showHistorySidebar)}
                className={cn(
                  showHistorySidebar && "bg-accent"
                )}
              >
                <Clock className="h-4 w-4" />
              </Button>

              <NotificationDropdown />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={deleteDocument}>
                    <Trash className="mr-2 h-4 w-4" />
                    Удалить
                  </DropdownMenuItem>
                  <Dialog>
                    <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Статистика
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Статистика документа</DialogTitle>
                        <DialogDescription>
                          Информация об использовании документа
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <DocumentStatistics documentId={document.id} />
                      </div>
                    </DialogContent>
                  </Dialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="flex h-full">
              <div className={cn("flex-1", showHistorySidebar && "mr-[400px]")}>
                <DocumentEditor
                  document={document}
                  onChange={handleDocumentChange}
                  titleInputRef={titleInputRef}
                />
              </div>
              
              {showHistorySidebar && (
                <div className="fixed top-16 right-0 bottom-0 z-20">
                  <DocumentHistorySidebar 
                    documentId={document.id} 
                    onClose={() => setShowHistorySidebar(false)} 
                  />
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
} 