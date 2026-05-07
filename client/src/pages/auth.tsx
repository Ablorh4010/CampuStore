import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { GraduationCap, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

const emailAuthSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  otpCode: z.string().optional(),
}).refine((data) => !data.otpCode || data.otpCode.length === 6, {
  message: 'Verification code must be 6 digits',
  path: ['otpCode'],
});

type EmailAuthFormData = z.infer<typeof emailAuthSchema>;

export default function Auth() {
  const [location, setLocation] = useLocation();
  const [showOtpField, setShowOtpField] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [userMode, setUserMode] = useState<'buyer' | 'seller' | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const { login, sendOtp, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') as 'buyer' | 'seller' | null;
    if (mode) {
      setUserMode(mode);
      localStorage.setItem('userMode', mode);
    } else {
      const savedMode = localStorage.getItem('userMode') as 'buyer' | 'seller' | null;
      setUserMode(savedMode);
    }
  }, []);

  const emailAuthForm = useForm<EmailAuthFormData>({
    resolver: zodResolver(emailAuthSchema),
    defaultValues: {
      email: '',
      otpCode: '',
    },
  });

  const onEmailLogin = async (data: EmailAuthFormData) => {
    try {
      const response = await login({ email: data.email, otpCode: data.otpCode });
      
      // If server responds that it sent an OTP (two-step login)
      if (response && (response as any).otpSent) {
        setOtpSent(true);
        setShowOtpField(true);
        toast({
          title: '✅ Verification code sent!',
          description: `A 6-digit login code has been sent to ${data.email}.`,
        });
        return;
      }

      toast({
        title: '✅ Welcome back!',
        description: 'You have been successfully signed in.',
      });
      setLocation('/');
    } catch (error: any) {
      toast({
        title: 'Sign in failed',
        description: error.message || 'Please check your verification code and try again.',
        variant: "destructive",
      });
    }
  };

  const handleSendOtp = async () => {
    const email = emailAuthForm.getValues('email');
    const cleanEmail = email?.trim();
    
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    if (!canResend) return;

    try {
      setCanResend(false);
      setResendTimer(60);
      await sendOtp(cleanEmail);
      setOtpSent(true);
      setShowOtpField(true);
      toast({
        title: '✅ Verification code sent!',
        description: `A 6-digit code has been sent to ${cleanEmail}. Please check your inbox and enter it below.`,
        duration: 10000,
      });
    } catch (error) {
      console.error('OTP send error:', error);
      setCanResend(true);
      setResendTimer(0);
      toast({
        title: 'Failed to send verification code',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">The University Hub</h1>
          <p className="text-gray-600">the student market place</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center">
              Sign in to continue shopping
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="w-full">
              {/* Login View */}
              <Form {...emailAuthForm}>
                <form onSubmit={emailAuthForm.handleSubmit(onEmailLogin)} className="space-y-4">
                  <FormField
                    control={emailAuthForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input 
                              type="email" 
                              placeholder="your@email.com" 
                              className="pl-10"
                              {...field}
                              data-testid="input-email-login"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!showOtpField && (
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      className="w-full"
                      variant="outline"
                      data-testid="button-send-code-login"
                    >
                      Send Verification Code
                    </Button>
                  )}

                  {showOtpField && (
                    <>
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Verification code sent! Check your email inbox.
                        </AlertDescription>
                      </Alert>

                      <FormField
                        control={emailAuthForm.control}
                        name="otpCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex justify-between items-center">
                              Verification Code
                              <Button 
                                type="button" 
                                variant="link" 
                                className="p-0 h-auto text-xs font-medium" 
                                onClick={handleSendOtp}
                                disabled={!canResend}
                              >
                                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                              </Button>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                placeholder="Enter 6-digit code" 
                                maxLength={6}
                                {...field}
                                data-testid="input-otp-login"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                        data-testid="button-submit-login"
                      >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                      </Button>
                    </>
                  )}
                </form>
              </Form>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-6">
          By continuing, you agree to The University Hub's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

