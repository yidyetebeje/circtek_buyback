This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Setup

The application uses Google Maps for the shop locator feature. You need to set up a Google Maps API key:

1. Get a Google Maps JavaScript API key from the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a `.env.local` file in the root directory
3. Add your API key to the file:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Favicon Configuration

You can set a custom favicon URL from an external address using an environment variable:

```bash
NEXT_PUBLIC_FAVICON_URL=https://example.com/path/to/your/favicon.ico
```

The favicon loading priority is:

1. `NEXT_PUBLIC_FAVICON_URL` environment variable (highest priority)
2. Shop configuration `faviconUrl` property
3. Shop logo URL as fallback
4. Default `/favicon.ico` file (lowest priority)

If the environment variable is set, it will be used across the entire application regardless of shop configuration.

### Running the Application

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
