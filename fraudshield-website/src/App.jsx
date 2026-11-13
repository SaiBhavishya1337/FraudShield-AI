
import { useState } from 'react';
import './App.css';
import Analytics from './Analytics';

function App() {
  const [page, setPage] = useState('Dashboard');

  const [transactionId, setTransactionId] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState(null);

  const [csvFile, setCsvFile] = useState(null);
  const [csvResult, setCsvResult] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Manual transaction detection
  async function detectFraud(e) {
    e.preventDefault();

    try {
      const response = await fetch('https://fraudshield-ai-1-vjvo.onrender.com/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transactionId,
          amount: Number(amount)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResult({
        id: data.transaction_id,
        amount: Number(data.amount).toFixed(2),
        status: data.risk_status,
        message: data.message
      });

    } catch (error) {
      setResult({
        id: transactionId,
        amount,
        status: 'Error',
        message: error.message
      });
    }
  }

  // CSV bulk detection
  async function uploadCSV(e) {
    e.preventDefault();

    if (!csvFile) {
      alert('Please select a CSV file');
      return;
    }

    const formData = new FormData();
    formData.append('file', csvFile);

    setUploading(true);
    setCsvResult(null);

    try {
      const response = await fetch(
        'http://127.0.0.1:5000/predict_csv',
        {
          method: 'POST',
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'CSV upload failed');
      }

      setCsvResult(data);

    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  }

  // Reports page
  function ReportsPage() {
    const reports = [
      { title: 'Total Transactions', value: '284,807', icon: '📊' },
      { title: 'Fraud Cases', value: '492', icon: '🚨' },
      { title: 'Genuine Transactions', value: '284,315', icon: '✅' },
      { title: 'Fraud Rate', value: '0.173%', icon: '📈' }
    ];

    function downloadReport() {
      const csv = [
        'Report,Value',
        'Total Transactions,284807',
        'Fraud Cases,492',
        'Genuine Transactions,284315',
        'Fraud Rate,0.173%'
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = 'FraudShield_Report.csv';
      link.click();

      URL.revokeObjectURL(url);
    }

    return (
      <section style={{ padding: '25px' }}>
        <h2>Fraud Detection Reports</h2>
        <p>Credit Card Transaction Summary</p>

        <button onClick={downloadReport}>
          ⬇ Download CSV
        </button>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '20px',
          marginTop: '25px'
        }}>
          {reports.map(item => (
            <div key={item.title} style={{
              background: '#1e293b',
              color: 'white',
              padding: '25px',
              borderRadius: '12px'
            }}>
              <h3>{item.icon} {item.title}</h3>
              <h2>{item.value}</h2>
            </div>
          ))}
        </div>

        <div style={{
          background: '#1e293b',
          color: 'white',
          padding: '25px',
          borderRadius: '12px',
          marginTop: '25px'
        }}>
          <h2>Report Summary</h2>
          <p>
            A total of 284,807 transactions were analyzed
            in the original dataset.
          </p>
          <p>Fraud cases: 492</p>
          <p>Genuine transactions: 284,315</p>
          <p>Fraud rate: 0.173%</p>
          <p style={{ color: '#fbbf24' }}>
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="app">

      <aside className="sidebar">
        <h2>🛡️ FraudShield AI</h2>
        <p className="menu-title">MAIN MENU</p>

        {[
          'Dashboard',
          'Fraud Detection',
          'Analytics',
          'Reports'
        ].map(item => (
          <a
            key={item}
            href="#"
            className={page === item ? 'active' : ''}
            onClick={e => {
              e.preventDefault();
              setPage(item);
              setResult(null);
              setCsvResult(null);
            }}
          >
            {item}
          </a>
        ))}

        <div className="sidebar-bottom">
          Credit Card Security
        </div>
      </aside>

      <main className="main">

        <header>
          <div>
            <h1>{page}</h1>
            <p>Credit Card Fraud Detection System</p>
          </div>

          <div className="profile">
            Admin 👤
          </div>
        </header>

        {/* DASHBOARD */}
        {page === 'Dashboard' && (
          <>
            <section className="welcome">
              <div>
                <h2>Welcome to FraudShield AI 🛡️</h2>
                <p>
                  Intelligent Credit Card Fraud Detection & Monitoring
                </p>
              </div>
              <span>AI POWERED</span>
            </section>

            <h2 className="section-title">Overview</h2>

            <section className="stats">
              <div className="stat-card">
                <p>Total Transactions</p>
                <h2>284,807</h2>
              </div>

              <div className="stat-card">
                <p>Fraud Transactions</p>
                <h2>492</h2>
              </div>

              <div className="stat-card">
                <p>Genuine Transactions</p>
                <h2>284,315</h2>
              </div>

              <div className="stat-card">
                <p>Fraud Percentage</p>
                <h2>0.173%</h2>
              </div>
            </section>

            <div className="panel" style={{ marginTop: 25 }}>
              <h3>Start Fraud Detection</h3>
              <p>Check a transaction for suspicious activity.</p>

              <button onClick={() => setPage('Fraud Detection')}>
                Open Detection →
              </button>
            </div>
          </>
        )}

        {/* FRAUD DETECTION */}
        {page === 'Fraud Detection' && (
          <section className="panel prediction">

            <h2>Transaction Analysis</h2>
            <p>Enter transaction details for screening.</p>

            <form onSubmit={detectFraud}>
              <label>Transaction ID</label>

              <input
                type="text"
                placeholder="Enter transaction ID"
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
                required
              />

              <label>Transaction Amount (₹)</label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />

              <button type="submit">
                Analyze Transaction
              </button>
            </form>

            {result && (
              <div className="result">
                <h3>Transaction Analysis Result</h3>
                <p>Transaction ID: {result.id}</p>
                <p>Amount: ₹{result.amount}</p>
                <p>Status: {result.status}</p>
                <p>{result.message}</p>
              </div>
            )}

            <div className="csv-upload">
              <h2>Bulk Fraud Detection</h2>
              <p>Upload a CSV containing all 30 transaction features.</p>

              <form onSubmit={uploadCSV}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => {
                    setCsvFile(e.target.files[0]);
                    setCsvResult(null);
                  }}
                />

                <button type="submit" disabled={uploading}>
                  {uploading ? 'Analyzing...' : 'Upload & Detect Fraud'}
                </button>
              </form>

              {csvResult && (
                <div className="result">
                  <h3>CSV Analysis Results</h3>
                  <p>Total Transactions: {csvResult.total_transactions}</p>
                  <p>Fraud Detected: {csvResult.fraud_detected}</p>
                  <p>Genuine Transactions: {csvResult.genuine_transactions}</p>
                  <p>Fraud Percentage: {csvResult.fraud_percentage}%</p>

                  <h3>Prediction Preview</h3>

                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Amount</th>
                          <th>Prediction</th>
                          <th>Risk Score</th>
                        </tr>
                      </thead>

                      <tbody>
                        {csvResult.preview?.map((row, index) => (
                          <tr key={index}>
                            <td>{row.Transaction_ID}</td>
                            <td>{row.Amount}</td>
                            <td>{row.Prediction}</td>
                            <td>{row.Fraud_Risk_Score}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ANALYTICS */}
        {page === 'Analytics' && <Analytics />}

        {/* REPORTS */}
        {page === 'Reports' && <ReportsPage />}

        <footer>
          © 2026 FraudShield AI | Machine Learning Project
        </footer>

      </main>
    </div>
  );
}

export default App;
