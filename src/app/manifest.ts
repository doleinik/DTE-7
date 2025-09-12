import { MetadataRoute } from 'next'

export const dynamic = 'force-dynamic'; 

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Training Beat-1',
    short_name: 'TB-1',
    description: 'A Progressive Web App for athletes',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
    {
      src: "/web-app-manifest-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable"
    },
    {
      src: "/web-app-manifest-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable"
    }
  ]
  }
}