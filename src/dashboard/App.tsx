import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PerformanceMetrics } from '../types/metrics';

function App() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [history, setHistory] = useState<Record<string, PerformanceMetrics[]>>({});

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/metrics');
        const data = await response.json();
        setMetrics(data);

        setHistory(prev => {
          const newHistory = { ...prev };
          data.forEach((m: PerformanceMetrics) => {
            if (!newHistory[m.chain]) {
              newHistory[m.chain] = [];
            }
            newHistory[m.chain].push(m);
            if (newHistory[m.chain].length > 50) {
              newHistory[m.chain] = newHistory[m.chain].slice(-50);
            }
          });
          return newHistory;
        });
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const chartData = Object.entries(history).flatMap(([chain, data]) =>
    data.map((m, idx) => ({
      time: new Date(m.timestamp).toLocaleTimeString(),
      chain,
      tps: m.tps,
      blockTime: m.blockTime,
      confirmationDelay: m.confirmationDelay
    }))
  );

  const comparisonData = metrics.map(m => ({
    chain: m.chain,
    tps: m.tps,
    blockTime: m.blockTime,
    confirmationDelay: m.confirmationDelay
  }));

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>On-chain Performance Profiler</h1>
      
      <div style={{ marginBottom: '40px' }}>
        <h2>Comparison</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="chain" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="tps" fill="#8884d8" />
            <Bar dataKey="blockTime" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>TPS Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="tps" stroke="#8884d8" name="TPS" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Block Time Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="blockTime" stroke="#82ca9d" name="Block Time (s)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h2>Current Metrics</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Chain</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>TPS</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Block Time (s)</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Confirmation Delay (s)</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.chain}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{m.chain}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{m.tps.toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{m.blockTime.toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{m.confirmationDelay.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;

