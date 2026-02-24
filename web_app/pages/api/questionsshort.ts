import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'questions_short.txt');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const questions = fileContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    res.status(200).json(questions);
  } catch (error) {
    console.error('Error reading questions file:', error);
    res.status(500).json({ error: 'Failed to load questions' });
  }
}
