<<<<<<< HEAD
﻿'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/ui/loader';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // РРјРёС‚Р°С†РёСЏ Р·Р°РґРµСЂР¶РєРё РґР»СЏ РґРµРјРѕРЅСЃС‚СЂР°С†РёРё Р·Р°РіСЂСѓР·С‡РёРєР°
    const timer = setTimeout(() => {
      router.push('/documents/new');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader 
        size="lg" 
        text="Р—Р°РіСЂСѓР·РєР° СЂР°Р±РѕС‡РµРіРѕ РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІР°..." 
      />
    </div>
  );
} 
=======
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"

// Шаблон приветственного контента для нового пользователя
const welcomeContent = {
  blocks: [
    {
      type: "header",
      data: {
        text: "👋 Добро пожаловать в ваше рабочее пространство!",
        level: 3
      }
    },
    {
      type: "paragraph",
      data: {
        text: "Это ваш первый документ. Здесь вы можете организовать свои мысли, задачи и проекты."
      }
    },
    {
      type: "header",
      data: {
        text: "✨ Как начать работу",
        level: 4
      }
    },
    {
      type: "list",
      data: {
        title: "Как начать работу",
        style: "unordered",
        items: [
          "Нажмите <kbd>/</kbd> для вызова меню команд",
          "Создавайте заголовки, списки и чек-листы",
          "Добавляйте вложенные документы для организации информации",
          "Используйте звездочку в верхнем меню, чтобы добавить документ в избранное"
        ]
      }
    },
    {
      type: "header",
      data: {
        text: "✅ Ваши первые задачи",
        level: 4
      }
    },
    {
      type: "list",
      data: {
        style: "checklist",
        items: [
          "Изучить интерфейс",
          "Создать свой первый вложенный документ",
          "Добавить документ в избранное",
          "Поделиться документом с коллегой"
        ]
      }
    },
    {
      type: "paragraph",
      data: {
        text: "Удачи в работе с вашими документами! Если у вас возникнут вопросы, обратитесь к документации или в службу поддержки."
      }
    }
  ],
  time: new Date().getTime(),
  version: "2.27.0"
};

