"use client"

import * as React from "react"
import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
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
  const router = useRouter();

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
      } catch (err: any) {
        // Если ошибка 404 или 403 — перенаправляем на /documents
        if (err?.response?.status === 404) {
          toast.error("Документ не найден. Вы будете перенаправлены на список документов.");
          router.push("/documents");
        } else if (err?.response?.status === 403) {
          toast.error("Нет доступа к документу. Вы будете перенаправлены на список документов.");
          router.push("/documents");
        } else {
          setError("Не удалось загрузить документ");
          toast.error("Не удалось загрузить документ");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id, router]);

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
        });
        
        console.log('Родительский документ обновлен:', updateResponse.data);
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
      
      console.log('Удаление ссылок на документ:', documentId);
      
      // Загружаем родительский документ
      const parentResponse = await api.get(`/documents/${document.parent}/`);
      const parentDoc = parentResponse.data;
      
      // Если у родителя нет контента, нечего обновлять
      if (!parentDoc.content || !parentDoc.content.blocks) return;
      
      let updated = false;
      
      // Проходим по блокам родительского документа и удаляем ссылки на текущий документ
      if (Array.isArray(parentDoc.content.blocks)) {
        const updatedBlocks = parentDoc.content.blocks.filter((block: any) => {
          if (block.type === 'nestedDocument' && 
              block.data && 
              typeof block.data === 'object' && 
              'id' in block.data && 
              block.data.id === documentId) {
            updated = true;
            return false;
          }
          return true;
        });
        
        if (updated) {
          parentDoc.content.blocks = updatedBlocks;
          
          const updateResponse = await api.put(`/documents/${document.parent}/`, {
            content: parentDoc.content,
            title: parentDoc.title,
          });
          
          console.log('Ссылки на документ удалены из родительского документа:', updateResponse.data);
        }
      }
    } catch (err) {
      console.error('Ошибка при удалении ссылок на документ:', err);
    }
  };

  const handleDocumentChange = (updatedDoc: Document) => {
    if (!document) return;
    
    // Обновляем локальное состояние
    setDocument(updatedDoc);
    
    // Отменяем предыдущий таймаут сохранения, если он есть
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Устанавливаем новый таймаут для сохранения
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await api.put(`/documents/${id}/`, {
          content: updatedDoc.content,
          title: updatedDoc.title,
        });
        
        console.log('Документ сохранен:', response.data);
      } catch (err) {
        console.error('Ошибка при сохранении документа:', err);
        toast.error("Не удалось сохранить документ");
      }
    }, 1000); // Задержка в 1 секунду перед сохранением
  };

  const toggleFavorite = async () => {
    if (!document) return;
    
    try {
      const response = await api.put(`/documents/${id}/`, {
        is_favorite: !document.is_favorite,
      });
      
      setDocument(response.data);
      toast.success(
        response.data.is_favorite 
          ? "Документ добавлен в избранное" 
          : "Документ удален из избранного"
      );
    } catch (err) {
      console.error('Ошибка при обновлении статуса избранного:', err);
      toast.error("Не удалось обновить статус избранного");
    }
  };

  const shareDocument = () => {
    // Открываем диалог шаринга
    const shareDialog = window.document.querySelector('#share-document-dialog') as HTMLDialogElement;
    if (shareDialog) {
      shareDialog.showModal();
    }
  };

  const deleteDocument = async () => {
    if (!document) return;
    
    if (!confirm("Вы уверены, что хотите удалить этот документ?")) {
      return;
    }
    
    try {
      // Сначала удаляем ссылки на документ из родительского документа
      await removeDocumentReferences(id);
      
      // Затем удаляем сам документ
      await api.delete(`/documents/${id}/`);
      
      toast.success("Документ успешно удален");
      
      // Если есть родительский документ, перенаправляем на него
      if (document.parent) {
        window.location.href = `/documents/${document.parent}`;
      } else {
        // Иначе перенаправляем на страницу документов
        window.location.href = '/documents';
      }
    } catch (err) {
      console.error('Ошибка при удалении документа:', err);
      toast.error("Не удалось удалить документ");
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    if (document) {
      const updatedDoc = { ...document, title: newTitle };
      setDocument(updatedDoc);
      
      // Отменяем предыдущий таймаут сохранения, если он есть
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Устанавливаем новый таймаут для сохранения
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await api.put(`/documents/${id}/`, {
            title: newTitle,
          });
          
          console.log('Название документа обновлено:', response.data);
          
          // Обновляем ссылки на документ в родительском документе
          await updateDocumentReferences(id, newTitle);
        } catch (err) {
          console.error('Ошибка при обновлении названия документа:', err);
          toast.error("Не удалось обновить название документа");
        }
      }, 1000); // Задержка в 1 секунду перед сохранением
    }
  };

  // Слушаем события обновления иконки из localStorage
  useEffect(() => {
    const handleIconUpdate = (event: StorageEvent) => {
      if (event.key === `document-icon-${id}` && document) {
        const newIcon = event.newValue;
        setDocument(prev => prev ? { ...prev, icon: newIcon || undefined } : null);
        
        // Сохраняем обновленную иконку на сервере
        api.put(`/documents/${id}/`, {
          icon: newIcon,
        }).catch(err => {
          console.error('Ошибка при сохранении иконки:', err);
        });
      }
    };
    
    window.addEventListener('storage', handleIconUpdate);
    
    return () => {
      window.removeEventListener('storage', handleIconUpdate);
    };
  }, [id, document]);

  const truncateText = (text: string, maxLength: number = 25) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const renderSmartBreadcrumbs = (items: Array<{id: string, title: string, icon?: string}>) => {
    if (items.length <= 3) {
      return items.map((item, index) => renderBreadcrumbItem(item, index === items.length - 1));
    }
    
    return [
      renderBreadcrumbItem(items[0], false),
      <BreadcrumbSeparator key="sep1" />,
      <BreadcrumbEllipsis key="ellipsis" />,
      <BreadcrumbSeparator key="sep2" />,
      renderBreadcrumbItem(items[items.length - 1], true)
    ];
  };

  const renderBreadcrumbItem = (item: {id: string, title: string, icon?: string}, isCurrentPage: boolean) => {
    const content = (
      <>
        {item.icon && <span className="mr-1">{item.icon}</span>}
        {truncateText(item.title)}
      </>
    );
    
    return isCurrentPage ? (
      <BreadcrumbPage key={item.id}>{content}</BreadcrumbPage>
    ) : (
      <BreadcrumbItem key={item.id}>
        <BreadcrumbLink href={`/documents/${item.id}`}>{content}</BreadcrumbLink>
      </BreadcrumbItem>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="lg" text="Загрузка документа..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ошибка</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b">
            <div className="flex h-16 items-center px-4 gap-4">
              <SidebarTrigger />
              
              <Breadcrumb>
                <BreadcrumbList>
                  {renderSmartBreadcrumbs(breadcrumbs)}
                </BreadcrumbList>
              </Breadcrumb>
              
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFavorite}
                  className={cn(
                    "hover:bg-yellow-100 hover:text-yellow-600",
                    document.is_favorite && "text-yellow-500"
                  )}
                >
                  <Star className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={shareDocument}
                >
                  <Share className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHistorySidebar(true)}
                >
                  <Clock className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const statsDialog = window.document.querySelector('#document-statistics-dialog') as HTMLDialogElement;
                    if (statsDialog) {
                      statsDialog.showModal();
                    }
                  }}
                >
                  <BarChart3 className="h-5 w-5" />
                </Button>
                
                <NotificationDropdown />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={deleteDocument}>
                      <Trash className="mr-2 h-4 w-4" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            <div className="container max-w-4xl py-6">
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={handleTitleChange}
                className="w-full text-3xl font-bold bg-transparent border-none outline-none focus:ring-0 p-0 mb-4"
                placeholder="Без названия"
              />
              
              <DocumentEditor
                document={document}
                onChange={handleDocumentChange}
              />
            </div>
          </main>
        </div>
        
        <DocumentHistorySidebar
          documentId={id}
          onClose={() => setShowHistorySidebar(false)}
        />
      </div>
      
      <ShareDocument documentId={id} />
      
      <Dialog>
        <DialogContent id="document-statistics-dialog" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Статистика документа</DialogTitle>
            <DialogDescription>
              Анализ содержимого и активности документа
            </DialogDescription>
          </DialogHeader>
          <DocumentStatistics documentId={id} />
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
} 