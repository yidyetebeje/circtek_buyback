'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePublishedModels } from '@/hooks/catalog/usePublishedModels';
import { usePublishedModelsByCategorySlug } from '@/hooks/catalog/useShops';
import { Model } from '@/types/catalog';
import { PaginatedResponse } from '@/lib/api/types'; // Import PaginatedResponse

const DEBOUNCE_DELAY = 500; // milliseconds

interface AutocompleteSearchProps {
  shopId: number;
  categorySlug?: string;
  onSelectModel?: (model: Model) => void;
  primaryColor?: string;
  placeholder?: string;
  debounceMs?: number;
}

export function AutocompleteSearch({
  shopId,
  categorySlug,
  onSelectModel,
  primaryColor = '#007bff',
  placeholder = 'Search for your device (e.g., iPhone 16, MacBook Pro)...',
  debounceMs = DEBOUNCE_DELAY,
}: AutocompleteSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, debounceMs]);

  const hookParams = { search: debouncedSearchTerm, limit: 6 };

  // Query for general search
  const generalSearchResult = usePublishedModels(
    !categorySlug ? shopId : undefined, // Only enable if no categorySlug
    hookParams,
    debounceMs
  );

  // Query for category-specific search
  const categorySearchResult = usePublishedModelsByCategorySlug(
    categorySlug ? shopId : 0, // Pass shopId if categorySlug is present, otherwise a dummy 0 (hook will be disabled)
    categorySlug || '', // Pass categorySlug, or empty string (hook will be disabled if no categorySlug)
    hookParams
  );

  // Determine which result to use
  let modelsResponse: PaginatedResponse<Model> | undefined;
  let isLoading: boolean;
  let isError: boolean;
  let error: Error | null;

  if (categorySlug) {
    modelsResponse = categorySearchResult.data;
    isLoading = categorySearchResult.isLoading;
    isError = categorySearchResult.isError;
    error = categorySearchResult.error;
  } else {
    modelsResponse = generalSearchResult.data;
    isLoading = generalSearchResult.isLoading;
    isError = generalSearchResult.isError;
    error = generalSearchResult.error;
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearch = () => {
    if (onSelectModel && searchTerm && modelsResponse?.data?.[0]) {
     
    }
    setIsOpen(false);
  };

  const handleSuggestionClick = (model: Model) => {
    setSearchTerm(model.title);
    if (onSelectModel) {
      onSelectModel(model);
    }
    setIsOpen(false);
  };

  return (
    <div className="w-full max-w-xl relative z-20" ref={searchRef}>
      <div className="relative flex items-center">
        <div className="absolute left-5 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder={placeholder}
          className="w-full py-4 pl-12 pr-16 text-base bg-white/90 backdrop-blur-md rounded-full border border-gray-200 shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-300"
          style={{ 
            color: "#333",
          }}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (e.target.value.length > 0) {
              setIsOpen(true);
            } else {
              setIsOpen(false);
            }
          }}
          onFocus={() => searchTerm && setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <div className="absolute right-3 p-2 text-black">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div className="z-[100000] absolute mt-2 w-full bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 overflow-hidden z-auto transform transition-all duration-200 animate-fade-in">
          {isLoading && (
            <div className="px-5 py-3 text-gray-500 text-center">Loading...</div>
          )}
          
          {isError && (
            <div className="px-5 py-3 text-red-500 text-center">
              Error: {error?.message || 'Could not fetch suggestions'}
            </div>
          )}
          
          {!isLoading && !isError && modelsResponse?.data && modelsResponse.data.length === 0 && searchTerm && (
            <div className="px-5 py-3 text-gray-500 text-center">No devices found</div>
          )}
          
          {!isLoading && !isError && modelsResponse?.data && modelsResponse.data.length > 0 && (
            <ul>
              {modelsResponse.data.map((model) => (
                <li 
                  key={model.id}
                  className="px-5 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors duration-150"
                  onClick={() => handleSuggestionClick(model)}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{model.title}</div>
                    {model.category_id && (
                      <div 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ 
                          backgroundColor: `${primaryColor}15`,
                          color: primaryColor
                        }}
                      >
                        Device
                      </div>
                    )}
                  </div>
                </li>
              ))}
              
            </ul>
          )}
        </div>
      )}
    </div>
  );
} 