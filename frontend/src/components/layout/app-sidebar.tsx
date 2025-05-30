"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { CustomScrollArea } from "@/components/ui/custom-scroll-area"
import { useAuth } from "@/components/auth"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { RodnikLogo } from "@/components/ui/rodnik-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

// Тип для документа в избранном
interface FavoriteDocument {
  id: string;
  title: string;
  icon?: string;
}

// Тип для общего документа
interface SharedDocument {
  id: string;
  title: string;
  owner_username: string;
  role?: 'editor' | 'viewer';
  icon?: string;
}

interface AppSidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AppSidebar({ className, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const [favoriteDocuments, setFavoriteDocuments] = useState<FavoriteDocument[]>([])
  const [sharedDocuments, setSharedDocuments] = useState<SharedDocument[]>([])
  const [rootDocumentIcon, setRootDocumentIcon] = useState<string | null>(null)
  const [rootDocumentId, setRootDocumentId] = useState<string | null>(null)
  

  // Загрузка избранных документов
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await api.get("/documents/favorites/");
        if (Array.isArray(response.data)) {
          setFavoriteDocuments(response.data);
        } else {
          setFavoriteDocuments([]);
        }
      } catch (err) {
        console.error("Ошибка при загрузке избранных документов:", err);
        setFavoriteDocuments([]);
      }
    };

    fetchFavorites();
  }, []);

  // Загрузка совместных документов
  useEffect(() => {
    const fetchSharedDocuments = async () => {
      try {
        const response = await api.get("/documents/shared_with_me/");
        if (Array.isArray(response.data)) {
          setSharedDocuments(response.data);
        } else {
          setSharedDocuments([]);
        }
      } catch (err) {
        console.error("Ошибка при загрузке совместных документов:", err);
        setSharedDocuments([]);
      }
    };

    fetchSharedDocuments();
  }, []);

  // Загрузка корневого документа и его иконки
  useEffect(() => {
    const fetchRootDocument = async () => {
      try {
        const response = await api.get("/documents/?root=true");
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          // Выбираем документ с наименьшим ID (самый первый созданный)
          const sortedDocs = [...response.data].sort((a, b) => {
            const idA = parseInt(a.id);
            const idB = parseInt(b.id);
            return idA - idB;
          });
          
          setRootDocumentId(sortedDocs[0].id);
          setRootDocumentIcon(sortedDocs[0].icon || null);
        } else if (response.data && response.data.id) {
          // Если получили один объект документа
          setRootDocumentId(response.data.id);
          setRootDocumentIcon(response.data.icon || null);
        }
      } catch (err) {
        console.error("Ошибка при загрузке корневого документа:", err);
      }
    };

    fetchRootDocument();
  }, []);

  // Обработка обновлений избранных документов в реальном времени
  useEffect(() => {
    const handleFavoriteUpdated = (event: StorageEvent) => {
      if (event.key === 'favorite_document_updated' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          if (data.isFavorite) {
            setFavoriteDocuments(prev => {
              const exists = prev.some(doc => doc.id === data.documentId);
              if (exists) return prev;
              return [...prev, { id: data.documentId, title: data.title }];
            });
          } else {
            setFavoriteDocuments(prev => 
              prev.filter(doc => doc.id !== data.documentId)
            );
          }
        } catch (err) {
          console.error('Ошибка при обработке обновления избранных:', err);
        }
      }
    };
    
    window.addEventListener('storage', handleFavoriteUpdated);
    return () => {
      window.removeEventListener('storage', handleFavoriteUpdated);
    };
  }, []);

  // Обработка обновлений иконок документов в реальном времени
  useEffect(() => {
    const handleIconUpdated = (event: StorageEvent) => {
      // Проверяем, является ли ключ обновлением иконки
      if (event.key && event.key.startsWith('document_icon_update_') && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          const documentId = data.documentId;
          const newIcon = data.icon;
          
          // Обновляем иконку корневого документа, если это он
          if (rootDocumentId === documentId) {
            setRootDocumentIcon(newIcon);
          }
          
          // Обновляем иконку в избранных документах
          setFavoriteDocuments(prev => 
            prev.map(doc => 
              doc.id === documentId 
                ? { ...doc, icon: newIcon } 
                : doc
            )
          );
          
          // Обновляем иконку в совместных документах
          setSharedDocuments(prev => 
            prev.map(doc => 
              doc.id === documentId 
                ? { ...doc, icon: newIcon } 
                : doc
            )
          );
          
          console.log(`Обновлена иконка документа ${documentId} на ${newIcon}`);
        } catch (err) {
          console.error('Ошибка при обработке обновления иконки:', err);
        }
      }
    };
    
    window.addEventListener('storage', handleIconUpdated);
    return () => {
      window.removeEventListener('storage', handleIconUpdated);
    };
  }, [rootDocumentId]);

  // Функция для перехода к корневому документу
  const navigateToRoot = async () => {
    try {
      const response = await api.get("/documents/?root=true");
      let rootDocumentId = null;
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        const sortedDocs = [...response.data].sort((a, b) => {
          const idA = parseInt(a.id);
          const idB = parseInt(b.id);
          return idA - idB;
        });
        rootDocumentId = sortedDocs[0].id;
      } else if (response.data && response.data.id) {
        rootDocumentId = response.data.id;
      }
      
      if (rootDocumentId) {
        if (pathname !== `/documents/${rootDocumentId}`) {
          router.push(`/documents/${rootDocumentId}`);
        }
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error("Ошибка при загрузке корневого документа:", err);
      router.push('/');
    }
  };

  return (
    <Sidebar 
      className={cn("border-r bg-background flex flex-col", className)}
      style={{ "--sidebar-width": "16rem", maxWidth: "16rem" } as React.CSSProperties}
      {...props}
    >
      <SidebarContent className="flex flex-col flex-1 w-full overflow-hidden">
        <div className="flex h-16 items-center px-4">
          <RodnikLogo />
          <span className="ml-2 text-lg font-semibold truncate">Rodnik</span>
        </div>
        <CustomScrollArea className="flex-1 w-full">
          <SidebarMenu className="w-full max-w-full">
            {/* Главная / Рабочее пространство */}
            <SidebarGroup className="w-full">
              <SidebarMenuItem
                active={pathname === "/"}
                onClick={navigateToRoot}
                className="px-4 w-full"
              >
                <div className="flex items-center w-full">
                  <span className="mr-2 text-lg">
                    {rootDocumentIcon && (
                      <span className="text-lg">{rootDocumentIcon}</span>
                    )}
                  </span>
                  <span className="block truncate w-full">Рабочее пространство</span>
                </div>
              </SidebarMenuItem>
            </SidebarGroup>

            {/* Избранные документы */}
            {favoriteDocuments.length > 0 && (
              <SidebarGroup className="w-full">
                <SidebarGroupLabel className="px-4 w-full">
                  Избранное
                </SidebarGroupLabel>
                <SidebarGroupContent className="w-full">
                  {favoriteDocuments.map((doc) => (
                    <SidebarMenuItem
                      key={doc.id}
                      active={pathname === `/documents/${doc.id}`}
                      onClick={() => router.push(`/documents/${doc.id}`)}
                      className="px-4 w-full"
                    >
                      <div className="flex items-center w-full">
                        <span className="mr-2 text-lg">
                          {doc.icon || (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          )}
                        </span>
                        <span className="block truncate w-full">{doc.title || "Без названия"}</span>
                      </div>
                    </SidebarMenuItem>
                  ))}
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Совместные документы */}
            {sharedDocuments.length > 0 && (
              <SidebarGroup className="w-full">
                <SidebarGroupLabel className="px-4 w-full">
                  Совместные документы
                </SidebarGroupLabel>
                <SidebarGroupContent className="w-full">
                  {sharedDocuments.map((doc) => (
                    <SidebarMenuItem
                      key={doc.id}
                      active={pathname === `/documents/${doc.id}`}
                      onClick={() => router.push(`/documents/${doc.id}`)}
                      className="px-4 w-full"
                    >
                      <div className="flex flex-col w-full">
                        <div className="flex items-center">
                          <span className="mr-2 text-lg">
                            {doc.icon || (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                              >
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                            )}
                          </span>
                          <span className="block truncate w-full">{doc.title || "Без названия"}</span>
                        </div>
                        <span className="block text-xs text-muted-foreground truncate w-full pl-6">
                          От: {doc.owner_username}
                          {doc.role && (
                            <span className={cn(
                              "ml-2 px-1.5 py-0.5 rounded text-[10px]",
                              doc.role === 'editor' ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                            )}>
                              {doc.role === 'editor' ? 'редактор' : 'наблюдатель'}
                            </span>
                          )}
                        </span>
                      </div>
                    </SidebarMenuItem>
                  ))}
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarMenu>
        </CustomScrollArea>

        {/* Нижняя часть с настройками и выходом */}
        <div className="mt-auto border-t w-full">
          <SidebarMenu className="w-full max-w-full">
            <SidebarMenuItem 
              onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
              className="px-4 w-full"
            >
              <span className="block truncate w-full">Настройки</span>
            </SidebarMenuItem>
            <SidebarMenuItem 
              onClick={logout}
              className="px-4 w-full"
            >
              <span className="block truncate w-full">Выйти</span>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  )
} 