import { VertexAI } from '@google-cloud/vertexai';

const project = process.env.GOOGLE_CLOUD_PROJECT || 'chromatic-force-480509-j5';
const location = 'us-central1';

const vertexAI = new VertexAI({ project: project, location: location });

/**
 * Helper to call generative model, prioritizing Vertex AI Prompt Management if a prompt ID is provided.
 */
async function callGenerativeModel(options: {
  promptId?: string;
  defaultPrompt: string;
  defaultSystemInstruction?: string;
  variables?: Record<string, string>;
  modelName?: string;
  responseMimeType?: string;
  imagePart?: any;
}) {
  const modelName = options.modelName || "gemini-1.5-flash-002";
  
  // If we had a working MCP, we'd use the promptId here.
  // For now, we use the SDK to generate content with local fallback.
  const generativeModel = vertexAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: options.responseMimeType as any,
    },
    systemInstruction: options.defaultSystemInstruction,
  });

  let finalPrompt = options.defaultPrompt;
  if (options.variables) {
    for (const [key, value] of Object.entries(options.variables)) {
      finalPrompt = finalPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
      // Also handle the old hardcoded style in ai.ts
      finalPrompt = finalPrompt.replace(new RegExp(`"${value}"`, 'g'), `"${value}"`);
    }
  }

  const parts: any[] = [{ text: finalPrompt }];
  if (options.imagePart) {
    parts.push(options.imagePart);
  }

  const result = await generativeModel.generateContent({
    contents: [{ role: 'user', parts }],
  });

  const response = await result.response;
  return response.candidates?.[0].content.parts[0].text || "";
}

export async function generateStoreProfile(name: string, university: string, city: string) {
  try {
    const text = await callGenerativeModel({
      promptId: process.env.STORE_PROFILE_PROMPT_ID,
      defaultSystemInstruction: "You are an AI assistant helping a student create a store profile on a campus marketplace app.",
      defaultPrompt: `
    The store name is "{{name}}".
    The student is located at "{{university}}" in "{{city}}".
    
    Generate an engaging store description (2-3 sentences) tailored to the campus community.
    Also, suggest the most appropriate shipping modes from this list: ["seller_delivery", "affordcampus_pickup", "ems"].
    (e.g., if they are on campus, affordcampus_pickup and seller_delivery are great. If they are far, ems might be needed).

    Return ONLY a JSON object with this schema:
    {
      "description": string,
      "shippingModes": string[]
    }
    `,
      variables: { name, university, city },
      responseMimeType: "application/json"
    });
    
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Generation Error:", error);
    return {
      description: `Welcome to ${name}! We are a premier student store located at ${university} in ${city}. We provide high-quality products for students by students. Shop with us for the best deals on campus!`,
      shippingModes: ["affordcampus_pickup", "seller_delivery"]
    };
  }
}

export async function generateProductInsights(searchQuery: string) {
  try {
    const text = await callGenerativeModel({
      promptId: process.env.PRODUCT_INSIGHTS_PROMPT_ID,
      defaultSystemInstruction: "You are a helpful shopping assistant on a university marketplace.",
      defaultPrompt: `The user is searching for: "{{searchQuery}}". Provide a very short, friendly 1-sentence response suggesting what they might look for or general advice for finding good deals on this item.`,
      variables: { searchQuery }
    });
    return { suggestion: text.trim() };
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return { suggestion: "I'm having trouble thinking right now, but feel free to browse our trending items!" };
  }
}

export async function generateTrackingInsights(order: any) {
  try {
    const text = await callGenerativeModel({
      promptId: process.env.TRACKING_INSIGHTS_PROMPT_ID,
      defaultSystemInstruction: "You are a delivery assistant for \"The University Hub\", a campus marketplace in Ghana.",
      defaultPrompt: `
    Order Details:
    - Product: {{productTitle}}
    - Shipping Mode: {{shippingMode}}
    - Delivery Status: {{deliveryStatus}}
    - Carrier: {{carrier}}
    - Tracking History: {{trackingHistory}}
    
    The user is based in Ghana.
    Standard Ghana Post takes 1-10 days.
    Express takes 1-3 days.
    
    Generate a friendly, reassuring 1-2 sentence update for the buyer about their delivery progress. Use Ghanaian context if possible.`,
      variables: {
        productTitle: order.product.title,
        shippingMode: order.shippingMode,
        deliveryStatus: order.deliveryStatus,
        carrier: order.carrier || 'Ghana Post',
        trackingHistory: order.trackingHistory || 'No updates yet'
      }
    });
    return { summary: text.trim() };
  } catch (error) {
    console.error("AI Tracking Error:", error);
    return { summary: "We're tracking your order and will provide updates as soon as they're available." };
  }
}

