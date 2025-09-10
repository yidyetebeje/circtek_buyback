import React from 'react';
import { Facebook, Linkedin, Instagram, Youtube } from 'lucide-react';

// Placeholder for TranslatableText type - replace with your actual import
export type TranslatableText = {
  en: string;
  de?: string;
  nl?: string;
  // Add other languages as needed
};

// Placeholder for getTranslatedText function - replace with your actual implementation
const getTranslatedText = (text: TranslatableText | string | undefined, locale: string): string => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text[locale as keyof TranslatableText] || text.en || '';
};

// Define TypeScript interfaces for props
export interface LinkItem {
  text: TranslatableText; // Changed to TranslatableText
  href: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
}

export interface SocialLinkItem {
  iconName: 'facebook' | 'linkedin' | 'instagram' | 'youtube' | 'tiktok' | string; 
  href: string;
  ariaLabel: TranslatableText; // Changed to TranslatableText
  customIconSvg?: string; 
}

export interface FooterVariant4Props {
  columnTitles: {
    thePhoneLab: TranslatableText;
    sitemap: TranslatableText;
    winkels: TranslatableText;
    social: TranslatableText;
    authorisations: TranslatableText;
  };
  thePhoneLabLinks: LinkItem[];
  sitemapLinks: LinkItem[];
  winkelsLinks: LinkItem[];
  socialLinks: SocialLinkItem[];
  authorisationLinks: LinkItem[];
  poweredByText: TranslatableText;
  poweredByLink: LinkItem; // LinkItem.text is already TranslatableText
  backgroundColor?: string; 
  textColor?: string; 
  linkColor?: string; 
  linkHoverColor?: string; 
  titleColor?: string; 
  currentLocale?: string; // To pass the current language
}

// TikTok SVG Icon Component
const TikTokIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512" fill="currentColor" {...props}>
    <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" />
  </svg>
);

const IconMap: { [key: string]: React.ElementType } = {
  facebook: Facebook,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: TikTokIcon,
};

