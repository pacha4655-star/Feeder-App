import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://feeder.life';
  const now = new Date();

  const routes = [
    '',
    '/communities',
    '/sos',
    '/nearby',
    '/feeding',
    '/ask-feeder',
    '/login',
    '/signup',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? 'always' : 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }));
}
