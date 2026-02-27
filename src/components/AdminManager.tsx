import React, { useState, useEffect } from 'react';
import { X, Users, Trash2, Plus, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User, Staff } from '../types';

interface AdminManagerProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  onStaffUpdate: () => void;
}

export function AdminManager({ isOpen, onClose, staffList, onStaffUpdate }: AdminManagerProps) {
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('staff')
        .insert([{ name: newStaffName, phone: newStaffPhone }]);

      if (insertError) throw insertError;

      setNewStaffName('');
      setNewStaffPhone('');
      onStaffUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this staff member? All their shifts will also be deleted.')) return;

    setLoading(true);
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

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

        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Staff</h2>
            <p className="text-gray-500 text-sm">Add or remove hospital staff</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <Plus className="w-4 h-4 mr-2" /> Add New Staff
          </h3>
          <form onSubmit={handleAddStaff} className="flex gap-3">
            <input
              type="text"
              placeholder="Full Name"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
            <input
              type="text"
              placeholder="Phone (optional)"
              value={newStaffPhone}
              onChange={(e) => setNewStaffPhone(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <button
              type="submit"
              disabled={loading || !newStaffName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium text-sm"
            >
              Add Staff
            </button>
          </form>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-xl">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3">
                        {staff.name.charAt(0)}
                      </div>
                      {staff.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteStaff(staff.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete Staff"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No staff members found. Add one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
