'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import ManagerOrders from './manager-orders';
import ManagerJournal from './manager-journal';
import ManagerCouriers from './manager-couriers';

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'all_orders' | 'couriers'>('orders');
  const [couriers, setCouriers] = useState<any[]>([]);

  const fetchCouriers = async () => {
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .eq('role', 'courier')
      .order('id', { ascending: true });
    if (data) setCouriers(data);
  };

  useEffect(() => {
    fetchCouriers();
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Меню переключения вкладок */}
      <div className="flex bg-gray-200 p-1 rounded-2xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap px-2 ${
            activeTab === 'orders' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
          }`}
        >
          📝 Новый заказ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('all_orders')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap px-2 ${
            activeTab === 'all_orders' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
          }`}
        >
          📋 Все заказы
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('couriers')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap px-2 ${
            activeTab === 'couriers' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
          }`}
        >
          👥 Курьеры ({couriers.length})
        </button>
      </div>

      {/* Содержимое вкладок */}
      {activeTab === 'orders' && (
        <ManagerOrders couriers={couriers} onCreated={fetchCouriers} />
      )}

      {activeTab === 'all_orders' && (
        <ManagerJournal />
      )}

      {activeTab === 'couriers' && (
        <ManagerCouriers couriers={couriers} onRefresh={fetchCouriers} />
      )}
    </div>
  );
}
