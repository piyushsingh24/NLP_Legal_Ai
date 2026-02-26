import { useEffect, useState } from 'react';
import NavBar from '../components/navbar';

const Dashboard: React.FC = () => {
  const [selectedResponse, setSelectedResponse] = useState<string>('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [status, setStatus] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
          <select name="question" className="select-box" value={selectedQuestion} onChange={(e) => setSelectedQuestion(e.target.value)}>
            {questions && questions.map((question, index) => (
              <option key={index} value={question}>
                {question}
              </option>
            ))}
          </select>
          <input className="custom-btn btn-8" type="submit" value={isAnalyzing ? "Processing..." : "Generate Response"} disabled={isAnalyzing} />
        </form>

        {status && (
          <div style={{ color: '#c797eb', marginTop: '10px', fontWeight: 'bold' }}>
            {status}
          </div>
        )}

        <div className="code-container">
          <section className="augs bg" data-augmented-ui>
            <input className="title" value="Get Response" readOnly />
            <div className="code highcontrast-dark">
              <textarea id="response" className="code-textarea" rows={10} placeholder="Generate Response..." readOnly></textarea>
            </div>
          </section>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button className="custom-btn btn-11" onClick={handleRiskAnalysis} disabled={isAnalyzing}>
            <span>{isAnalyzing ? '⏳ Analyzing...' : '⚠️ Analyze Legal Risks'}</span>
          </button>
        </div>

        {riskData && (
          <div id="risk-container" className="ccode highcontrast-dark" style={{ display: 'block', marginTop: '20px', padding: '15px', border: '1px solid #e74c3c' }}>
            <h3 style={{ color: '#e74c3c' }}>🚨 Risk Analysis Summary</h3>
            <div id="risk-summary" style={{ whiteSpace: 'pre-wrap', textAlign: 'left', marginBottom: '15px' }}>
              {riskData.summary}
            </div>
            <button className="custom-btn btn-9" onClick={() => setShowDetail(!showDetail)}>
              <span>{showDetail ? 'Hide Detailed Analysis' : 'Show Detailed Analysis'}</span>
            </button>
            {showDetail && (
              <div id="risk-detail" style={{ display: 'block', marginTop: '15px', padding: '10px', background: '#333', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                {riskData.detailed}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
