'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ManagerJournal() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCourierFilter, setSelectedCourierFilter] = useState('all');
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  
  // Простые и надежные текстовые состояния
  const [editType, setEditType] = useState('');
  const [editCourier, setEditCourier] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editItems, setEditItems] = useState(''); // Прямой текст товаров
  const [editPriceString, setEditPriceString] = useState(''); // Прямой текст цены
  const [editComment, setEditComment] = useState('');
  const [editStatus, setEditStatus] = useState('new');

  const fetchData = async () => {
    const { data: cData } = await supabase.from('app_users').select('username, full_name').eq('role', 'courier');
    if (cData) setCouriers(cData);
    
    const start = `${selectedDate}T00:00:00.000Z`;
    const end = `${selectedDate}T23:59:59.999Z`;
    let query = supabase.from('orders').select('*').gte('created_at', start).lte('created_at', end);
    
    if (selectedCourierFilter === 'none') query = query.is('courier_id', null);
    else if (selectedCourierFilter !== 'all') query = query.eq('courier_id', selectedCourierFilter);

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

  // Без всяких регулярных выражений просто берем строки из базы "как есть"
  const startEdit = (o: any) => {
    setEditingOrder(o); 
    setEditType(o.type); 
    setEditCourier(o.courier_id || '');
    setEditAddress(o.address || ''); 
    setEditTime(o.delivery_time || ''); 
    setEditPhone(o.phone || '');
    setEditItems(o.items || ''); 
    setEditPriceString(o.price || ''); 
    setEditComment(o.comment || ''); 
    setEditStatus(o.status || 'new');
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
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-4 shadow-sm border space-y-3 text-sm text-gray-700">
        <div className="flex justify-between items-center">
          <span>Дата:</span>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 bg-gray-50 rounded-xl border-0" />
        </div>
        <div className="flex justify-between items-center border-t pt-2">
          <span>Курьер:</span>
          <select value={selectedCourierFilter} onChange={(e) => setSelectedCourierFilter(e.target.value)} className="p-2 bg-gray-50 rounded-xl border-0">
            <option value="all">Все</option><option value="none">Не назначены</option>
            {couriers.map((c) => <option key={c.username} value={c.username}>{c.full_name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {allOrders.map((o) => (
          <div key={o.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-2 text-sm">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold px-2 py-0.5 bg-slate-100 rounded-full">{getTypeName(o.type)}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold">{o.status === 'canceled' ? '🛑 Отказ' : o.status === 'delivered' ? '✅ Доставлен' : o.status === 'in_transit' ? '⏳ В пути' : '🆕 Новый'}</span>
                <button type="button" onClick={() => startEdit(o)} className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded text-xs cursor-pointer">Правка ✏️</button>
                <button type="button" onClick={() => handleDeleteOrder(o.id)} className="text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded text-xs cursor-pointer">🗑️</button>
              </div>
            </div>
            <p className="font-bold">{o.address}</p><p className="text-xs text-gray-500">🛍️ {o.items}</p>
            {o.comment && <p className="text-xs text-amber-700 font-mono bg-amber-50/50 p-2 rounded-lg">💡 {o.comment}</p>}
            <div className="flex justify-between pt-2 border-t text-xs text-gray-400">
              <span>Курьер: <strong className="text-gray-700">{couriers.find(c => c.username === o.courier_id)?.full_name || 'Общий пул'}</strong></span>
              <span className="font-black text-gray-800">{o.price}</span>
            </div>
          </div>
        ))}
      </div>

      {editingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-t-3xl p-5 space-y-3 max-h-[85vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-gray-800">Заказ №{editingOrder.id}</h3>
              <button type="button" onClick={() => setEditingOrder(null)} className="p-1">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-3">
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full p-2 bg-gray-50 rounded-xl border-0"><option value="new">Новый</option><option value="in_transit">В пути</option><option value="delivered">Доставлен</option><option value="canceled">Отказ 🛑</option></select>
              <select value={editType} onChange={(e) => setEditType(e.target.value)} className="w-full p-2 bg-gray-50 rounded-xl border-0"><option value="city_delivery">По городу</option><option value="minibus_send">Маршрутка</option><option value="courier_service">Служба доставки</option><option value="pickup">Самовывоз</option><option value="minibus_pickup">Забор маршрутки</option><option value="errand">Поручение</option></select>
              <select value={editCourier} onChange={(e) => setEditCourier(e.target.value)} className="w-full p-2 bg-gray-50 rounded-xl border-0"><option value="">-- Общий пул --</option>{couriers.map((c) => <option key={c.username} value={c.username}>{c.full_name}</option>)}</select>
              <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} required placeholder="Адрес" className="w-full p-2 bg-gray-50 rounded-xl border-0" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={editTime} onChange={(e) => setEditTime(e.target.value)} placeholder="Время" className="w-full p-2 bg-gray-50 rounded-xl border-0" />
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required placeholder="Телефон" className="w-full p-2 bg-gray-50 rounded-xl border-0" />
              </div>
              <div>
                <label className="block font-bold text-gray-400 mb-1">Товары</label>
                <input type="text" value={editItems} onChange={(e) => setEditItems(e.target.value)} required className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-gray-800" />
              </div>
              <div>
                <label className="block font-bold text-gray-400 mb-1">Сумма к оплате</label>
                <input type="text" value={editPriceString} onChange={(e) => setEditPriceString(e.target.value)} required className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-gray-800 font-mono" />
              </div>
              <input type="text" value={editComment} onChange={(e) => setEditComment(e.target.value)} placeholder="Комментарий" className="w-full p-2 bg-gray-50 rounded-xl border-0" />
              <button type="submit" className="w-full bg-indigo-600 text-white p-2.5 rounded-xl font-bold cursor-pointer">Сохранить</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getTypeName(t: string) {
  const names: Record<string, string> = { city_delivery: '🏙️ Город', minibus_send: '🚌 Маршрутка', courier_service: '📦 Служба', pickup: '🏪 Самовывоз', minibus_pickup: '📥 Забор', errand: '🏃 Поручение' };
  return names[t] || t;
}
