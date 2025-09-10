"use client";

import React from 'react';
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface Language {
  id: number;
  code: string;
  name: string;
  is_default?: boolean | number;
}

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: Language | null;
  onLanguageChange: (language: Language) => void;
  disabled?: boolean;
}

export function LanguageSelector({
  languages,
  selectedLanguage,
  onLanguageChange,
  disabled = false
}: LanguageSelectorProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
          disabled={disabled}
        >
          {selectedLanguage ? (
            <span className="flex items-center">
              <span className="mr-2 uppercase">{selectedLanguage.code}</span>
              {selectedLanguage.name}
              {selectedLanguage.is_default && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                  Default
                </span>
              )}
            </span>
          ) : (
            "Select language"
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search language..." />
          <CommandEmpty>No language found.</CommandEmpty>
          <CommandGroup>
            {languages.map((language) => (
              <CommandItem
                key={language.id}
                value={language.name}
                onSelect={() => {
                  onLanguageChange(language);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedLanguage?.id === language.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="mr-2 uppercase">{language.code}</span>
                {language.name}
                {Boolean(language.is_default) && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                    Default
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
