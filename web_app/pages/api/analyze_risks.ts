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
    try {
      const paragraph = await extractText(file.filepath, file.originalFilename || '');
      if (!paragraph.trim()) return res.status(200).json({ summary: 'Empty document', detailed: '' });
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Analyze the following legal contract for risks, loopholes, and liabilities.\n\nCONTEXT:\n${paragraph}\n\nReturn a valid JSON with exactly two keys:\n1. "summary": Top 3-5 critical risks as plain text.\n2. "detailed": Comprehensive explanation citing specific clauses.\n\nDo NOT include markdown code fences. Just raw JSON.`;
      const result = await model.generateContent(prompt);
      const rawResponse = result.response.text();
      console.log('Gemini Raw Risk Response:', rawResponse);
      let text = rawResponse.trim();
      if (text.startsWith('```json')) text = text.slice(7);
      if (text.startsWith('```')) text = text.slice(3);
      if (text.endsWith('```')) text = text.slice(0, -3);
      text = text.trim();
      try { return res.status(200).json(JSON.parse(text)); }
      catch { return res.status(200).json({ summary: 'Could not parse analysis.', detailed: text }); }
    } catch (error) {
      return res.status(500).json({ summary: 'Error during analysis.', detailed: String(error) });
    } finally {
      try { fs.unlinkSync(file.filepath); } catch { }
    }
  });
}
