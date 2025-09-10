"use client";

import { useState } from 'react';
import { ShopConfig } from '@/types/shop';

interface FooterLink {
  label: string;
  url: string;
  isExternal?: boolean;
  icon?: string;
}

interface FooterLinkSection {
  title: string;
  titleColor?: string;
  links: FooterLink[];
}

interface FooterLinksEditorProps {
  footerLinks: FooterLinkSection[];
  onChange: (links: FooterLinkSection[]) => void;
  primaryColor: string;
}

export function FooterLinksEditor({ 
  footerLinks, 
  onChange,
  primaryColor
}: FooterLinksEditorProps) {
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);
  const [showNewSectionForm, setShowNewSectionForm] = useState(false);
  const [showNewLinkForm, setShowNewLinkForm] = useState(false);
  
  // Form state for new/edited section
  const [sectionForm, setSectionForm] = useState<FooterLinkSection>({
    title: '',
    links: []
  });
  
  // Form state for new/edited link
  const [linkForm, setLinkForm] = useState<FooterLink>({
    label: '',
    url: '',
    isExternal: false
  });

  // Handler for section form changes
  const handleSectionFormChange = (field: keyof FooterLinkSection, value: string) => {
    setSectionForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handler for link form changes
  const handleLinkFormChange = (field: keyof FooterLink, value: string | boolean) => {
    setLinkForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save a new section
  const handleAddSection = () => {
    if (!sectionForm.title.trim()) {
      alert('Section title is required');
      return;
    }
    
    const updatedLinks = [...footerLinks, { ...sectionForm, links: [] }];
    onChange(updatedLinks);
    setSectionForm({ title: '', links: [] });
    setShowNewSectionForm(false);
  };

  // Save an edited section
  const handleSaveSection = () => {
    if (!sectionForm.title.trim() || editingSectionIndex === null) {
      alert('Section title is required');
      return;
    }
    
    const updatedLinks = [...footerLinks];
    updatedLinks[editingSectionIndex] = {
      ...updatedLinks[editingSectionIndex],
      title: sectionForm.title,
      titleColor: sectionForm.titleColor
    };
    
    onChange(updatedLinks);
    setSectionForm({ title: '', links: [] });
    setEditingSectionIndex(null);
  };

  // Delete a section
  const handleDeleteSection = (index: number) => {
    if (confirm('Are you sure you want to delete this section?')) {
      const updatedLinks = footerLinks.filter((_, i) => i !== index);
      onChange(updatedLinks);
    }
  };

  // Start editing a section
  const handleEditSection = (index: number) => {
    const section = footerLinks[index];
    setSectionForm({
      title: section.title,
      titleColor: section.titleColor,
      links: section.links
    });
    setEditingSectionIndex(index);
  };

  // Add a new link to a section
  const handleAddLink = (sectionIndex: number) => {
    if (!linkForm.label.trim() || !linkForm.url.trim()) {
      alert('Link label and URL are required');
      return;
    }
    
    const updatedLinks = [...footerLinks];
    updatedLinks[sectionIndex].links.push({ ...linkForm });
    
    onChange(updatedLinks);
    setLinkForm({ label: '', url: '', isExternal: false });
    setShowNewLinkForm(false);
  };

  // Save an edited link
  const handleSaveLink = (sectionIndex: number) => {
    if (!linkForm.label.trim() || !linkForm.url.trim() || editingLinkIndex === null) {
      alert('Link label and URL are required');
      return;
    }
    
    const updatedLinks = [...footerLinks];
    updatedLinks[sectionIndex].links[editingLinkIndex] = { ...linkForm };
    
    onChange(updatedLinks);
    setLinkForm({ label: '', url: '', isExternal: false });
    setEditingLinkIndex(null);
  };

  // Delete a link
  const handleDeleteLink = (sectionIndex: number, linkIndex: number) => {
    const updatedLinks = [...footerLinks];
    updatedLinks[sectionIndex].links = updatedLinks[sectionIndex].links.filter((_, i) => i !== linkIndex);
    
    onChange(updatedLinks);
  };

  // Start editing a link
  const handleEditLink = (sectionIndex: number, linkIndex: number) => {
    const link = footerLinks[sectionIndex].links[linkIndex];
    setLinkForm({
      label: link.label,
      url: link.url,
      isExternal: link.isExternal || false,
      icon: link.icon
    });
    setEditingLinkIndex(linkIndex);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Footer Link Sections</h3>
        <button
          type="button"
          onClick={() => {
            setShowNewSectionForm(true);
            setSectionForm({ title: '', links: [] });
          }}
          className="px-3 py-1.5 rounded-md text-white text-sm font-medium"
          style={{ backgroundColor: primaryColor }}
        >
          Add Section
        </button>
      </div>

      {/* Section List */}
      <div className="space-y-4">
        {footerLinks.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-md">
            <p className="text-gray-500">No footer link sections yet. Add a section to get started.</p>
          </div>
        ) : (
          footerLinks.map((section, sectionIndex) => (
            <div key={sectionIndex} className="border rounded-md overflow-hidden">
              {/* Section Header */}
              <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
                <div>
                  <h4 className="font-medium" style={{ color: section.titleColor || 'inherit' }}>
                    {section.title}
                  </h4>
                  <p className="text-sm text-gray-500">{section.links.length} links</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEditSection(sectionIndex)}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSection(sectionIndex)}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-red-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Section Links */}
              <div className="p-4">
                {section.links.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">No links in this section yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {section.links.map((link, linkIndex) => (
                      <li key={linkIndex} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50">
                        <div>
                          <div className="font-medium">{link.label}</div>
                          <div className="text-sm text-gray-500">{link.url}</div>
                          {link.isExternal && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                              External
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLinkIndex(linkIndex);
                              handleEditLink(sectionIndex, linkIndex);
                            }}
                            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLink(sectionIndex, linkIndex)}
                            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-red-500"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add New Link Button */}
                <div className="mt-4">
                  {editingLinkIndex !== null ? (
                    <div className="space-y-3 p-3 border rounded-md bg-gray-50">
                      <h5 className="font-medium">Edit Link</h5>
                      <div>
                        <label className="block text-sm font-medium mb-1">Label</label>
                        <input
                          type="text"
                          value={linkForm.label}
                          onChange={(e) => handleLinkFormChange('label', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., Our Locations"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">URL</label>
                        <input
                          type="text"
                          value={linkForm.url}
                          onChange={(e) => handleLinkFormChange('url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., /locations"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`external-link-${sectionIndex}`}
                          checked={linkForm.isExternal || false}
                          onChange={(e) => handleLinkFormChange('isExternal', e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label htmlFor={`external-link-${sectionIndex}`} className="ml-2 text-sm text-gray-700">
                          External link (opens in new tab)
                        </label>
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleSaveLink(sectionIndex)}
                          className="px-3 py-1.5 rounded-md text-white text-sm font-medium"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Save Link
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLinkIndex(null);
                            setLinkForm({ label: '', url: '', isExternal: false });
                          }}
                          className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : showNewLinkForm ? (
                    <div className="space-y-3 p-3 border rounded-md bg-gray-50">
                      <h5 className="font-medium">Add New Link</h5>
                      <div>
                        <label className="block text-sm font-medium mb-1">Label</label>
                        <input
                          type="text"
                          value={linkForm.label}
                          onChange={(e) => handleLinkFormChange('label', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., Our Locations"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">URL</label>
                        <input
                          type="text"
                          value={linkForm.url}
                          onChange={(e) => handleLinkFormChange('url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., /locations"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`external-link-new-${sectionIndex}`}
                          checked={linkForm.isExternal || false}
                          onChange={(e) => handleLinkFormChange('isExternal', e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label htmlFor={`external-link-new-${sectionIndex}`} className="ml-2 text-sm text-gray-700">
                          External link (opens in new tab)
                        </label>
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleAddLink(sectionIndex)}
                          className="px-3 py-1.5 rounded-md text-white text-sm font-medium"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Add Link
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewLinkForm(false);
                            setLinkForm({ label: '', url: '', isExternal: false });
                          }}
                          className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewLinkForm(true);
                        setLinkForm({ label: '', url: '', isExternal: false });
                      }}
                      className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Link
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Section Form */}
      {showNewSectionForm && (
        <div className="space-y-3 p-4 border rounded-md bg-gray-50">
          <h4 className="font-medium">Add New Section</h4>
          <div>
            <label className="block text-sm font-medium mb-1">Section Title</label>
            <input
              type="text"
              value={sectionForm.title}
              onChange={(e) => handleSectionFormChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., Quick Links"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title Color (optional)</label>
            <input
              type="text"
              value={sectionForm.titleColor || ''}
              onChange={(e) => handleSectionFormChange('titleColor', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., #4A5568 or inherit"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to use the default text color</p>
          </div>
          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={handleAddSection}
              className="px-3 py-1.5 rounded-md text-white text-sm font-medium"
              style={{ backgroundColor: primaryColor }}
            >
              Add Section
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewSectionForm(false);
                setSectionForm({ title: '', links: [] });
              }}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Section Form */}
      {editingSectionIndex !== null && (
        <div className="space-y-3 p-4 border rounded-md bg-gray-50">
          <h4 className="font-medium">Edit Section</h4>
          <div>
            <label className="block text-sm font-medium mb-1">Section Title</label>
            <input
              type="text"
              value={sectionForm.title}
              onChange={(e) => handleSectionFormChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., Quick Links"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title Color (optional)</label>
            <input
              type="text"
              value={sectionForm.titleColor || ''}
              onChange={(e) => handleSectionFormChange('titleColor', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., #4A5568 or inherit"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to use the default text color</p>
          </div>
          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={handleSaveSection}
              className="px-3 py-1.5 rounded-md text-white text-sm font-medium"
              style={{ backgroundColor: primaryColor }}
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingSectionIndex(null);
                setSectionForm({ title: '', links: [] });
              }}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800 mt-2">
        <p>
          <span className="font-medium">Tip:</span> Organize your footer links into logical sections like "Quick Links," "Company," "Support," etc.
          Use clear labels and keep URLs consistent with your site structure.
        </p>
      </div>
    </div>
  );
}
