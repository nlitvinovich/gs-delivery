'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import ManagerDashboard from './manager-dashboard';
import CourierDashboard from './courier-dashboard';

export default function Home() {
  const [role, setRole] = useState<'select' | 'manager' | 'courier'>('select');

  if (role === 'manager') {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <button 
          onClick={() => setRole('select')}
          className="mb-4 bg-gray-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm active:scale-95 transition-transform"
        >
          ← Выйти в меню
        </button>
        <ManagerDashboard />
      </div>
    );
  }

  if (role === 'courier') {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <button 
          onClick={() => setRole('select')}
          className="mb-4 bg-gray-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm active:scale-95 transition-transform"
        >
          ← Выйти в меню
        </button>
        <CourierDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-center items-center p-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">GS Delivery</h1>
        <p className="text-sm text-slate-500 mb-8">Выберите вашу роль для входа в систему</p>
        
        <div className="space-y-3">
          <button
            onClick={() => setRole('manager')}
            className="w-full bg-indigo-600 text-white py-4 px-6 rounded-2xl font-bold text-base shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            Войти как Менеджер
          </button>
          
          <button
            onClick={() => setRole('courier')}
            className="w-full bg-emerald-600 text-white py-4 px-6 rounded-2xl font-bold text-base shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            Войти как Курьер
          </button>
        </div>
      </div>
    </div>
  );
}
