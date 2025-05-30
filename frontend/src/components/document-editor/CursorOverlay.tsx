import React, { useEffect, useRef } from 'react';
import './remote-cursor.css';

<<<<<<< HEAD
interface RemoteCursor {
  id: string;
  username: string;
  color: string;
  position: {
    x: number;
    y: number;
  } | null;
  timestamp: number;
=======
interface CursorPosition {
  x: number;
  y: number;
}

interface RemoteCursor {
  id: string;
  username: string;
  position: CursorPosition | null;
  color: string;
  timestamp?: number;
>>>>>>> 1055d67876f61dc45fa5a69a988d44cca38b1d87
}

interface CursorOverlayProps {
  cursors: RemoteCursor[];
<<<<<<< HEAD
  containerRef: React.RefObject<HTMLDivElement>;
=======
  containerRef: React.RefObject<HTMLDivElement | null>;
>>>>>>> 1055d67876f61dc45fa5a69a988d44cca38b1d87
}

/**
 * Компонент для отображения курсоров других пользователей в стиле Figma
 */
const CursorOverlay: React.FC<CursorOverlayProps> = ({ cursors, containerRef }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Синхронизируем размеры оверлея с контейнером редактора
  useEffect(() => {
    const resizeOverlay = () => {
      if (!containerRef.current || !overlayRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      overlayRef.current.style.width = `${containerRect.width}px`;
      overlayRef.current.style.height = `${containerRect.height}px`;
    };

    // Начальная синхронизация
    resizeOverlay();
    
    // Добавляем обработчик события изменения размера окна
    window.addEventListener('resize', resizeOverlay);
    
    // Регулярная проверка размеров (для случаев изменения контента)
    const interval = setInterval(resizeOverlay, 1000);
    
    return () => {
      window.removeEventListener('resize', resizeOverlay);
      clearInterval(interval);
    };
  }, [containerRef]);

  return (
    <div 
      ref={overlayRef}
      className="cursor-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
<<<<<<< HEAD
        right: 0,
        bottom: 0,
=======
>>>>>>> 1055d67876f61dc45fa5a69a988d44cca38b1d87
        pointerEvents: 'none',
        zIndex: 1000,
        overflow: 'visible'
      }}
    >
<<<<<<< HEAD
      {cursors.map(cursor => {
        if (!cursor.position) return null;
        
        return (
          <div 
            key={cursor.id}
            className="remote-cursor"
            style={{
              position: 'absolute',
              left: `${cursor.position.x}px`,
              top: `${cursor.position.y}px`,
              pointerEvents: 'none',
              zIndex: 1000,
              transition: 'transform 0.1s ease-out, opacity 0.3s ease-in-out',
            }}
          >
            {/* Треугольник курсора */}
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: `16px solid ${cursor.color}`,
                transform: 'rotate(-45deg)',
              }}
            />
            
            {/* Имя пользователя */}
            <div
              style={{
                background: cursor.color,
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px',
                marginTop: '5px',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
              }}
=======
      {cursors.map(cursor => 
        cursor.position && (
          <div
            key={cursor.id}
            className="remote-cursor"
            style={{
              left: `${cursor.position.x}px`,
              top: `${cursor.position.y}px`,
              '--cursor-color': cursor.color
            } as React.CSSProperties}
          >
            <div 
              className="cursor-username"
              style={{
                '--cursor-color': cursor.color
              } as React.CSSProperties}
>>>>>>> 1055d67876f61dc45fa5a69a988d44cca38b1d87
            >
              {cursor.username}
            </div>
          </div>
<<<<<<< HEAD
        );
      })}
=======
        )
      )}
>>>>>>> 1055d67876f61dc45fa5a69a988d44cca38b1d87
    </div>
  );
};

export default CursorOverlay; 