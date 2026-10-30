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
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('gs_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    const bioEnabled = localStorage.getItem('gs_bio_enabled');
    if (bioEnabled === 'true') {
      setHasBiometrics(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

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

    localStorage.setItem('gs_user', JSON.stringify(loggedUser));
    
    if (localStorage.getItem('gs_bio_enabled') !== 'true') {
      if (window.confirm('Включить вход по Face ID / Touch ID на этом устройстве?')) {
        localStorage.setItem('gs_bio_enabled', 'true');
        localStorage.setItem('gs_bio_credentials', JSON.stringify(loggedUser));
        setHasBiometrics(true);
      }
    }

    setUser(loggedUser);
  };

  const handleFaceID = async () => {
    setError('');
    
    if (!window.PublicKeyCredential) {
      alert('Биометрия не поддерживается этим браузером. Откройте приложение в оригинальном Safari на iPhone.');
      return;
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credentialOptions: CredentialCreationOptions = {
        publicKey: {
          challenge: challenge,
          rp: { name: "GS Delivery" },
          user: {
            id: new Uint8Array(), 
            name: "courier",
            displayName: "Courier"
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }], 
          authenticatorSelection: {
            authenticatorAttachment: "platform", 
            userVerification: "required" 
          },
          timeout: 60000
        }
      };

      await navigator.credentials.create(credentialOptions);

      const savedCredentials = localStorage.getItem('gs_bio_credentials');
      if (savedCredentials) {
        setUser(JSON.parse(savedCredentials));
      } else {
        setError('Сначала войдите по паролю, чтобы привязать Face ID');
      }
    } catch (err: any) {
      console.error(err);
      setError('Биометрия отклонена устройством');
    }
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
          <span className="text-xs text-gray-500 font-medium">👤 {user.fullName} (Менеджер)</span>
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
        <CourierDashboard username={user.username} />
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
              autoComplete="off"
              id="login-field-fixed"
              placeholder="имя пользователя"
              className="w-full p-3.5 bg-gray-50 rounded-2xl border-0 text-sm text-gray-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Пароль</label>
            <input 
              type="text" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              id="pass-field-fixed"
              placeholder="••••••••"
              style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
              className="w-full p-3.5 bg-gray-50 rounded-2xl border-0 text-sm text-gray-800"
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
            className="w-full bg-indigo-600 text-white py-4 px-6 rounded-2xl font-bold text-base shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            {loading ? 'Проверка...' : 'Войти по паролю'}
          </button>

          {hasBiometrics && (
            <button
              type="button"
              onClick={handleFaceID}
              className="w-full mt-2 bg-emerald-600 text-white py-3 px-6 rounded-2xl font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Вход по Face ID 📱
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
