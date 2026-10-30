'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import ManagerDashboard from './manager-dashboard';
import CourierDashboard from './courier-dashboard';

export default function Home() {
  const [user, setUser] = useState<{ username: string; role: string; fullName: string } | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Проверяем, входил ли пользователь ранее
  useEffect(() => {
    const savedUser = localStorage.getItem('gs_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Ищем пользователя в нашей новой таблице app_users
    const { data, error: dbError } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .eq('password', password)
      .single();

    setLoading(false);

    if (dbError || !data) {
      setError('Неверное имя пользователя или пароль');
      return;
    }

    const loggedUser = {
      username: data.username,
      role: data.role,
      fullName: data.full_name,
    };

    // Сохраняем в память устройства, чтобы не вводить каждый раз
    localStorage.setItem('gs_user', JSON.stringify(loggedUser));
    setUser(loggedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('gs_user');
    setUser(null);
    setUsername('');
    setPassword('');
  };

  if (user?.role === 'manager') {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-md mx-auto flex justify-between items-center mb-4 bg-white p-3 rounded-2xl shadow-sm border">
          <span className="text-xs text-gray-500 font-medium">👤 {user.fullName}</span>
          <button onClick={handleLogout} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-transform">
            Выйти
          </button>
        </div>
        <ManagerDashboard />
      </div>
    );
  }

  if (user?.role === 'courier') {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-md mx-auto flex justify-between items-center mb-4 bg-white p-3 rounded-2xl shadow-sm border">
          <span className="text-xs text-gray-500 font-medium">🛵 {user.fullName}</span>
          <button onClick={handleLogout} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-transform">
            Выйти
          </button>
        </div>
        <CourierDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-center items-center p-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight text-center mb-1">GS Delivery</h1>
        <p className="text-xs text-slate-400 text-center mb-6">Вход в систему управления доставкой</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Логин</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Введите имя пользователя"
              className="w-full p-3.5 bg-gray-50 rounded-2xl border-0 text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Пароль</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full p-3.5 bg-gray-50 rounded-2xl border-0 text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-500 text-center bg-red-50 p-2.5 rounded-xl">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 px-6 rounded-2xl font-bold text-base shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Проверка...' : 'Войти в систему'}
          </button>
        </form>
      </div>
    </div>
  );
}
