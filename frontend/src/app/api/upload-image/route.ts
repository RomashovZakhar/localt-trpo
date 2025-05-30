import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { nanoid } from 'nanoid';

// Обработчик POST запроса для загрузки изображений
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, message: 'Файл не найден' }, { status: 400 });
    }

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, message: 'Файл должен быть изображением' }, { status: 400 });
    }

    // Создаем уникальное имя файла
    const uniqueId = nanoid();
    const filename = `${uniqueId}-${file.name.replace(/\s+/g, '-')}`;
    
    // Путь для сохранения файлов
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // Убедимся, что директория существует
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    // Путь для сохранения файла
    const filepath = join(uploadDir, filename);
    
    // Чтение файла как ArrayBuffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Запись файла на диск
    await writeFile(filepath, buffer);
    
    // Возвращаем URL загруженного изображения
    const fileUrl = `/uploads/${filename}`;
    
    // Формируем ответ в формате, ожидаемом EditorJS Image Tool
    return NextResponse.json({
      success: 1,
      file: {
        url: fileUrl,
        // Включаем дополнительные метаданные, если нужно
        name: file.name,
        size: file.size,
        type: file.type
      }
    });
  } catch (error) {
    console.error('Ошибка при загрузке изображения:', error);
    return NextResponse.json(
      { success: false, message: 'Произошла ошибка при загрузке изображения' },
      { status: 500 }
    );
  }
} 