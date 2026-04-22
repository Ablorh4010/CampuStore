import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Shield, Lock, Mail, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

const adminLoginSchema = z.object({
  email: z.string().email('Valid admin email is required'),
  password: z.string().min(1, 'Password is required'),
});

const adminRegisterSchema = z.object({
  email: z.string().email('Valid email is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  inviteToken: z.string().min(1, 'Admin invitation token is required'),
});

type AdminLoginData = z.infer<typeof adminLoginSchema>;
type AdminRegisterData = z.infer<typeof adminRegisterSchema>;

export default function AdminPortal() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const { login, registerAdmin, isLoading } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<AdminLoginData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<AdminRegisterData>({
    resolver: zodResolver(adminRegisterSchema),
    defaultValues: { 
      email: '', 
      username: '', 
      firstName: '', 
      lastName: '', 
      password: '',
      inviteToken: '' 
    },
  });

  const onLogin = async (data: AdminLoginData) => {
    try {
      const res = await login(data);
      if (!res.user.isAdmin) {
        throw new Error('This account does not have administrator privileges.');
      }
      toast({ title: 'Admin access granted', description: 'Welcome to the moderation engine.' });
      setLocation('/admin');
    } catch (error: any) {
      toast({
        title: 'Access Denied',
        description: error.message || 'Invalid credentials or insufficient permissions.',
        variant: 'destructive',
      });
    }
  };

  const onRegister = async (data: AdminRegisterData) => {
    try {
      await registerAdmin(data);
      toast({
        title: 'Admin account created',
        description: 'Successfully registered as an administrator.',
      });
      setLocation('/admin');
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'Please check your invitation token and try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-gray-50/50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
           <div className="inline-flex p-4 rounded-3xl bg-primary/10 mb-4 ring-8 ring-primary/5">
              <Shield className="w-10 h-10 text-primary" />
           </div>
           <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Admin Portal</h1>
           <p className="text-gray-500 font-medium mt-1 uppercase tracking-widest text-[10px]">Secure Access Only</p>
        </div>

        <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
            <TabsList className="grid w-full grid-cols-2 rounded-none h-14 bg-gray-100/50 p-1">
              <TabsTrigger value="login" className="rounded-[2rem] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="rounded-[2rem] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Sign Up</TabsTrigger>
            </TabsList>

            <CardContent className="p-8">
              <TabsContent value="login" className="mt-0">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-xs uppercase tracking-wider text-gray-400">Admin Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <Input className="h-12 pl-11 rounded-xl border-2 focus:ring-primary" placeholder="admin@uniexchangehub.com" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-xs uppercase tracking-wider text-gray-400">Security Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <Input 
                                type={showPassword ? 'text' : 'password'} 
                                className="h-12 pl-11 pr-11 rounded-xl border-2" 
                                placeholder="••••••••" 
                                {...field} 
                              />
                              <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl font-bold text-lg shadow-xl shadow-primary/20">
                       {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Portal'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                       <FormField control={registerForm.control} name="firstName" render={({ field }) => (
                          <FormItem><FormControl><Input placeholder="First Name" className="h-11 rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                       )} />
                       <FormField control={registerForm.control} name="lastName" render={({ field }) => (
                          <FormItem><FormControl><Input placeholder="Last Name" className="h-11 rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                       )} />
                    </div>
                    <FormField control={registerForm.control} name="email" render={({ field }) => (
                       <FormItem><FormControl><Input placeholder="Work Email" className="h-11 rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={registerForm.control} name="username" render={({ field }) => (
                       <FormItem><FormControl><Input placeholder="Admin Username" className="h-11 rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={registerForm.control} name="password" render={({ field }) => (
                       <FormItem><FormControl><Input type="password" placeholder="Secure Password" className="h-11 rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={registerForm.control} name="inviteToken" render={({ field }) => (
                       <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-primary">Invitation Token Required</FormLabel>
                          <FormControl><Input placeholder="Paste security token here" className="h-11 rounded-xl border-primary/30" {...field} /></FormControl>
                          <FormMessage />
                       </FormItem>
                    )} />
                    <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl font-bold bg-primary shadow-lg">
                       Initialize Admin Account
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
        
        <p className="text-center text-[10px] text-gray-400 mt-6 font-bold uppercase tracking-[0.2em]">
           System Monitoring Active • IP Encrypted
        </p>
      </div>
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`animate-spin ${props.className}`}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
