import { useEffect, useState } from 'react';
import NavBar from '../components/navbar';

const Dashboard: React.FC = () => {
  const [selectedResponse, setSelectedResponse] = useState<string>('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [status, setStatus] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [paraphraseText, setParaphraseText] = useState<string>('');
  const [paraphrases, setParaphrases] = useState<string[]>([]);
  const [riskData, setRiskData] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('/api/questionsshort');
        if (response.ok) {
          const data = await response.json();
          setQuestions(data);
          if (data.length > 0) setSelectedQuestion(data[0]);
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };
    fetchQuestions();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const textarea = document.getElementById('response') as HTMLTextAreaElement;
    const fileInput = (e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement);
    const question = selectedQuestion;

    if (!fileInput.files || fileInput.files.length === 0) {
      alert("Please upload a file first!");
      return;
    }

    if (textarea) textarea.value = "Preparing document...";
    setStatus("Uploading file...");
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      formData.append('question', question);

      setStatus("Analyzing document... (this might take a while for large files)");
      const response = await fetch('/api/contracts', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate response. The file might be too large or invalid.');
      }

      setStatus("Finalizing response...");
      const data = await response.json();

      if (data && data.length > 0) {
        const textareaContent = data
          .map((res: any, index: number) => `Answer ${index + 1}: ${res.answer}`)
          .join('\n');
        if (textarea) textarea.value = textareaContent;
        setStatus("Response generated!");
      } else {
        if (textarea) textarea.value = "No answer found in document";
        setStatus("Process complete.");
      }
    } catch (error: any) {
      if (textarea) textarea.value = `Error: ${error.message}`;
      setStatus("Error occurred.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleParaphrase = async () => {
    if (!paraphraseText.trim()) {
      alert("Please enter text to paraphrase.");
      return;
    }
    setIsAnalyzing(true);
    setStatus("Paraphrasing...");
    try {
      const response = await fetch('/api/paraphrase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: paraphraseText }),
      });
      if (!response.ok) {
        throw new Error('Paraphrase failed.');
      }
      const data = await response.json();
      setParaphrases(data);
      setStatus("Paraphrasing complete.");
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setStatus("Error in paraphrasing.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRiskAnalysis = async () => {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      alert("Please upload a file first!");
      return;
    }

    setIsAnalyzing(true);
    setRiskData(null);
    setStatus("Uploading file for risk analysis...");

    try {
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);

      setStatus("Analyzing risks... (this might take a while for large files)");
      const response = await fetch('/api/analyze_risks', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Risk analysis failed. Document might be too large.');
      }
      setStatus("Finalizing analysis...");
      const data = await response.json();
      setRiskData(data);
      setStatus("Risk analysis complete.");
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setStatus("Error in risk analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className='dashboard'>
      <NavBar />

      <div className='titre'>
        <div className='first-word'>Legal AI Dashboard</div>
        <div className='complete-phrase'>
          <span>Precision Analysis for Legal Documents</span>
        </div>
      </div>

      <div className="glass-card">
        <form onSubmit={handleFormSubmit} encType="multipart/form-data">
          <label htmlFor="file-upload" className="drop-container">
            <span className="drop-title">📄 Upload Legal Document</span>
            <p style={{ color: '#888', margin: '10px 0' }}>Support for PDF and Text files (Max 10MB)</p>
            <input
              id="file-upload"
              type="file"
              className='file-upload'
              name="file"
              required
              onChange={() => setStatus('File selected. Ready to analyze.')}
            />
          </label>

          <label className="response-label">Targeted Question</label>
          <select name="question" className="select-box" value={selectedQuestion} onChange={(e) => setSelectedQuestion(e.target.value)}>
            {questions && questions.map((question, index) => (
              <option key={index} value={question}>
                {question}
              </option>
            ))}
          </select>

          <button className="custom-btn btn-8" type="submit" disabled={isAnalyzing}>
            <span>{isAnalyzing ? "⚙️ Processing..." : "🔍 Generate Precise Answer"}</span>
          </button>
        </form>

        {status && (
          <div className="status-indicator" style={{ marginTop: '20px', textAlign: 'center' }}>
            {status}
          </div>
        )}
      </div>

      <div className="response-area">
        <div className="glass-card">
          <label className="response-label">AI Analysis Result</label>
          <textarea
            id="response"
            className="code-textarea"
            rows={8}
            placeholder="Analysis will appear here..."
            readOnly
          ></textarea>
        </div>
      </div>

      <div className="glass-card risk-section">
        <div className="risk-title">
          <span>⚠️ Legal Risk Assessment</span>
        </div>
        <p style={{ color: '#B8B8B8', marginBottom: '20px' }}>Comprehensive scan for liabilities, loopholes, and unfavorable clauses.</p>
        <button className="custom-btn btn-11" style={{ background: '#ff4d4d', color: '#fff', border: 'none' }} onClick={handleRiskAnalysis} disabled={isAnalyzing}>
          <span>{isAnalyzing ? '⏳ Running Risk Scan...' : '🚀 Start Risk Analysis'}</span>
        </button>

        {riskData && (
          <div style={{ marginTop: '25px' }}>
            <h4 style={{ color: '#ff4d4d', marginBottom: '15px' }}>🚨 Executive Summary</h4>
            <div style={{ whiteSpace: 'pre-wrap', color: '#e0e0e0', background: 'rgba(255, 77, 77, 0.1)', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
              {riskData.summary}
            </div>

            <button className="custom-btn btn-9" style={{ width: 'auto', padding: '10px 25px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setShowDetail(!showDetail)}>
              <span>{showDetail ? 'Hide Fine Print' : 'View Detailed Clauses'}</span>
            </button>

            {showDetail && (
              <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', color: '#B8B8B8', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                {riskData.detailed}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass-card paraphrase-section">
        <div className="risk-title" style={{ color: '#c797eb' }}>
          <span>📝 Smart Paraphraser</span>
        </div>
        <p style={{ color: '#B8B8B8', marginBottom: '20px' }}>Rewrite complex legal jargon into plain, understandable English.</p>

        <textarea
          value={paraphraseText}
          onChange={(e) => setParaphraseText(e.target.value)}
          placeholder="Paste complex clause here..."
          rows={3}
          className="code-textarea"
          style={{ marginBottom: '20px' }}
        />

        <button className="custom-btn btn-10" style={{ background: '#c797eb', color: '#fff', border: 'none' }} onClick={handleParaphrase} disabled={isAnalyzing}>
          <span>{isAnalyzing ? '⏳ Rewriting...' : '🔄 Paraphrase Clause'}</span>
        </button>

        {paraphrases.length > 0 && (
          <div style={{ marginTop: '25px' }}>
            <h4 style={{ color: '#c797eb', marginBottom: '15px' }}>Simplified Versions:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {paraphrases.map((p, i) => (
                <div key={i} style={{ padding: '15px', background: 'rgba(199, 151, 235, 0.1)', borderRadius: '10px', color: '#e0e0e0', borderLeft: '3px solid #c797eb' }}>
                  {p}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer>
        <p>&copy; {new Date().getFullYear()} Legal AI Project. Premium Intelligence for Legal Professionals.</p>
      </footer>
    </div>
  );
};

export default Dashboard;
