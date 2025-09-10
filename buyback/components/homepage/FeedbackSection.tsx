"use client";

import { useAtomValue } from "jotai";
import { currentLanguageObjectAtom } from "@/store/atoms";
import { getLocalizedText } from "@/utils/localization";
import { ShopConfig } from "@/types/shop";
import { useState, useEffect } from "react";
import { Star, StarHalf, ChevronLeft, ChevronRight } from 'lucide-react';

interface FeedbackSectionProps {
  shopConfig: ShopConfig;
}

// Define specific types for translation keys to ensure type safety
type ReviewTextKey = 
  | "review1_text" | "review2_text" | "review3_text"
  | "review4_text" | "review5_text" | "review6_text";

type ReviewerNameKey = 
  | "review1_reviewer" | "review2_reviewer" | "review3_reviewer"
  | "review4_reviewer" | "review5_reviewer" | "review6_reviewer";

interface Review {
  id: string;
  stars: number;
  textKey: ReviewTextKey; 
  reviewerKey: ReviewerNameKey; 
  date: string;
}

// Moved to shop config - will be removed

  // Create review data structure using feedbackConfig
  const reviewsData: Review[] = [
    { id: "1", stars: 5, textKey: "review1_text", reviewerKey: "review1_reviewer", date: "12 / 10 / 2024" },
    { id: "2", stars: 5, textKey: "review2_text", reviewerKey: "review2_reviewer", date: "12 / 10 / 2024" },
    { id: "3", stars: 5, textKey: "review3_text", reviewerKey: "review3_reviewer", date: "12 / 10 / 2024" },
    { id: "4", stars: 4, textKey: "review4_text", reviewerKey: "review4_reviewer", date: "11 / 10 / 2024" },
    { id: "5", stars: 5, textKey: "review5_text", reviewerKey: "review5_reviewer", date: "10 / 10 / 2024" },
    { id: "6", stars: 4.5, textKey: "review6_text", reviewerKey: "review6_reviewer", date: "09 / 10 / 2024" },
  ];

