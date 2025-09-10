import React, { useState, useEffect } from 'react';
import type { FooterVariant4Props, LinkItem, SocialLinkItem, TranslatableText } from '../layout/footer-variants/FooterVariant4';
import { defaultFooterVariant4Props } from '../layout/footer-variants/FooterVariant4'; // Import defaults

interface FooterVariant4LinksEditorProps {
  initialConfig?: Partial<FooterVariant4Props>;
  onConfigChange: (config: FooterVariant4Props) => void;
}

const inputTwClasses = "mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500";
const labelTwClasses = "block text-sm font-medium text-slate-700 mb-1";
const buttonTwClasses = "px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";
const removeButtonTwClasses = "ml-2 px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1";
const sectionTwClasses = "p-4 border border-slate-200 rounded-md mb-6";
const sectionTitleTwClasses = "text-lg font-semibold text-slate-800 mb-3";

// Helper component for editing a list of LinkItems
interface LinkListEditorProps {
  links: LinkItem[];
  onChange: (links: LinkItem[]) => void;
  title: string;
}

const LinkListEditor: React.FC<LinkListEditorProps> = ({ links, onChange, title }) => {
  const handleLinkTextChange = (index: number, lang: keyof TranslatableText, value: string) => {
    const newLinks = [...links];
    const currentText = newLinks[index].text;
    newLinks[index] = {
      ...newLinks[index],
      text: {
        ...(typeof currentText === 'object' ? currentText : { en: '', de: '', nl: '' }), // Ensure text is an object
        [lang]: value,
      },
    };
    onChange(newLinks);
  };

  const handleLinkNonTextChange = (index: number, field: 'href' | 'target', value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    onChange(newLinks);
  };

  const addLink = () => {
    onChange([...links, { text: { en: '', de: '', nl: '' }, href: '', target: '_self' }]);
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  return (
    <div className={sectionTwClasses}>
      <h3 className={sectionTitleTwClasses}>{title}</h3>
      {links.map((link, index) => (
        <div key={index} className="mb-3 p-2 border border-slate-100 rounded-md">
          <label className={labelTwClasses}>Link Text {index + 1} (EN)</label>
          <input type="text" value={typeof link.text === 'object' ? link.text.en : link.text} onChange={(e) => handleLinkTextChange(index, 'en', e.target.value)} className={inputTwClasses} placeholder="Link Text (English)" />
          <label className={`${labelTwClasses} mt-1`}>Link Text {index + 1} (DE)</label>
          <input type="text" value={typeof link.text === 'object' ? link.text.de : ''} onChange={(e) => handleLinkTextChange(index, 'de', e.target.value)} className={inputTwClasses} placeholder="Link Text (German)" />
          <label className={`${labelTwClasses} mt-1`}>Link Text {index + 1} (NL)</label>
          <input type="text" value={typeof link.text === 'object' ? link.text.nl : ''} onChange={(e) => handleLinkTextChange(index, 'nl', e.target.value)} className={inputTwClasses} placeholder="Link Text (Dutch)" />
          
          <label className={`${labelTwClasses} mt-1`}>Link Href {index + 1}</label>
          <input type="text" value={link.href} onChange={(e) => handleLinkNonTextChange(index, 'href', e.target.value)} className={inputTwClasses} placeholder="https://example.com" />
          <label className={`${labelTwClasses} mt-1`}>Link Target {index + 1}</label>
          <select value={link.target || '_self'} onChange={(e) => handleLinkNonTextChange(index, 'target', e.target.value)} className={inputTwClasses}>
            <option value="_self">_self (Same tab)</option>
            <option value="_blank">_blank (New tab)</option>
            <option value="_parent">_parent</option>
            <option value="_top">_top</option>
          </select>
          <button type="button" onClick={() => removeLink(index)} className={`${removeButtonTwClasses} mt-2`}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={addLink} className={buttonTwClasses}>Add Link to {title}</button>
    </div>
  );
};

// Helper component for editing a list of SocialLinkItems
interface SocialLinkListEditorProps {
  links: SocialLinkItem[];
  onChange: (links: SocialLinkItem[]) => void;
  title: string;
}

const SocialLinkListEditor: React.FC<SocialLinkListEditorProps> = ({ links, onChange, title }) => {
  const handleSocialLinkTextChange = (index: number, lang: keyof TranslatableText, value: string) => {
    const newLinks = [...links];
    const currentAriaLabel = newLinks[index].ariaLabel;
    newLinks[index] = {
      ...newLinks[index],
      ariaLabel: {
        ...(typeof currentAriaLabel === 'object' ? currentAriaLabel : { en: '', de: '', nl: '' }), // Ensure ariaLabel is an object
        [lang]: value,
      },
    };
    onChange(newLinks);
  };

  const handleSocialLinkNonTextChange = (index: number, field: 'iconName' | 'href', value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    onChange(newLinks);
  };

  const addSocialLink = () => {
    onChange([...links, { iconName: 'custom', href: '', ariaLabel: { en: '', de: '', nl: '' } }]);
  };

  const removeSocialLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const iconOptions = ['facebook', 'linkedin', 'instagram', 'youtube', 'tiktok', 'custom'];

  return (
    <div className={sectionTwClasses}>
      <h3 className={sectionTitleTwClasses}>{title}</h3>
      {links.map((link, index) => (
        <div key={index} className="mb-3 p-2 border border-slate-100 rounded-md">
          <label className={labelTwClasses}>Icon Name {index + 1}</label>
          <select value={link.iconName} onChange={(e) => handleSocialLinkNonTextChange(index, 'iconName', e.target.value)} className={inputTwClasses}>
            {iconOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <label className={`${labelTwClasses} mt-1`}>Link Href {index + 1}</label>
          <input type="text" value={link.href} onChange={(e) => handleSocialLinkNonTextChange(index, 'href', e.target.value)} className={inputTwClasses} placeholder="https://social.com/profile" />
          
          <label className={`${labelTwClasses} mt-1`}>Aria Label {index + 1} (EN)</label>
          <input type="text" value={typeof link.ariaLabel === 'object' ? link.ariaLabel.en : link.ariaLabel} onChange={(e) => handleSocialLinkTextChange(index, 'en', e.target.value)} className={inputTwClasses} placeholder="Follow us on... (English)" />
          <label className={`${labelTwClasses} mt-1`}>Aria Label {index + 1} (DE)</label>
          <input type="text" value={typeof link.ariaLabel === 'object' ? link.ariaLabel.de : ''} onChange={(e) => handleSocialLinkTextChange(index, 'de', e.target.value)} className={inputTwClasses} placeholder="Follow us on... (German)" />
          <label className={`${labelTwClasses} mt-1`}>Aria Label {index + 1} (NL)</label>
          <input type="text" value={typeof link.ariaLabel === 'object' ? link.ariaLabel.nl : ''} onChange={(e) => handleSocialLinkTextChange(index, 'nl', e.target.value)} className={inputTwClasses} placeholder="Follow us on... (Dutch)" />
          <button type="button" onClick={() => removeSocialLink(index)} className={`${removeButtonTwClasses} mt-2`}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={addSocialLink} className={buttonTwClasses}>Add Social Link</button>
    </div>
  );
};

export const FooterVariant4LinksEditor: React.FC<FooterVariant4LinksEditorProps> = ({ initialConfig, onConfigChange }) => {
  const [config, setConfig] = useState<FooterVariant4Props>({ ...defaultFooterVariant4Props, ...initialConfig });

  useEffect(() => {
    // Update parent component when config changes
    onConfigChange(config);
  }, [config, onConfigChange]);

  const handleTitleChange = (section: keyof FooterVariant4Props['columnTitles'], lang: keyof TranslatableText, value: string) => {
    setConfig(prev => ({
      ...prev,
      columnTitles: {
        ...prev.columnTitles,
        [section]: {
          ...(typeof prev.columnTitles[section] === 'object' ? prev.columnTitles[section] : { en: '', de: '', nl: '' }),
          [lang]: value,
        },
      },
    }));
  };

  const handlePoweredByChange = (section: 'poweredByText' | 'poweredByLink', field: keyof LinkItem | 'text', value: string, lang?: keyof TranslatableText) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      if (section === 'poweredByText' && field === 'text' && lang) {
        const currentText = newConfig.poweredByText;
        newConfig.poweredByText = {
          ...(typeof currentText === 'object' ? currentText : { en: '', de: '', nl: '' }),
          [lang]: value,
        };
      } else if (section === 'poweredByLink') {
        if (field === 'text' && lang) {
          const currentLinkText = newConfig.poweredByLink.text;
          newConfig.poweredByLink = {
            ...newConfig.poweredByLink,
            text: {
              ...(typeof currentLinkText === 'object' ? currentLinkText : { en: '', de: '', nl: '' }),
              [lang]: value,
            },
          };
        } else if (field === 'href' || field === 'target') {
          newConfig.poweredByLink = {
            ...newConfig.poweredByLink,
            [field]: value,
          };
        }
      }
      return newConfig;
    });
  };

  return (
    <div className="space-y-6 p-4 bg-slate-50 rounded-lg shadow">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Edit Footer Variant 4 Configuration</h2>

      {/* Column Titles */}
      <div className={sectionTwClasses}>
        <h3 className={sectionTitleTwClasses}>Column Titles</h3>
        {Object.keys(config.columnTitles).map((key) => {
          const titleKey = key as keyof FooterVariant4Props['columnTitles'];
          const titleValue = config.columnTitles[titleKey];
          return (
            <div key={key} className="mb-4 p-3 border border-slate-100 rounded-md">
              <h4 className="text-md font-medium text-slate-700 mb-2">{key.charAt(0).toUpperCase() + key.slice(1)} Title:</h4>
              <div>
                <label htmlFor={`title-${key}-en`} className={labelTwClasses}>English:</label>
                <input 
                  type="text" 
                  id={`title-${key}-en`} 
                  value={typeof titleValue === 'object' ? titleValue.en : titleValue}
                  onChange={(e) => handleTitleChange(titleKey, 'en', e.target.value)} 
                  className={inputTwClasses} 
                  placeholder={`${key} Title (English)`}
                />
              </div>
              <div className="mt-1">
                <label htmlFor={`title-${key}-de`} className={labelTwClasses}>German:</label>
                <input 
                  type="text" 
                  id={`title-${key}-de`} 
                  value={typeof titleValue === 'object' ? titleValue.de : ''}
                  onChange={(e) => handleTitleChange(titleKey, 'de', e.target.value)} 
                  className={inputTwClasses} 
                  placeholder={`${key} Title (German)`}
                />
              </div>
              <div className="mt-1">
                <label htmlFor={`title-${key}-nl`} className={labelTwClasses}>Dutch:</label>
                <input 
                  type="text" 
                  id={`title-${key}-nl`} 
                  value={typeof titleValue === 'object' ? titleValue.nl : ''}
                  onChange={(e) => handleTitleChange(titleKey, 'nl', e.target.value)} 
                  className={inputTwClasses} 
                  placeholder={`${key} Title (Dutch)`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <LinkListEditor title="'ThePhoneLab' Links" links={config.thePhoneLabLinks} onChange={(newLinks) => setConfig(prev => ({ ...prev, thePhoneLabLinks: newLinks }))} />
      <LinkListEditor title="'Sitemap' Links" links={config.sitemapLinks} onChange={(newLinks) => setConfig(prev => ({ ...prev, sitemapLinks: newLinks }))} />
      <LinkListEditor title="'Winkels' (Shops) Links" links={config.winkelsLinks} onChange={(newLinks) => setConfig(prev => ({ ...prev, winkelsLinks: newLinks }))} />
      <LinkListEditor title="'Authorisation' Links" links={config.authorisationLinks} onChange={(newLinks) => setConfig(prev => ({ ...prev, authorisationLinks: newLinks }))} />
      
      <SocialLinkListEditor title="Social Media Links" links={config.socialLinks} onChange={(newLinks) => setConfig(prev => ({ ...prev, socialLinks: newLinks }))} />

      {/* Powered By Section */}
      <div className={sectionTwClasses}>
        <h3 className={sectionTitleTwClasses}>Powered By Section</h3>
        
        <div className="mb-3">
          <label className={labelTwClasses}>Powered By Text (EN):</label>
          <input type="text" value={typeof config.poweredByText === 'object' ? config.poweredByText.en : config.poweredByText} onChange={(e) => handlePoweredByChange('poweredByText', 'text', e.target.value, 'en')} className={inputTwClasses} placeholder="Powered By Text (English)"/>
          <label className={`${labelTwClasses} mt-1`}>Powered By Text (DE):</label>
          <input type="text" value={typeof config.poweredByText === 'object' ? config.poweredByText.de : ''} onChange={(e) => handlePoweredByChange('poweredByText', 'text', e.target.value, 'de')} className={inputTwClasses} placeholder="Powered By Text (German)"/>
          <label className={`${labelTwClasses} mt-1`}>Powered By Text (NL):</label>
          <input type="text" value={typeof config.poweredByText === 'object' ? config.poweredByText.nl : ''} onChange={(e) => handlePoweredByChange('poweredByText', 'text', e.target.value, 'nl')} className={inputTwClasses} placeholder="Powered By Text (Dutch)"/>
        </div>

        <div className="mb-3">
          <label className={labelTwClasses}>Powered By Link Text (EN):</label>
          <input type="text" value={typeof config.poweredByLink.text === 'object' ? config.poweredByLink.text.en : config.poweredByLink.text} onChange={(e) => handlePoweredByChange('poweredByLink', 'text', e.target.value, 'en')} className={inputTwClasses} placeholder="Link Text (English)"/>
          <label className={`${labelTwClasses} mt-1`}>Powered By Link Text (DE):</label>
          <input type="text" value={typeof config.poweredByLink.text === 'object' ? config.poweredByLink.text.de : ''} onChange={(e) => handlePoweredByChange('poweredByLink', 'text', e.target.value, 'de')} className={inputTwClasses} placeholder="Link Text (German)"/>
          <label className={`${labelTwClasses} mt-1`}>Powered By Link Text (NL):</label>
          <input type="text" value={typeof config.poweredByLink.text === 'object' ? config.poweredByLink.text.nl : ''} onChange={(e) => handlePoweredByChange('poweredByLink', 'text', e.target.value, 'nl')} className={inputTwClasses} placeholder="Link Text (Dutch)"/>
        </div>
        
        <label htmlFor="poweredByLinkHref" className={`${labelTwClasses} mt-2`}>Powered By Link Href:</label>
        <input type="text" id="poweredByLinkHref" value={config.poweredByLink.href} onChange={(e) => handlePoweredByChange('poweredByLink', 'href', e.target.value)} className={inputTwClasses} />

        <label htmlFor="poweredByLinkTarget" className={`${labelTwClasses} mt-2`}>Powered By Link Target:</label>
        <select id="poweredByLinkTarget" value={config.poweredByLink.target || '_self'} onChange={(e) => handlePoweredByChange('poweredByLink', 'target', e.target.value)} className={inputTwClasses}>
            <option value="_self">_self (Same tab)</option>
            <option value="_blank">_blank (New tab)</option>
        </select>
      </div>

      {/* Styling Options - Basic Example */}
      <div className={sectionTwClasses}>
        <h3 className={sectionTitleTwClasses}>Styling (Tailwind Classes)</h3>
        <p className="text-xs text-slate-500 mb-2">Enter Tailwind CSS classes directly.</p>
        <div>
          <label htmlFor="backgroundColor" className={labelTwClasses}>Background Color:</label>
          <input type="text" id="backgroundColor" value={config.backgroundColor || ''} onChange={(e) => setConfig(prev => ({...prev, backgroundColor: e.target.value}))} className={inputTwClasses} placeholder="e.g., bg-gray-100" />
        </div>
        <div className="mt-2">
          <label htmlFor="textColor" className={labelTwClasses}>Default Text Color:</label>
          <input type="text" id="textColor" value={config.textColor || ''} onChange={(e) => setConfig(prev => ({...prev, textColor: e.target.value}))} className={inputTwClasses} placeholder="e.g., text-gray-800" />
        </div>
        {/* Add more styling inputs as needed for titleColor, linkColor, linkHoverColor */}
      </div>

    </div>
  );
};

export default FooterVariant4LinksEditor;
