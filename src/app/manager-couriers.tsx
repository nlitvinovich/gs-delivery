'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ManagerCouriers({ couriers, onRefresh }: { couriers: any[], onRefresh: () => void }) {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleDelete = async (username: string, fullName: string) => {
    if (window.confirm(`Удалить курьера ${fullName}?`)) {
      await supabase.from('app_users').delete().eq('username', username);
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
        <h3 className="text-base font-bold text-gray-800 mb-3">Регистрация курьера</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} required placeholder="ФИО курьера" className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
          <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required placeholder="Логин (en)" className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
          <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Пароль" className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold text-sm disabled:opacity-50 cursor-pointer">Добавить курьера</button>
        </form>
      </div>
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
        <div className="divide-y divide-gray-100">
          {couriers.map((c) => (
            <div key={c.id} className="flex justify-between items-center py-2 text-sm">
              <div>
                <p className="font-bold text-gray-800">{c.full_name}</p>
                <p className="text-xs text-gray-400">Логин: {c.username} | Пасс: {c.password}</p>
              </div>
              <button type="button" onClick={() => handleDelete(c.username, c.full_name)} className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-xl font-bold cursor-pointer">Удалить</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
