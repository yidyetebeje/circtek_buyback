export const defaultShopConfig = {
  shopId: "default",
  shopName: "Device Buyback",
  logoUrl: "/image.png",
  faviconUrl: process.env.NEXT_PUBLIC_FAVICON_URL || "/favicon.ico",
  theme: {
    primary: "#3b82f6", // blue-500
    secondary: "#10b981", // emerald-500
    accent: "#f59e0b", // amber-500
    background: "#ffffff",
    text: "#111827", // gray-900
  },
  design: {
    borderRadius: {
      button: "0.5rem", // 8px
      card: "1rem", // 16px
      input: "0.375rem", // 6px
    },
    spacing: {
      sectionPadding: "5rem", // 80px
    },
    layout: "default",
    darkMode: false,
  },
  sectionOrder: {
    categories: 1,
    featuredProducts: 2,
    testimonials: 3,
    partners: 4,
    stepProcess: 5,
    globalEarth: 6,
    feedback: 7,
    faq: 8,
    help: 9,
  },
  headerVariant: 'default',
  benefits: {
    items: [
      { id: "free-shipping", text: "Free shipping both ways", icon: "truck" },
      { id: "money-back", text: "Money back guarantee", icon: "shield-check" },
      { id: "instant-payments", text: "Instant payments", icon: "cash" },
      { id: "professional", text: "Professional service", icon: "star" }
    ],
    alignment: 'center',
    backgroundColor: '#3b82f6',
    textColor: '#ffffff',
    iconColor: '#ffffff',
    showBenefits: true
  },
  faq: {
    showFAQ: true,
    title: {
      en: "Frequently Asked Questions",
      nl: "Veelgestelde Vragen"
    },
    subtitle: {
      en: "Find answers to commonly asked questions about our services",
      nl: "Vind antwoorden op veelgestelde vragen over onze diensten"
    }
  },
  heroSection: {
    title: "Sell Your Device for the Best Price",
    subtitle: "Quick, Easy, and Secure",
    description: "Get an instant quote for your old device and get paid fast. We make recycling electronics simple and rewarding.",
    backgroundImage: "https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960",
    buttonText: "Get an Instant Quote",
    buttonLink: "/sell-device",
    variant: "default",
  },
  categories: [
    {
      id: 1,
      title: "Smartphones",
      description: "Sell your old smartphones at competitive prices",
      imageUrl: "https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960",
      link: "/category/smartphones/models",
      name: "Smartphones" // For backward compatibility
    },
    {
      id: 2,
      title: "Tablets",
      description: "Get cash for your used tablets",
      imageUrl: "https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960",
      link: "/category/tablets/models",
      name: "Tablets" // For backward compatibility
    },
    {
      id: 3,
      title: "Laptops",
      description: "Trade in your laptops for instant cash",
      imageUrl: "https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960",
      link: "/category/laptops/models",
      name: "Laptops" // For backward compatibility
    },
    {
      id: 4,
      title: "Smartwatches",
      description: "Sell your old smartwatches easily",
      imageUrl: "https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960",
      link: "/category/smartwatches/models",
      name: "Smartwatches" // For backward compatibility
    },
    {
      id: 5,
      title: "Gaming Consoles",
      description: "Trade in your gaming consoles for the best value",
      imageUrl: "https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960",
      link: "/category/gaming-consoles/models",
      name: "Gaming Consoles" // For backward compatibility
    },
  ],
  showFeaturedProducts: true,
  showTestimonials: true,
  showPartners: true,
  showHelp: true,
  showStepProcess: true,
  showGlobalEarth: true,
  showFeedback: true,
  stepProcessConfig: {
    step1Title: { 
      en: "Sign up", 
      nl: "Inschrijven" 
    },
    step1Description: {
      en: "Answer a few questions and receive your price proposal",
      nl: "Beantwoord enkele vragen en ontvang je prijsvoorstel"
    },
    step2Title: { 
      en: "Return", 
      nl: "Retourneren" 
    },
    step2Description: {
      en: "Return your device to one of our 13 stores or send it to us free of charge",
      nl: "Lever je apparaat in bij een van onze 13 winkels of stuur het gratis naar ons op"
    },
    step3Title: { 
      en: "Earn money", 
      nl: "Verdien geld" 
    },
    step3Description: {
      en: "Paid directly in our stores, with no surprises. When sent within 24 hours",
      nl: "Direct uitbetaald in onze winkels, zonder verrassingen. Bij verzending binnen 24 uur"
    }
  },
  helpConfig: {
    title: { 
      en: "Need help?", 
      nl: "Hulp nodig?",
      de: "Brauchen Sie Hilfe?",
      fr: "Besoin d'aide ?",
      es: "¿Necesitas ayuda?"
    },
    subtitle: {
      en: "Get in touch with one of our specialists",
      nl: "Neem contact op met een van onze specialisten",
      de: "Kontaktieren Sie einen unserer Spezialisten",
      fr: "Contactez l'un de nos spécialistes",
      es: "Ponte en contacto con uno de nuestros especialistas"
    },
    whatsapp: {
      en: "Whatsapp",
      nl: "Whatsapp",
      de: "Whatsapp",
      fr: "Whatsapp",
      es: "Whatsapp"
    },
    email: {
      en: "Email",
      nl: "Email",
      de: "Email",
      fr: "Email",
      es: "Email"
    },
    stores: {
      en: "13 stores",
      nl: "13 winkels",
      de: "13 Geschäfte",
      fr: "13 magasins",
      es: "13 tiendas"
    },
    comeVisit: {
      en: "Feel free to visit",
      nl: "Kom gerust langs",
      de: "Besuchen Sie uns gerne",
      fr: "N'hésitez pas à visiter",
      es: "No dudes en visitarnos"
    }
  },
  feedbackConfig: {
    title: {
      en: "We score 9.5 out of 10 calculated from 10345 customer reviews",
      nl: "Wij scoren een 9.5 uit 10 berekend uit 10345 reviews van klanten",
    },
    altLogo: { 
      en: "Feedback Company Logo", 
      nl: "Feedback Bedrijfslogo" 
    },
    ariaPrev: { 
      en: "Previous review", 
      nl: "Vorige recensie" 
    },
    ariaNext: { 
      en: "Next review", 
      nl: "Volgende recensie" 
    },
    review1Text: { 
      en: "Very good", 
      nl: "Zeer goed" 
    },
    review1Reviewer: { 
      en: "Marten Bezemer", 
      nl: "Marten Bezemer" 
    },
    review2Text: { 
      en: "Fast and professional service!", 
      nl: "Snelle en professionele service!" 
    },
    review2Reviewer: { 
      en: "Haarlem Grote Houtstraat", 
      nl: "Haarlem Grote Houtstraat" 
    },
    review3Text: { 
      en: "Top services", 
      nl: "Top services" 
    },
    review3Reviewer: { 
      en: "Schildersbedrijf verhoeven", 
      nl: "Schildersbedrijf verhoeven" 
    },
    review4Text: { 
      en: "Very satisfied!", 
      nl: "Heel tevreden!" 
    },
    review4Reviewer: { 
      en: "Anna K.", 
      nl: "Anna K." 
    },
    review5Text: { 
      en: "Excellent service.", 
      nl: "Uitstekende service." 
    },
    review5Reviewer: { 
      en: "Peter V.", 
      nl: "Peter V." 
    },
    review6Text: { 
      en: "Almost perfect, short waiting time.", 
      nl: "Bijna perfect, kleine wachttijd." 
    },
    review6Reviewer: { 
      en: "Laura B.", 
      nl: "Laura B." 
    },
  },
  thePhoneLabHeaderConfig: {
    benefit1: {
      en: "Paid immediately",
      nl: "Direct uitbetaald",
      de: "Sofort bezahlt",
      fr: "Payé immédiatement",
      es: "Pagado inmediatamente"
    },
    benefit2: {
      en: "Sales in 1 of our 12 stores",
      nl: "Verkoop in 1 van onze 12 winkels",
      de: "Verkauf in 1 unserer 12 Geschäfte",
      fr: "Ventes dans 1 de nos 12 magasins",
      es: "Ventas en 1 de nuestras 12 tiendas"
    },
    benefit3: {
      en: "No surprises",
      nl: "Geen verrassingen",
      de: "Keine Überraschungen",
      fr: "Aucune surprise",
      es: "Sin sorpresas"
    },
    repairs: {
      en: "Repairs",
      nl: "Reparaties",
      de: "Reparaturen",
      fr: "Réparations",
      es: "Reparaciones"
    },
    stores: {
      en: "Stores",
      nl: "Winkels",
      de: "Geschäfte",
      fr: "Magasins",
      es: "Tiendas"
    }
  },
  footerLinks: [
    {
      title: "Company",
      links: [
        { label: "About Us", url: "/about" },
        { label: "How It Works", url: "/how-it-works" },
        { label: "Blog", url: "/blog" },
        { label: "Careers", url: "/careers" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "FAQ", url: "/faq" },
        { label: "Contact Us", url: "/contact" },
        { label: "Privacy Policy", url: "/privacy" },
        { label: "Terms of Service", url: "/terms" },
      ],
    },
  ],
  contactInfo: {
    email: "support@devicebuyback.com",
    phone: "+1 (555) 123-4567",
    address: "123 Tech Street, San Francisco, CA 94105",
  },
  socialMedia: {
    facebook: "https://facebook.com/devicebuyback",
    twitter: "https://twitter.com/devicebuyback",
    instagram: "https://instagram.com/devicebuyback",
    linkedin: "https://linkedin.com/company/devicebuyback",
  },
  // Model List Page Defaults
  modelListVariant: 'classicElegant',
  // Device Estimation Page Defaults
  deviceEstimationConfig: {
    pageTitle: {
      en: "Estimate Your Device Value",
      nl: "Schat de waarde van uw apparaat"
    },
    questions: [
      {
        id: "storage",
        text: {
          en: "What is the storage capacity?",
          nl: "Wat is de opslagcapaciteit?"
        },
        type: "multiple-choice",
        options: [
          { label: { en: "64GB", nl: "64GB" }, value: "64gb" },
          { label: { en: "128GB", nl: "128GB" }, value: "128gb" },
          { label: { en: "256GB", nl: "256GB" }, value: "256gb" },
          { label: { en: "512GB", nl: "512GB" }, value: "512gb" },
          { label: { en: "1TB", nl: "1TB" }, value: "1tb" },
        ],
      },
      {
        id: "condition",
        text: {
          en: "What is the condition of the device?",
          nl: "Wat is de staat van het apparaat?"
        },
        type: "multiple-choice",
        options: [
          {
            label: { en: "Like New", nl: "Als Nieuw" },
            value: "like-new",
            description: { en: "No visible scratches or scuffs. Perfect working order.", nl: "Geen zichtbare krassen of slijtage. Perfect werkend." },
            icon: "✨"
          },
          {
            label: { en: "Good", nl: "Goed" },
            value: "good",
            description: { en: "Minor scratches, fully functional.", nl: "Lichte krasjes, volledig functioneel." },
            icon: "👍"
          },
          {
            label: { en: "Fair", nl: "Redelijk" },
            value: "fair",
            description: { en: "Visible wear and tear, but works.", nl: "Zichtbare slijtage, maar werkt." },
            icon: "👌"
          },
          {
            label: { en: "Damaged", nl: "Beschadigd" },
            value: "damaged",
            description: { en: "Cracked screen, dents, or functional issues.", nl: "Gebarsten scherm, deuken of functionele problemen." },
            icon: "💔"
          },
        ],
      },
      {
        id: "accessories",
        text: {
          en: "Do you have the original accessories (charger, cable)?",
          nl: "Heeft u de originele accessoires (oplader, kabel)?"
        },
        type: "multiple-choice",
        options: [
          { label: { en: "Yes, all original", nl: "Ja, allemaal origineel" }, value: "yes-all" },
          { label: { en: "Some of them", nl: "Sommige ervan" }, value: "yes-some" },
          { label: { en: "No accessories", nl: "Geen accessoires" }, value: "no" },
        ],
      },
    ],
    variant: 'default',
    estimationResultTitle: {
      en: "Your Estimated Value",
      nl: "Uw geschatte waarde"
    },
    checkoutButtonText: {
      en: "Sell Your Device Now",
      nl: "Verkoop uw apparaat nu"
    }
  },
  // Checkout Page Configuration
  checkoutVariant: 'default',
};