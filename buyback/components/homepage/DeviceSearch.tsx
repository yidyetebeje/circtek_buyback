"use client";

import { useState, useRef, useEffect } from "react";

// Mock data for device suggestions - in a real app, this would come from an API
const DEVICE_SUGGESTIONS = [
  { id: 1, name: "iPhone 16", category: "Smartphones" },
  { id: 2, name: "iPhone 15 Pro", category: "Smartphones" },
  { id: 3, name: "iPhone 15", category: "Smartphones" },
  { id: 4, name: "iPhone 14 Pro", category: "Smartphones" },
  { id: 5, name: "Samsung Galaxy S24", category: "Smartphones" },
  { id: 6, name: "Samsung Galaxy S23", category: "Smartphones" },
  { id: 7, name: "Google Pixel 8", category: "Smartphones" },
  { id: 8, name: "iPad Pro", category: "Tablets" },
  { id: 9, name: "iPad Air", category: "Tablets" },
  { id: 10, name: "MacBook Pro M3", category: "Laptops" },
  { id: 11, name: "MacBook Air M2", category: "Laptops" },
  { id: 12, name: "Apple Watch Series 9", category: "Smartwatches" },
  { id: 13, name: "PlayStation 5", category: "Gaming Consoles" },
  { id: 14, name: "Xbox Series X", category: "Gaming Consoles" },
];

interface DeviceSearchProps {
  primaryColor: string;
  onSearch?: (device: string) => void;
}

export function DeviceSearch({ primaryColor, onSearch }: DeviceSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<typeof DEVICE_SUGGESTIONS>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSuggestions([]);
      return;
    }
    
    const filtered = DEVICE_SUGGESTIONS.filter(device => 
      device.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSuggestions(filtered.slice(0, 6)); // Limit to 6 suggestions
  }, [searchQuery]);

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
    if (onSearch && searchQuery) {
      onSearch(searchQuery);
    }
    setIsOpen(false);
  };

  const handleSuggestionClick = (deviceName: string) => {
    setSearchQuery(deviceName);
    if (onSearch) {
      onSearch(deviceName);
    }
    setIsOpen(false);
  };

  return (
    <div className="w-full max-w-xl relative" ref={searchRef}>
      <div className="relative flex items-center">
        <div className="absolute left-5 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search for your device (e.g., iPhone 16, MacBook Pro)..."
          className={`w-full py-4 pl-12 pr-16 text-base bg-white/90 backdrop-blur-md rounded-full border border-gray-200 shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-300`}
          style={{ 
            color: "#333",
          }}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <button
          className="absolute right-3 p-2 rounded-full text-white shadow-sm hover:shadow-md transition-all duration-300"
          style={{ backgroundColor: primaryColor }}
          onClick={handleSearch}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute mt-2 w-full bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 transform transition-all duration-200 animate-fade-in">
          <ul>
            {suggestions.map((device) => (
              <li 
                key={device.id}
                className="px-5 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors duration-150"
                onClick={() => handleSuggestionClick(device.name)}
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium">{device.name}</div>
                  <div 
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ 
                      backgroundColor: `${primaryColor}15`,
                      color: primaryColor
                    }}
                  >
                    {device.category}
                  </div>
                </div>
              </li>
            ))}
            <li className="px-5 py-2 bg-gray-50 text-center">
              <button 
                className="text-sm font-medium"
                style={{ color: primaryColor }}
                onClick={handleSearch}
              >
                See all results for &quot;{searchQuery}&quot;
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
} 