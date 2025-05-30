"use client"

/**
 * Функция для принудительного исправления стилей display:table в DOM
 */
export function fixTableStyles() {
  // Функция исправления стилей
  const fix = () => {
    try {
      // Находим все элементы с display:table
      const tableElements = document.querySelectorAll('[style*="display:table"]')
      
      console.log('Found elements with display:table:', tableElements.length)
      
      tableElements.forEach(element => {
        if (element instanceof HTMLElement) {
          // Применяем стили напрямую
          element.style.display = 'block'
          element.style.width = '100%'
          console.log('Fixed element:', element)
        }
      })
      
      // Специальная обработка для Radix UI вьюпорта
      const viewports = document.querySelectorAll('[data-radix-scroll-area-viewport]')
      viewports.forEach(viewport => {
        const children = viewport.children
        for (let i = 0; i < children.length; i++) {
          const child = children[i]
          if (child instanceof HTMLElement) {
            if (child.style.display === 'table') {
              child.style.display = 'block'
              child.style.width = '100%'
              console.log('Fixed viewport child:', child)
            }
          }
        }
      })
    } catch (error) {
      console.error('Error fixing table styles:', error)
    }
  }

  // Запускаем исправление сразу
  if (typeof window !== 'undefined') {
    // Проверка на клиентскую среду
    fix()
    
    // Запускаем с разной задержкой
    setTimeout(fix, 0)
    setTimeout(fix, 100)
    setTimeout(fix, 500)
    setTimeout(fix, 1000)
    
    // Наблюдатель за изменениями в DOM
    try {
      const observer = new MutationObserver((mutations) => {
        let shouldFix = false
        
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' || 
              (mutation.type === 'attributes' && mutation.attributeName === 'style')) {
            shouldFix = true
          }
        })
        
        if (shouldFix) {
          fix()
        }
      })
      
      // Наблюдаем за всем документом
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
      })
      
      // Сохраняем observer в window для отладки
      // @ts-ignore
      window.__tableFixObserver = observer
    } catch (error) {
      console.error('Error setting up MutationObserver:', error)
    }
    
    // Добавляем стиль напрямую в head
    const style = document.createElement('style')
    style.innerHTML = `
      *[style*="display:table"] {
        display: block !important;
        width: 100% !important;
      }
      
      [data-radix-scroll-area-viewport] > div {
        display: block !important;
        width: 100% !important;
      }
    `
    document.head.appendChild(style)
  }
} 