import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { MessageCircle, X, Send, Sparkles, ShoppingBag, ArrowRight, User, Bot, Search, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useVoiceSearch } from '@/hooks/use-voice-search';
import type { ProductWithStore } from '@shared/schema';

interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  products?: ProductWithStore[];
}

export default function GeminiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      type: 'ai', 
      text: "Hi! I'm your University Hub AI Assistant. I can help you find exactly what you need based on your recent activity. What are you looking for today?" 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const { data: allProducts = [] } = useQuery<ProductWithStore[]>({
    queryKey: ['/api/products'],
  });

  // Track recent searches from localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recent searches", e);
        localStorage.removeItem('recentSearches');
      }
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), type: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Save search term
    const newSearches = [textToSend, ...recentSearches.slice(0, 4)];
    setRecentSearches(newSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newSearches));

    // Simulate AI logic
    setTimeout(() => {
      const searchTerm = textToSend.toLowerCase();
      const matchedProducts = allProducts.filter(p => 
        p.title.toLowerCase().includes(searchTerm) || 
        p.description.toLowerCase().includes(searchTerm) ||
        p.category?.name?.toLowerCase().includes(searchTerm)
      ).slice(0, 3);

      let responseText = "";
      if (matchedProducts.length > 0) {
        responseText = `I found ${matchedProducts.length} items that match your interest! Check these out:`;
      } else {
        responseText = "I couldn't find a direct match for that, but I can keep an eye out. Would you like to browse our latest trending items instead?";
      }

      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        type: 'ai', 
        text: responseText,
        products: matchedProducts.length > 0 ? matchedProducts : undefined
      };
      
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1000);
  };

  const { isListening, startListening } = useVoiceSearch((text) => {
    setInput(text);
    handleSend(text);
  });

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <Card className="w-[380px] h-[550px] mb-4 shadow-2xl rounded-[2rem] border-none flex flex-col overflow-hidden animate-reveal-up bg-white">
          <CardHeader className="paylater-hero text-white p-6 shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="bg-white/20 p-2 rounded-2xl backdrop-blur-md">
                    <Sparkles className="w-5 h-5 text-white animate-pulse" />
                 </div>
                 <div>
                    <CardTitle className="text-lg font-black tracking-tight">AI Assistant</CardTitle>
                    <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest">Powered by Gemini</p>
                 </div>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0 bg-gray-50/50">
            <ScrollArea className="h-full p-6" ref={scrollRef}>
              <div className="space-y-6">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-[85%] ${m.type === 'user' ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="w-8 h-8 shrink-0 border-2 border-white shadow-sm">
                        {m.type === 'ai' ? (
                          <div className="bg-primary w-full h-full flex items-center justify-center text-white">
                            <Bot className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="bg-gray-200 w-full h-full flex items-center justify-center text-gray-500">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </Avatar>
                      <div className="space-y-3">
                        <div className={`p-4 rounded-2xl text-sm font-medium shadow-sm ${
                          m.type === 'user' 
                            ? 'bg-primary text-white rounded-tr-none' 
                            : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                        }`}>
                          {m.text}
                        </div>
                        
                        {m.products && (
                          <div className="space-y-2">
                            {m.products.map(product => (
                              <Link key={product.id} href={`/product/${product.id}`}>
                                <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-3 hover:border-primary/30 transition-all cursor-pointer group shadow-sm">
                                  {product.images?.[0] && <img src={(product.images?.[0] && product.images[0] !== 'uploaded') ? product.images[0] : '/placeholder-product.png'} className="w-12 h-12 object-cover rounded-lg" alt="" />}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black truncate">{product.title}</p>
                                    <p className="text-primary font-bold text-xs">${product.price}</p>
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 rounded-tl-none">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-4 bg-white border-t shrink-0">
            <div className="flex w-full gap-2 relative items-center">
              <button
                type="button"
                onClick={startListening}
                className={`p-2 rounded-xl transition-all ${isListening ? 'bg-secondary text-white animate-pulse shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <div className="flex-1 relative">
                <Input 
                  placeholder="Ask for a product..." 
                  className="rounded-xl border-gray-200 focus:ring-primary h-12 pr-12"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button size="icon" className="absolute right-1 top-1 h-10 w-10 rounded-lg shadow-lg" onClick={() => handleSend()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      )}

      {!isOpen && (
        <Button 
          size="lg" 
          className="h-16 w-16 rounded-full shadow-2xl paylater-hero border-4 border-white animate-float p-0 relative group overflow-hidden"
          onClick={() => setIsOpen(true)}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <MessageCircle className="w-7 h-7 text-white" />
          <Badge className="absolute -top-1 -right-1 bg-secondary text-white border-2 border-white animate-pulse">AI</Badge>
        </Button>
      )}
    </div>
  );
}
