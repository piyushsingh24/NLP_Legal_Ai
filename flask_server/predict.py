import os
from google import genai
from dotenv import load_dotenv
import re
import warnings

warnings.filterwarnings("ignore", category=FutureWarning)

load_dotenv()

GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
client = None
if GENAI_API_KEY:
    client = genai.Client(api_key=GENAI_API_KEY)
else:
    print("Error: GEMINI_API_KEY not found in environment variables.")


def simple_keyword_search(question, context):
    sentences = re.split(r'(?<=[.!?])\s+', context)
    question_words = set(re.findall(r'\w+', question.lower()))
    if not question_words:
        return "No query words found."

    best_score = -1
    best_sentence = "No matching content found."

    for sentence in sentences:
        sentence_words = set(re.findall(r'\w+', sentence.lower()))
        if not sentence_words:
            continue
        score = len(question_words.intersection(sentence_words))
        if score > best_score:
            best_score = score
            best_sentence = sentence

    return best_sentence


def run_prediction(question_texts, context_text, model_path, n_best_size=5):
    print(f"Starting prediction for {len(question_texts)} questions...", flush=True)

    all_predictions = []

    for i, question in enumerate(question_texts):
        print(f"Processing question {i+1}/{len(question_texts)}: {question}...", flush=True)

        prompt = f"""
        Context:
        {context_text}

        Question:
        {question}

        Answer the question based ONLY on the context provided above.
        If the answer is not in the context, say "No answer found in document".
        Keep the answer concise and direct.
        """

        gemini_success = False
        answer_text = ""

        if client:
            try:
                response = client.models.generate_content(
                    model='gemini-2.0-flash-lite',
                    contents=prompt
                )
                if response.text:
                    answer_text = response.text.strip()
                    print(f"Gemini Answer: {answer_text}", flush=True)
                    gemini_success = True
            except Exception as e:
                print(f"Gemini Unavailable ({e}). Switching to fallback.", flush=True)

        if not gemini_success:
            print("Using Keyword Search Fallback...", flush=True)
            answer_text = simple_keyword_search(question, context_text)
            answer_text += " (Local Fallback)"

        all_predictions.append({
            '0': {
                "text": answer_text,
                "probability": 0.99 if gemini_success else 0.5,
                "start_logit": 0.0,
                "end_logit": 0.0
            }
        })

    final_output = {}
    for i, preds in enumerate(all_predictions):
        formatted_list = [preds[key] for key in preds]
        final_output[str(i)] = formatted_list

    return final_output


def analyze_risks(context_text):
    print("Starting Risk Analysis...", flush=True)

    if not client:
        return {"summary": "Error: API Key missing", "detailed": ""}

    prompt = f"""
    Analyze the following legal contract context for potential risks, loopholes, and liabilities.

    CONTEXT:
    {context_text}

    OUTPUT FORMAT:
    Return a valid JSON string (NO markdown formatting) with exactly two keys:
    1. "summary": A concise, bulleted list of the top 3-5 most critical risks (plain text).
    2. "detailed": A comprehensive, deep-dive explanation of all identified risks, citing specific clauses if possible (plain text).

    Do not include ```json or ``` tags. Just the raw JSON string.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash-lite',
            contents=prompt
        )
        text = response.text.strip()

        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]

        import json
        try:
            return json.loads(text.strip())
        except json.JSONDecodeError:
            return {"summary": "Could not parse structured analysis.", "detailed": text}

    except Exception as e:
        print(f"Risk Analysis Error: {e}")
        return {"summary": "Error during analysis.", "detailed": str(e)}
