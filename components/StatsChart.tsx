

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { AnalysisResult, FreshnessStatus } from '../types';

interface StatsChartProps {
  history: AnalysisResult[];
}

export const StatsChart: React.FC<StatsChartProps> = ({ history }) => {
  // Process data for charts
  const statusCounts = history.reduce((acc, result) => {
    result.items.forEach(item => {
      acc[item.status] = (acc[item.status] || 0) + 1;
    });
    return acc;
  }, {} as Record<FreshnessStatus, number>);

  const pieData = [
    { name: 'Fresh', value: statusCounts['Fresh'] || 0, color: '#22c55e' },
    { name: 'Semi-fresh', value: statusCounts['Semi-fresh'] || 0, color: '#eab308' },
    { name: 'Rotten', value: statusCounts['Rotten'] || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Recent average scores
  const trendData = history.slice(0, 10).reverse().map((h, i) => ({
    name: `Scan ${i + 1}`,
    score: h.overallScore
  }));

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-dashed border-gray-300">
        <p className="text-gray-400">No data available. Start scanning!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Freshness Distribution</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2">
          {pieData.map(d => (
            <div key={d.name} className="flex items-center text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: d.color }}></span>
              {d.name} ({d.value})
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Freshness Trend (0-100)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" hide />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                 {trendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#22c55e' : entry.score >= 50 ? '#eab308' : '#ef4444'} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center text-sm text-gray-500 mt-2">Last 10 Scans</div>
      </div>
    </div>
  );
};