import { AutocompleteSearch } from "../../shared/AutocompleteSearch";
import { HeroVariantProps } from "./index";
import Image from "next/image";
import { useHeroTranslationContent } from "@/hooks/catalog/useHeroTranslations";

export function VideoHero({ 
  heroSection, 
  primaryColor, 
  shopId,
  onSelectModel
}: HeroVariantProps) {
  // Get translated content using the translation hook
  const translatedContent = useHeroTranslationContent(heroSection);
  
  // Default video URL (this would ideally come from the heroSection config)
  const videoUrl = heroSection.videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-typing-on-smartphone-screen-close-up-4121-large.mp4";
  
  return (
    <section className="relative w-full overflow-hidden min-h-[85vh] flex items-center">
      {/* Video Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/50 z-10"></div>
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={videoUrl} type="video/mp4" />
          {/* Fallback image if video doesn't load */}
          <Image
            src={heroSection.backgroundImage}
            alt="Background"
            fill
            priority
            className="object-cover"
          />
        </video>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="flex flex-col space-y-8">
            <div 
              className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm inline-flex items-center gap-2 w-fit"
            >
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}></span>
              <span className="font-medium">{translatedContent.liveBadgeText || "Live Pricing Updates"}</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              {translatedContent.title}
            </h1>
            
            <h2 className="text-xl md:text-2xl text-white/90">
              {translatedContent.subtitle}
            </h2>
            
            {translatedContent.description && (
              <p className="text-base md:text-lg text-white/80 max-w-xl">
                {translatedContent.description}
              </p>
            )}
            
            {/* Device Search */}
            <div className="pt-4 w-full max-w-xl">
              <AutocompleteSearch 
                shopId={shopId} 
                primaryColor={primaryColor} 
                onSelectModel={onSelectModel} 
                placeholder="Search your device model..."
              />
              <p className="text-white/60 text-sm mt-3 ml-4">
                Popular: iPhone 16, Samsung Galaxy S24, MacBook Pro...
              </p>
            </div>
          </div>
          
          {/* Right Content - Floating Price Cards */}
          <div className="hidden md:block relative">
            <div className="relative w-full h-[400px]">
              {/* Animated cards */}
              <div className="absolute top-0 left-0 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg animate-float-slow transform -rotate-3">
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 relative rounded-lg overflow-hidden">
                    <Image 
                      src="https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8aXBob25lfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60" 
                      alt="iPhone"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-medium">iPhone 16 Pro</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-white/60 text-xs">Up to</span>
                      <span className="text-white text-sm font-bold">$750</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="absolute top-[120px] right-0 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg animate-float transform rotate-2">
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 relative rounded-lg overflow-hidden">
                    <Image 
                      src="https://images.unsplash.com/photo-1598327105666-5b89351aff97?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c2Ftc3VuZyUyMGdhbGF4eXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60" 
                      alt="Samsung"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-medium">Galaxy S24 Ultra</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-white/60 text-xs">Up to</span>
                      <span className="text-white text-sm font-bold">$650</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="absolute top-[240px] left-[60px] p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg animate-float-slow-reverse transform -rotate-1">
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 relative rounded-lg overflow-hidden">
                    <Image 
                      src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bWFjYm9va3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60" 
                      alt="MacBook Pro"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-medium">MacBook Pro</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-white/60 text-xs">Up to</span>
                      <span className="text-white text-sm font-bold">$1,200</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-[color:var(--color-primary)]/20 blur-3xl"></div>
            </div>
            
            {/* Stats bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-white">24h</div>
                  <div className="text-xs text-white/60">Fast Payment</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">10K+</div>
                  <div className="text-xs text-white/60">Happy Customers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">100%</div>
                  <div className="text-xs text-white/60">Data Secure</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS for animations - add these to your global CSS */}
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(2deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(2deg); }
        }
        
        @keyframes float-slow {
          0% { transform: translateY(0px) rotate(-3deg); }
          50% { transform: translateY(-15px) rotate(-3deg); }
          100% { transform: translateY(0px) rotate(-3deg); }
        }
        
        @keyframes float-slow-reverse {
          0% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-8px) rotate(-1deg); }
          100% { transform: translateY(0px) rotate(-1deg); }
        }
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
        
        .animate-float-slow-reverse {
          animation: float-slow-reverse 5s ease-in-out infinite;
        }
        
        @keyframes gradient-x {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
      `}</style>
    </section>
  );
}
