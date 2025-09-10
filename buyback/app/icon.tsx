import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default async function Icon() {
  // If environment variable is set, redirect to external favicon
  const envFaviconUrl = process.env.NEXT_PUBLIC_FAVICON_URL;
  
  if (envFaviconUrl) {
    // For external favicons, we can't generate them here
    // The DynamicFavicon component will handle external URLs
    // This function only handles generated icons
    return new Response(null, { status: 204 });
  }

  // Create a simple generated icon with 'S' letter (fallback)
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: '#4F46E5',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '50%',
        }}
      >
        S
      </div>
    ),
    {
      ...size,
    }
  );
}
