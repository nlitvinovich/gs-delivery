'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ManagerJournal() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCourierFilter, setSelectedCourierFilter] = useState('all');
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  
  // Состояния полей редактирования
  const [editType, setEditType] = useState('');
  const [editCourier, setEditCourier] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editItems, setEditItems] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCurrency, setEditCurrency] = useState('BYN');
  const [editUsdRate, setEditUsdRate] = useState('3.30');
  const [editComment, setEditComment] = useState('');
  const [editStatus, setEditStatus] = useState('new');

  const fetchCouriers = async () => {
    const { data } = await supabase.from('app_users').select('username, full_name').eq('role', 'courier');
    if (data) setCouriers(data);
  };

  const fetchAllOrders = async () => {
    const start = `${selectedDate}T00:00:00.000Z`;
    const end = `${selectedDate}T23:59:59.999Z`;
    let query = supabase.from('orders').select('*').gte('created_at', start).lte('created_at', end);

    if (selectedCourierFilter === 'none') {
      query = query.is('courier_id', null);
    } else if (selectedCourierFilter !== 'all') {
      query = query.eq('courier_id', selectedCourierFilter);
    }

    const { data } = await query.order('created_at', { ascending: false });
    if (data) setAllOrders(data);
  };

  // 1. Загружаем курьеров один раз при старте
  useEffect(() => { fetchCouriers(); }, []);

  // 2. Слушаем базу данных в реальном времени при изменении даты или фильтра курьеров
  useEffect(() => {
    fetchAllOrders();

    // Подписываемся на мгновенные изменения статусов курьерами
    const channel = supabase
      .channel('manager-realtime-journal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchAllOrders(); // При любом чихе курьера (В путь / Доставлен) — обновляем список у менеджера
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, selectedCourierFilter]);

  const startEdit = (o: any) => {
    setEditingOrder(o); setEditType(o.type); setEditCourier(o.courier_id || '');
    setEditAddress(o.address || ''); setEditTime(o.delivery_time || ''); setEditPhone(o.phone || '');
    setEditItems(o.items || ''); setEditPrice(o.price?.toString() || ''); setEditCurrency(o.currency || 'BYN');
    setEditUsdRate(o.usd_rate?.toString() || '3.30'); setEditComment(o.comment || ''); setEditStatus(o.status || 'new');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    await supabase.from('orders').update({
      type: editType, courier_id: editCourier || null, address: editAddress,
      delivery_time: editTime, phone: editPhone, items: editItems,
      price: parseFloat(editPrice), currency: editCurrency, usd_rate: parseFloat(editUsdRate),
      comment: editComment, status: editStatus
    }).eq('id', editingOrder.id);
    setEditingOrder(null);
    fetchAllOrders();
  };

  const getTypeName = (t: string) => {
    const names: Record<string, string> = {
      city_delivery: '🏙️ По городу', minibus_send: '🚌 Маршрутка (отпр)',
      courier_service: '📦 Курьерская сл.', pickup: '🏪 Самовывоз',
      minibus_pickup: '📥 Маршрутка (забор)', errand: '🏃 Поручение'
    };
    return names[t] || t;
  };
  return (
    <div className="space-y-4">
      {/* Календарь и Фильтр по курьерам */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">Дата просмотра:</span>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 bg-gray-50 rounded-xl text-sm font-semibold border-0 text-gray-800" />
        </div>
        
        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-sm font-bold text-gray-700">Фильтр по курьеру:</span>
          <select value={selectedCourierFilter} onChange={(e) => setSelectedCourierFilter(e.target.value)} className="p-2 bg-gray-50 rounded-xl text-sm font-semibold border-0 text-gray-800">
            <option value="all">👀 Все курьеры</option>
            <option value="none">🛑 Не назначены</option>
            {couriers.map((c) => (
              <option key={c.username} value={c.username}>👤 {c.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Список отфильтрованных заказов */}
      <div className="space-y-3">
        {allOrders.length === 0 ? (
          <p className="text-gray-400 text-center py-8 bg-white rounded-3xl border border-dashed">Заказов не найдено</p>
        ) : (
          allOrders.map((o) => (
            <div key={o.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">{getTypeName(o.type)}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-bold ${o.status === 'new' ? 'bg-blue-50 text-blue-600' : o.status === 'in_transit' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {o.status === 'new' ? 'Новый' : o.status === 'in_transit' ? 'В пути' : 'Доставлен'}
                  </span>
                  <button type="button" onClick={() => startEdit(o)} className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded cursor-pointer">Правка ✏️</button>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-800">{o.address}</p>
              <p className="text-xs text-gray-500">🛍️ {o.items}</p>
              {o.comment && <p className="text-xs text-amber-700 font-mono bg-amber-50/50 p-2 rounded-lg">💡 {o.comment}</p>}
              <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-50">
                <span className="text-gray-400">Курьер: <strong className="text-gray-700">{couriers.find(c => c.username === o.courier_id)?.full_name || o.courier_id || 'Не назначен'}</strong></span>
                <span className="font-black text-gray-800 text-sm">{o.price} {o.currency}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ВСПЛЫВАЮЩЕЕ ОКНО РЕДАКТИРОВАНИЯ */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800">Заказ №{editingOrder.id}</h3>
              <button type="button" onClick={() => setEditingOrder(null)} className="text-gray-400 font-bold text-lg p-1">✕</button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Статус</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full p-2.5 bg-gray-50 rounded-xl text-sm border-0 text-gray-800">
                  <option value="new">Новый</option><option value="in_transit">В пути</option><option value="delivered">Доставлен</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Тип</label>
                <select value={editType} onChange={(e) => setEditType(e.target.value)} className="w-full p-2.5 bg-gray-50 rounded-xl text-sm border-0 text-gray-800">
                  <option value="city_delivery">Доставка по городу</option><option value="minibus_send">Отправка маршруткой</option><option value="courier_service">Доставка курьерской службой</option><option value="pickup">Самовывоз</option><option value="minibus_pickup">Забор маршрутки</option><option value="errand">Поручение</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Курьер</label>
                <select value={editCourier} onChange={(e) => setEditCourier(e.target.value)} className="w-full p-2.5 bg-gray-50 rounded-xl text-sm border-0 text-gray-800">
                  <option value="">-- Общий пул --</option>
                  {couriers.map((c) => <option key={c.username} value={c.username}>{c.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Адрес</label>
                <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} required className="w-full p-2.5 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={editTime} onChange={(e) => setEditTime(e.target.value)} placeholder="Время" className="w-full p-2.5 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required placeholder="Телефон" className="w-full p-2.5 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              </div>
              <input type="text" value={editItems} onChange={(e) => setEditItems(e.target.value)} required placeholder="Товары" className="w-full p-2.5 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} required placeholder="Цена" className="w-full p-2.5 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
                <select value={editCurrency} onChange={(e) => setEditCurrency(e.target.value)} className="w-full p-2.5 bg-gray-50 rounded-xl text-sm border-0 text-gray-800">
                  <option value="BYN">BYN</option><option value="USD">USD</option><option value="RUB">RUB</option>
                </select>
                <input type="number" step="0.0001" value={editUsdRate} onChange={(e) => setEditUsdRate(e.target.value)} placeholder="Курс" className="w-full p-2.5 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              </div>
              <input type="text" value={editComment} onChange={(e) => setEditComment(e.target.value)} placeholder="Комментарий" className="w-full p-2.5 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              <button type="submit" className="w-full bg-indigo-600 text-white p-3.5 rounded-xl font-bold active:scale-95 transition-all cursor-pointer">Сохранить</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
