'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { displayConfigAtom } from '@/store/atoms';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { signIn } from 'next-auth/react';
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

export function LoginPageClient() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/en/admin/dashboards';
  const config = useAtomValue(displayConfigAtom);
  const [isMounted, setIsMounted] = useState(false);
  
  // Prevent hydration mismatch by only rendering dynamic content after mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
     
     
      
      const result = await signIn('credentials', {
        identifier: email,
        password: password,
        redirect: false,
        callbackUrl,
      });

     

      if (result.error) {
        // Instead of using result.error directly (which might be a technical string like "CredentialsSignin"),
        // display a generic user-friendly message.
        const userFriendlyMessage = "Invalid email or password";
        toast.error("Login failed. Please check your credentials."); // This toast provides a general failure notice
        setError(userFriendlyMessage); // This sets the specific error message in the UI
        setIsLoading(false);
        return;
      }
      
      // Only show success and redirect if we have a successful result
      toast.success("Login successful!");
      
      // Ensure the callbackUrl includes the locale
      let redirectUrl = callbackUrl;
      if (!redirectUrl.startsWith('/en/')) {
        redirectUrl = `/en${redirectUrl.startsWith('/') ? '' : '/'}${redirectUrl}`;
      }
      
     
      router.push(redirectUrl);
      router.refresh();
    } catch (error) {
      console.error('Login error:', error);
      toast.error("An error occurred during login");
      setError('An error occurred during login. Please try again.');
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-2 items-center text-center">
        {isMounted && config.logoUrl ? (
          <div className="w-32 h-16 relative mx-auto mb-4">
            <Image
              src={config.logoUrl}
              alt={config.shopName || 'Company Logo'}
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        ) : (
          <div className="text-2xl font-bold mb-4" style={isMounted ? { color: config.theme?.primary } : undefined}>
            {isMounted ? (config.shopName || 'Admin Portal') : 'Admin Portal'}
          </div>
        )}
        <CardTitle className="text-2xl">Admin Login</CardTitle>
        <CardDescription>Enter your credentials to access the dashboard</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email or Username</Label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors group-focus-within:text-primary" />
              <Input
                id="email"
                type="text"
                placeholder="Email or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2 mb-6">
            <Label htmlFor="password">Password</Label>
            <div className="relative group flex items-center">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors group-focus-within:text-primary" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 pr-10 w-full"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-500 hover:bg-accent hover:text-accent-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
            style={isMounted ? { 
              backgroundColor: config.theme?.primary,
              borderColor: config.theme?.primary,
            } : undefined}
          >
            {isLoading ? (
              <>
                <span className="mr-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
                Signing in...
              </>
            ) : 'Sign in'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 