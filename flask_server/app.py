from flask import Flask, render_template, request, jsonify
from textblob import TextBlob
from paraphrase import paraphrase
from predict import run_prediction
import json
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment varibles
load_dotenv()

app = Flask(__name__)
CORS(app)
answers = []




def load_questions_short():
    questions_short = []
    try:
        with open('data/questions_short.txt', encoding="utf8") as f:
            questions_short = [line.strip() for line in f.readlines() if line.strip()]
    except Exception as e:
        print(f"Error loading questions: {e}")
    return questions_short


def getContractAnalysis(selected_response):
    print(selected_response)
    
    if selected_response == "":
        return "No answer found in document"
    else:
        blob = TextBlob(selected_response)
        polarity = blob.sentiment.polarity
        print(polarity)

        if polarity > 0:
            return "Positive"
        elif polarity < 0:
            return "Negative"
        else:
            return "Neutral"



# Initial load (optional, but good for check)
load_questions_short()



@app.route('/questionsshort')
def getQuestionsShort():
    return load_questions_short()




@app.route('/contracts', methods=["POST"], strict_slashes=False)
def getContractResponse():
    
    file = request.files.get("file")
    if not file:
        return "No file uploaded", 400
    question = request.form.get('question', '')

    # Process the file based on extension
    filename = file.filename.lower()
    paragraph = ""
    
    try:
        if filename.endswith('.pdf'):
            import pypdf
            import io
            print("Processing PDF file...", flush=True)
            pdf_reader = pypdf.PdfReader(file)
            text_content = []
            for page in pdf_reader.pages:
                text_content.append(page.extract_text())
            paragraph = "\n".join(text_content)
        else:
            # Assume text file
            file.seek(0)
            file_bytes = file.read()
            try:
                paragraph = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                paragraph = file_bytes.decode("latin-1")
                
    except Exception as e:
        print(f"Error reading file: {e}")
        return f"Error reading file: {str(e)}", 400
    
    response = []
    answer = ""

    import os
    if os.path.exists("nbest.json"):
        try:
            os.remove("nbest.json")
            print("Removed existing nbest.json")
        except Exception as e:
            print(f"Warning: Could not remove nbest.json: {e}")

    if paragraph.strip() and question.strip():
        print(f"getting predictions for question: {question}")
        
        # run_prediction now returns the prediction dictionary directly
        predictions_data = run_prediction([question], paragraph, 'marshmellow77/roberta-base-cuad', n_best_size=5)
        print(f"DEBUG: Raw predictions keys: {predictions_data.keys()}", flush=True)
        
        answer = []
        # The pipeline wrapper returns predictions keyed by question index '0'
        results = predictions_data.get('0', [])
        
        if not results:
             print("DEBUG: No results found in predictions_data['0']", flush=True)
             answer.append({
                "answer": 'No answer found in document',
                "probability": ""
            })
        else:
            for i in range(min(5, len(results))):
                text_ans = results[i].get('text', '')
                if not text_ans.strip(): 
                    continue
                    
                answer.append({
                    "answer": text_ans,
                    # Pipeline scores are floats, e.g., 0.95. Convert to percentage string.
                    "probability": f"{round(results[i].get('probability', 0)*100, 1)}%",
                    "analyse": getContractAnalysis(text_ans)
                })
        
        # Fallback if valid answers were filtered out
        if not answer:
             answer.append({
                "answer": 'No answer found in document',
                "probability": ""
            })
            
        json_response = json.dumps(answer)
        print(f"DEBUG: Sending response to frontend: {json_response}", flush=True)
        return json_response

    else:
        return "Unable to call model, please select question and contract", 400

 




@app.route('/contracts/paraphrase', methods=['POST'])
def getContractParaphrase():
    data = request.get_json()
    selected_response = data.get('text', '')
    
    print(f"Paraphrasing text length: {len(selected_response)}")
    
    if selected_response == "":
        return jsonify(["No text provided to paraphrase"])
    else:
        print('getting paraphrases')
        paraphrases = paraphrase(selected_response)
        # Ensure we return a list, paraphrase() returns a list
        return jsonify(paraphrases)

@app.route('/get_response', methods=['POST'])
def get_response():
    question = request.form['selected_response']
    with open('responses.json', 'r') as file:
        responses = json.load(file)
        for response in responses:
            if response['question'] == question:
                return response['answer']
    
    return "Response not found"

@app.route('/analyze_risks', methods=['POST'])
def analyze_risks_route():
    file = request.files.get("file")
    if not file:
        return "No file uploaded", 400

    # 1. Extract Text (Reuse logic)
    filename = file.filename.lower()
    paragraph = ""
    try:
        if filename.endswith('.pdf'):
            import pypdf
            print("Processing PDF for Risk Analysis...", flush=True)
            pdf_reader = pypdf.PdfReader(file)
            text_content = []
            for page in pdf_reader.pages:
                text_content.append(page.extract_text())
            paragraph = "\n".join(text_content)
        else:
            file.seek(0)
            file_bytes = file.read()
            try:
                paragraph = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                paragraph = file_bytes.decode("latin-1")
    except Exception as e:
        return jsonify({"summary": "Error reading file", "detailed": str(e)})

    # 2. Call Analysis
    from predict import analyze_risks
    if paragraph.strip():
        result = analyze_risks(paragraph)
        return jsonify(result)
    else:
        return jsonify({"summary": "Empty document", "detailed": ""})






    





if __name__ == '__main__':
    app.run(debug=True)
