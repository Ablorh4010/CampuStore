import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, X, ExternalLink, Smartphone, Clock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface SupportNumber {
  label: string;
  number: string;
  description: string;
}

export default function WhatsAppSupport() {
  const [isOpen, setIsOpen] = useState(false);

  const { data: whatsapp1 } = useQuery<{ value: string }>({ queryKey: ['/api/admin/config/whatsapp_support_1'] });
  const { data: whatsapp2 } = useQuery<{ value: string }>({ queryKey: ['/api/admin/config/whatsapp_support_2'] });
  const { data: whatsapp3 } = useQuery<{ value: string }>({ queryKey: ['/api/admin/config/whatsapp_support_3'] });

  const supportNumbers: SupportNumber[] = [
    { 
      label: 'General Support', 
      number: whatsapp1?.value || '233240000001', 
      description: 'Order tracking & general inquiries' 
    },
    { 
      label: 'Seller Desk', 
      number: whatsapp2?.value || '233240000002', 
      description: 'Store setup & merchant support' 
    },
    { 
      label: 'Technical Help', 
      number: whatsapp3?.value || '233240000003', 
      description: 'Account issues & technical bugs' 
    }
  ];

  const handleWhatsAppClick = (number: string) => {
    const cleanNumber = number.replace(/\D/g, '');
    const url = `https://wa.me/${cleanNumber}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <Card className="w-[350px] mb-4 shadow-2xl rounded-[2.5rem] border-none flex flex-col overflow-hidden animate-reveal-up bg-white">
          <CardHeader className="bg-[#25D366] text-white p-8 shrink-0">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                 <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                    <MessageCircle className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <CardTitle className="text-xl font-black tracking-tight uppercase">Support Hub</CardTitle>
                    <p className="text-[10px] uppercase font-bold text-white/70 tracking-widest mt-0.5">WhatsApp Integration</p>
                 </div>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-2 bg-black/10 p-3 rounded-xl border border-white/10">
               <ShieldCheck className="w-4 h-4 text-white" />
               <p className="text-[10px] font-bold text-white uppercase">Direct Admin Connection</p>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4 bg-gray-50/50">
            <div className="text-center mb-4">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                  Connect with our team instantly via WhatsApp. Choose a department below:
               </p>
            </div>

            {supportNumbers.map((support, idx) => (
              <button
                key={idx}
                onClick={() => handleWhatsAppClick(support.number)}
                className="w-full bg-white p-5 rounded-[1.5rem] border-2 border-gray-100 hover:border-[#25D366] hover:shadow-xl hover:shadow-[#25D366]/5 transition-all group text-left flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-[#25D366]/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Smartphone className="w-6 h-6 text-[#25D366]" />
                </div>
                <div className="flex-1">
                   <div className="flex justify-between items-center">
                      <h4 className="font-black text-xs uppercase tracking-tight text-gray-900">{support.label}</h4>
                      <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-[#25D366]" />
                   </div>
                   <p className="text-[10px] font-bold text-gray-400 mt-0.5">{support.description}</p>
                </div>
              </button>
            ))}

            <div className="flex items-center justify-center gap-2 pt-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active & Ready to help</p>
            </div>
          </CardContent>
          
          <div className="p-4 bg-white border-t text-center">
             <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Response time usually under 10 minutes during working hours</p>
          </div>
        </Card>
      )}

      {!isOpen && (
        <Button 
          size="lg" 
          className="h-16 w-16 rounded-full shadow-2xl bg-[#25D366] hover:bg-[#128C7E] border-4 border-white animate-float p-0 relative group overflow-hidden"
          onClick={() => setIsOpen(true)}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <MessageCircle className="w-8 h-8 text-white" />
          <Badge className="absolute -top-1 -right-1 bg-white text-[#25D366] border-2 border-[#25D366] font-black text-[10px]">SOS</Badge>
        </Button>
      )}
    </div>
  );
}
