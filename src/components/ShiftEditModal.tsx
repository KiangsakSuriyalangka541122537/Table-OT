import React from 'react';
import { X, Sun, Sunset, Moon, Ban } from 'lucide-react';
import { ShiftType } from '../types';
import clsx from 'clsx';

interface ShiftEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shiftType: ShiftType | null) => void;
  currentShift: ShiftType | undefined;
  staffName: string;
  dateStr: string;
}

const shiftOptions: { type: ShiftType | null; label: string; icon: React.ElementType; color: string; desc: string }[] = [
  { type: 'M', label: 'เช้า (ช)', icon: Sun, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300', desc: '08:00 - 16:00' },
  { type: 'A', label: 'บ่าย (บ)', icon: Sunset, color: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300', desc: '16:00 - 24:00' },
  { type: 'N', label: 'ดึก (ด)', icon: Moon, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300', desc: '24:00 - 08:00' },
  { type: null, label: 'หยุด (O)', icon: Ban, color: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300', desc: 'ไม่มีกะการทำงาน' },
];

export function ShiftEditModal({ isOpen, onClose, onSave, currentShift, staffName, dateStr }: ShiftEditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">แก้ไขกะการทำงาน</h2>
          <p className="text-sm text-gray-500 mt-1">
            กำลังกำหนดกะสำหรับ <span className="font-semibold text-gray-700">{staffName}</span> ในวันที่ <span className="font-semibold text-gray-700">{dateStr}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {shiftOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = currentShift === option.type || (currentShift === undefined && option.type === null);

            return (
              <button
                key={option.type || 'off'}
                onClick={() => {
                  onSave(option.type);
                  onClose();
                }}
                className={clsx(
                  "flex items-center p-4 border rounded-xl transition-all text-left",
                  option.color,
                  isSelected ? "ring-2 ring-offset-2 ring-indigo-500 shadow-md" : "opacity-80 hover:opacity-100"
                )}
              >
                <div className="flex-shrink-0 mr-4">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-xs opacity-80 mt-0.5">{option.desc}</div>
                </div>
                {isSelected && (
                  <div className="ml-auto flex-shrink-0">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
