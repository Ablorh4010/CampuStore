import { extractProductFromHtml } from "./ai";

/**
 * Specialized WooCommerce product extractor
 * Tries to find structured data before falling back to AI
 */
export async function extractWooCommerceProduct(html: string, url: string) {
  try {
    // 1. Try to find JSON-LD (most reliable)
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      for (const script of jsonLdMatch) {
        const content = script.replace(/<script type="application\/ld\+json">|<\/script>/gi, '');
        try {
          const data = JSON.parse(content);
          
          // Handle both single objects and arrays (common in JSON-LD)
          const items = Array.isArray(data) ? data : (data['@graph'] || [data]);
          
          const product = items.find((item: any) => 
            item['@type'] === 'Product' || 
            (Array.isArray(item['@type']) && item['@type'].includes('Product'))
          );

          if (product) {
            console.log("Magic Import: Found WooCommerce JSON-LD data");
            
            // Extract images
            let images: string[] = [];
            if (product.image) {
              if (Array.isArray(product.image)) images = product.image;
              else if (typeof product.image === 'string') images = [product.image];
              else if (product.image.url) images = [product.image.url];
            }

            // Extract price from offers
            let price = 0;
            let originalPrice = null;
            if (product.offers) {
              const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
              price = parseFloat(offer.price || offer.lowPrice);
              
              // Try to find regular price if it's different (sometimes in meta or other scripts)
            }

            return {
              title: product.name,
              description: product.description || product.name,
              price: price || 0,
              originalPrice: originalPrice,
              condition: 'new',
              images: images.filter(Boolean),
              categoryName: "Electronics", // Default fallback
              subcategoryName: "Accessories" // Default fallback
            };
          }
        } catch (e) {
          // Continue to next script if JSON is invalid
        }
      }
    }

    // 2. Try OpenGraph meta tags
    const getMeta = (property: string) => {
      const match = html.match(new RegExp(`<meta property="${property}" content="(.*?)"`, 'i'));
      return match ? match[1] : null;
    };

    const ogTitle = getMeta('og:title');
    const ogPrice = getMeta('product:price:amount');
    
    if (ogTitle && ogPrice) {
      console.log("Magic Import: Found WooCommerce OpenGraph data");
      return {
        title: ogTitle,
        description: getMeta('og:description') || ogTitle,
        price: parseFloat(ogPrice),
        originalPrice: null,
        condition: 'new',
        images: [getMeta('og:image')].filter(Boolean) as string[],
        categoryName: "Electronics",
        subcategoryName: "Accessories"
      };
    }

    // 3. Fallback to AI extraction
    console.log("Magic Import: Falling back to AI extraction for WooCommerce site");
    return extractProductFromHtml(html);
  } catch (error) {
    console.error("WooCommerce Extraction Error:", error);
    return extractProductFromHtml(html);
  }
}

/**
 * Detect if HTML content likely belongs to a WooCommerce site
 */
export function isWooCommerce(html: string): boolean {
  return html.includes('woocommerce') || 
         html.includes('wp-content/plugins/woocommerce') ||
         html.includes('woocommerce-product-gallery');
}
