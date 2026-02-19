from predict import run_prediction
import time

print("Starting test...", flush=True)
start = time.time()

context = "This contract is renewable for one year periods upon 30 days written notice."
questions = ["What is the notice period?"]

print("Calling run_prediction...", flush=True)
results = run_prediction(questions, context, "unused_model_path")

print(f"Prediction returned in {time.time() - start:.2f} seconds.", flush=True)
print("Results:", results, flush=True)
