export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
      {
        userAgent: 'Baiduspider',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
      {
        userAgent: '360Spider',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
      {
        userAgent: 'Sogou web spider',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
      {
        userAgent: 'YisouSpider',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
    ],
    sitemap: 'https://faka.example.com/sitemap.xml',
    host: 'https://faka.example.com',
  };
}
