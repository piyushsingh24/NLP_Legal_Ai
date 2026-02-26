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

function getAnalysis(answer: string): string {
  const lower = answer.toLowerCase();
  let score = 0;
  ['complies', 'allows', 'grants', 'provides', 'includes', 'covered'].forEach(w => { if (lower.includes(w)) score++; });
  ['does not', 'shall not', 'prohibited', 'terminat', 'risk', 'penalty', 'liable'].forEach(w => { if (lower.includes(w)) score--; });
  return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
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

    const q = fields.question;
    const question = (Array.isArray(q) ? q[0] : q) || '';
    if (!question.trim()) {
      res.status(400).json({ error: 'No question provided' });
      return;
    }

    try {
      const paragraph = await extractText(file.filepath, file.originalFilename || '');
      if (!paragraph.trim()) {
        res.status(400).json({ error: 'The uploaded file appears to be empty.' });
        return;
      }
      // Ensure text is within reasonable bounds for a single prompt
      const processedText = paragraph.length > 20000 ? paragraph.slice(0, 20000) + "... [truncated for length]" : paragraph;

      const prompt = `Context:\n${processedText}\n\nQuestion:\n${question}\n\nAnswer ONLY from context. If not found, say "No answer found in document". Be concise.`;

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
        console.error('Gemini API Error (Contracts):', errorData);
        throw new Error(`AI Generation failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const answerText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No answer found in document';
      console.log('Gemini Response:', answerText);
      res.status(200).json([{ answer: answerText, probability: '99.0%', analyse: getAnalysis(answerText) }]);
    } catch (error: any) {
      console.error('Inner handler error:', error);
      res.status(500).json({ error: `AI Error: ${error.message}` });
    } finally {
      try { fs.unlinkSync(file.filepath); } catch { }
    }
  } catch (error) {
    console.error('Form parse error:', error);
    res.status(500).json({ error: String(error) });
  }
}
