import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generatePrediction(matchState: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const prompt = `You are a cricket analyst. Given the current match state (score, overs left, wickets, run rate, required rate), output a JSON object:
{
  "winProbability": <0-100 for batting team>,
  "nextOverRunsPrediction": <number>,
  "wicketInNextOver": <true|false>,
  "reasoning": "<one sentence, ≤ 20 words>"
}
Be specific, not generic. Output JSON only, no markdown fences.

Match State:
${matchState}`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith("\`\`\`json")) text = text.replace(/\`\`\`json/g, "");
    if (text.startsWith("\`\`\`")) text = text.replace(/\`\`\`/g, "");
    if (text.endsWith("\`\`\`")) text = text.replace(/\`\`\`/g, "");
    
    return JSON.parse(text);
  } catch (e) {
    console.error("Predictor Agent error:", e);
    return null;
  }
}
