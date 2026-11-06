'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import ManagerJournal from './manager-journal';
import ManagerCouriers from './manager-couriers';
import ManagerCreateModal from './manager-create-modal';

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'all_orders' | 'couriers'>('dashboard');
  const [couriers, setCouriers] = useState<any[]>([]);
  const [todayOrders, setTodayOrders] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchData = async () => {
    const { data: cData } = await supabase.from('app_users').select('*').eq('role', 'courier').order('id', { ascending: true });
    if (cData) setCouriers(cData);

    const todayStr = new Date().toISOString().split('T')[0];
    const start = `${todayStr}T00:00:00.000Z`;
    const end = `${todayStr}T23:59:59.999Z`;
    const { data: oData } = await supabase.from('orders').select('*').gte('created_at', start).lte('created_at', end);
    if (oData) setTodayOrders(oData);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('manager-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, () => { fetchData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const countStatus = (st: string) => todayOrders.filter(o => o.status === st).length;

  return (
    <div className="max-w-md mx-auto space-y-4 text-slate-900">
      <div className="flex bg-gray-200 p-1 rounded-2xl gap-1 items-center">
        <button type="button" onClick={() => setActiveTab('dashboard')} className={`flex-1 py-2 text-xs font-bold rounded-xl ${activeTab === 'dashboard' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>📊 Дашборд</button>
        <button type="button" onClick={() => setActiveTab('all_orders')} className={`flex-1 py-2 text-xs font-bold rounded-xl ${activeTab === 'all_orders' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>📋 Заказы</button>
        <button type="button" onClick={() => setActiveTab('couriers')} className={`flex-1 py-2 text-xs font-bold rounded-xl ${activeTab === 'couriers' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>👥 Курьеры</button>
        <button type="button" onClick={() => setShowCreateModal(true)} className="w-9 h-9 bg-indigo-600 text-white font-black text-lg rounded-xl flex items-center justify-center shadow-md cursor-pointer shrink-0">+</button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-3 rounded-2xl border text-center"><p className="text-[10px] font-bold text-gray-400 uppercase">Всего задач</p><p className="text-xl font-black mt-0.5">{todayOrders.length}</p></div>
            <div className="bg-white p-3 rounded-2xl border text-center"><p className="text-[10px] font-bold text-blue-400 uppercase">Новые</p><p className="text-xl font-black text-blue-600 mt-0.5">{countStatus('new')}</p></div>
            <div className="bg-white p-3 rounded-2xl border text-center"><p className="text-[10px] font-bold text-amber-400 uppercase">В пути</p><p className="text-xl font-black text-amber-600 mt-0.5">{countStatus('in_transit')}</p></div>
            <div className="bg-white p-3 rounded-2xl border text-center"><p className="text-[10px] font-bold text-emerald-400 uppercase">Выполнены</p><p className="text-xl font-black text-emerald-600 mt-0.5">{countStatus('delivered')}</p></div>
            <div className="bg-white p-3 rounded-2xl border text-center col-span-2"><p className="text-[10px] font-bold text-red-400 uppercase">Отказы за сегодня</p><p className="text-xl font-black text-red-600 mt-0.5">{countStatus('canceled')}</p></div>
          </div>

          <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider border-b pb-1.5">Нагрузка курьеров на сегодня</h3>
            <div className="divide-y divide-gray-100">
              {couriers.map((c) => {
                const cOrders = todayOrders.filter(o => o.courier_id === c.username);
                const activeCount = cOrders.filter(o => o.status === 'new' || o.status === 'in_transit').length;
                const doneCount = cOrders.filter(o => o.status === 'delivered').length;
                return (
                  <div key={c.id} className="py-2.5 flex justify-between items-center text-sm">
                    <div><p className="font-bold text-slate-800">👤 {c.full_name}</p><p className="text-[10px] text-gray-400 font-mono">Логин: {c.username}</p></div>
                    <div className="text-right"><span className="inline-block text-[11px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg mr-1">В работе: {activeCount}</span><span className="inline-block text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg">Сдано: {doneCount}</span></div>
                  </div>
                );
              })}
              <div className="py-2.5 flex justify-between items-center text-sm">
                <div><p className="font-bold text-gray-500">🛑 Общий пул (Не назначены)</p></div>
                <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg">Свободно: {todayOrders.filter(o => !o.courier_id).length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'all_orders' && <ManagerJournal />}
      {activeTab === 'couriers' && <ManagerCouriers couriers={couriers} onRefresh={fetchData} />}

      {showCreateModal && (
        <ManagerCreateModal couriers={couriers} onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); fetchData(); }} />
      )}
    </div>
  );
}
