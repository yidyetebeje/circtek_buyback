"use client";

import { useEffect } from "react";
import { ThemeColors, DesignSystem } from "@/types/shop";

interface ThemeProviderProps {
  theme: ThemeColors;
  design?: DesignSystem;
  children: React.ReactNode;
}

export function ThemeProvider({ theme, design, children }: ThemeProviderProps) {
  // Update CSS variables whenever theme or design changes
  useEffect(() => {
    // Color theme
    document.documentElement.style.setProperty('--color-primary', theme.primary);
    document.documentElement.style.setProperty('--color-secondary', theme.secondary);
    document.documentElement.style.setProperty('--color-accent', theme.accent);
    document.documentElement.style.setProperty('--color-background', theme.background || '#ffffff');
    document.documentElement.style.setProperty('--color-text', theme.text || '#111827');

    // Design system - only apply if design is provided
    if (design) {
      // Border radius
      document.documentElement.style.setProperty('--radius-button', design.borderRadius.button);
      document.documentElement.style.setProperty('--radius-card', design.borderRadius.card);
      document.documentElement.style.setProperty('--radius-input', design.borderRadius.input);
      
      // Spacing
      document.documentElement.style.setProperty('--spacing-section', design.spacing.sectionPadding);
      
      // Layout
      const layoutMultiplier = design.layout === 'compact' ? '0.75' : 
                               design.layout === 'spacious' ? '1.5' : '1';
      document.documentElement.style.setProperty('--layout-multiplier', layoutMultiplier);
      
      // Dark mode
      if (design.darkMode) {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
    }
  }, [theme, design]);

  return <>{children}</>;
} 