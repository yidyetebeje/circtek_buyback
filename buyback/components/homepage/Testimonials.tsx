import Image from "next/image";
import { ShopConfig } from "@/types/shop";

interface TestimonialsProps {
  shopConfig: ShopConfig;
}

export function Testimonials({ shopConfig }: TestimonialsProps) {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[color:var(--color-primary)]/5 via-transparent to-[color:var(--color-accent)]/5 -z-10"></div>
      <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-tl from-[color:var(--color-primary)]/10 to-transparent blur-3xl"></div>
      
      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col items-center mb-16">
          <div className="inline-flex items-center justify-center mb-4">
            <span className="h-[1px] w-10 bg-gray-300"></span>
            <span 
              className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-center mx-3 rounded-full"
              style={{ 
                color: shopConfig.theme.primary,
                backgroundColor: `${shopConfig.theme.primary}10` 
              }}
            >
              Testimonials
            </span>
            <span className="h-[1px] w-10 bg-gray-300"></span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
            Customer Success Stories
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-center text-lg">
            See what our satisfied customers have to say about their experience
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative bg-white/60 backdrop-blur-md rounded-2xl p-8 shadow-md transition-all duration-300 hover:shadow-xl" style={{
            boxShadow: '0 10px 40px -15px rgba(0,0,0,0.05)',
          }}>
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-12 h-12 bg-white shadow-md rounded-full flex items-center justify-center text-3xl text-[color:var(--color-primary)]">
              <span>&ldquo;</span>
            </div>
            
            <div className="flex items-center mb-6">
              <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-white shadow-sm mr-4">
                <Image
                  src="https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960"
                  alt="Sarah Johnson"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h4 className="font-semibold text-lg">Sarah Johnson</h4>
                <p className="text-sm text-gray-500">iPhone 15 Pro Seller</p>
              </div>
            </div>
            
            <p className="text-gray-600 italic mb-4 text-lg leading-relaxed">
              &ldquo;I was amazed at how quick and easy it was to sell my old iPhone. The price offered was better than any other buyback service I tried! The entire process took less than a week.&rdquo;
            </p>
            
            <div className="flex mt-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-400">
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                </svg>
              ))}
            </div>
          </div>
          
          <div className="relative bg-white/60 backdrop-blur-md rounded-2xl p-8 shadow-md transition-all duration-300 hover:shadow-xl mt-10 md:mt-0" style={{
            boxShadow: '0 10px 40px -15px rgba(0,0,0,0.05)',
          }}>
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-12 h-12 bg-white shadow-md rounded-full flex items-center justify-center text-3xl text-[color:var(--color-primary)]">
              <span>&ldquo;</span>
            </div>
            
            <div className="flex items-center mb-6">
              <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-white shadow-sm mr-4">
                <Image
                  src="https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960"
                  alt="Michael Chen"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h4 className="font-semibold text-lg">Michael Chen</h4>
                <p className="text-sm text-gray-500">MacBook Pro Seller</p>
              </div>
            </div>
            
            <p className="text-gray-600 italic mb-4 text-lg leading-relaxed">
              &ldquo;The entire process from quote to payment took less than a week. Very professional service and great communication throughout. I&apos;ll definitely use this service again!&rdquo;
            </p>
            
            <div className="flex mt-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-400">
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                </svg>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center mt-16">
          <button 
            className="inline-flex items-center justify-center rounded-full px-8 py-3 font-medium transition-all duration-300 border"
            style={{ 
              borderColor: `${shopConfig.theme.primary}50`, 
              color: shopConfig.theme.primary,
              backgroundColor: `${shopConfig.theme.primary}08`
            }}
          >
            Read More Reviews
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
} 