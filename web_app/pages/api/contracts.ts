import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IncomingForm, Fields, Files } from 'formidable';
import fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

export const config = { api: { bodyParser: false } };

async function extractText(filePath: string, filename: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  if (filename.toLowerCase().endsWith('.pdf')) {
    const data = await pdfParse(buffer);
    return data.text;
  }
  try { return buffer.toString('utf-8'); } catch { return buffer.toString('latin1'); }
}

function getAnalysis(answer: string): string {
  const lower = answer.toLowerCase();
  let score = 0;
  ['complies', 'allows', 'grants', 'provides', 'includes', 'covered'].forEach(w => { if (lower.includes(w)) score++; });
  ['does not', 'shall not', 'prohibited', 'terminat', 'risk', 'penalty', 'liable'].forEach(w => { if (lower.includes(w)) score--; });
  return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const form = new IncomingForm({ keepExtensions: true });
  form.parse(req, async (err: Error | null, fields: Fields, files: Files) => {
    if (err) return res.status(500).json({ error: String(err) });
    const fileArr = files.file;
    const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    const q = fields.question;
    const question = (Array.isArray(q) ? q[0] : q) || '';
    if (!question.trim()) return res.status(400).json({ error: 'No question provided' });
    try {
      const paragraph = await extractText(file.filepath, file.originalFilename || '');
      if (!paragraph.trim()) return res.status(400).json({ error: 'Empty file' });
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Context:\n${paragraph}\n\nQuestion:\n${question}\n\nAnswer ONLY from context. If not found, say "No answer found in document". Be concise.`;
      const result = await model.generateContent(prompt);
      const answerText = result.response.text().trim() || 'No answer found in document';
      console.log('Gemini Response:', answerText);
      return res.status(200).json([{ answer: answerText, probability: '99.0%', analyse: getAnalysis(answerText) }]);
    } catch (error) {
      return res.status(500).json([{ answer: `Error: ${String(error)}`, probability: '0%', analyse: 'neutral' }]);
    } finally {
      try { fs.unlinkSync(file.filepath); } catch { }
    }
  });
}
