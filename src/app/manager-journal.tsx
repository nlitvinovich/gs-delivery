'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ManagerJournal() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCourierFilter, setSelectedCourierFilter] = useState('all');
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  
  const [editType, setEditType] = useState('');
  const [editCourier, setEditCourier] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editItems, setEditItems] = useState('');
  const [editPriceString, setEditPriceString] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editStatus, setEditStatus] = useState('new');

  const fetchData = async () => {
    const { data: cData } = await supabase.from('app_users').select('username, full_name').eq('role', 'courier');
    if (cData) setCouriers(cData);
    
    const start = `${selectedDate}T00:00:00.000Z`;
    const end = `${selectedDate}T23:59:59.999Z`;
    let query = supabase.from('orders').select('*').gte('created_at', start).lte('created_at', end);

    if (selectedCourierFilter === 'none') {
      query = query.is('courier_id', null);
    } else if (selectedCourierFilter !== 'all') {
      query = query.eq('courier_id', selectedCourierFilter);
    }

    const { data: oData } = await query.order('created_at', { ascending: false });
    if (oData) setAllOrders(oData);
  };

  useEffect(() => { fetchData(); }, [selectedDate, selectedCourierFilter]);

  const handleDeleteOrder = async (id: number) => {
    if (window.confirm(`Вы уверены, что хотите ПОЛНОСТЬЮ УДАЛИТЬ заказ №${id}?`)) {
      await supabase.from('orders').delete().eq('id', id);
      fetchData();
    }
  };

  const startEdit = (o: any) => {
    setEditingOrder(o); setEditType(o.type); setEditCourier(o.courier_id || '');
    setEditAddress(o.address || ''); setEditTime(o.delivery_time || ''); setEditPhone(o.phone || '');
    setEditItems(o.items || ''); setEditPriceString(o.price || ''); setEditComment(o.comment || ''); setEditStatus(o.status || 'new');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    await supabase.from('orders').update({
      type: editType, courier_id: editCourier || null, address: editAddress,
      delivery_time: editTime, phone: editPhone, items: editItems,
      price: editPriceString, comment: editComment, status: editStatus
    }).eq('id', editingOrder.id);
    setEditingOrder(null);
    fetchData();
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
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">Дата:</span>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 bg-gray-50 rounded-xl text-sm font-semibold border-0 text-gray-800" />
        </div>
        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-sm font-bold text-gray-700">Курьер:</span>
          <select value={selectedCourierFilter} onChange={(e) => setSelectedCourierFilter(e.target.value)} className="p-2 bg-gray-50 rounded-xl text-sm font-semibold border-0 text-gray-800">
            <option value="all">👀 Все</option><option value="none">🛑 Не назначены</option>
            {couriers.map((c) => <option key={c.username} value={c.username}>👤 {c.full_name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {allOrders.length === 0 ? (
          <p className="text-gray-400 text-center py-8 bg-white rounded-3xl border border-dashed text-sm">Заказов не найдено</p>
        ) : (
          allOrders.map((o) => (
            <div key={o.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">{getTypeName(o.type)}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-bold ${o.status === 'new' ? 'bg-blue-50 text-blue-600' : o.status === 'in_transit' ? 'bg-amber-50 text-amber-600' : o.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {o.status === 'new' ? 'Новый' : o.status === 'in_transit' ? 'В пути' : o.status === 'delivered' ? 'Доставлен' : 'Отказ'}
                  </span>
                  <button type="button" onClick={() => startEdit(o)} className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded text-xs cursor-pointer">Правка ✏️</button>
                  <button type="button" onClick={() => handleDeleteOrder(o.id)} className="text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded text-xs cursor-pointer">🗑️</button>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-800">{o.address}</p>
              <p className="text-xs text-gray-500">🛍️ {o.items}</p>
              {o.comment && <p className="text-xs text-amber-700 font-mono bg-amber-50/50 p-2 rounded-lg">💡 {o.comment}</p>}
              <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-50">
                <span className="text-gray-400">Курьер: <strong className="text-gray-700">{couriers.find(c => c.username === o.courier_id)?.full_name || o.courier_id || 'Не назначен'}</strong></span>
                <span className="font-black text-gray-800 text-sm">{o.price}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {editingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-t-3xl p-5 space-y-3 shadow-xl max-h-[85vh] overflow-y-auto text-sm text-gray-700">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-bold text-gray-800">Заказ №{editingOrder.id}</h3>
              <button type="button" onClick={() => setEditingOrder(null)} className="text-gray-400 font-bold p-1">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-3">
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-sm"><option value="new">Новый</option><option value="in_transit">В пути</option><option value="delivered">Доставлен</option><option value="canceled">Отказ 🛑</option></select>
              <select value={editType} onChange={(e) => setEditType(e.target.value)} className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-sm"><option value="city_delivery">По городу</option><option value="minibus_send">Отправка маршруткой</option><option value="courier_service">Курьерская служба</option><option value="pickup">Самовывоз</option><option value="minibus_pickup">Забор маршрутки</option><option value="errand">Поручение</option></select>
              <select value={editCourier} onChange={(e) => setEditCourier(e.target.value)} className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-sm"><option value="">-- Общий пул --</option>{couriers.map((c) => <option key={c.username} value={c.username}>{c.full_name}</option>)}</select>
              <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} required placeholder="Адрес" className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={editTime} onChange={(e) => setEditTime(e.target.value)} placeholder="Время" className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-xs" />
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required placeholder="Телефон" className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-xs" />
              </div>
              <input type="text" value={editItems} onChange={(e) => setEditItems(e.target.value)} required placeholder="Товары" className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-sm" />
              <input type="text" value={editPriceString} onChange={(e) => setEditPriceString(e.target.value)} required placeholder="Цена (например: 700 RUB + 70 BYN)" className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-sm font-mono" />
              <input type="text" value={editComment} onChange={(e) => setEditComment(e.target.value)} placeholder="Комментарий" className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-sm" />
              <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold cursor-pointer active:scale-95 transition-transform">Сохранить</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
