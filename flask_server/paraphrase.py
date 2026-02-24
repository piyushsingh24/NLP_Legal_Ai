import os
from google import genai
from dotenv import load_dotenv
import warnings

warnings.filterwarnings("ignore", category=FutureWarning)

load_dotenv()

GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
_client = None


def get_client():
    global _client
    if _client is None and GENAI_API_KEY:
        _client = genai.Client(api_key=GENAI_API_KEY)
    return _client


def paraphrase(text, num_return_sequences=1, max_length=128):
    client = get_client()
    if not client:
        return [text]

    print(f"Paraphrasing: {text}", flush=True)

    prompt = f"Paraphrase the following sentence in 3 different ways:\n'{text}'\nOutput ONLY the paraphrased sentences, one per line. Do not include numbering or bullets."

    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash-lite',
            contents=prompt
        )

        if not response.text:
            return [text]

        paraphrases = [
            line.strip().lstrip('- ').strip()
            for line in response.text.split('\n')
            if line.strip()
        ]
        return paraphrases[:5]

    except Exception as e:
        print(f"Gemini Paraphrase Error: {e}. Returning original text.", flush=True)
        return [text, f"(Fallback) {text}"]