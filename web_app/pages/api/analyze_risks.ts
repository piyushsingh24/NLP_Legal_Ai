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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    return;
  }

  const form = new IncomingForm({ keepExtensions: true });

  try {
    const { fields, files } = await new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
      form.parse(req, (err: Error | null, fields: Fields, files: Files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const fileArr = files.file;
    const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    try {
      const paragraph = await extractText(file.filepath, file.originalFilename || '');
      if (!paragraph.trim()) {
        res.status(200).json({ summary: 'Empty document', detailed: '' });
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Chunking if text is very large (arbitrary limit for prompt stability)
      const MAX_CHARS = 30000;
      let processedText = paragraph;
      if (paragraph.length > MAX_CHARS) {
        console.log(`Large document detected (${paragraph.length} chars). Truncating or chunking might be needed, but trying 1.5-flash capacity first.`);
        // For now, we'll try to send it, but if it fails we might need a more complex strategy.
        // Actually, let's implement a simple truncation for safety or just pass it if it's within limits.
        // gemini-1.5-flash can handle 1M tokens, so 30k chars is well within.
        // The issue might be the response time or a specific error.
      }

      const prompt = `Analyze the following legal contract for risks, loopholes, and liabilities.\n\nCONTEXT:\n${processedText}\n\nReturn a valid JSON with exactly two keys:\n1. "summary": Top 3-5 critical risks as plain text.\n2. "detailed": Comprehensive explanation citing specific clauses.\n\nDo NOT include markdown code fences. Just raw JSON.`;

      const result = await model.generateContent(prompt).catch(err => {
        console.error('Gemini API Error:', err);
        throw new Error(`Gemini API failed: ${err.message}`);
      });

      const rawResponse = result.response.text();
      console.log('Gemini Raw Risk Response:', rawResponse);
      let text = rawResponse.trim();
      if (text.startsWith('```json')) text = text.slice(7);
      if (text.startsWith('```')) text = text.slice(3);
      if (text.endsWith('```')) text = text.slice(0, -3);
      text = text.trim();
      try {
        res.status(200).json(JSON.parse(text));
      } catch {
        res.status(200).json({ summary: 'Could not parse analysis output.', detailed: text });
      }
    } catch (error: any) {
      console.error('Risk analysis processing error:', error);
      res.status(500).json({ error: `Analysis Error: ${error.message}` });
    } finally {
      try { fs.unlinkSync(file.filepath); } catch { }
    }
  } catch (error) {
    console.error('Form parse error in risk analysis:', error);
    res.status(500).json({ error: String(error) });
  }
}
