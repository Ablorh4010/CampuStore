import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-context';
import { 
  Search, Send, User, Bot, Shield, Clock, 
  CheckCheck, MessageSquare, Loader2, Phone,
  MoreVertical, MoreHorizontal, Image as ImageIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  userId: number;
  firstName: string;
  lastName: string;
  avatar: string | null;
  userType: 'buyer' | 'seller' | 'admin';
  lastMessage: string;
  timestamp: string;
  isRead: boolean;
  lastMessageFromId: number;
}

interface Message {
  id: string;
  fromId: number;
  toId: number;
  content: string;
  createdAt: string;
  isRead: boolean;
  fromUser?: {
    id: number;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
}

export default function InboxComponent() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/messages/conversations'],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages', user?.id, selectedUser?.userId],
    enabled: !!user && !!selectedUser,
    queryFn: async () => {
      const res = await fetch(`/api/messages/${user?.id}/${selectedUser?.userId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      // Messages return desc from server, we need asc for display
      const data = await res.json();
      return data.reverse();
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (msg: any) => {
      // If message is from or to the selected user, invalidate messages
      if (selectedUser && (msg.fromId === selectedUser.userId || msg.toId === selectedUser.userId)) {
        queryClient.invalidateQueries({ queryKey: ['/api/messages', user.id, selectedUser.userId] });
      }
      // Always invalidate conversations to update last message
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations'] });
    };

    socket.on('chat:message', handleNewMessage);
    return () => {
      socket.off('chat:message', handleNewMessage);
    };
  }, [socket, user, selectedUser, queryClient]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedUser || !socket) return;

    socket.emit('chat:message', {
      toId: selectedUser.userId,
      content: messageInput,
      type: user?.userType === 'admin' ? 'helpdesk' : 'user'
    });

    setMessageInput('');
  };

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    // If current user is a seller, they should only see admins in their inbox
    if (user?.userType === 'seller') {
      return matchesSearch && c.userType === 'admin';
    }
    
    // Admins see everyone
    return matchesSearch;
  });

  return (
    <div className="flex h-[700px] bg-white rounded-[2.5rem] shadow-2xl shadow-black/5 overflow-hidden border border-gray-100">
      {/* Sidebar */}
      <div className="w-1/3 border-r flex flex-col bg-gray-50/30">
        <div className="p-6 bg-white border-b">
          <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Messages.</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-10 h-12 rounded-xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-bold text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center p-12 text-gray-400 font-bold uppercase text-[10px] tracking-widest">No messages found</div>
          ) : (
            <div className="divide-y divide-gray-100/50">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => setSelectedUser(conv)}
                  className={`w-full p-6 text-left flex gap-4 transition-all hover:bg-white group relative ${selectedUser?.userId === conv.userId ? 'bg-white shadow-lg z-10' : ''}`}
                >
                  <Avatar className="w-12 h-12 border-2 border-white shadow-sm flex-shrink-0">
                    <AvatarImage src={conv.avatar || ''} />
                    <AvatarFallback className="bg-gray-100 font-black text-xs">{conv.firstName[0]}{conv.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-black text-xs uppercase truncate tracking-tight">{conv.firstName} {conv.lastName}</h4>
                      <span className="text-[9px] font-bold text-gray-400">{formatDistanceToNow(new Date(conv.timestamp), { addSuffix: false })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       {conv.userType === 'admin' && <Badge className="h-4 px-1.5 bg-black text-white text-[8px] border-none">ADMIN</Badge>}
                       <p className={`text-[11px] truncate font-medium ${!conv.isRead && conv.lastMessageFromId !== user?.id ? 'text-black font-black' : 'text-gray-400'}`}>
                         {conv.lastMessageFromId === user?.id && 'You: '}{conv.lastMessage}
                       </p>
                    </div>
                  </div>
                  {!conv.isRead && conv.lastMessageFromId !== user?.id && (
                    <div className="w-2 h-2 rounded-full bg-primary absolute right-4 top-1/2 -translate-y-1/2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUser ? (
          <>
            <div className="p-6 border-b flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
               <div className="flex items-center gap-4">
                  <Avatar className="w-10 h-10 border-2 border-primary/10">
                    <AvatarImage src={selectedUser.avatar || ''} />
                    <AvatarFallback className="bg-primary/5 text-primary font-black text-xs">{selectedUser.firstName[0]}{selectedUser.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-tight">{selectedUser.firstName} {selectedUser.lastName}</h3>
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedUser.userType}</span>
                    </div>
                  </div>
               </div>
               <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-2"><Phone className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-2"><MoreHorizontal className="w-4 h-4" /></Button>
               </div>
            </div>

            <ScrollArea className="flex-1 p-8" ref={scrollRef}>
               <div className="space-y-6">
                  {messages.map((msg, i) => {
                    const isMe = msg.fromId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-3 max-w-[70%] ${isMe ? 'flex-row-reverse' : ''}`}>
                          {!isMe && (
                             <Avatar className="w-8 h-8 flex-shrink-0 shadow-sm border-2 border-white">
                                <AvatarImage src={selectedUser.avatar || ''} />
                                <AvatarFallback className="text-[10px] font-black">{selectedUser.firstName[0]}</AvatarFallback>
                             </Avatar>
                          )}
                          <div className="space-y-1">
                             <div className={`p-4 rounded-[1.5rem] text-xs font-medium shadow-sm leading-relaxed ${
                               isMe ? 'bg-black text-white rounded-tr-none' : 'bg-gray-50 text-gray-800 rounded-tl-none border border-gray-100'
                             }`}>
                                {msg.content}
                             </div>
                             <div className={`flex items-center gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <span className="text-[8px] font-bold text-gray-300 uppercase">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                                {isMe && <CheckCheck className="w-3 h-3 text-primary" />}
                             </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
               </div>
            </ScrollArea>

            <div className="p-6 bg-white border-t">
               <div className="relative flex items-center gap-3">
                  <Button variant="outline" size="icon" className="rounded-xl h-12 w-12 flex-shrink-0 border-2"><ImageIcon className="w-5 h-5 text-gray-400" /></Button>
                  <div className="flex-1 relative">
                    <Input 
                      placeholder="Type your message..." 
                      className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-black font-bold text-sm px-6 pr-16"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button 
                      onClick={handleSendMessage}
                      size="icon" 
                      className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-black text-white shadow-xl shadow-black/20"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/20 p-12 text-center">
             <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl shadow-black/5 flex items-center justify-center mb-8 animate-float">
                <MessageSquare className="w-10 h-10 text-primary" />
             </div>
             <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Campus Inbox.</h3>
             <p className="max-w-xs text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Select a conversation to start chatting with buyers or university hub admins.</p>
          </div>
        )}
      </div>
    </div>
  );
}
