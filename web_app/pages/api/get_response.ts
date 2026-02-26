import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { selected_response } = req.body;

  if (!selected_response) {
    res.status(400).json({ error: 'Question not provided' });
    return;
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'responses.json');
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Responses data not found' });
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const responses = JSON.parse(fileContent);

    const matchedResponse = responses.find((r: any) => r.question === selected_response);

    if (matchedResponse) {
      res.status(200).send(matchedResponse.answer);
    } else {
      res.status(404).send("Response not found");
    }
  } catch (error) {
    console.error('Error reading responses file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
