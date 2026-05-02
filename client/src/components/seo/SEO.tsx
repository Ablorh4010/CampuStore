import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'profile';
  keywords?: string;
  schemaData?: object;
}

export default function SEO({ 
  title = "The Hub - Ghana's Leading Student Marketplace", 
  description = "Buy and sell student essentials, electronics, fashion and more at The Hub. The best marketplace for students in Ghana.",
  image = "/icon-512.png",
  url = "https://uniexchangehub.com",
  type = 'website',
  keywords = "marketplace ghana, student market ghana, buy sell ghana, student entrepreneurship, university hub, campus marketplace",
  schemaData
}: SEOProps) {
  const fullTitle = title.includes("The Hub") ? title : `${title} | The Hub`;
  const canonicalUrl = url.startsWith('http') ? url : `https://uniexchangehub.com${url}`;
  const ogImage = image.startsWith('http') ? image : `https://uniexchangehub.com${image}`;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Canonical Link */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Structured Data */}
      {schemaData && (
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      )}
    </Helmet>
  );
}
