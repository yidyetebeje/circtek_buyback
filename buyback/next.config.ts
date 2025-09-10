import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['imageio.forbes.com', "images.unsplash.com", "www.apple.com", "store.storeimages.cdn-apple.com", "images.samsung.com", "lh3.googleusercontent.com", "images.prismic.io", "s3.eu-west-1.amazonaws.com"],
  },
  // Enable strict mode for React
  reactStrictMode: true,
};
 
const withNextIntl = createNextIntlPlugin();

// The Next.js config with internationalization
const config = withNextIntl({
  ...nextConfig,
});

export default config;