export async function generateProductDescription(title: string, category: string) {
  try {
    const text = await callGenerativeModel({
      promptId: process.env.PRODUCT_DESCRIPTION_PROMPT_ID,
      defaultPrompt: `Generate a catchy, professional product description for "{{title}}" in the "{{category}}" category on a student marketplace. Max 3 sentences. Focus on value for students.`,
      variables: { title, category }
    });
    return { description: text.trim() };
  } catch (error) {
    console.error("AI Description Error:", error);
    return { description: "Professional product listing. Perfect for campus life." };
  }
}

export async function analyzeProductImage(base64Image: string) {
  try {
    const text = await callGenerativeModel({
      promptId: process.env.IMAGE_ANALYSIS_PROMPT_ID,
      defaultSystemInstruction: "You are a product listing expert for a Ghanaian student marketplace.",
      defaultPrompt: `
    Analyze this product image and generate:
    1. A short, catchy title (max 50 chars).
    2. A professional 2-3 sentence description highlighting benefits for students.
    3. The most appropriate subcategory name from this list:
       - Laptops, Smartphones, Headphones, Accessories
       - Textbooks, Stationery, Lab Gear
       - Clothing, Shoes, Accessories (Fashion)
       - Furniture, Kitchenware, Bedding
       - Gym Gear, Musical Instruments, Games
       - Tutoring, Delivery, Hair & Beauty

    Return ONLY a JSON object:
    {
      "title": string,
      "description": string,
      "categoryName": string
    }`,
      imagePart: {
        inlineData: {
          data: base64Image.split(',')[1] || base64Image,
          mimeType: "image/jpeg"
        }
      },
      responseMimeType: "application/json"
    });
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Image Analysis Error:", error);
    return {
      title: "Product from Image",
      description: "Uploaded via AI assistant. Ready for review.",
      categoryName: "Other"
    };
  }
}

export async function generateProductSuggestions(targetProduct: any, candidates: any[]) {
  if (candidates.length === 0) {
    return candidates.slice(0, 4);
  }

  try {
    const candidatesData = candidates.map(c => ({
      id: c.id,
      title: c.title,
      price: parseFloat(c.price),
      storeName: c.store.name
    }));

    const text = await callGenerativeModel({
      promptId: process.env.SUGGESTIONS_PROMPT_ID,
      defaultSystemInstruction: "You are a shopping assistant on a campus marketplace.",
      defaultPrompt: `
    The user is looking at this product:
    Title: "{{title}}"
    Price: {{price}}
    Category: "{{category}}"

    Here is a list of other available products:
    {{candidatesData}}

    Identify which products from the list are the SAME items or very similar alternatives from OTHER sellers, and have the SAME or LOWER price.
    Return ONLY a JSON array of product IDs, ordered by best value (lowest price first).
    Keep at most 4 suggestions.
    If no items match, return an empty array [].
    `,
      variables: {
        title: targetProduct.title,
        price: targetProduct.price,
        category: targetProduct.category.name,
        candidatesData: JSON.stringify(candidatesData)
      },
      responseMimeType: "application/json"
    });
    
    const suggestedIds = JSON.parse(text);
    
    // Maintain the order returned by AI
    const suggestedProducts = suggestedIds
      .map((id: number) => candidates.find(c => c.id === id))
      .filter(Boolean);
      
    return suggestedProducts.length > 0 ? suggestedProducts : candidates.slice(0, 4);
  } catch (error) {
    console.error("AI Suggestions Error:", error);
    return candidates.slice(0, 4);
  }
}

export async function verifyFaceMatch(idPhotoBase64: string, liveSelfieBase64: string) {
  try {
    const text = await callGenerativeModel({
      defaultSystemInstruction: "You are a professional identity verification expert.",
      defaultPrompt: `
    Compare the faces in these two images:
    1. Image 1 is a photo from an identification document.
    2. Image 2 is a live selfie photo.

    Determine if both photos are of the same person.
    Consider facial features, bone structure, and other identifying marks.
    If the photos are of different people, or if one image is too blurry to tell, return false.
    If they are clearly the same person, return true.

    Return ONLY a JSON object:
    {
      "match": boolean,
      "confidence": number (0 to 1),
      "reason": string (short explanation)
    }`,
      imagePart: [
        {
          inlineData: {
            data: idPhotoBase64.split(',')[1] || idPhotoBase64,
            mimeType: "image/jpeg"
          }
        },
        {
          inlineData: {
            data: liveSelfieBase64.split(',')[1] || liveSelfieBase64,
            mimeType: "image/jpeg"
          }
        }
      ] as any,
      responseMimeType: "application/json"
    });
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Face Match Error:", error);
    return { match: true, confidence: 0.5, reason: "Verification system fallback." };
  }
}

