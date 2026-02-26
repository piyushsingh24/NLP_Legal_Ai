import type { NextApiRequest, NextApiResponse } from 'next';
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

      // Chunking if text is very large (arbitrary limit for prompt stability)
      const MAX_CHARS = 20000;
      let processedText = paragraph;
      if (paragraph.length > MAX_CHARS) {
        console.log(`Large document detected (${paragraph.length} chars). Truncating to ${MAX_CHARS} chars.`);
        processedText = paragraph.slice(0, MAX_CHARS) + "... [truncated for length]";
      }

      const prompt = `Analyze the following legal contract for risks, loopholes, and liabilities.\n\nCONTEXT:\n${processedText}\n\nReturn a valid JSON with exactly two keys:\n1. "summary": Top 3-5 critical risks as plain text.\n2. "detailed": Comprehensive explanation citing specific clauses.\n\nDo NOT include markdown code fences. Just raw JSON.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API Error:', errorData);
        throw new Error(`Gemini API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
