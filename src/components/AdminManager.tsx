import React, { useState, useEffect } from 'react';
import { X, Users, Trash2, Plus, Edit2, User as UserIcon, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User, Staff } from '../types';
import { ShiftSwapRequestsManager } from './ShiftSwapRequestsManager';

interface AdminManagerProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  onStaffUpdate: () => void;
}

export function AdminManager({ isOpen, onClose, staffList, onStaffUpdate }: AdminManagerProps) {
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSyncStaff = async () => {
    if (!window.confirm('คุณต้องการรีเซ็ตรายชื่อบุคลากรและรหัสผ่านให้เป็นไปตามค่าเริ่มต้นหรือไม่? (ข้อมูลเดิมจะถูกลบ)')) return;

    setLoading(true);
    setError('');

    try {
      // 1. Clear existing staff and users (optional, but requested for cleanup)
      // For safety, we only delete the duplicate "นายเกรียงศักดิ์ สุริยะลังกา" if it exists
      // But the user specifically listed the people they want.
      
      const defaultStaff = [
        { name: 'นายกิตติพงษ์ ชัยศรี', username: 'tor', password: 'tor', role: 'staff' },
        { name: 'น.ส. วรรณภา สอนเสือ', username: 'kik', password: 'kik', role: 'admin' },
        { name: 'น.ส.ศิรินชา พึ่งวงษ์เขียน', username: 'jhim', password: 'jhim', role: 'staff' },
        { name: 'น.ส.นิธิพร ใสปา', username: 'parn', password: 'parn', role: 'staff' },
        { name: 'นาย เกรียงศักดิ์ สุริยะลังกา', username: 'top', password: 'top', role: 'staff' },
        { name: 'นายวิทวัส หมายมั่น', username: 'team', password: 'team', role: 'staff' },
      ];

      // Delete all current staff and users to start fresh as requested
      await supabase.from('staff').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      for (const s of defaultStaff) {
        // Insert Staff
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .insert([{ name: s.name }])
          .select()
          .single();

        if (staffError) throw staffError;

        // Insert User
        const { error: userError } = await supabase
          .from('users')
          .insert([{
            username: s.username,
            password: s.password,
            name: s.name,
            role: s.role
          }]);

        if (userError) throw userError;
      }

      onStaffUpdate();
      alert('ตั้งค่าบุคลากรเริ่มต้นเรียบร้อยแล้ว');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !username.trim() || !password.trim()) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, ชื่อผู้ใช้งาน, รหัสผ่าน)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create Staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .insert([{ name: newStaffName, phone: newStaffPhone }])
        .select()
        .single();

      if (staffError) throw staffError;

      // 2. Create User
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          username,
          password,
          name: newStaffName,
          role: isAdmin ? 'admin' : 'staff'
        }]);

      if (userError) throw userError;

      setNewStaffName('');
      setNewStaffPhone('');
      setUsername('');
      setPassword('');
      setIsAdmin(false);
      onStaffUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${name}? ข้อมูลการอยู่เวรและบัญชีผู้ใช้งานจะถูกลบออกทั้งหมด`)) return;

    setLoading(true);
    setError('');

    try {
      // 1. Delete from staff
      const { error: deleteStaffError } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (deleteStaffError) throw deleteStaffError;

      // 2. Delete from users (by name, since we don't have a direct link in this schema)
      const { error: deleteUserError } = await supabase
        .from('users')
        .delete()
        .eq('name', name);

      if (deleteUserError) throw deleteUserError;

      onStaffUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative animate-in fade-in zoom-in duration-200 h-[80vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">บุคลากร</h2>
              <p className="text-gray-500 text-sm">จัดการรายชื่อบุคลากรและสิทธิ์การใช้งาน</p>
            </div>
          </div>
          <button
            onClick={handleSyncStaff}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            title="รีเซ็ตเป็นรายชื่อเริ่มต้น"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            ตั้งค่าบุคลากรเริ่มต้น
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {/* Staff Management Section */}
        <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <Plus className="w-4 h-4 mr-2" /> เพิ่มบุคลากรใหม่
          </h3>
          <form onSubmit={handleAddStaff} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
              <input
                type="text"
                placeholder="เบอร์โทรศัพท์"
                value={newStaffPhone}
                onChange={(e) => setNewStaffPhone(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="ชื่อผู้ใช้งาน (Username)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
              <input
                type="password"
                placeholder="รหัสผ่าน (Password)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600">สิทธิ์ผู้ดูแลระบบ (Admin)</span>
              </label>
              <button
                type="submit"
                disabled={loading || !newStaffName.trim() || !username.trim() || !password.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium text-sm"
              >
                {loading ? 'กำลังบันทึก...' : 'เพิ่มบุคลากร'}
              </button>
            </div>
          </form>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-xl">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เบอร์โทรศัพท์</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold mr-3 ${
                        staff.name.startsWith('นาย') 
                          ? 'bg-blue-100 text-blue-700' 
                          : staff.name.startsWith('น.ส.') || staff.name.startsWith('นาง')
                            ? 'bg-pink-100 text-pink-700'
                            : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        <UserIcon className="w-4 h-4" />
                      </div>
                      {staff.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteStaff(staff.id, staff.name)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                      title="ลบพนักงาน"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    ไม่พบพนักงาน เพิ่มพนักงานใหม่ด้านบน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Shift Swap Requests Management Section */}
        <div className="mt-8">
          <ShiftSwapRequestsManager
            allStaff={staffList}
            allShifts={[]}
            onUpdate={onStaffUpdate}
          />
        </div>
      </div>
    </div>
  );
}
