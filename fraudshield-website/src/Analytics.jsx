
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js';

import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

function Analytics() {
  const fraudData = {
    labels: ['Genuine', 'Fraud'],
    datasets: [{
      data: [284315, 492],
      backgroundColor: ['#2878d0', '#ef5350'],
      borderWidth: 0
    }]
  };

  const riskData = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
    datasets: [{
      label: 'Transactions',
      data: [180, 65, 25],
      backgroundColor: ['#2878d0', '#f5b942', '#ef5350'],
      borderRadius: 7
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false
  };

  return (
    <div className="analytics-grid">
      <div className="panel chart-panel">
        <h2>Fraud vs Genuine</h2>
        <div className="chart-area">
          <Doughnut data={fraudData} options={options} />
        </div>
      </div>

      <div className="panel chart-panel">
        <h2>Risk Distribution</h2>
        <div className="chart-area">
          <Bar data={riskData} options={options} />
        </div>
      </div>
    </div>
  );
}

export default Analytics;
