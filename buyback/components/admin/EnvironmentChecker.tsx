'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function EnvironmentChecker() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.warn('NEXT_PUBLIC_API_URL is not defined in environment variables');
      toast.warning('API URL not configured properly. Authentication may fail.');
    } else {
     
    }
    
    // Test if the auth API is accessible without language prefix
    fetch('/api/auth-check')
      .then(response => response.json())
      .then(data => {
       
        if (data.success) {
         
        } else {
          toast.error('Auth API check failed');
        }
      })
      .catch(error => {
        console.error('Error checking auth API:', error);
        toast.error('Failed to connect to auth API. Authentication may not work properly.');
      });

    // We can't check NEXTAUTH_URL and NEXTAUTH_SECRET from the client
    // as they're server-only environment variables
    
    setChecked(true);
  }, [checked]);

  // This component doesn't render anything
  return null;
} 