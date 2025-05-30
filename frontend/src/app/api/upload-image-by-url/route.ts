import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { nanoid } from 'nanoid';

// Обработчик POST запроса для загрузки изображений по URL
export async function POST(request: NextRequest) {
  try {
    // Получаем URL изображения из тела запроса
    const body = await request.json();
    const imageUrl = body.url;

    if (!imageUrl) {
      return NextResponse.json({ success: false, message: 'URL изображения не указан' }, { status: 400 });
    }

    // Создаем уникальный ID для файла
    const uniqueId = nanoid();
    
    try {
      // Попытка загрузить изображение по URL напрямую
      // Используем no-cors для обхода ограничений CORS на некоторых сайтах
      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        // mode: 'no-cors' не работает с Next.js API routes, так как это серверный код
      };
      
      const response = await fetch(imageUrl, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`);
      }
      
      // Проверяем, что это изображение
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        return NextResponse.json({ 
          success: false, 
          message: 'Указанный URL не ведет к изображению' 
        }, { status: 400 });
      }

      // Получаем данные изображения
      const imageBuffer = await response.arrayBuffer();
      
      // Создаем имя файла на основе URL и текущей даты
      const urlObj = new URL(imageUrl);
      const pathSegments = urlObj.pathname.split('/');
      let originalFilename = pathSegments[pathSegments.length - 1];
      
      // Если имя файла не определено, используем дефолтное
      if (!originalFilename || originalFilename === '' || !originalFilename.includes('.')) {
        const fileExtension = contentType.split('/')[1] || 'jpg';
        originalFilename = `image.${fileExtension}`;
      }
      
      const filename = `${uniqueId}-${originalFilename.replace(/\s+/g, '-')}`;
      
      // Путь для сохранения файлов
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      
      // Убедимся, что директория существует
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      
      // Путь для сохранения файла
      const filepath = join(uploadDir, filename);
      
      // Запись файла на диск
      await writeFile(filepath, Buffer.from(imageBuffer));
      
      // Возвращаем URL загруженного изображения
      const fileUrl = `/uploads/${filename}`;
      
      // Примерный размер файла в байтах
      const fileSize = Buffer.from(imageBuffer).length;
      
      // Формируем ответ в формате, ожидаемом EditorJS Image Tool
      return NextResponse.json({
        success: 1,
        file: {
          url: fileUrl,
          name: originalFilename,
          size: fileSize,
          type: contentType
        }
      });
    } catch (fetchError) {
      console.error('Ошибка при прямой загрузке изображения:', fetchError);
      
      // Создаем имя файла для proxy-доступа
      const urlObj = new URL(imageUrl);
      const filename = `${uniqueId}-proxy-image.jpg`;
      
      // Путь для сохранения файлов
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      
      // Убедимся, что директория существует
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      
      // Создаем файл для прямой ссылки в HTML
      const htmlContent = `
        <html>
          <head>
            <meta http-equiv="refresh" content="0;url=${imageUrl}">
            <style>
              body, html {
                margin: 0;
                padding: 0;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
              }
              img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" alt="Image">
          </body>
        </html>
      `;
      
      const filepath = join(uploadDir, `${uniqueId}-proxy.html`);
      await writeFile(filepath, htmlContent);
      
      // Возвращаем URL загруженного изображения
      const fileUrl = imageUrl; // Используем оригинальный URL
      
      // Формируем ответ в формате, ожидаемом EditorJS Image Tool
      return NextResponse.json({
        success: 1,
        file: {
          url: fileUrl,
          name: filename,
          size: 0, // Размер неизвестен
          type: 'image/jpeg' // Предполагаем, что это изображение
        }
      });
    }
  } catch (error) {
    console.error('Ошибка при загрузке изображения по URL:', error);
    return NextResponse.json(
      { success: false, message: 'Произошла ошибка при загрузке изображения по URL' },
      { status: 500 }
    );
  }
} 