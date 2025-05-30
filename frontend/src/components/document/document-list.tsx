'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/ui/loader';

export function DocumentList() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // В реальном компоненте здесь был бы запрос к API
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Перенаправить на первый документ или страницу создания
      router.push('/documents/new');
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader 
          size="lg" 
          text="Загрузка документов..." 
        />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <p>Загрузка списка документов...</p>
    </div>
  );
} 