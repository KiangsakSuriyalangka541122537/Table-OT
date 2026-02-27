import React from 'react';
import { X, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Staff, Shift } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  shifts: Shift[];
}

export function StatsModal({ isOpen, onClose, staffList, shifts }: StatsModalProps) {
  if (!isOpen) return null;

  const stats = staffList.map(staff => {
    const staffShifts = shifts.filter(s => s.staff_id === staff.id);
    const mCount = staffShifts.filter(s => s.shift_type === 'M').length;
    const aCount = staffShifts.filter(s => s.shift_type === 'A').length;
    const nCount = staffShifts.filter(s => s.shift_type === 'N').length;
    
    // Calculate total shifts (M=1, A=0.5, N=0.5)
    const totalShifts = mCount + (aCount * 0.5) + (nCount * 0.5);
    
    // Calculate OT pay (M=750, A=375, N=375)
    const otPay = (mCount * 750) + (aCount * 375) + (nCount * 375);

    return {
      name: staff.name,
      M: mCount,
      A: aCount,
      N: nCount,
      Total: totalShifts,
      Pay: otPay
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 relative animate-in fade-in zoom-in duration-200 h-[80vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Monthly Statistics</h2>
            <p className="text-gray-500 text-sm">Shift distribution and OT calculations</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="h-[400px] w-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="M" stackId="a" fill="#3b82f6" name="Morning (ช)" />
                <Bar dataKey="A" stackId="a" fill="#f97316" name="Afternoon (บ)" />
                <Bar dataKey="N" stackId="a" fill="#a855f7" name="Night (ด)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Morning (M)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Afternoon (A)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Night (N)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Shifts</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Est. OT Pay (฿)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-blue-600 font-semibold">{row.M}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-orange-600 font-semibold">{row.A}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-purple-600 font-semibold">{row.N}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-bold">{row.Total}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-bold">
                      {row.Pay.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
