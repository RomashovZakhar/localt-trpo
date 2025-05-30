import { useEffect, useRef, useState } from "react";

// Простая заглушка для useSocket
export function useSocket(url: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    socket.onerror = (e) => {
      setError(e instanceof Error ? e : new Error("WebSocket error"));
    };

    return () => {
      socket.close();
    };
  }, [url]);

  const sendMessage = (data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof data === "string" ? data : JSON.stringify(data));
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    error,
    sendMessage,
  };
} 