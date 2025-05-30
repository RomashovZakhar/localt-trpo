"use client"

import { useEffect } from "react"
import { fixTableStyles } from "@/lib/fix-table-styles"

export function FixTableStyleComponent() {
  useEffect(() => {
    // Вызываем функцию исправления при монтировании компонента
    fixTableStyles()
  }, [])
  
  // Компонент не рендерит ничего видимого
  return null
} 