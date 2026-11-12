
function Reports() {
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
    <div style={{ padding: '25px', color: '#ffffff' }}>
      <h2>Fraud Detection Reports</h2>
      <p>Credit card transaction summary</p>

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
        padding: '25px',
        borderRadius: '12px',
        marginTop: '25px'
      }}>
        <h2>Report Summary</h2>
        <p>
          Total of 284,807 transactions, including 492 fraud cases
          and 284,315 genuine transactions.
        </p>
        <p>Fraud rate: 0.173%</p>
        <p>Note: These are dataset summary figures, not live predictions.</p>
      </div>
    </div>
  );
}

export default Reports;