// Флаг для предотвращения параллельного создания корневого документа
// @ts-ignore
let isCreatingRootDocument = window.isCreatingRootDocument || false;
// @ts-ignore
window.isCreatingRootDocument = isCreatingRootDocument;

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Проверяем, авторизован ли пользователь
    const token = localStorage.getItem("accessToken")
    
    if (!token) {
      // Если не авторизован, перенаправляем на страницу входа
      router.push("/login")
      return
    }
    
    // Если авторизован, загружаем корневой документ
    const fetchRootDocument = async () => {
      try {
        console.log("Запрос корневого документа с главной страницы...");
        
        // Получаем корневой документ
        const response = await api.get("/documents/?root=true")
        console.log("Ответ API при запросе корневого документа:", response.data)
        
        // Определяем ID корневого документа согласно установленным правилам
        let rootDocumentId = null;
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          console.log(`Обнаружено ${response.data.length} корневых документов, выбираем основной`);
          
          // Строгое правило: всегда выбираем документ с наименьшим ID (самый первый созданный) 
          const sortedDocs = [...response.data].sort((a, b) => {
            const idA = parseInt(a.id);
            const idB = parseInt(b.id);
            return idA - idB;  // От меньшего к большему
          });
          
          rootDocumentId = sortedDocs[0].id;
          console.log(`Выбран документ с ID ${rootDocumentId} как самый первый корневой документ`);
        } else if (response.data && response.data.id) {
          // Если получили один объект документа
          rootDocumentId = response.data.id;
          console.log(`Выбран единственный корневой документ с ID ${rootDocumentId}`);
        }
        
        // Если нашли корневой документ, перенаправляем на него
        if (rootDocumentId) {
          console.log(`Переход к корневому документу с ID ${rootDocumentId}`);
          router.push(`/documents/${rootDocumentId}`);
        } else {
          // Создаем новый документ без выбрасывания ошибки
          console.log("Корневой документ не найден, создаем новый");
          await createRootDocument();
        }
      } catch (err) {
        console.error("Ошибка при загрузке корневого документа:", err)
        // Если корневого документа нет, создаем его с приветственным контентом
        await createRootDocument();
      }
    }

    // Выделяем создание корневого документа в отдельную функцию
    const createRootDocument = async () => {
      // Предотвращаем параллельное создание документа
      if (isCreatingRootDocument) {
        console.log("Создание корневого документа уже выполняется, ожидаем...");
        // Ждем небольшое время и проверяем, появился ли документ
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retryResponse = await api.get("/documents/?root=true");
        
        if (Array.isArray(retryResponse.data) && retryResponse.data.length > 0) {
          console.log("Документ был создан параллельным процессом, перенаправляем...");
          const sortedDocs = [...retryResponse.data].sort((a, b) => {
            const idA = parseInt(a.id);
            const idB = parseInt(b.id);
            return idA - idB;
          });
          
          const rootDocumentId = sortedDocs[0].id;
          router.push(`/documents/${rootDocumentId}`);
          return;
        }
        
        console.log("Документ все еще не создан, повторяем проверку...");
        // Если документ все равно не создан, продолжаем попытку создания
      }
      
      // Устанавливаем флаг, что процесс создания начался
      isCreatingRootDocument = true;
      // @ts-ignore
      window.isCreatingRootDocument = true;
      
      try {
        console.log("Создаю новый корневой документ с приветственным контентом");
        
        // Сначала проверим, нет ли уже корневых документов (это может означать,
        // что предыдущие запросы не вернули их по какой-то причине)
        const checkResponse = await api.get("/documents/?root=true");
        if (Array.isArray(checkResponse.data) && checkResponse.data.length > 0) {
          console.log("Обнаружены существующие корневые документы, отменяю создание нового");
          
          // Если есть документы, используем первый (с наименьшим ID)
          const sortedDocs = [...checkResponse.data].sort((a, b) => {
            const idA = parseInt(a.id);
            const idB = parseInt(b.id);
            return idA - idB;
          });
          
          const rootDocumentId = sortedDocs[0].id;
          console.log(`Перенаправление на существующий документ с ID ${rootDocumentId}`);
          router.push(`/documents/${rootDocumentId}`);
          return;
        }
        
        // Структура данных для EditorJS в правильном формате
        const documentData = {
          title: "Моё рабочее пространство",
          parent: null,
          is_root: true,
          content: welcomeContent,
          icon: "🏡"
        };
        
        console.log("Отправляемые данные:", JSON.stringify(documentData, null, 2));
        
        const newRootResponse = await api.post("/documents/", documentData);
        
        console.log("Ответ API при создании корневого документа:", newRootResponse.data);
        
        // Проверяем, что ответ содержит id нового документа
        if (newRootResponse.data && newRootResponse.data.id) {
          router.push(`/documents/${newRootResponse.data.id}`);
        } else {
          console.error("Не удалось получить ID созданного документа:", newRootResponse.data);
          // Если не удалось получить ID, показываем сообщение об ошибке
          alert("Не удалось создать корневой документ. Пожалуйста, обновите страницу или обратитесь в службу поддержки.");
        }
      } catch (createErr) {
        console.error("Ошибка при создании корневого документа:", createErr);
        // Показываем сообщение об ошибке пользователю
        alert("Произошла ошибка при создании корневого документа. Пожалуйста, попробуйте еще раз.");
      } finally {
        // Сбрасываем флаг после завершения
        isCreatingRootDocument = false;
        // @ts-ignore
        window.isCreatingRootDocument = false;
      }
    }

    fetchRootDocument()
  }, [router])

  // Функция для создания нового документа
  const createDocument = async () => {
    try {
      const response = await api.post('/documents/', {
        title: 'Новый документ',
        content: { blocks: [] }
      })
      
      // Перенаправляем на страницу созданного документа
      router.push(`/documents/${response.data.id}`)
    } catch (error) {
      console.error('Ошибка при создании документа:', error)
    }
  }

  // Показываем индикатор загрузки, пока идет перенаправление
  return (
    <main className="flex min-h-screen flex-col items-start p-6 max-w-7xl mx-auto">
      <div className="w-full flex-1 flex items-center justify-center">
        <Loader 
          variant="dots" 
          size="lg" 
          text="Загрузка документа..." 
          fullPage 
        />
      </div>
    </main>
  )
}
>>>>>>> 1055d67876f61dc45fa5a69a988d44cca38b1d87