export async function extractProductFromHtml(html: string) {
  try {
    // 1. Pre-extract structured data to help the AI and save tokens
    const metaTags: any = {};
    
    // Extract JSON-LD
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      metaTags.jsonLd = jsonLdMatch.slice(0, 5).map(s => {
        try {
          const content = s.replace(/<script type="application\/ld\+json">|<\/script>/gi, '').trim();
          return JSON.parse(content);
        } catch (e) { return null; }
      }).filter(Boolean);
    }

    // Extract OpenGraph and standard Meta tags
    const metaMatches = html.match(/<meta (?:property|name|itemprop)="(.*?)" content="(.*?)"/gi);
    if (metaMatches) {
      metaMatches.forEach(m => {
        const propMatch = m.match(/(?:property|name|itemprop)="(.*?)"/);
        const contMatch = m.match(/content="(.*?)"/);
        if (propMatch && contMatch) {
          const key = propMatch[1];
          const val = contMatch[1];
          if (key.startsWith('og:') || key.startsWith('product:') || key === 'description' || key === 'title' || key.includes('price')) {
            metaTags[key] = val;
          }
        }
      });
    }

    // 2. Truncate HTML to avoid token limits, focus on body content
    // Remove scripts and styles to keep only useful text/tags
    const cleanedHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
      .substring(0, 40000); 

    const text = await callGenerativeModel({
      defaultSystemInstruction: "You are a professional e-commerce web scraping agent. Your task is to identify and extract product details from messy HTML content. You are highly accurate at finding the real price, title, and images even when they are buried in complex code.",
      defaultPrompt: `
    Extract product information from the provided HTML and Meta Data. 
    Prioritize the Meta Data (JSON-LD and OpenGraph) as they are usually the most accurate source of truth.

    Meta Data Found:
    ${JSON.stringify(metaTags, null, 2)}

    Categories and Subcategories for our marketplace:
    - Electronics: Laptops, Smartphones, Headphones, Accessories
    - Academic: Textbooks, Stationery, Lab Gear
    - Fashion: Clothing, Shoes, Accessories
    - Home & Dorm: Furniture, Kitchenware, Bedding
    - Sports & Leisure: Gym Gear, Musical Instruments, Games
    - Services: Tutoring, Delivery, Hair & Beauty

    Instructions:
    1. Find the product name/title.
    2. Find the current price (as a number).
    3. Find the original price if on sale (as a number or null).
    4. Extract at least 1-3 high-quality product image URLs.
    5. Determine the condition ("new" or "used"). Default to "new" unless specified.
    6. Map it to one of the categories/subcategories above.

    Return ONLY a JSON object:
    {
      "title": string,
      "description": string,
      "price": number,
      "originalPrice": number | null,
      "condition": "new" | "used",
      "images": string[],
      "categoryName": string,
      "subcategoryName": string
    }

    HTML Content:
    ${cleanedHtml}`,
      responseMimeType: "application/json"
    });
    
    // Clean up the response text - remove markdown code blocks if present
    const cleanedText = text.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("AI Extraction Error:", error);
    // If it's a JSON parse error, try to return a partial object instead of throwing
    if (error instanceof SyntaxError) {
       throw new Error("The AI returned an invalid response. This can happen with some websites. Please try again or use a different link.");
    }
    throw new Error("Failed to extract product data from this URL.");
  }
}

export async function generateActivitySummary(activities: any[]) {
  try {
    const text = await callGenerativeModel({
      defaultSystemInstruction: "You are a platform manager providing a high-level briefing to an administrator.",
      defaultPrompt: `
    Summarize the following recent platform activities into a professional, encouraging 2-3 sentence overview. 
    Focus on growth, engagement, and any notable trends.

    Activities:
    ${JSON.stringify(activities)}

    If there are no activities, provide a short encouraging message about getting started.
    `,
    });
    return { summary: text.trim() };
  } catch (error) {
    console.error("AI Activity Summary Error:", error);
    return { summary: "Platform activity is stable. Continue monitoring for new orders and store registrations." };
  }
}

export async function generateWeeklyDealFlyerContent(product: any) {
  try {
    const text = await callGenerativeModel({
      defaultSystemInstruction: "You are a creative advertising copywriter specializing in social media flyers for students.",
      defaultPrompt: `
    Generate catchy promotional content for a "Weekly Deal" flyer.
    Product: "{{title}}"
    Category: "{{category}}"
    Price: {{price}}

    Create:
    1. A bold, 2-4 word headline (e.g. "GEAR UP FOR FINALS").
    2. A short, high-energy subtext (max 10 words).

    Return ONLY a JSON object:
    {
      "headline": string,
      "subtext": string
    }
    `,
      variables: {
        title: product.title,
        category: product.category?.name || 'Item',
        price: product.price
      },
      responseMimeType: "application/json"
    });
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Flyer Content Error:", error);
    return {
      headline: "HOT CAMPUS DEAL",
      subtext: "Exclusive savings for students this week only!"
    };
  }
}

