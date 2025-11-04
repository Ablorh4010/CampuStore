import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

const emailLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const phoneLoginSchema = z.object({
  phoneNumber: z.string().min(10, 'Please enter a valid phone number'),
  otpCode: z.string().length(6, 'OTP code must be 6 digits'),
});

type EmailLoginFormData = z.infer<typeof emailLoginSchema>;
type PhoneLoginFormData = z.infer<typeof phoneLoginSchema>;

export default function Auth() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [showOtpField, setShowOtpField] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { login, sendOtp, isLoading } = useAuth();
  const { toast } = useToast();

  const emailLoginForm = useForm<EmailLoginFormData>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const phoneLoginForm = useForm<PhoneLoginFormData>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: {
      phoneNumber: '',
      otpCode: '',
    },
  });

  const onEmailLogin = async (data: EmailLoginFormData) => {
    try {
      await login({ email: data.email, password: data.password });
      toast({
        title: 'Welcome back!',
        description: 'You have been successfully signed in.',
      });
      setLocation('/');
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description: 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    }
  };

  const onPhoneLogin = async (data: PhoneLoginFormData) => {
    try {
      await login({ phoneNumber: data.phoneNumber, otpCode: data.otpCode });
      toast({
        title: 'Welcome back!',
        description: 'You have been successfully signed in.',
      });
      setLocation('/');
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description: 'Please check your OTP code and try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSendOtp = async () => {
    const phoneNumber = phoneLoginForm.getValues('phoneNumber');
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid phone number.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendOtp(phoneNumber);
      setOtpSent(true);
      setShowOtpField(true);
      toast({
        title: 'OTP sent!',
        description: 'Please check your phone for the verification code.',
      });
    } catch (error) {
      toast({
        title: 'Failed to send OTP',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-white to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">StudentMarket</h1>
          <p className="text-gray-600">Sign in to the student marketplace</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to continue buying and selling
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="flex space-x-2 mb-4">
                <Button
                  type="button"
                  variant={loginMethod === 'email' ? 'default' : 'outline'}
                  onClick={() => setLoginMethod('email')}
                  className="flex-1"
                  data-testid="button-email-method"
                >
                  Email
                </Button>
                <Button
                  type="button"
                  variant={loginMethod === 'phone' ? 'default' : 'outline'}
                  onClick={() => {
                    setLoginMethod('phone');
                    setShowOtpField(false);
                    setOtpSent(false);
                  }}
                  className="flex-1"
                  data-testid="button-phone-method"
                >
                  Phone
                </Button>
              </div>

              {loginMethod === 'email' ? (
                <Form {...emailLoginForm}>
                  <form onSubmit={emailLoginForm.handleSubmit(onEmailLogin)} className="space-y-4">
                    <FormField
                      control={emailLoginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="your@university.edu" 
                              {...field}
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={emailLoginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password" 
                                {...field}
                                data-testid="input-password"
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
                      disabled={isLoading}
                      data-testid="button-sign-in"
                    >
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>

                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm text-primary"
                        onClick={() => setLocation('/forgot-password')}
                        data-testid="link-forgot-password"
                      >
                        Forgot your password?
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <Form {...phoneLoginForm}>
                  <form onSubmit={phoneLoginForm.handleSubmit(onPhoneLogin)} className="space-y-4">
                    <FormField
                      control={phoneLoginForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <div className="flex space-x-2">
                              <Input 
                                type="tel" 
                                placeholder="+1234567890" 
                                {...field} 
                                className="flex-1"
                                data-testid="input-phone"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleSendOtp}
                                disabled={isLoading || otpSent}
                                data-testid="button-send-otp"
                              >
                                {otpSent ? 'Sent' : 'Send OTP'}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {showOtpField && (
                      <FormField
                        control={phoneLoginForm.control}
                        name="otpCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>OTP Code</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                placeholder="Enter 6-digit code" 
                                maxLength={6}
                                {...field}
                                data-testid="input-otp"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading || !showOtpField}
                      data-testid="button-verify-otp"
                    >
                      {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
