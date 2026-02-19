import { useEffect, useState } from 'react';
import { NavBar } from '../components/navbar';
import axios from 'axios';
import AccessDenied from '../components/access-denied';

const FileUpload: React.FC = () => {
  const [selectedResponse, setSelectedResponse] = useState<string>('');
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/questionsshort'); // Replace with your Flask API endpoint
      const data = await response.json();
      console.log(data);
      setQuestions(data);
    } catch (error) {
      console.log('Error fetching questions:', error);
    }
  };
  const handleQuestionSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedQuestion(event.target.value);
  };
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    fetch('http://127.0.0.1:5000/contracts', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json()) // Parse response as JSON
      .then((data) => {
        console.log(data[0].answer);
        setSelectedResponse(data[0].answer);
        console.log(data[0].answer);

        const textareaContent = data
          .map(
            (res: { answer: any; probability: any; analyse: any }, index: number) =>
              `Answer ${index + 1}: ${res.answer} (${res.probability}) (${res.analyse})`
          )
          .join('\n');

        const textarea = document.getElementById('response') as HTMLTextAreaElement;
        textarea.value = textareaContent;

        // Update answer colors based on analysis
        data.forEach((res: { answer: any; analyse: any }) => {
          const answerIndex = data.findIndex((item: { answer: any }) => item.answer === res.answer);
          const answerElement = document.getElementById(`answer-${answerIndex + 1}`);

          if (answerElement) {
            if (res.analyse === 'positive') {
              answerElement.style.color = 'green';
            } else if (res.analyse === 'negative') {
              answerElement.style.color = 'red';
            } else {
              answerElement.style.color = 'inherit';
            }
          }
        });


        document.getElementById('explanation')!.innerHTML = '';
      })
      .catch((error) => console.log(error));
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

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
      const response = await fetch('http://127.0.0.1:5000/analyze_risks', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      setRiskData(data); // Store response in state

    } catch (error) {
      console.error(error);
      setRiskData({
        summary: "Error analyzing risks. Ensure backend is running.",
        detailed: String(error)
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
