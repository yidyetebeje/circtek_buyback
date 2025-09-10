"use client";

import Link from "next/link";
import { ShopConfig } from "@/types/shop";

interface TrackOrderButtonProps {
  shopConfig: ShopConfig;
}

export function TrackOrderButton({ shopConfig }: TrackOrderButtonProps) { // eslint-disable-line @typescript-eslint/no-unused-vars
  return (
    <Link 
      href="/track-order" 
      className="flex items-center text-sm font-medium hover:text-opacity-80 transition-colors gap-1.5"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
        />
      </svg>
      Track Order
    </Link>
  );
}
