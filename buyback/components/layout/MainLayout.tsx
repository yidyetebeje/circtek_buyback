import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { FAQSection } from "./FAQSection";
import { ShopConfig } from "@/types/shop";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { CustomizeFab } from "@/components/config/CustomizeFab";

interface MainLayoutProps {
  children: ReactNode;
  shopConfig: ShopConfig;
}

export function MainLayout({ children, shopConfig }: MainLayoutProps) {
  return (
    <ThemeProvider theme={shopConfig.theme} design={shopConfig.design}>
      <div className="flex flex-col min-h-screen" style={{ 
        backgroundColor: shopConfig.theme.background, 
        color: shopConfig.theme.text,
      }}>
        <Header shopConfig={shopConfig} />
        <main className="flex-grow w-full">
          {children}
        </main>
        {/* FAQ Section above footer */}
        <FAQSection shopConfig={shopConfig} shopId={parseInt(shopConfig.shopId)} />
        <Footer shopConfig={shopConfig} />
        <CustomizeFab />
      </div>
    </ThemeProvider>
  );
} 