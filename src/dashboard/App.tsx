import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PerformanceMetrics } from '../types/metrics';

const COLORS = {
  ethereum: '#627EEA',
  arbitrum: '#28A0F0',
  base: '#0052FF',
  solana: '#14F195',
  background: '#0A0A0A',
  surface: '#1A1A1A',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  error: '#FF4444'
};

const chartTheme = {
  backgroundColor: COLORS.surface,
  textColor: COLORS.text,
  gridColor: COLORS.border,
  tooltipBg: COLORS.surface,
  tooltipBorder: COLORS.border
};

function App() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [history, setHistory] = useState<Record<string, PerformanceMetrics[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = useCallback(async (isManual = false) => {
    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/metrics');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to fetch metrics');
      }
      const result = await response.json();
      const data = result.data || result;
      setMetrics(Array.isArray(data) ? data : []);

      setHistory(prev => {
        const newHistory = { ...prev };
        data.forEach((m: PerformanceMetrics) => {
          if (!newHistory[m.chain]) {
            newHistory[m.chain] = [];
          }
          
          const isValidData = m.tps > 0 || m.blockTime > 0;
          const lastValidData = [...newHistory[m.chain]].reverse().find(item => item.tps > 0 || item.blockTime > 0);
          
          if (isValidData) {
            newHistory[m.chain].push(m);
          } else if (lastValidData) {
            newHistory[m.chain].push({ ...lastValidData, timestamp: m.timestamp });
          }
          
          if (newHistory[m.chain].length > 50) {
            newHistory[m.chain] = newHistory[m.chain].slice(-50);
          }
        });
        return newHistory;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(() => fetchMetrics(false), 3000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const comparisonData = metrics.map(m => ({
    chain: m.chain,
    tps: m.tps,
    blockTime: m.blockTime,
    confirmationDelay: m.confirmationDelay
  }));

  const getChainColor = (chain: string): string => {
    return COLORS[chain as keyof typeof COLORS] || COLORS.textSecondary;
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: COLORS.background,
    color: COLORS.text,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '24px',
    paddingTop: '80px'
  };

  const headerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderBottom: `1px solid ${COLORS.border}`,
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: COLORS.border,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px'
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    overflowX: 'auto',
    display: 'block'
  };

  if (loading && metrics.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: `3px solid ${COLORS.border}`, 
              borderTopColor: COLORS.text,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <div style={{ color: COLORS.textSecondary }}>Loading metrics...</div>
          </div>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={containerStyle} className="container">
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .container { padding: 16px !important; padding-top: 70px !important; }
          .header { padding: 12px 16px !important; flex-direction: column !important; gap: 12px !important; }
          .header h1 { font-size: 16px !important; }
          .card { padding: 16px !important; margin-bottom: 16px !important; }
          .card h2 { font-size: 16px !important; margin-bottom: 16px !important; }
          .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          table { font-size: 12px !important; }
          th, td { padding: 8px !important; }
        }
        @media (max-width: 480px) {
          .container { padding: 12px !important; padding-top: 65px !important; }
          .card { padding: 12px !important; }
          .card h2 { font-size: 14px !important; }
          .card h3 { font-size: 12px !important; }
        }
      `}</style>

      <div style={headerStyle} className="header">
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>On-chain Performance Profiler</h1>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: refreshing ? COLORS.border : COLORS.surface,
            opacity: refreshing ? 0.6 : 1
          }}
          onClick={() => fetchMetrics(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <div style={{ 
                width: '14px', 
                height: '14px', 
                border: `2px solid ${COLORS.border}`, 
                borderTopColor: COLORS.text,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              Refreshing...
            </>
          ) : (
            '↻ Refresh'
          )}
        </button>
      </div>

      {error && (
        <div style={{
          ...cardStyle,
          backgroundColor: '#2A1A1A',
          borderColor: COLORS.error,
          marginBottom: '24px'
        }} className="card">
          <div style={{ color: COLORS.error, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div style={cardStyle} className="card">
        <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 600 }}>Chain Comparison</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
            <XAxis dataKey="chain" stroke={chartTheme.textColor} tick={{ fill: chartTheme.textColor }} />
            <YAxis stroke={chartTheme.textColor} tick={{ fill: chartTheme.textColor }} />
            <Tooltip
              contentStyle={{
                backgroundColor: chartTheme.tooltipBg,
                border: `1px solid ${chartTheme.tooltipBorder}`,
                color: chartTheme.textColor,
                borderRadius: '6px'
              }}
            />
            <Legend wrapperStyle={{ color: chartTheme.textColor }} />
            <Bar dataKey="tps" fill={COLORS.ethereum} name="TPS" />
            <Bar dataKey="blockTime" fill={COLORS.arbitrum} name="Block Time (s)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {Object.entries(history).map(([chain, data]) => {
        if (data.length === 0) return null;
        const chainData = data.map(m => ({
          time: new Date(m.timestamp).toLocaleTimeString(),
          tps: m.tps,
          blockTime: m.blockTime,
          confirmationDelay: m.confirmationDelay
        }));

        return (
          <div key={chain} style={cardStyle} className="card">
            <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 600, textTransform: 'capitalize' }}>
              {chain} Trends
            </h2>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: COLORS.textSecondary, fontWeight: 500 }} className="card">TPS</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chainData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
                  <XAxis dataKey="time" stroke={chartTheme.textColor} tick={{ fill: chartTheme.textColor, fontSize: 12 }} />
                  <YAxis stroke={chartTheme.textColor} tick={{ fill: chartTheme.textColor, fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      color: chartTheme.textColor,
                      borderRadius: '6px'
                    }}
                  />
                  <Line type="monotone" dataKey="tps" stroke={getChainColor(chain)} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: COLORS.textSecondary, fontWeight: 500 }} className="card">Block Time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chainData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
                  <XAxis dataKey="time" stroke={chartTheme.textColor} tick={{ fill: chartTheme.textColor, fontSize: 12 }} />
                  <YAxis stroke={chartTheme.textColor} tick={{ fill: chartTheme.textColor, fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      color: chartTheme.textColor,
                      borderRadius: '6px'
                    }}
                  />
                  <Line type="monotone" dataKey="blockTime" stroke={getChainColor(chain)} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}

      <div style={cardStyle} className="card">
        <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 600 }}>Current Metrics</h2>
        <div style={{ overflowX: 'auto' }} className="table-wrapper">
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ borderBottom: `1px solid ${COLORS.border}`, padding: '12px', textAlign: 'left', color: COLORS.textSecondary, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Chain</th>
                <th style={{ borderBottom: `1px solid ${COLORS.border}`, padding: '12px', textAlign: 'right', color: COLORS.textSecondary, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>TPS</th>
                <th style={{ borderBottom: `1px solid ${COLORS.border}`, padding: '12px', textAlign: 'right', color: COLORS.textSecondary, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Block Time (s)</th>
                <th style={{ borderBottom: `1px solid ${COLORS.border}`, padding: '12px', textAlign: 'right', color: COLORS.textSecondary, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Confirmation Delay (s)</th>
              </tr>
            </thead>
            <tbody>
              {metrics.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: COLORS.textSecondary }}>
                    No data available
                  </td>
                </tr>
              ) : (
                metrics.map((m) => (
                  <tr key={m.chain} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: '12px', fontWeight: 500, textTransform: 'capitalize' }}>{m.chain}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{m.tps.toFixed(2)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{m.blockTime.toFixed(2)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{m.confirmationDelay.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;

