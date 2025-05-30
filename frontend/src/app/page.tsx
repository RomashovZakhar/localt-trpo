'use client';

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
