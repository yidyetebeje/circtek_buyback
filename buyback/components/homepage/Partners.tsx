import Image from "next/image";
import { ShopConfig } from "@/types/shop";

interface PartnersProps {
  shopConfig: ShopConfig;
}

export function Partners({ shopConfig }: PartnersProps) {
  // Mock partner data - in a real app, this would come from API or config
  const partners = [
    { id: 1, name: "Apple Recycling", logo: "https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960" },
    { id: 2, name: "Samsung Certified", logo: "https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960" },
    { id: 3, name: "Green Tech Solutions", logo: "https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960" },
    { id: 4, name: "Eco Reclaim", logo: "https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960" },
    { id: 5, name: "Tech Renew", logo: "https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960" },
    { id: 6, name: "Circular Electronics", logo: "https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960" },
  ];

  return (
    <section className="section relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-gray-50/80 -z-10"></div>
      <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-bl from-[color:var(--color-accent)]/10 to-transparent blur-3xl"></div>
      
      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col items-center" style={{ marginBottom: `calc(4rem * var(--layout-multiplier))` }}>
          <div className="inline-flex items-center justify-center mb-4">
            <span className="h-[1px] w-10 bg-gray-300"></span>
            <span 
              className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-center mx-3 rounded-full"
              style={{ 
                color: shopConfig.theme.primary,
                backgroundColor: `${shopConfig.theme.primary}10`,
                borderRadius: 'var(--radius-button)'
              }}
            >
              Trusted By
            </span>
            <span className="h-[1px] w-10 bg-gray-300"></span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
            Our Partners
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-center text-lg">
            We work with certified recycling and distribution partners to ensure your device finds its best next home
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8" style={{ gap: `calc(2rem * var(--layout-multiplier))` }}>
          {partners.map((partner) => (
            <div 
              key={partner.id} 
              className="flex flex-col items-center group"
            >
              <div className="relative w-24 h-24 mb-4 bg-white/90 p-4 shadow-sm transition-all duration-300 group-hover:shadow-md flex items-center justify-center"
                style={{ 
                  borderRadius: 'var(--radius-card)',
                  width: `calc(6rem * var(--layout-multiplier))`,
                  height: `calc(6rem * var(--layout-multiplier))`
                }}
              >
                <Image
                  src={partner.logo}
                  alt={partner.name}
                  fill
                  className="object-contain p-2 opacity-70 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-white/5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ borderRadius: 'var(--radius-card)' }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-700">{partner.name}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-16 flex justify-center" style={{ marginTop: `calc(4rem * var(--layout-multiplier))` }}>
          <div className="flex flex-col items-center max-w-2xl text-center">
            <div className="flex items-center space-x-1 text-yellow-400 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-gray-600 text-base italic mb-1">
              &ldquo;All our partners meet strict environmental and data security standards to ensure responsible recycling and data protection.&rdquo;
            </p>
            <span className="text-sm font-medium" style={{ color: shopConfig.theme.primary }}>
              Environmental Certification
            </span>
          </div>
        </div>
      </div>
    </section>
  );
} 