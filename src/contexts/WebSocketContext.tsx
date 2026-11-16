import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketPayload } from '@/types/websocket';
import { useAuth } from './AuthContext';

type MessageHandler = (payload: WebSocketPayload) => void;

interface WebSocketContextType {
  isConnected: boolean;
  onlineCount: number;
  subscribe: (handler: MessageHandler) => () => void;
  sendMessage: (data: unknown) => boolean;
  playOrderNotificationSound: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const playOrderNotificationSound = useCallback(() => {
    try {
      // Dùng Web Audio API tạo tiếng chuông notification mượt mà không cần file mp3 ngoài
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      const now = audioCtx.currentTime;
      // Ting 1: High note
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Ting 2: Higher note
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.15); // A5
      gain2.gain.setValueAtTime(0.4, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.8);
    } catch {
      // Audio might be blocked if user has not interacted with the page yet
    }
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    // Xác định protocol ws: hay wss:
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    let url = `${protocol}//${host}/ws`;

    if (token) {
      url += `?token=Bearer%20${encodeURIComponent(token)}`;
    }

    try {
      const socket = new WebSocket(url);

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload: WebSocketPayload = JSON.parse(event.data);

          if (payload.action === 'ONLINE_COUNT' && 'count' in payload) {
            setOnlineCount(payload.count as number);
          }

          if (payload.action === 'NEW_ORDER' || payload.action === 'CALL_STAFF') {
            playOrderNotificationSound();
          }

          // Gửi tới tất cả subscriber đang đăng ký
          handlersRef.current.forEach((handler) => handler(payload));
        } catch {
          // Bỏ qua tin nhắn không phải JSON
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        // Tự động thử kết nối lại sau 3 giây
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };

      socketRef.current = socket;
    } catch {
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [token, playOrderNotificationSound]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const subscribe = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const sendMessage = useCallback((data: unknown): boolean => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        onlineCount,
        subscribe,
        sendMessage,
        playOrderNotificationSound,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
