/**
 * Real-time Chat Component with Socket.IO Integration
 * Provides live chat support between users and sellers
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageCircle, X, Minimize2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth-context';
import { useSocket, useChatMessages } from '@/lib/socket-context';
import { useToast } from '@/hooks/use-toast';
import type { Message, User } from '@shared/schema';

interface LiveChatProps {
  recipientId: number;
  recipientName: string;
  recipientAvatar?: string;
  contextName: string; // Store name or "Helpdesk"
  productId?: number;
}

interface MessageWithUser extends Message {
  fromUser?: { firstName: string; lastName: string; avatar?: string };
}

export default function LiveChat({ 
  recipientId, 
  recipientName, 
  recipientAvatar, 
  contextName,
  productId 
}: LiveChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected, sendMessage, sendTyping, onlineUsers } = useSocket();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [localMessages, setLocalMessages] = useState<MessageWithUser[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Room ID for socket communication
  const roomId = user ? `chat:${Math.min(user.id, recipientId)}-${Math.max(user.id, recipientId)}` : '';

  // Get socket messages
  const { messages: socketMessages, typing } = useChatMessages(roomId);

  // Is recipient online?
  const isOnline = onlineUsers.has(recipientId);

  // Fetch existing messages from API
  const { data: apiMessages = [], refetch } = useQuery<MessageWithUser[]>({
    queryKey: ['/api/messages', user?.id, recipientId],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiRequest('GET', `/api/messages/${user.id}/${recipientId}`);
      return response.json();
    },
    enabled: !!user && isOpen,
  });

  // Merge API and socket messages
  useEffect(() => {
    const allMessages = [...apiMessages];
    socketMessages.forEach(socketMsg => {
      const exists = allMessages.some(m => String(m.id) === String(socketMsg.id));
      if (!exists) {
        allMessages.push({
          id: parseInt(socketMsg.id) || Date.now(),
          fromId: socketMsg.fromId,
          toId: socketMsg.toId,
          content: socketMsg.content,
          createdAt: new Date(socketMsg.createdAt),
          isRead: false,
          productId: socketMsg.productId || null,
          fromUser: socketMsg.fromUser
        } as MessageWithUser);
      }
    });
    setLocalMessages(allMessages.sort((a, b) => 
      new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
    ));
  }, [apiMessages, socketMessages]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (localMessages.length > 0) {
      scrollToBottom();
    }
  }, [localMessages, scrollToBottom]);

  // Save message to database as backup
  const saveMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/messages', {
        fromId: user!.id,
        toId: recipientId,
        content,
        productId: productId || null
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    },
  });

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isConnected || !user) return;
    
    sendTyping(recipientId, true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(recipientId, false);
    }, 2000);
  }, [isConnected, sendTyping, recipientId, user]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    if (user.id === recipientId) {
      toast({
        title: 'Cannot message yourself',
        description: 'You cannot send messages to yourself.',
        variant: 'destructive',
      });
      return;
    }

    const content = message.trim();
    setMessage('');
    
    // Stop typing indicator
    sendTyping(recipientId, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send via Socket.IO for real-time delivery
    if (isConnected) {
      sendMessage(recipientId, content, productId);
    }

    // Also save to database as backup
    saveMessageMutation.mutate(content);
  };

  if (!user) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => {
            toast({
              title: 'Please sign in',
              description: 'You need to be signed in to use live chat.',
              variant: 'destructive',
            });
          }}
          className="rounded-full shadow-lg"
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          Live Chat
        </Button>
      </div>
    );
  }

  if (user.id === recipientId) {
    return null;
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          Live Chat
          {isConnected && (
            <Badge variant="secondary" className="ml-2 bg-green-500 text-white text-xs px-1.5">
              Live
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className={`w-80 shadow-xl ${isMinimized ? 'h-auto' : 'h-96'}`}>
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 bg-gradient-to-r from-primary to-primary/80 text-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Avatar className="h-8 w-8 border-2 border-white/30">
                <AvatarImage src={recipientAvatar} alt={recipientName} />
                <AvatarFallback className="text-xs bg-white/20 text-white">
                  {recipientName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {isOnline && (
                <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-400 text-green-400" />
              )}
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-white">{recipientName}</CardTitle>
              <p className="text-xs text-white/70">
                {contextName} {isOnline ? '• Online' : ''}
              </p>
            </div>
          </div>
          <div className="flex space-x-1">
            {isConnected && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-200 text-[10px] px-1.5">
                Live
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-80">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {localMessages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Start a conversation!</p>
                    <p className="text-xs">Messages are delivered in real-time.</p>
                  </div>
                ) : (
                  localMessages.map((msg, index) => (
                    <div
                      key={msg.id || index}
                      className={`flex ${msg.fromId === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-2 rounded-lg text-sm ${
                          msg.fromId === user.id
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.fromId === user.id ? 'text-white/70' : 'text-gray-500'
                          }`}
                        >
                          {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {typing && typing.userId !== user.id && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-500 text-sm rounded-lg px-3 py-2 rounded-bl-sm">
                      <span className="animate-pulse">typing...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-gray-50">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type your message..."
                  className="flex-1 text-sm"
                  disabled={saveMessageMutation.isPending}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!message.trim() || saveMessageMutation.isPending}
                  className="px-3"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
