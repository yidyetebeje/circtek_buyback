"use client";

import { useAtomValue, useAtom } from "jotai";
import { currentLanguageObjectAtom, activeComponentAtom, editModeAtom } from "@/store/atoms";
import { ShopConfig } from "@/types/shop";
import { FooterVariants, FooterVariantType, defaultFooterVariant4Props, FooterVariant4Props as FV4Props } from "./footer-variants"; // Adjusted import
import { useSession } from "next-auth/react";

interface FooterProps {
  shopConfig: ShopConfig;
}

export function Footer({ shopConfig }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const currentLanguageObject = useAtomValue(currentLanguageObjectAtom);
  const currentLocale = currentLanguageObject?.code || 'en';
  const fallbackLocale = 'en';
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isEditMode = useAtomValue(editModeAtom);
  const canEdit = isAuthenticated && isEditMode;
  const [, setActiveComponent] = useAtom(activeComponentAtom);
  
  // Function to handle editing the footer
  const handleComponentEdit = () => {
    setActiveComponent('footer');
  };
  
  // Get footer configuration or use defaults
  const footerConfig = shopConfig.footerConfig || {
    variant: 'default',
    backgroundColor: shopConfig.theme.background,
    textColor: shopConfig.theme.text,
    showLogo: true,
    logoPosition: 'left',
    showCopyright: true,
  };

  // Check if locations link exists in any of the footer sections
  const hasLocationsLink = shopConfig.footerLinks?.some(section => 
    section.links.some(link => link.url.includes('/locations'))
  );

  // Create default quick links section if none exists or add to it
  const quickLinksSection = shopConfig.footerLinks?.find(section => 
    section.title === "Quick Links" || 
    section.title === "Links" || 
    section.title === "Navigation"
  );

  // If we need to add the locations link and there's no suitable section, create a default one
  const footerLinks = [...(shopConfig.footerLinks || [])];
  
  if (!hasLocationsLink) {
    if (quickLinksSection) {
      // Add to existing quick links section
      const sectionIndex = footerLinks.findIndex(section => section === quickLinksSection);
      footerLinks[sectionIndex] = {
        ...quickLinksSection,
        links: [
          ...quickLinksSection.links,
          { label: "Our Locations", url: `/${currentLocale}/locations` }
        ]
      };
    } else {
      // Create a new quick links section
      footerLinks.push({
        title: "Quick Links",
        links: [
          { label: "Home", url: "/" },
          { label: "Our Locations", url: `/${currentLocale}/locations` }
        ]
      });
    }
  }

  // Select the appropriate footer variant component
  const variant = footerConfig.variant || 'default';
  const SelectedFooterVariantComponent = FooterVariants[variant as FooterVariantType] || FooterVariants.default;

  let variantSpecificProps: Record<string, unknown>;
  // Prepare props based on the *actual* component being rendered
  if (SelectedFooterVariantComponent === FooterVariants.variant4) {
    const v4config = shopConfig.footerConfig?.variant4Options as FV4Props | undefined;
    variantSpecificProps = {
      ...(v4config || defaultFooterVariant4Props), // Use variant4 specific config or its defaults
      // Pass common props that FooterVariant4 might also use or expect, for consistency or future use.
      // These are passed to other variants, so FooterVariant4 can also access them if needed.
      shopConfig,
      currentLocale,
      fallbackLocale,
      currentYear,
      // Ensure general theme/footerConfig settings are applied if FooterVariant4 doesn't have its own specific background/text color props
      // or if FooterVariant4 is designed to inherit these. FooterVariant4.tsx uses its own 'containerClass' and 'textColor' props.
      backgroundColor: footerConfig.backgroundColor || shopConfig.theme.background,
      textColor: footerConfig.textColor || shopConfig.theme.text,
    };
  } else {
    // For DefaultFooter, MinimalFooter, ExpandedFooter, etc.
    variantSpecificProps = {
      shopConfig,
      currentLocale,
      fallbackLocale,
      currentYear,
      footerLinks, // Crucially, provide the footerLinks array these components expect
      backgroundColor: footerConfig.backgroundColor,
      textColor: footerConfig.textColor,
    };
  }

  return (
    <div className="relative">
      {/* Edit button - only visible when authenticated */}
      {canEdit && (
        <button 
          onClick={handleComponentEdit}
          className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg transition-all z-50"
          title="Edit Footer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
      )}
      
      <footer className="w-full py-8 border-t border-gray-200" style={{ 
        backgroundColor: footerConfig.backgroundColor || shopConfig.theme.background, 
        color: footerConfig.textColor || shopConfig.theme.text 
      }}>
        {/* Render the selected footer variant */}
        <SelectedFooterVariantComponent {...variantSpecificProps} />
      </footer>
    </div>
  );
}