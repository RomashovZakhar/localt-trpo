"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { ScrollArea } from "./scroll-area"
import { cn } from "@/lib/utils"

interface CustomScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollArea> {
  children: React.ReactNode
}

export function CustomScrollArea({ className, children, ...props }: CustomScrollAreaProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fixTableDisplayStyles = () => {
      if (!ref.current) return
      
      // Находим все элементы с display:table внутри нашего компонента
      const tableElements = ref.current.querySelectorAll('[style*="display:table"]')
      
      tableElements.forEach(element => {
        if (element instanceof HTMLElement) {
          // Применяем стили напрямую
          element.style.display = 'block'
          element.style.width = '100%'
          
          // Можно также попробовать другой подход - создать и добавить стили через CSS
          const id = `fix-table-${Math.random().toString(36).substring(2, 9)}`
          element.setAttribute('id', id)
          
          const style = document.createElement('style')
          style.textContent = `
            #${id} {
              display: block !important;
              width: 100% !important;
            }
          `
          document.head.appendChild(style)
        }
      })
    }

    // Запускаем исправление сразу
    fixTableDisplayStyles()
    
    // Затем еще несколько раз с задержкой
    const timers = [
      setTimeout(fixTableDisplayStyles, 100),
      setTimeout(fixTableDisplayStyles, 300),
      setTimeout(fixTableDisplayStyles, 1000)
    ]

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [])

  return (
    <div ref={ref} className={cn("custom-scroll-wrapper", className)}>
      <ScrollArea className="w-full h-full" {...props}>
        {children}
      </ScrollArea>
      
      {/* Добавляем глобальный стиль для решения проблемы */}
      <style jsx global>{`
        [style*="display:table"] {
          display: block !important;
          width: 100% !important;
        }
      `}</style>
    </div>
  )
} 