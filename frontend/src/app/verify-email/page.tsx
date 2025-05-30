'use client';

import { Suspense } from 'react';
import { Loader } from '@/components/ui/loader';

// РљРѕРјРїРѕРЅРµРЅС‚ СЃРѕРґРµСЂР¶РёРјРѕРіРѕ СЃС‚СЂР°РЅРёС†С‹
function VerifyEmailContent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ Email</h1>
      <p className="mb-6">РџРѕР¶Р°Р»СѓР№СЃС‚Р°, РїРѕРґРѕР¶РґРёС‚Рµ...</p>
      <Loader 
        size="lg" 
        text="РџСЂРѕРІРµСЂРєР° РєРѕРґР° РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ..." 
      />
    </div>
  );
}

// РћСЃРЅРѕРІРЅРѕР№ РєРѕРјРїРѕРЅРµРЅС‚ СЃС‚СЂР°РЅРёС†С‹
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Loader size="lg" text="Р—Р°РіСЂСѓР·РєР°..." />}>
      <VerifyEmailContent />
    </Suspense>
  );
} 
