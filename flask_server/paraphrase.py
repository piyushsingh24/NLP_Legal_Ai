import os
import google.generativeai as genai
from dotenv import load_dotenv
import warnings

# Suppress the deprecation warning
warnings.filterwarnings("ignore", category=FutureWarning)

# Load environment variables
load_dotenv()

# Configure Gemini
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")

_gemini_configured = False

def configure_gemini():
    global _gemini_configured
    if not _gemini_configured and GENAI_API_KEY:
        genai.configure(api_key=GENAI_API_KEY)
        _gemini_configured = True

def paraphrase(question, num_return_sequences=1, max_length=128):
    """
    Paraphrases utilizing Google Gemini (Old SDK).
    Deprecated warning is suppressed.
    """
    configure_gemini()
    
    if not GENAI_API_KEY:
        return [question]

    print(f"Paraphrasing: {question}", flush=True)
    
    model = genai.GenerativeModel('gemini-2.0-flash-lite')
    
    prompt = f"Paraphrase the following sentence in 3 different ways:\n'{question}'\nOutput ONLY the paraphrased sentences, one per line. Do not include numbering or bullets."

    try:
        response = model.generate_content(prompt)
        
        if not response.text:
             return [question]

        paraphrases = [line.strip().lstrip('- ').strip() for line in response.text.split('\n') if line.strip()]
        return paraphrases[:5]
        
    except Exception as e:
        print(f"Gemini Paraphrase Error: {e}. Returning original text.", flush=True)
        return [question, f"(Fallback) {question}"]