
import { useState } from 'react';
import './App.css';
import Analytics from './Analytics';

const API_URL = "https://fraudshield-ai-2-355b.onrender.com";
const numericFields = [
  'TransactionAmt', 'card1', 'card2', 'card3',
  'card5', 'addr1', 'addr2', 'dist1', 'dist2'
];

const fieldGroups = [
  {
    title: 'Transaction Details',
    fields: [
      { name: 'TransactionAmt', label: 'Transaction Amount', type: 'number', required: true },
      { name: 'ProductCD', label: 'Product Category', type: 'text' }
    ]
  },
  {
    title: 'Card Details',
    fields: [
      { name: 'card1', label: 'Card 1', type: 'number' },
      { name: 'card2', label: 'Card 2', type: 'number' },
      { name: 'card3', label: 'Card 3', type: 'number' },
      { name: 'card4', label: 'Card 4 (Brand)', type: 'text' },
      { name: 'card5', label: 'Card 5', type: 'number' },
      { name: 'card6', label: 'Card 6 (Type)', type: 'text' }
    ]
  },
  {
    title: 'Address and Distance',
    fields: [
      { name: 'addr1', label: 'Address 1', type: 'number' },
      { name: 'addr2', label: 'Address 2', type: 'number' },
      { name: 'dist1', label: 'Distance 1', type: 'number' },
      { name: 'dist2', label: 'Distance 2', type: 'number' }
    ]
  },
  {
    title: 'Email Details',
    fields: [
      { name: 'P_emaildomain', label: 'Purchaser Email Domain', type: 'text' },
      { name: 'R_emaildomain', label: 'Recipient Email Domain', type: 'text' }
    ]
  },
  {
    title: 'Device Details',
    fields: [
      { name: 'DeviceType', label: 'Device Type', type: 'text' },
      { name: 'DeviceInfo', label: 'Device Information', type: 'text' },
      { name: 'id_30', label: 'Operating System', type: 'text' },
      { name: 'id_31', label: 'Browser', type: 'text' }
    ]
  }
];

const initialForm = {
  TransactionAmt: '',
  ProductCD: '',
  card1: '',
  card2: '',
  card3: '',
  card4: '',
  card5: '',
  card6: '',
  addr1: '',
  addr2: '',
  dist1: '',
  dist2: '',
  P_emaildomain: '',
  R_emaildomain: '',
  DeviceType: '',
  DeviceInfo: '',
  id_30: '',
  id_31: ''
};

function App() {
  const [page, setPage] = useState('Dashboard');
  const [transactionId, setTransactionId] = useState('');
  const [formData, setFormData] = useState(initialForm);
  const [result, setResult] = useState(null);

  const [csvFile, setCsvFile] = useState(null);
  const [csvResult, setCsvResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  function updateField(name, value) {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  async function detectFraud(e) {
    e.preventDefault();
    setAnalyzing(true);
    setResult(null);

    try {
      const payload = {};

      Object.entries(formData).forEach(([key, value]) => {
        if (value.trim() === '') {
          payload[key] = null;
        } else if (numericFields.includes(key)) {
          payload[key] = Number(value);
        } else {
          payload[key] = value;
        }
      });

      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Prediction failed');
      }

      setResult({
        id: transactionId || 'Not provided',
        amount: data.amount,
        status: data.prediction,
        score: data.fraud_risk_score
      });

    } catch (error) {
      setResult({
        status: 'Error',
        message: error.message
      });
    } finally {
      setAnalyzing(false);
    }
  }

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
      const response = await fetch(`${API_URL}/predict_csv`, {
        method: 'POST',
        body: formData
      });

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
        <p>Original Credit Card Dataset Summary</p>

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
            Original dataset contained 284,807 transactions.
          </p>
          <p>Fraud cases: 492</p>
          <p>Genuine transactions: 284,315</p>
          <p>Fraud rate: 0.173%</p>
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
          <div className="profile">Admin 👤</div>
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
            <p>Enter available transaction details for screening.</p>

            <form onSubmit={detectFraud}>

              <label>Transaction ID (Optional)</label>
              <input
                type="text"
                placeholder="Enter transaction ID"
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
              />

              {fieldGroups.map(group => (
                <div key={group.title} style={{ marginTop: '25px' }}>
                  <h3>{group.title}</h3>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '15px'
                  }}>
                    {group.fields.map(field => (
                      <div key={field.name}>
                        <label>{field.label}</label>
                        <input
                          type={field.type}
                          step={field.type === 'number' ? 'any' : undefined}
                          min={field.name === 'TransactionAmt' ? '0' : undefined}
                          placeholder={`Enter ${field.label}`}
                          value={formData[field.name]}
                          onChange={e => updateField(field.name, e.target.value)}
                          required={field.required || false}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <button type="submit" disabled={analyzing}>
                {analyzing ? 'Analyzing...' : 'Analyze Transaction'}
              </button>
            </form>

            {result && (
              <div className="result">
                <h3>Transaction Analysis Result</h3>

                {result.status === 'Error' ? (
                  <p>Error: {result.message}</p>
                ) : (
                  <>
                    <p>Transaction ID: {result.id}</p>
                    <p>Amount: {result.amount}</p>
                    <p>
                      Status: <strong>{result.status}</strong>
                    </p>
                    <p>
                      Fraud Risk Score: {result.score}%
                    </p>
                  </>
                )}
              </div>
            )}

            {/* CSV BULK DETECTION */}
            <div className="csv-upload">
              <h2>Bulk Fraud Detection</h2>
              <p>
                Upload a CSV containing all 18 selected model features.
              </p>

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
                  <p>
                    Genuine Transactions: {csvResult.genuine_transactions}
                  </p>
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