export function FeedbackSection({ shopConfig }: FeedbackSectionProps) {
  const currentLanguageObject = useAtomValue(currentLanguageObjectAtom);
  const currentLocale = currentLanguageObject?.code || 'en';
  const fallbackLocale = 'en';

  // Use feedbackConfig from shopConfig with fallbacks
  const feedbackConfig = shopConfig.feedbackConfig || {
    title: { en: "We score 9.5 out of 10 calculated from 10345 customer reviews", nl: "Wij scoren een 9.5 uit 10 berekend uit 10345 reviews van klanten" },
    altLogo: { en: "Feedback Company Logo", nl: "Feedback Bedrijfslogo" },
    ariaPrev: { en: "Previous review", nl: "Vorige recensie" },
    ariaNext: { en: "Next review", nl: "Volgende recensie" },
    review1Text: { en: "Very good", nl: "Zeer goed" },
    review1Reviewer: { en: "Marten Bezemer", nl: "Marten Bezemer" },
    review2Text: { en: "Fast and professional service!", nl: "Snelle en professionele service!" },
    review2Reviewer: { en: "Haarlem Grote Houtstraat", nl: "Haarlem Grote Houtstraat" },
    review3Text: { en: "Top services", nl: "Top services" },
    review3Reviewer: { en: "Schildersbedrijf verhoeven", nl: "Schildersbedrijf verhoeven" },
    review4Text: { en: "Very satisfied!", nl: "Heel tevreden!" },
    review4Reviewer: { en: "Anna K.", nl: "Anna K." },
    review5Text: { en: "Excellent service.", nl: "Uitstekende service." },
    review5Reviewer: { en: "Peter V.", nl: "Peter V." },
    review6Text: { en: "Almost perfect, short waiting time.", nl: "Bijna perfect, kleine wachttijd." },
    review6Reviewer: { en: "Laura B.", nl: "Laura B." },
  };

  // Helper functions to get review text and reviewer names
  const getReviewText = (textKey: ReviewTextKey) => {
    const keyMap: Record<ReviewTextKey, keyof typeof feedbackConfig> = {
      'review1_text': 'review1Text',
      'review2_text': 'review2Text', 
      'review3_text': 'review3Text',
      'review4_text': 'review4Text',
      'review5_text': 'review5Text',
      'review6_text': 'review6Text',
    };
    const configKey = keyMap[textKey];
    return getLocalizedText(feedbackConfig[configKey], currentLocale, fallbackLocale);
  };

  const getReviewerName = (reviewerKey: ReviewerNameKey) => {
    const keyMap: Record<ReviewerNameKey, keyof typeof feedbackConfig> = {
      'review1_reviewer': 'review1Reviewer',
      'review2_reviewer': 'review2Reviewer',
      'review3_reviewer': 'review3Reviewer',
      'review4_reviewer': 'review4Reviewer',
      'review5_reviewer': 'review5Reviewer',
      'review6_reviewer': 'review6Reviewer',
    };
    const configKey = keyMap[reviewerKey];
    return getLocalizedText(feedbackConfig[configKey], currentLocale, fallbackLocale);
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [numVisibleSlides, setNumVisibleSlides] = useState(1);

  useEffect(() => {
    const updateVisibleSlides = () => {
      if (window.innerWidth >= 1024) {
        setNumVisibleSlides(3); // Desktop: 3 slides
      } else if (window.innerWidth >= 640) {
        setNumVisibleSlides(2); // Tablet: 2 slides
      } else {
        setNumVisibleSlides(1); // Mobile: 1 slide
      }
    };
    
    updateVisibleSlides();
    window.addEventListener('resize', updateVisibleSlides);
    return () => window.removeEventListener('resize', updateVisibleSlides);
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
  }, [numVisibleSlides]);

  const totalReviews = reviewsData.length;

  const goNext = () => {
    setCurrentIndex(prev => Math.min(prev + 1, totalReviews - numVisibleSlides));
  };

  const goPrev = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const isPrevDisabled = currentIndex === 0;
  const isNextDisabled = currentIndex >= totalReviews - numVisibleSlides;

  const slideWidthPercent = totalReviews > 0 ? 100 / totalReviews : 100 / numVisibleSlides;
  const wrapperWidthPercent = (totalReviews / numVisibleSlides) * 100;
  const translateXValue = currentIndex * slideWidthPercent;

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const starSize = 16; // Smaller stars for mobile
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="text-white" size={starSize} fill="currentColor" />);
    }
    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="text-white" size={starSize} fill="currentColor" />);
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="text-white" size={starSize} />);
    }
    return stars;
  };

  return (
    <section 
      className="feedback-section text-white py-8 sm:py-12 md:py-16 text-center"
      style={{ backgroundColor: shopConfig.theme.primary }}
    >
      <div className="container mx-auto px-4">
        <div className="mb-4 md:mb-6">
          <img 
            src="https://verkopen.thephonelab.nl/assets/images/6-feedback-section-image.png" 
            alt={getLocalizedText(feedbackConfig.altLogo, currentLocale, fallbackLocale)}
            className="max-w-[140px] sm:max-w-[160px] md:max-w-[180px] rounded-md mx-auto"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://placehold.co/180x50/D74A44/FFFFFF?text=Logo&font=inter';
            }}
          />
        </div>
        
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold max-w-4xl mx-auto mb-6 sm:mb-8 md:mb-10 lg:mb-16 leading-tight px-2">
          {getLocalizedText(feedbackConfig.title, currentLocale, fallbackLocale)}
        </h2>
        
        <div className="relative w-full max-w-6xl mx-auto">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-in-out"
              style={{
                width: `${wrapperWidthPercent}%`,
                transform: `translateX(-${translateXValue}%)`,
              }}
            >
              {reviewsData.map((review, index) => (
                <div
                  key={review.id}
                  className="relative px-2 sm:px-3 md:px-4 flex-shrink-0"
                  style={{ width: `${slideWidthPercent}%` }}
                >
                  <div className="feedback__item py-4 sm:py-5 md:py-6 px-3 sm:px-4 flex flex-col justify-between min-h-[160px] sm:min-h-[180px] md:min-h-[200px] h-full">
                    <div className="stars mb-2 sm:mb-3 md:mb-4 flex flex-row items-center justify-center">
                      {renderStars(review.stars)}
                    </div>
                    <div className="feedback__text text-xs sm:text-sm md:text-base leading-relaxed mb-3 sm:mb-4 font-medium min-h-[40px] sm:min-h-[50px] md:min-h-[60px] flex-grow flex items-center justify-center">
                      <span className="text-center">{getReviewText(review.textKey)}</span>
                    </div>
                    <div className="feedback__info text-xs md:text-sm">
                      <span className="reviewer-name font-bold mr-1 md:mr-2 block sm:inline">
                        {getReviewerName(review.reviewerKey)}
                      </span>
                      <span className="review-date text-sm md:text-lg opacity-90 font-bold block sm:inline">{review.date}</span>
                    </div>
                  </div>
                  
                  {/* Show separator only on desktop and not for last item */}
                  {index < totalReviews - 1 && numVisibleSlides >= 3 && (
                    <div 
                      className="absolute top-[15%] bottom-[15%] right-0 w-px"
                      style={{
                        backgroundImage: 'linear-gradient(to bottom, white 50%, transparent 50%)',
                        backgroundSize: '1px 10px',
                        backgroundRepeat: 'repeat-y'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <button 
            onClick={goPrev}
            disabled={isPrevDisabled}
            className={`absolute top-1/2 -translate-y-1/2 left-1 sm:left-2 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center bg-white bg-opacity-15 hover:bg-opacity-30 rounded-lg transition-all z-10 ${isPrevDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label={getLocalizedText(feedbackConfig.ariaPrev, currentLocale, fallbackLocale)}
          >
            <ChevronLeft size={16} className="sm:w-5 sm:h-5 text-black"/>
          </button>
          
          <button 
            onClick={goNext}
            disabled={isNextDisabled}
            className={`absolute top-1/2 -translate-y-1/2 right-1 sm:right-2 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center bg-white bg-opacity-15 hover:bg-opacity-30 rounded-lg transition-all z-10 ${isNextDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label={getLocalizedText(feedbackConfig.ariaNext, currentLocale, fallbackLocale)}
          >
            <ChevronRight size={16} className="sm:w-5 sm:h-5 text-black" />
          </button>
        </div>
      </div>
    </section>
  );
}
