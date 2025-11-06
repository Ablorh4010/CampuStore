import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useParams } from 'wouter';
import { Eye, EyeOff, Lock, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const adminRegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

type AdminRegisterFormData = z.infer<typeof adminRegisterSchema>;

export default function AdminRegister() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteToken, setInviteToken] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // Get token from URL params or query string
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromQuery = urlParams.get('token');
    const tokenFromPath = params.token;
    
    const token = tokenFromQuery || tokenFromPath;
    
    if (!token) {
      toast({
        title: 'Missing Invite Token',
        description: 'This page requires a valid invitation link to access.',
        variant: 'destructive',
        duration: 6000,
      });
      // Redirect to home after a short delay
      setTimeout(() => setLocation('/'), 2000);
    } else {
      setInviteToken(token);
    }
  }, [params.token, toast, setLocation]);

  const form = useForm<AdminRegisterFormData>({
    resolver: zodResolver(adminRegisterSchema),
    defaultValues: {
      email: 'richard.jil@outlook.com', // Pre-fill the invited email
      password: '',
      username: '',
      firstName: '',
      lastName: '',
    },
  });

  const onSubmit = async (data: AdminRegisterFormData) => {
    if (!inviteToken) {
      toast({
        title: 'Error',
        description: 'Missing invite token. Please use the invitation link.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', '/api/auth/admin/register', {
        ...data,
        inviteToken,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      // Store user and token
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('token', result.token);

      toast({
        title: '✅ Admin Account Created!',
        description: 'Your admin account is now active. Redirecting to admin portal...',
        duration: 6000,
      });

      setTimeout(() => {
        setLocation('/admin');
      }, 1500);
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Please check your details and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!inviteToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
            <CardDescription className="text-center">
              This page requires a valid invitation link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center">
              Redirecting to homepage...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Registration</h1>
          <p className="text-gray-600">Create your admin account</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-center mb-2">
              <Lock className="h-5 w-5 text-purple-600 mr-2" />
              <CardTitle className="text-center">Secure Admin Access</CardTitle>
            </div>
            <CardDescription className="text-center">
              You've been invited to create an admin account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Valid invitation token detected. Please complete the form below.
              </AlertDescription>
            </Alert>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="admin@example.com" 
                          {...field}
                          data-testid="input-admin-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="adminuser" 
                          {...field}
                          data-testid="input-admin-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="John" 
                            {...field}
                            data-testid="input-admin-first-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Doe" 
                            {...field}
                            data-testid="input-admin-last-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a secure password" 
                            {...field}
                            data-testid="input-admin-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="button-submit-admin-register"
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Admin Account'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-6">
          This page is only accessible with a valid invitation token
        </p>
      </div>
    </div>
  );
}
