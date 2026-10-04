import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Atelier Edit — The Personal Style Journal',
    short_name: 'Atelier Edit',
    description: 'A personal stylist for the clothes you already own.',
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
