"use client";

import { ShopConfig } from "@/types/shop";

interface BenefitsBarProps {
  shopConfig: ShopConfig;
}

export function BenefitsBar({ shopConfig }: BenefitsBarProps) {
  // Default benefits data
  const defaultBenefits = [
    { id: "free-shipping", text: "Free shipping both ways", icon: "truck" },
    { id: "money-back", text: "Money back guarantee", icon: "shield-check" },
    { id: "instant-payments", text: "Instant payments", icon: "cash" },
    { id: "professional", text: "Professional service", icon: "star" }
  ];

  // Use customized benefits from shop config or fallback to defaults
  const benefitsConfig = shopConfig.benefits || {
    items: defaultBenefits,
    alignment: 'center',
    backgroundColor: shopConfig.theme.primary,
    textColor: '#ffffff',
    iconColor: '#ffffff',
    showBenefits: true
  };

  // Don't render if benefits are hidden
  if (!benefitsConfig.showBenefits || benefitsConfig.items.length === 0) {
    return null;
  }

  // Get icon component based on name
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "truck":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        );
      case "shield-check":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case "cash":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case "star":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        );
      case "check":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "clock":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "lightning":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
    }
  };
  
  // Get the alignment class based on config
  const getAlignmentClass = () => {
    switch (benefitsConfig.alignment) {
      case 'left': return 'justify-start';
      case 'center': return 'justify-center';
      case 'right': return 'justify-end';
      case 'space-between': return 'justify-between';
      case 'space-around': return 'justify-around';
      default: return 'justify-center';
    }
  };
  
  return (
    <div 
      className="w-full py-2 border-b border-opacity-15 relative z-10"
      style={{ 
        backgroundColor: benefitsConfig.backgroundColor,
        color: benefitsConfig.textColor,
        borderColor: benefitsConfig.textColor + '20'
      }}
    >
      <div className="container mx-auto px-4">
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 ${getAlignmentClass()}`}>
          {benefitsConfig.items.map((benefit) => (
            <div key={benefit.id} className="flex items-center gap-2 justify-center md:justify-start">
              <div className="bg-white bg-opacity-20 rounded-full p-1.5" style={{ color: benefitsConfig.iconColor }}>
                {getIcon(benefit.icon)}
              </div>
              <span className="text-xs font-medium">{benefit.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
