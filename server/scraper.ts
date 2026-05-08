
/**
 * Smart Scraper Service
 * Handles fetching content from ecommerce sites with improved bot bypass
 */

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
];

export async function smartFetch(url: string): Promise<{ html: string; status: number }> {
  const PROXY_LIST = ["https://api.allorigins.win/raw?url=","https://api.codetabs.com/v1/proxy/?quest=","https://thingproxy.freeboard.io/fetch/"];
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  const baseHeaders = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,gh;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Upgrade-Insecure-Requests': '1',
  };

  try {
    console.log(`SmartFetch: Attempting primary fetch for ${url}`);
    
    // Initial fetch to get any session cookies
    const response = await fetch(url, { 
      headers: baseHeaders, 
      redirect: 'follow' 
    });
    
    if (response.ok) {
      const html = await response.text();
      // If we got a captcha page or very short HTML, it might be a block
      if (html.length > 5000 && !html.toLowerCase().includes('captcha')) {
        return { html, status: response.status };
      }
      console.log(`SmartFetch: Result looks like a block or redirect (${html.length} bytes). Trying fallback...`);
    }

    console.log(`SmartFetch: Primary fetch failed or blocked (${response.status}). Trying mobile fallback...`);
    
    // Tier 2: Try mobile user agent with specific headers for Amazon/Jumia
    const mobileHeaders = { 
      ...baseHeaders, 
      'User-Agent': USER_AGENTS[3],
      'Sec-Ch-Ua-Mobile': '?1',
      'Sec-Ch-Ua-Platform': '"iOS"'
    };
    
    const response2 = await fetch(url, { headers: mobileHeaders, redirect: 'follow' });
    
    if (response2.ok) {
      const html = await response2.text();
      return { html, status: response2.status };
    }

    console.log('SmartFetch: Tier 2 failed. Trying proxy fallback...');
    for (const proxyBase of PROXY_LIST) {
      try {
        const proxyUrl = proxyBase + encodeURIComponent(url);
        console.log('SmartFetch: Trying proxy: ' + proxyBase);
        const proxyRes = await fetch(proxyUrl, { headers: baseHeaders });
        if (proxyRes.ok) {
          const html = await proxyRes.text();
          if (html.length > 5000) {
             return { html, status: 200 };
          }
        }
      } catch (proxyErr) {
        console.error('SmartFetch: Proxy attempt failed', proxyErr);
      }
    }
    return { html: '', status: response2.status };
  } catch (error) {
    console.error("SmartFetch Error:", error);
    throw error;
  }
}
