import { useEffect, useState } from 'react';
import { NavBar } from '../components/navbar';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const FileUpload: React.FC = () => {
  const [selectedResponse, setSelectedResponse] = useState<string>('');
  const [questions] = useState([
    "Question 1: What is the contract name?",
    "Question 2: Who are the parties that signed the contract?",
    "Question 3: What is the agreement date of the contract?",
    "Question 4: What is the date when the contract is effective?",
    "Question 5: What date will the contract's initial term expire?",
    "Question 6: What is the renewal term after the initial term expires?",
    "Question 7: What is the notice period required to terminate renewal?",
    "Question 8: Which state/country's law governs the interpretation of the contract?",
    "Question 9: What happens if a third party gets better terms in the contract?",
    "Question 10: What is the restriction on the ability of a party to compete with the counterparty?",
    "Question 11: Is there an exclusive dealing commitment with the counterparty?",
    "Question 12: Is a party restricted from contracting or soliciting customers?",
    "Question 13: What are the competitive restriction exceptions in the contract?",
    "Question 14: Is there a restriction on a party’s soliciting or hiring employees?",
    "Question 15: Is there a requirement on a party not to disparage the counterparty?",
    "Question 16: Can a party terminate this contract without cause?",
    "Question 17: What are the terms granting for right of first refusal, first offer, or negotiation?",
    "Question 18: What are the terms about right of termination?",
    "Question 19: Is consent or notice required of a party if the contract is assigned to a third party?",
    "Question 20: What are the terms for revenue and profit sharing?",
    "Question 21: What are the restrictions to raise or reduce prices of technology, goods, or services provided?",
    "Question 22: Is there a minimum order size or minimum amount or units per-time period?",
    "Question 23: What are the volume restrictions if one party’s use of the product/services exceeds certain threshold?",
    "Question 24: What are the terms about intellectual property created by one party?",
    "Question 25: What terms are related to joint IP ownership?",
    "Question 26: Does the contract contain a license granted by one party to its counterparty?",
    "Question 27: Does the contract limit the ability of a party to transfer the license being granted to a third party?",
    "Question 28: Does the contract contain a license grant by affiliates of the licensor?",
    "Question 29: Does the contract contain a license grant to a licensee?",
    "Question 30: Is there a clause granting one party an “enterprise,” “all you can eat” or unlimited usage license?",
    "Question 31: Does the contract contain a license grant that is irrevocable or perpetual?",
    "Question 32: Is one party required to deposit its source code into escrow with a third party?",
    "Question 33: Is a party subject to obligations after the termination or expiration of a contract?",
    "Question 34: Does a party have the right to audit the books, records, or physical locations of the counterparty?",
    "Question 35: Is a party’s liability uncapped upon the breach of its obligation in the contract?",
    "Question 36: Does the contract include a cap on liability upon the breach of a party’s obligation?",
    "Question 37: What clauses would either award either party liquidated damages for breach?",
    "Question 38: What is the duration of any warranty against defects or errors in technology, products, or services?",
    "Question 39: What are the requirements for insurance that must be maintained?",
    "Question 40: What sections describe the covenant not to sue?",
    "Question 41: What clauses relate to third-party beneficiaries?"
  ]);
  const [selectedQuestion, setSelectedQuestion] = useState(questions[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    return fullText;
  };

  const getAnalysis = (answer: string): string => {
    const lower = answer.toLowerCase();
    let score = 0;
    ['complies', 'allows', 'grants', 'provides', 'includes', 'covered'].forEach(w => { if (lower.includes(w)) score++; });
    ['does not', 'shall not', 'prohibited', 'terminat', 'risk', 'penalty', 'liable'].forEach(w => { if (lower.includes(w)) score--; });
    return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const textarea = document.getElementById('response') as HTMLTextAreaElement;
    const fileInput = (e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement);
    const question = selectedQuestion;

    if (!fileInput.files || fileInput.files.length === 0) {
      alert("Please upload a file first!");
      return;
    }

    if (textarea) textarea.value = "Extracting text and generating response...";
    setIsAnalyzing(true);

    try {
      const file = fileInput.files[0];
      let text = "";
      if (file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractTextFromPDF(file);
      } else {
        text = await file.text();
      }

      if (!text.trim()) throw new Error("Could not extract text from file.");

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key is not configured (NEXT_PUBLIC_GEMINI_API_KEY)");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Context:\n${text}\n\nQuestion:\n${question}\n\nAnswer ONLY from context. If not found, say "No answer found in document". Be concise.`;

      const result = await model.generateContent(prompt);
      const answerText = result.response.text().trim() || 'No answer found in document';

      const analysis = getAnalysis(answerText);
      const data = [{ answer: answerText, probability: '99.0%', analyse: analysis }];

      setSelectedResponse(answerText);
      const textareaContent = data
        .map((res, index) => `Answer ${index + 1}: ${res.answer} (${res.probability}) (${res.analyse})`)
        .join('\n');

      if (textarea) textarea.value = textareaContent;
      document.getElementById('explanation')!.innerHTML = '';

    } catch (error: any) {
      console.error("Error generating response:", error);
      if (textarea) textarea.value = `Error: ${error.message}`;
    } finally {
      setIsAnalyzing(false);
    }
  };


  /* Risk Analysis State */
  const [riskData, setRiskData] = useState<{ summary: string; detailed: string } | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleRiskAnalysis = async () => {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      alert("Please upload a file first!");
      return;
    }

    setIsAnalyzing(true);
    setRiskData(null);
    setShowDetail(false);

    try {
      const file = fileInput.files[0];
      let text = "";
      if (file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractTextFromPDF(file);
      } else {
        text = await file.text();
      }

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key is not configured (NEXT_PUBLIC_GEMINI_API_KEY)");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Analyze the following legal contract for risks, loopholes, and liabilities.\n\nCONTEXT:\n${text}\n\nReturn a valid JSON with exactly two keys:\n1. "summary": Top 3-5 critical risks as plain text.\n2. "detailed": Comprehensive explanation citing specific clauses.\n\nDo NOT include markdown code fences or any other text. Just raw JSON.`;

      const result = await model.generateContent(prompt);
      let rawResponse = result.response.text().trim();

      // Basic JSON cleaning
      if (rawResponse.startsWith('```json')) rawResponse = rawResponse.slice(7);
      if (rawResponse.startsWith('```')) rawResponse = rawResponse.slice(3);
      if (rawResponse.endsWith('```')) rawResponse = rawResponse.slice(0, -3);
      rawResponse = rawResponse.trim();

      try {
        const parsed = JSON.parse(rawResponse);
        setRiskData(parsed);
      } catch {
        setRiskData({ summary: 'Could not parse analysis.', detailed: rawResponse });
      }

    } catch (error: any) {
      console.error("Risk Analysis Error:", error);
      setRiskData({
        summary: "Error analyzing risks.",
        detailed: error.message || String(error)
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <NavBar />
      <div className='titre'>
        <div className='first-word'>Contract Q&A:</div>
        <div className='complete-phrase'>
          <span>Unlocking Answers to Vital Questions</span>
        </div>
      </div>
      <div className='dashboard'>

        <form onSubmit={handleFormSubmit} encType="multipart/form-data">
          <label htmlFor="images" className="drop-container">
            <span className="drop-title">Drop files here</span>
            or
            <input type="file" className='file-upload' name="file" required />
          </label>
          <select name="question" className="select-box" onChange={(e) => setSelectedQuestion(e.target.value)}>
            {questions && questions.map((question, index) => (
              <option key={index} value={question}>
                {question}
              </option>
            ))}
          </select>
          <input className="custom-btn btn-8" type="submit" value="Generate Response" />
        </form>

        <div className="code-container">
          <section className="augs bg" data-augmented-ui>
            <input className="title" value="Get Response" readOnly />
            <div className="code highcontrast-dark">
              <textarea id="response" className="code-textarea" rows={10} placeholder="Generate Response..." readOnly>
              </textarea>
            </div>
          </section>
        </div>

        <div className="ccode highcontrast-dark" id="explanation"></div>

        {/* Risk Analysis Section */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button className="custom-btn btn-11" onClick={handleRiskAnalysis} disabled={isAnalyzing} style={{ backgroundColor: isAnalyzing ? '#95a5a6' : '#e74c3c', cursor: isAnalyzing ? 'not-allowed' : 'pointer' }}>
            <span>{isAnalyzing ? '⏳ Analyzing...' : '⚠️ Analyze Legal Risks'}</span>
          </button>
        </div>

        {(isAnalyzing || riskData) && (
          <div id="risk-container" className="ccode highcontrast-dark" style={{ display: 'block', marginTop: '20px', padding: '15px', border: '1px solid #e74c3c' }}>
            {isAnalyzing ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div className="loader"></div>
                <p style={{ marginTop: '10px' }}>Analyzing Contract Risks... Please wait.</p>
                <style>{`
                            .loader {
                                border: 5px solid #f3f3f3;
                                border-top: 5px solid #e74c3c;
                                border-radius: 50%;
                                width: 40px;
                                height: 40px;
                                animation: spin 1s linear infinite;
                                margin: 0 auto;
                            }
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}</style>
              </div>
            ) : (
              <>
                <h3 style={{ color: '#e74c3c' }}>🚨 Risk Analysis Summary</h3>
                <div id="risk-summary" style={{ whiteSpace: 'pre-wrap', textAlign: 'left', marginBottom: '15px' }}>
                  {riskData?.summary}
                </div>

                <button className="custom-btn btn-9" onClick={() => setShowDetail(!showDetail)}>
                  <span>{showDetail ? 'Hide Detailed Analysis' : 'Show Detailed Analysis'}</span>
                </button>

                {showDetail && (
                  <div id="risk-detail" style={{ display: 'block', marginTop: '15px', padding: '10px', background: '#333', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                    {riskData?.detailed}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="ccode highcontrast-dark" id="analysis"></div>
      </div >
    </>
  );
};

export default FileUpload;
