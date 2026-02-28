import React from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download, LogIn, LogOut, Settings, BarChart2 } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  user: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onAdminClick: () => void;
  onStatsClick: () => void;
  isPublished: boolean;
  onPublishToggle: () => void;
}

export function Header({
  currentMonth,
  setCurrentMonth,
  user,
  onLoginClick,
  onLogout,
  onExportPDF,
  onExportExcel,
  onAdminClick,
  onStatsClick,
  isPublished,
  onPublishToggle
}: HeaderProps) {
  const isAdmin = user?.role === 'admin';

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-slate-900 hidden sm:block tracking-tight">ระบบจัดการตารางเวร</h1>
            <h1 className="text-lg font-semibold text-slate-900 sm:hidden">ตารางเวร</h1>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 hover:text-indigo-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 font-medium text-slate-700 min-w-[140px] text-center text-sm">
                {format(currentMonth, 'MMMM yyyy', { locale: th })}
              </span>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 hover:text-indigo-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden md:flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button onClick={onStatsClick} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-lg transition-all" title="สถิติ">
                <BarChart2 className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <button onClick={onExportPDF} className="p-2 text-slate-500 hover:text-rose-600 hover:bg-white hover:shadow-sm rounded-lg transition-all" title="ส่งออก PDF">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={onExportExcel} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-white hover:shadow-sm rounded-lg transition-all" title="ส่งออก Excel">
                <Download className="w-4 h-4" />
              </button>
            </div>

            {isAdmin && (
              <div className="flex items-center space-x-2 border-l pl-3 border-slate-200">
                <button
                  onClick={onPublishToggle}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                    isPublished 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  {isPublished ? 'เผยแพร่แล้ว' : 'โหมดร่าง'}
                </button>
                <button onClick={onAdminClick} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all" title="ตั้งค่าผู้ดูแล">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="border-l pl-3 border-slate-200">
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-xs font-semibold text-slate-900 leading-none">{user.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน'}</span>
                  </div>
                  <button onClick={onLogout} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="ออกจากระบบ">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button onClick={onLoginClick} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-sm font-medium">
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบ</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