export const FooterVariant4: React.FC<FooterVariant4Props> = ({
  columnTitles,
  thePhoneLabLinks,
  sitemapLinks,
  winkelsLinks,
  socialLinks,
  authorisationLinks,
  poweredByText,
  poweredByLink,
  backgroundColor = 'bg-neutral-50',
  textColor = 'text-neutral-700',
  linkColor = 'text-neutral-600',
  linkHoverColor = 'hover:text-red-600',
  titleColor = 'text-neutral-800',
  currentLocale = 'en', // Default to 'en' if not provided
}) => {
  const locale = currentLocale; // Use the passed locale
  return (
    <footer className={`${backgroundColor} ${textColor} py-8 md:py-12`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: ThePhoneLab */}
          <div className="footer-nav">
            <h4 className={`text-lg font-semibold ${titleColor} mb-4`}>{getTranslatedText(columnTitles.thePhoneLab, locale)}</h4>
            <ul className="list-none p-0 m-0 space-y-2">
              {Array.isArray(thePhoneLabLinks) && thePhoneLabLinks.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className={`${linkColor} ${linkHoverColor} text-sm`} target={link.target || '_self'}>
                    {getTranslatedText(link.text, locale)}
                  </a>
                </li>
              ))}
            </ul>
            <div className={`mt-4 text-sm ${textColor}`}>
              {getTranslatedText(poweredByText, locale)}{' '}
              <a 
                href={poweredByLink.href} 
                className="font-semibold text-[#e72329] hover:underline" 
                target={poweredByLink.target || '_blank'} 
                rel={poweredByLink.target === '_blank' ? 'noopener noreferrer' : undefined}
              >
                {getTranslatedText(poweredByLink.text, locale)}
              </a>
            </div>
          </div>

          {/* Column 2: Sitemap */}
          <div className="footer-nav">
            <h4 className={`text-lg font-semibold ${titleColor} mb-4`}>{getTranslatedText(columnTitles.sitemap, locale)}</h4>
            <ul className="list-none p-0 m-0 space-y-2">
              {Array.isArray(sitemapLinks) && sitemapLinks.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className={`${linkColor} ${linkHoverColor} text-sm`} target={link.target || '_self'}>
                    {getTranslatedText(link.text, locale)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Winkels */}
          <div className="footer-nav">
            <h4 className={`text-lg font-semibold ${titleColor} mb-4`}>{getTranslatedText(columnTitles.winkels, locale)}</h4>
            <ul className="list-none p-0 m-0 space-y-2">
              {Array.isArray(winkelsLinks) && winkelsLinks.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className={`${linkColor} ${linkHoverColor} text-sm`} target={link.target || '_self'}>
                    {getTranslatedText(link.text, locale)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Social & Authorisations */}
          <div className="footer-nav">
            <h4 className={`text-lg font-semibold ${titleColor} mb-4`}>{getTranslatedText(columnTitles.social, locale)}</h4>
            <ul className="list-none p-0 m-0 flex items-center space-x-3 mb-6">
              {Array.isArray(socialLinks) && socialLinks.map((social, index) => {
                const IconComponent = IconMap[social.iconName.toLowerCase()] || (() => <span title={social.iconName}></span>);
                return (
                  <li key={index}>
                    <a href={social.href} aria-label={getTranslatedText(social.ariaLabel, locale)} className={`${linkColor} ${linkHoverColor}`} target="_blank" rel="noopener noreferrer">
                      <IconComponent size={20} />
                    </a>
                  </li>
                );
              })}
            </ul>

            <h4 className={`text-lg font-semibold ${titleColor} mb-4 mt-6`}>{getTranslatedText(columnTitles.authorisations, locale)}</h4>
            <ul className="list-none p-0 m-0 space-y-2">
              {Array.isArray(authorisationLinks) && authorisationLinks.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className={`${linkColor} ${linkHoverColor} text-sm`} target={link.target || '_self'}>
                    {getTranslatedText(link.text, locale)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Default props for easy use and for editor initialization
export const defaultFooterVariant4Props: FooterVariant4Props = {
  columnTitles: {
    thePhoneLab: { en: "ThePhoneLab", de: "ThePhoneLab", nl: "ThePhoneLab" },
    sitemap: { en: "Sitemap", de: "Seitenübersicht", nl: "Sitemap" },
    winkels: { en: "Stores", de: "Geschäfte", nl: "Winkels" },
    social: { en: "Let's get social", de: "Lasst uns sozial werden", nl: "Let's get social" },
    authorisations: { en: "Our Authorizations", de: "Unsere Berechtigungen", nl: "Onze autorisaties" },
  },
  thePhoneLabLinks: [
    { text: { en: "General Terms and Conditions", de: "Allgemeine Geschäftsbedingungen", nl: "Algemene voorwaarden" }, href: "https://thephonelab.nl/algemene-voorwaarden" },
    { text: { en: "Privacy Statement", de: "Datenschutzerklärung", nl: "Privacy statement" }, href: "https://thephonelab.nl/privacy-statement/" },
    { text: { en: "Disclaimer", de: "Haftungsausschluss", nl: "Disclaimer" }, href: "https://thephonelab.nl/disclaimer/" },
    { text: { en: "What customers say", de: "Was Kunden sagen", nl: "Wat klanten zeggen" }, href: "https://thephonelab.nl/reviews-over-thephonelab/" },
    { text: { en: "The Team", de: "Das Team", nl: "Het team" }, href: "https://thephonelab.nl/over-ons/" },
    { text: { en: "Vacancies", de: "Stellenangebote", nl: "Vacatures" }, href: "https://werkenbij.thephonelab.nl/", target: "_blank" },
    { text: { en: "Our 5 promises to you", de: "Unsere 5 Versprechen an Sie", nl: "Onze 5 beloftes aan jou" }, href: "https://thephonelab.nl/de-5-beloftes-van-thephonelab/" },
    { text: { en: "About Us", de: "Über uns", nl: "Over ons" }, href: "https://thephonelab.nl/over-thephonelab/" },
  ],
  sitemapLinks: [
    { text: { en: "Home", de: "Startseite", nl: "Home" }, href: "https://verkopen.thephonelab.nl" },
    { text: { en: "Sell", de: "Verkaufen", nl: "Verkopen" }, href: "https://thephonelab.nl/reparaties/" },
    { text: { en: "Stores", de: "Geschäfte", nl: "Winkels" }, href: "https://thephonelab.nl/locaties/" },
    { text: { en: "Prices", de: "Preise", nl: "Prijzen" }, href: "https://thephonelab.nl/prijzen/" },
    { text: { en: "Blog", de: "Blog", nl: "Blog" }, href: "https://thephonelab.nl/blog/" },
    { text: { en: "Contact", de: "Kontakt", nl: "Contact" }, href: "https://thephonelab.nl/contact/" },
    { text: { en: "Business", de: "Geschäftlich", nl: "Zakelijk" }, href: "https://thephonelab.nl/zakelijk/" },
    { text: { en: "Insurance", de: "Versicherung", nl: "Verzekering" }, href: "https://thephonelab.nl/verzekering/" },
  ],
  winkelsLinks: [
    { text: { en: "Alkmaar", de: "Alkmaar", nl: "Alkmaar" }, href: "https://thephonelab.nl/locaties/alkmaar/kennemerstraatweg-alkmaar/" },
    { text: { en: "Amsterdam - Beethovenstraat", de: "Amsterdam - Beethovenstraat", nl: "Amsterdam - Beethovenstraat" }, href: "https://thephonelab.nl/locaties/amsterdam/beethovenstraat/" },
    { text: { en: "Amsterdam - Gelderlandplein", de: "Amsterdam - Gelderlandplein", nl: "Amsterdam - Gelderlandplein" }, href: "https://thephonelab.nl/locaties/amsterdam/gelderlandplein-amsterdam/" },
    { text: { en: "Amsterdam - Marnixstraat", de: "Amsterdam - Marnixstraat", nl: "Amsterdam - Marnixstraat" }, href: "https://thephonelab.nl/locaties/amsterdam/marnixstraat/" },
    { text: { en: "Amsterdam - Van Woustraat", de: "Amsterdam - Van Woustraat", nl: "Amsterdam - Van Woustraat" }, href: "https://thephonelab.nl/locaties/amsterdam/van-woustraat/" },
    { text: { en: "Arnhem", de: "Arnhem", nl: "Arnhem" }, href: "https://thephonelab.nl/locaties/arnhem/koningstraat-arnhem/" },
    { text: { en: "Den Haag - Denneweg", de: "Den Haag - Denneweg", nl: "Den Haag - Denneweg" }, href: "https://thephonelab.nl/locaties/den-haag/denneweg-den-haag/" },
    { text: { en: "Den Haag - Frederik Hendriklaan", de: "Den Haag - Frederik Hendriklaan", nl: "Den Haag - Frederik Hendriklaan" }, href: "https://thephonelab.nl/locaties/den-haag/frederik-hendriklaan-den-haag/" },
    { text: { en: "Groningen", de: "Groningen", nl: "Groningen" }, href: "https://thephonelab.nl/locaties/groningen/astraat-groningen/" },
    { text: { en: "Haarlem", de: "Haarlem", nl: "Haarlem" }, href: "https://thephonelab.nl/locaties/haarlem/grote-houtstraat/" },
    { text: { en: "Rotterdam", de: "Rotterdam", nl: "Rotterdam" }, href: "https://thephonelab.nl/locaties/rotterdam/meent-rotterdam/" },
    { text: { en: "Utrecht", de: "Utrecht", nl: "Utrecht" }, href: "https://thephonelab.nl/locaties/utrecht/potterstraat-utrecht/" },
    { text: { en: "Breda", de: "Breda", nl: "Breda" }, href: "https://thephonelab.nl/locaties/breda/wilhelminastraat-breda/" },
  ],
  socialLinks: [
    { iconName: "facebook", href: "https://www.facebook.com/ThePhoneLabNL", ariaLabel: { en: "Facebook", de: "Facebook", nl: "Facebook" } },
    { iconName: "linkedin", href: "https://www.linkedin.com/company/thephonelab", ariaLabel: { en: "LinkedIn", de: "LinkedIn", nl: "LinkedIn" } },
    { iconName: "instagram", href: "https://www.instagram.com/thephonelabnl/", ariaLabel: { en: "Instagram", de: "Instagram", nl: "Instagram" } },
    { iconName: "tiktok", href: "https://www.tiktok.com/@thephonelab", ariaLabel: { en: "TikTok", de: "TikTok", nl: "TikTok" } },
  ],
  authorisationLinks: [
    { text: { en: "OPPO authorized service partner", de: "OPPO autorisierter Servicepartner", nl: "OPPO geautoriseerde servicepartner" }, href: "https://thephonelab.nl/geautoriseerd-reparatiepartner-oppo/" },
    { text: { en: "OnePlus authorized service partner", de: "OnePlus autorisierter Servicepartner", nl: "OnePlus geautoriseerde servicepartner" }, href: "https://thephonelab.nl/oneplus-reparatie/" },
    { text: { en: "Apple Independent Repair Provider", de: "Apple Independent Repair Provider", nl: "Apple Independent Repair Provider" }, href: "https://thephonelab.nl/independent-repairprovider/" },
  ],
  poweredByText: { en: "Powered by Circtek", de: "Unterstützt von Circtek", nl: "Mogelijk gemaakt door Circtek" },
  poweredByLink: { text: { en: "Circtek", de: "Circtek", nl: "Circtek" }, href: "https://stg-app.circtek.com", target: "_blank" },
};
