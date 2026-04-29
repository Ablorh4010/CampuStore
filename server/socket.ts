/**
 * Socket.IO Server for Real-time Chat
 * Provides live chat support for user-to-seller and helpdesk communication
 */
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { authenticateTokenForSocket } from './auth';

interface ChatMessage {
  id: string;
  fromId: number;
  toId: number;
  content: string;
  createdAt: Date;
  productId?: number;
  type: 'user' | 'seller' | 'helpdesk';
}

interface TypingEvent {
  userId: number;
  roomId: string;
  isTyping: boolean;
}

interface UserStatus {
  odId: number;
  online: boolean;
  lastSeen: Date;
}

// Track online users
const onlineUsers = new Map<number, Set<string>>();

export function setupSocketIO(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? [process.env.APP_URL || 'https://uniexchangehub.com']
        : ['http://localhost:5000', 'http://localhost:3000'],      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const user = await authenticateTokenForSocket(token);
      if (!user) {
        return next(new Error('Invalid token'));
      }

      // Attach user to socket
      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    console.log(`User ${user.id} (${user.firstName} ${user.lastName}) connected via WebSocket`);

    // Track online status
    if (!onlineUsers.has(user.id)) {
      onlineUsers.set(user.id, new Set());
    }
    onlineUsers.get(user.id)!.add(socket.id);

    // Join personal room for direct messages
    socket.join(`user:${user.id}`);

    // Broadcast online status
    io.emit('user:status', { userId: user.id, online: true });

    // Join chat room
    socket.on('chat:join', ({ roomId }: { roomId: string }) => {
      socket.join(roomId);
      console.log(`User ${user.id} joined room ${roomId}`);
    });

    // Leave chat room
    socket.on('chat:leave', ({ roomId }: { roomId: string }) => {
      socket.leave(roomId);
      console.log(`User ${user.id} left room ${roomId}`);
    });

    // Handle new message
    socket.on('chat:message', async (data: { 
      toId: number; 
      content: string; 
      productId?: number;
      type?: 'user' | 'seller' | 'helpdesk';
    }) => {
      const message: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fromId: user.id,
        toId: data.toId,
        content: data.content,
        productId: data.productId,
        createdAt: new Date(),
        type: data.type || 'user'
      };

      // Create room ID (smaller ID first for consistency)
      const roomId = `chat:${Math.min(user.id, data.toId)}-${Math.max(user.id, data.toId)}`;
      
      // Send to room participants
      io.to(roomId).emit('chat:message', {
        ...message,
        fromUser: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar
        }
      });

      // Also send to recipient's personal room if not in chat room
      io.to(`user:${data.toId}`).emit('chat:notification', {
        type: 'new_message',
        fromUser: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName
        },
        preview: data.content.substring(0, 50)
      });

      console.log(`Message from ${user.id} to ${data.toId}: ${data.content.substring(0, 30)}...`);
    });

    // Handle typing indicator
    socket.on('chat:typing', (data: { toId: number; isTyping: boolean }) => {
      const roomId = `chat:${Math.min(user.id, data.toId)}-${Math.max(user.id, data.toId)}`;
      socket.to(roomId).emit('chat:typing', {
        userId: user.id,
        isTyping: data.isTyping
      });
    });

    // Handle read receipts
    socket.on('chat:read', (data: { messageIds: string[]; fromId: number }) => {
      io.to(`user:${data.fromId}`).emit('chat:read', {
        messageIds: data.messageIds,
        readBy: user.id
      });
    });

    // Helpdesk support room
    socket.on('helpdesk:join', () => {
      socket.join('helpdesk');
      console.log(`User ${user.id} joined helpdesk`);
    });

    socket.on('helpdesk:message', (data: { content: string }) => {
      const message = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fromId: user.id,
        content: data.content,
        createdAt: new Date(),
        fromUser: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar
        }
      };

      io.to('helpdesk').emit('helpdesk:message', message);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(user.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(user.id);
          // Broadcast offline status after a delay (in case of reconnection)
          setTimeout(() => {
            if (!onlineUsers.has(user.id)) {
              io.emit('user:status', { 
                odId: user.id, 
                online: false,
                lastSeen: new Date()
              });
            }
          }, 5000);
        }
      }
      console.log(`User ${user.id} disconnected`);
    });
  });

  console.log('Socket.IO server initialized for real-time chat');
  return io;
}

// Helper to check if user is online
export function isUserOnline(userId: number): boolean {
  return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
}

// Get list of online users
export function getOnlineUsers(): number[] {
  return Array.from(onlineUsers.keys());
}
