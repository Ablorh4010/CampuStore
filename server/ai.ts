import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

export async function generateStoreProfile(name: string, university: string, city: string) {
  if (!process.env.GEMINI_API_KEY) {
    // Fallback if no key is provided
    return {
      description: `Welcome to ${name}! We are a premier student store located at ${university} in ${city}. We provide high-quality products for students by students. Shop with us for the best deals on campus!`,
      shippingModes: ["affordcampus_pickup", "seller_delivery"]
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    
    const prompt = `You are an AI assistant helping a student create a store profile on a campus marketplace app.
    The store name is "${name}".
    The student is located at "${university}" in "${city}".
    
    Generate an engaging store description (2-3 sentences) tailored to the campus community.
    Also, suggest the most appropriate shipping modes from this list: ["seller_delivery", "affordcampus_pickup", "ems"].
    (e.g., if they are on campus, affordcampus_pickup and seller_delivery are great. If they are far, ems might be needed).

    Return ONLY a JSON object with this schema:
    {
      "description": string,
      "shippingModes": string[]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate store profile with AI");
  }
}

export async function generateProductInsights(searchQuery: string) {
  if (!process.env.GEMINI_API_KEY) {
    return { suggestion: "I couldn't find a direct match, but I can keep an eye out!" };
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are a helpful shopping assistant on a university marketplace. The user is searching for: "${searchQuery}". Provide a very short, friendly 1-sentence response suggesting what they might look for or general advice for finding good deals on this item.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return { suggestion: response.text().trim() };
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return { suggestion: "I'm having trouble thinking right now, but feel free to browse our trending items!" };
  }
}

export async function generateTrackingInsights(order: any) {
  if (!process.env.GEMINI_API_KEY) {
    return { summary: "Your order is being processed and will be delivered soon." };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are a delivery assistant for "The University Hub", a campus marketplace in Ghana.
    Order Details:
    - Product: ${order.product.title}
    - Shipping Mode: ${order.shippingMode}
    - Delivery Status: ${order.deliveryStatus}
    - Carrier: ${order.carrier || 'Ghana Post'}
    - Tracking History: ${order.trackingHistory || 'No updates yet'}
    
    The user is based in Ghana.
    Standard Ghana Post takes 1-10 days.
    Express takes 1-3 days.
    
    Generate a friendly, reassuring 1-2 sentence update for the buyer about their delivery progress. Use Ghanaian context if possible.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return { summary: response.text().trim() };
  } catch (error) {
    console.error("AI Tracking Error:", error);
    return { summary: "We're tracking your order and will provide updates as soon as they're available." };
  }
}
