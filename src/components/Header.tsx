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
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900 hidden sm:block">ระบบจัดการตารางเวรโรงพยาบาล</h1>
            <h1 className="text-xl font-bold text-gray-900 sm:hidden">ตารางเวร</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 rounded hover:bg-white hover:shadow-sm transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="px-3 font-medium text-gray-700 min-w-[120px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: th })}
              </span>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 rounded hover:bg-white hover:shadow-sm transition-all"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="hidden md:flex items-center space-x-2">
              <button onClick={onStatsClick} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="สถิติ">
                <BarChart2 className="w-5 h-5" />
              </button>
              <button onClick={onExportPDF} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="ส่งออก PDF">
                <Download className="w-5 h-5" />
              </button>
              <button onClick={onExportExcel} className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors" title="ส่งออก Excel">
                <Download className="w-5 h-5" />
              </button>
            </div>

            {isAdmin && (
              <div className="flex items-center space-x-2 border-l pl-4 border-gray-200">
                <button
                  onClick={onPublishToggle}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isPublished 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  }`}
                >
                  {isPublished ? 'เผยแพร่แล้ว' : 'โหมดร่าง'}
                </button>
                <button onClick={onAdminClick} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors" title="ตั้งค่าผู้ดูแล">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="border-l pl-4 border-gray-200">
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.name}</span>
                  <button onClick={onLogout} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="ออกจากระบบ">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button onClick={onLoginClick} className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 font-medium">
                  <LogIn className="w-5 h-5" />
                  <span className="hidden sm:block">เข้าสู่ระบบ</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
