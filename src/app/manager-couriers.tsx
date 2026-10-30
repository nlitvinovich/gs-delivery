'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ManagerCouriers({ couriers, onRefresh }: { couriers: any[], onRefresh: () => void }) {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [loading, setLoading] = useState(false);

  // Состояния для редактирования курьера
  const [editingCourier, setEditingCourier] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('app_users').insert([{
      username: newUsername.trim().toLowerCase(), password: newPassword.trim(), full_name: newFullName.trim(), role: 'courier'
    }]);
    setLoading(false);
    if (error) alert('Логин уже занят');
    else {
      alert('Курьер добавлен!');
      setNewUsername(''); setNewPassword(''); setNewFullName('');
      onRefresh();
    }
  };

  const startEdit = (c: any) => {
    setEditingOrder(null); // Сброс, если были открыты заказы
    setEditingCourier(c);
    setEditFullName(c.full_name);
    setEditUsername(c.username);
    setEditPassword(c.password);
  };

  const handleUpdateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourier) return;
    setSaving(true);

    const { error } = await supabase
      .from('app_users')
      .update({
        full_name: editFullName.trim(),
        username: editUsername.trim().toLowerCase(),
        password: editPassword.trim()
      })
      .eq('id', editingCourier.id);

    setSaving(false);
    if (error) {
      alert('Ошибка обновления: Логин уже занят другим сотрудником');
    } else {
      setEditingCourier(null);
      onRefresh();
    }
  };

  const handleDelete = async (username: string, fullName: string) => {
    if (window.confirm(`Удалить курьера ${fullName}?`)) {
      await supabase.from('app_users').delete().eq('username', username);
      onRefresh();
    }
  };
  return (
    <div className="space-y-4">
      {/* Форма добавления курьера */}
      <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
        <h3 className="text-base font-bold text-gray-800 mb-3">Регистрация курьера</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} required placeholder="ФИО курьера" className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
          <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required placeholder="Логин (en)" className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
          <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Пароль" className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold text-sm disabled:opacity-50 cursor-pointer">Добавить курьера</button>
        </form>
      </div>

      {/* Список сотрудников */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
        <div className="divide-y divide-gray-100">
          {couriers.map((c) => (
            <div key={c.id} className="flex justify-between items-center py-2.5 text-sm">
              <div>
                <p className="font-bold text-gray-800">{c.full_name}</p>
                <p className="text-xs text-gray-400">Логин: {c.username} | Пасс: {c.password}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => startEdit(c)} className="text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-xl font-bold cursor-pointer">Правка ✏️</button>
                <button type="button" onClick={() => handleDelete(c.username, c.full_name)} className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-xl font-bold cursor-pointer">Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ КУРЬЕРА */}
      {editingCourier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-bold text-gray-800">Редактировать сотрудника</h3>
              <button type="button" onClick={() => setEditingCourier(null)} className="text-gray-400 font-bold p-1">✕</button>
            </div>
            
            <form onSubmit={handleUpdateCourier} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">ФИО курьера</label>
                <input type="text" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} required className="w-full p-2.5 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Логин</label>
                <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} required className="w-full p-2.5 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Пароль</label>
                <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} required className="w-full p-2.5 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              </div>
              <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold text-sm active:scale-95 transition-all cursor-pointer">
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
