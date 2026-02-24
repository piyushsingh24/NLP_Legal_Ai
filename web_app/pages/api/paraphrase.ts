import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'No text provided' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Paraphrase the following sentence in 3 different ways:\n'${text}'\nOutput ONLY the paraphrased sentences, one per line. No numbering or bullets.`;
    const result = await model.generateContent(prompt);
    const rawResponse = result.response.text();
    console.log('Gemini Paraphrase Response:', rawResponse);
    const paraphrases = rawResponse
      .split('\n').map((l: string) => l.trim().replace(/^[-*]\s*/, '')).filter((l: string) => l.length > 0).slice(0, 5);
    res.status(200).json(paraphrases);
  } catch (error) {
    res.status(500).json({ error: 'Paraphrase failed', details: String(error) });
  }
}
