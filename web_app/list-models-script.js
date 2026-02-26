const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found in .env.local");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    // There is no listModels in the client directly usually, but we can try fetching models
    // Or we use the REST API directly to be sure
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    const data = await response.json();
    console.log("Available Models (v1):", JSON.stringify(data, null, 2));

    const responseBeta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const dataBeta = await responseBeta.json();
    console.log("Available Models (v1beta):", JSON.stringify(dataBeta, null, 2));
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
