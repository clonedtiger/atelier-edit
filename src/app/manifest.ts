import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Atelier Edit — The Personal Style Journal',
    short_name: 'Atelier Edit',
    description: 'AI-driven luxury fashion styling, wardrobe intelligence, and personalized trend consultations.',
    start_url: '/',
    display: 'standalone',
    background_color: '#121214',
    theme_color: '#121214',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
