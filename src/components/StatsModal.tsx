import React, { useMemo } from 'react';
import { X, BarChart2, TrendingUp, Users, Wallet, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { Staff, Shift } from '../types';
import clsx from 'clsx';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  shifts: Shift[];
}

export function StatsModal({ isOpen, onClose, staffList, shifts }: StatsModalProps) {
  if (!isOpen) return null;

  const stats = useMemo(() => {
    return staffList.map(staff => {
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
    }).sort((a, b) => b.Total - a.Total); // Sort by most shifts
  }, [staffList, shifts]);

  const summary = useMemo(() => {
    const totalPay = stats.reduce((sum, s) => sum + s.Pay, 0);
    const totalShifts = stats.reduce((sum, s) => sum + s.Total, 0);
    const topStaff = stats[0]?.name || '-';
    return { totalPay, totalShifts, topStaff };
  }, [stats]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-600">{entry.name}:</span>
              <span className="font-semibold text-slate-900">{entry.value} กะ</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl relative flex flex-col overflow-hidden max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-inner border border-indigo-100/50">
              <BarChart2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">สถิติรายเดือน</h2>
              <p className="text-slate-500 text-sm mt-0.5">ภาพรวมการทำงานและค่าตอบแทน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5"
            >
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                <Wallet className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">งบประมาณรวม (OT)</p>
                <p className="text-2xl font-bold text-slate-900">฿{summary.totalPay.toLocaleString()}</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5"
            >
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                <Clock className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">จำนวนกะทั้งหมด</p>
                <p className="text-2xl font-bold text-slate-900">{summary.totalShifts} <span className="text-base font-medium text-slate-400">กะ</span></p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5"
            >
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center border border-purple-100">
                <TrendingUp className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">พนักงานที่ขึ้นเวรมากสุด</p>
                <p className="text-xl font-bold text-slate-900 truncate max-w-[150px]">{summary.topStaff}</p>
              </div>
            </motion.div>
          </div>

          {/* Chart Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8"
          >
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-500" />
              กราฟแสดงจำนวนกะของพนักงานแต่ละคน
            </h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="M" stackId="a" fill="#3b82f6" name="เช้า (M)" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="A" stackId="a" fill="#f97316" name="บ่าย (A)" />
                  <Bar dataKey="N" stackId="a" fill="#a855f7" name="ดึก (N)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Table Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                รายละเอียดรายบุคคล
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">พนักงาน</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">เช้า (M)</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">บ่าย (A)</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">ดึก (N)</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">รวมกะ</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">ค่าล่วงเวลา (฿)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-50">
                  {stats.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                            {row.name.charAt(0)}
                          </div>
                          <span className="text-sm font-semibold text-slate-700">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold text-sm">
                          {row.M}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-orange-50 text-orange-600 font-bold text-sm">
                          {row.A}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-purple-600 font-bold text-sm">
                          {row.N}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-bold text-slate-700">{row.Total}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                          ฿{row.Pay.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                        ไม่มีข้อมูลสถิติ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
