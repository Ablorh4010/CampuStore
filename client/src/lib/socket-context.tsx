/**
 * Socket.IO Client Context for Real-time Chat
 * Provides connection management and event handling for live chat
 */
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';

interface ChatMessage {
  id: string;
  fromId: number;
  toId: number;
  content: string;
  createdAt: Date;
  productId?: number;
  fromUser: {
    id: number;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

interface TypingStatus {
  userId: number;
  isTyping: boolean;
}

interface UserStatus {
  odId: number;
  online: boolean;
  lastSeen?: Date;
}

interface Notification {
  type: 'new_message' | 'new_order' | 'admin_alert';
  title?: string;
  message?: string;
  fromUser?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  preview?: string;
  orderId?: number;
  timestamp?: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinChatRoom: (roomId: string) => void;
  leaveChatRoom: (roomId: string) => void;
  sendMessage: (toId: number, content: string, productId?: number) => void;
  sendTyping: (toId: number, isTyping: boolean) => void;
  markAsRead: (messageIds: string[], fromId: number) => void;
  onlineUsers: Set<number>;
  joinHelpdesk: () => void;
  sendHelpdeskMessage: (content: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection with authentication
    const newSocket = io({
      auth: { token },
      // On GAE, polling often works more reliably as initial handshake
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      // GAE standard often requires specific path or protocol handling
      secure: true,
      timeout: 5000,
      autoConnect: true
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Track online users
    newSocket.on('user:status', (data: UserStatus) => {
      setOnlineUsers(prev => {
        const updated = new Set(prev);
        if (data.online) {
          updated.add(data.odId);
        } else {
          updated.delete(data.odId);
        }
        return updated;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  const joinChatRoom = useCallback((roomId: string) => {
    if (socket && isConnected) {
      socket.emit('chat:join', { roomId });
    }
  }, [socket, isConnected]);

  const leaveChatRoom = useCallback((roomId: string) => {
    if (socket && isConnected) {
      socket.emit('chat:leave', { roomId });
    }
  }, [socket, isConnected]);

  const sendMessage = useCallback((toId: number, content: string, productId?: number) => {
    if (socket && isConnected) {
      socket.emit('chat:message', { toId, content, productId });
    }
  }, [socket, isConnected]);

  const sendTyping = useCallback((toId: number, isTyping: boolean) => {
    if (socket && isConnected) {
      socket.emit('chat:typing', { toId, isTyping });
    }
  }, [socket, isConnected]);

  const markAsRead = useCallback((messageIds: string[], fromId: number) => {
    if (socket && isConnected) {
      socket.emit('chat:read', { messageIds, fromId });
    }
  }, [socket, isConnected]);

  const joinHelpdesk = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('helpdesk:join');
    }
  }, [socket, isConnected]);

  const sendHelpdeskMessage = useCallback((content: string) => {
    if (socket && isConnected) {
      socket.emit('helpdesk:message', { content });
    }
  }, [socket, isConnected]);

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      joinChatRoom,
      leaveChatRoom,
      sendMessage,
      sendTyping,
      markAsRead,
      onlineUsers,
      joinHelpdesk,
      sendHelpdeskMessage
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

// Hook for listening to chat messages
export function useChatMessages(roomId: string) {
  const { socket, joinChatRoom, leaveChatRoom } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState<TypingStatus | null>(null);

  useEffect(() => {
    if (!socket) return;

    joinChatRoom(roomId);

    const handleMessage = (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    };

    const handleTyping = (data: TypingStatus) => {
      setTyping(data.isTyping ? data : null);
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:typing', handleTyping);

    return () => {
      leaveChatRoom(roomId);
      socket.off('chat:message', handleMessage);
      socket.off('chat:typing', handleTyping);
    };
  }, [socket, roomId, joinChatRoom, leaveChatRoom]);

  return { messages, typing, setMessages };
}

// Hook for chat notifications
export function useChatNotifications() {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notification: Notification) => {
      setNotifications(prev => [...prev, notification]);
    };

    socket.on('chat:notification', handleNotification);

    return () => {
      socket.off('chat:notification', handleNotification);
    };
  }, [socket]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, clearNotifications };
}
