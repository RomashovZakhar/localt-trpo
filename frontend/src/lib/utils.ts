import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Функция для объединения классов Tailwind CSS
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Функция для генерации случайного цвета
export function randomColor() {
  const colors = [
    '#FF5252', '#FF4081', '#E040FB', '#7C4DFF', 
    '#536DFE', '#448AFF', '#40C4FF', '#18FFFF', 
    '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41', 
    '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}
