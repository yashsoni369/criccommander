import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateStats(ballEvent: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const prompt = `You are a cricket statistician. Given a single ball event (bowler, batter, outcome, score), produce ONE surprising or insightful statistical nugget in ≤ 25 words. Examples:
- "Bumrah's economy vs left-handers in death overs: 6.2. Lowest in IPL."
- "Rohit has scored 47% of his IPL runs in the powerplay since 2023."
Output the nugget only. No preamble. No emoji. If you don't have a real stat, return an empty string — do not hallucinate numbers.

Ball Event:
${ballEvent}`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.error("Stats Agent error:", e);
    return "";
  }
}
