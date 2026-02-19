from predict import run_prediction
import time
import os

print("Starting Gemini API test...", flush=True)

# Context resembling a contract
context = "This agreement is valid for a period of two years from the date of signing."
questions = ["How long is the agreement valid?"]

start = time.time()
print("Sending request to Gemini...", flush=True)

try:
    results = run_prediction(questions, context, "unused")
    
    print(f"Response received in {time.time() - start:.2f} seconds.", flush=True)
    print("Results:", results, flush=True)

    if not results or not results.get('0'):
        print("FAILED: No results returned. Check API Key.", flush=True)
    else:
        print("SUCCESS: Gemini returned a valid answer.", flush=True)

except Exception as e:
    print(f"FAILED with error: {e}", flush=True)
