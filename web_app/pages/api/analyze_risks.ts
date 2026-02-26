import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Fields, Files } from 'formidable';
import fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    if (file.size > 10 * 1024 * 1024) {
      res.status(400).json({ error: 'File is too large. Maximum size is 10MB.' });
      return;
    }

    try {
      const paragraph = await extractText(file.filepath, file.originalFilename || '');
      if (!paragraph.trim()) {
        res.status(200).json({ summary: 'Empty document', detailed: '' });
        return;
      }

      const MAX_CHARS = 20000;
      let processedText = paragraph.length > MAX_CHARS ? paragraph.slice(0, MAX_CHARS) : paragraph;

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `Analyze the following legal contract for risks, loopholes, and liabilities.\n\nCONTEXT:\n${processedText}\n\nReturn EXACTLY this JSON format:\n{\n  "summary": "Top 3-5 critical risks",\n  "detailed": "Detailed explanation"\n}`;

      const result = await model.generateContent(prompt);
      const rawResponse = result.response.text();

      console.log('Gemini SDK Risk Response:', rawResponse);
      try {
        res.status(200).json(JSON.parse(rawResponse));
      } catch {
        // Fallback if JSON parsing fails
        res.status(200).json({ summary: 'Analysis complete but output format was unexpected.', detailed: rawResponse });
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
