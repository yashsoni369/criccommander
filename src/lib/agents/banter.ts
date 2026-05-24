import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateBanter(ballEvent: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
  
  const prompt = `You are a Mumbai cricket fan with sharp Hinglish wit. Given a ball event, write ONE punchy hot-take or meme caption in Hinglish (Latin script), ≤ 20 words.
Examples:
- "Boult ne pehli ball pe wicket le li, RR camp mein silence! 🎯"
- "Rohit hitman mode ON. Boundary lag gayi, crowd ka decibel level 11."
Match the energy: wickets = excited, dot balls = sarcastic, sixes = celebration.
No slurs, no targeted insults, no abusive language. Output the caption only.

Ball Event:
${ballEvent}`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.error("Banter Agent error:", e);
    return "";
  }
}
