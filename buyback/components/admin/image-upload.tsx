"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  initialImage?: string | null;
  onImageUpload: (file: File) => Promise<string>;
  onImageRemove?: () => void;
  aspectRatio?: 'square' | 'wide' | 'tall';
  maxSizeMB?: number;
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  initialImage,
  onImageUpload,
  onImageRemove,
  aspectRatio = 'square',
  maxSizeMB = 5,
  className,
  disabled = false
}: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImage || null);
  
  // Update imageUrl when initialImage prop changes
  useEffect(() => {
   
    setImageUrl(initialImage || null);
  }, [initialImage]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate aspect ratio classes
  let aspectRatioClass = 'aspect-square';
  if (aspectRatio === 'wide') aspectRatioClass = 'aspect-video';
  if (aspectRatio === 'tall') aspectRatioClass = 'aspect-[3/4]';

  // Check if file is HEIC/HEIF format
  const isHeicFile = (file: File): boolean => {
    const heicTypes = ['image/heic', 'image/heif'];
    const heicExtensions = ['.heic', '.heif'];
    
    return heicTypes.includes(file.type.toLowerCase()) || 
           heicExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  };

  // Validate file before processing
  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File is too large. Maximum size is ${maxSizeMB}MB.`;
    }

    // Check if file is an image (including HEIC)
    const isImageFile = file.type.startsWith('image/') || isHeicFile(file);
    if (!isImageFile) {
      return 'Only image files are accepted. Supported formats: JPG, PNG, WebP, GIF, HEIC.';
    }

    // Check for empty files
    if (file.size === 0) {
      return 'The selected file is empty. Please choose a valid image file.';
    }

    return null; // No validation errors
  };

  // Convert HEIC to JPEG if possible using Canvas API
  const convertHeicToJpeg = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      // Check if it's a HEIC file
      if (isHeicFile(file)) {
        
        // For HEIC files, we'll create a blob URL and try to load it in an image
        // If the browser supports HEIC (like Safari), this will work
        // If not, we'll show a helpful error message
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        // Set up timeout for image loading
        const timeout = setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('HEIC image conversion timed out. Please try converting the image to JPG format manually.'));
        }, 10000); // 10 second timeout
        
        img.onload = () => {
          clearTimeout(timeout);
          
          // Create a canvas to convert the image to JPEG
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Canvas context not available. Unable to convert HEIC image.'));
            return;
          }
          
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          
          // Convert to JPEG blob
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              // Create a new File object with JPEG format
              const convertedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(convertedFile);
            } else {
              reject(new Error('Failed to convert HEIC image to JPEG format.'));
            }
          }, 'image/jpeg', 0.9);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(objectUrl);
          reject(new Error('HEIC format is not supported by your browser. Please convert the image to JPG, PNG, or WebP format before uploading.'));
        };
        
        img.src = objectUrl;
      } else {
        // Not a HEIC file, return as-is
        resolve(file);
      }
    });
  };

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate the file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Try to convert HEIC files to JPEG
      const processedFile = await convertHeicToJpeg(file);
      
      // Create a local preview URL
      const objectUrl = URL.createObjectURL(processedFile);
      setImageUrl(objectUrl);
      
      // Call the upload function provided by parent
      const uploadedUrl = await onImageUpload(processedFile);
      
      // Clean up the object URL after successful upload
      URL.revokeObjectURL(objectUrl);
      setImageUrl(uploadedUrl);
    } catch (err) {
      console.error('Error processing/uploading image:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to upload image. Please try again.');
      }
      setImageUrl(null);
    } finally {
      setIsUploading(false);
    }
  }, [maxSizeMB, onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.heic', '.heif']
    },
    maxFiles: 1,
    disabled: isUploading || disabled,
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection) {
        const errors = rejection.errors.map(e => e.message).join(', ');
        setError(`File rejected: ${errors}`);
      }
    }
  });

  // Handle image removal
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Clean up blob URL if it exists
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
    
    setImageUrl(null);
    setError(null);
    if (onImageRemove) {
      onImageRemove();
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        {...getRootProps()}
        className={`
          w-full
          border-2 rounded-md cursor-pointer flex flex-col items-center justify-center
          transition-colors duration-200 
          ${isDragActive ? 'border-primary bg-primary/5 border-dashed' : 'border-border'}
          ${error ? 'border-destructive bg-destructive/5' : ''}
          ${isUploading ? 'opacity-70' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${imageUrl ? 'p-0 border-0 bg-transparent' : 'p-3'}
        `}
      >
        <input {...getInputProps()} />
        
        {isUploading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {!imageUrl && !isUploading && (
          <div className="flex flex-col items-center justify-center text-center p-2">
            <Upload className="h-6 w-6 mb-1 text-muted-foreground" />
            <p className="text-xs font-medium">Click or drag image</p>
            <p className="text-[10px] text-muted-foreground">
              JPG, PNG, WebP, HEIC (max {maxSizeMB}MB)
            </p>
          </div>
        )}

        {imageUrl && !isUploading && (
          <div className="relative w-full h-28 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Uploaded"
              className={`w-full h-full object-contain rounded-md ${aspectRatioClass}`}
              onError={() => {
                setError('Failed to load image preview. The file may be corrupted.');
                setImageUrl(null);
              }}
            />
            
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <div className="flex gap-2">
                {/* Replace button to select new image */}
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent parent click
                    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                    if (fileInput) {
                      fileInput.click();
                    }
                  }}
                  disabled={disabled}
                  className="size-8"
                  title="Replace image"
                >
                  <Upload className="size-4" />
                </Button>
              
                {/* Remove button */}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={disabled}
                  className="size-8"
                  title="Remove image"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 w-full">
          <p className="text-xs text-destructive text-left">{error}</p>
        </div>
      )}
    </div>
  );
}
