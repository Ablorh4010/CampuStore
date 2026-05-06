import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  video?: string;
  videoType?: string;
  url?: string;
  type?: 'website' | 'product' | 'profile';
  keywords?: string;
  schemaData?: object;
  price?: string;
  currency?: string;
}

export default function SEO({ 
  title = "The Hub - Ghana's Leading Student Marketplace", 
  description = "Buy and sell student essentials, electronics, fashion and more at The Hub. The best marketplace for students in Ghana.",
  image = "/icon-512.png",
  video,
  videoType = "video/mp4",
  url = "https://uniexchangehub.com",
  type = 'website',
  keywords = "marketplace ghana, student market ghana, buy sell ghana, student entrepreneurship, university hub, campus marketplace",
  schemaData,
  price,
  currency = "GHS"
}: SEOProps) {
  const fullTitle = title.includes("The Hub") ? title : `${title} | The Hub`;
  const canonicalUrl = url.startsWith('http') ? url : `https://uniexchangehub.com${url}`;
  const ogImage = image.startsWith('http') ? image : `https://uniexchangehub.com${image}`;
  const ogVideo = video && (video.startsWith('http') ? video : `https://uniexchangehub.com${video}`);

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
      {ogVideo && <meta property="og:video" content={ogVideo} />}
      {ogVideo && <meta property="og:video:secure_url" content={ogVideo} />}
      {ogVideo && <meta property="og:video:type" content={videoType} />}

      {/* Product Details for Social Media */}
      {price && <meta property="product:price:amount" content={price} />}
      {price && <meta property="product:price:currency" content={currency} />}

      {/* Twitter */}
      <meta name="twitter:card" content={ogVideo ? "player" : "summary_large_image"} />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {ogVideo && <meta name="twitter:player" content={ogVideo} />}
      {ogVideo && <meta name="twitter:player:width" content="1280" />}
      {ogVideo && <meta name="twitter:player:height" content="720" />}

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
