"use client";

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function DiagnosticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="w-full py-10 flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-red-500 mb-6">{error.message}</p>
      <Button
        onClick={
          () => reset()
        }
      >
        Try again
      </Button>
    </div>
  );
} 