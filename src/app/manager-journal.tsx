'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ManagerJournal() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCourierFilter, setSelectedCourierFilter] = useState('all');
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  
  // Надежные текстовые поля для ручного изменения данных
  const [editType, setEditType] = useState('city_delivery');
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

  // Передаем данные из базы в форму "как есть" без опасных алгоритмов парсинга
  const startEdit = (o: any) => {
    setEditingOrder(o); 
    setEditType(o.type || 'city_delivery'); 
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
      type: editType, 
      courier_id: editCourier || null, 
      address: editAddress,
      delivery_time: editTime, 
      phone: editPhone, 
      items: editItems,
      price: editPriceString, 
      comment: editComment, 
      status: editStatus
    }).eq('id', editingOrder.id);
    
    setEditingOrder(null);
    fetchData();
  };
  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3 text-sm text-slate-800">
        <div className="flex justify-between items-center">
          <span className="font-bold text-slate-700">Дата просмотра:</span>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 bg-slate-50 rounded-xl border-0 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex justify-between items-center border-t border-slate-50 pt-2">
          <span className="font-bold text-slate-700">Фильтр курьера:</span>
          <select value={selectedCourierFilter} onChange={(e) => setSelectedCourierFilter(e.target.value)} className="p-2 bg-slate-50 rounded-xl border-0 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500">
            <option value="all">👀 Все</option>
            <option value="none">🛑 Не назначены</option>
            {couriers.map((c) => <option key={c.username} value={c.username}>👤 {c.full_name}</option>)}
          </select>
        </div>
      </div>

      {/* Список заказов */}
      <div className="space-y-3">
        {allOrders.length === 0 ? (
          <p className="text-slate-400 text-center py-8 bg-white rounded-3xl border border-dashed border-slate-200 text-sm">Заказов на эту дату нет</p>
        ) : (
          allOrders.map((o) => (
            <div key={o.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-2 text-sm text-slate-900">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">{getTypeName(o.type)}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded font-black ${o.status === 'canceled' ? 'bg-red-50 text-red-600' : o.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : o.status === 'in_transit' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                    {o.status === 'new' ? 'Новый' : o.status === 'in_transit' ? 'В пути' : o.status === 'delivered' ? 'Доставлен' : 'Отказ 🛑'}
                  </span>
                  <button type="button" onClick={() => startEdit(o)} className="text-indigo-600 font-black bg-indigo-50 px-2.5 py-1 rounded-xl cursor-pointer">Правка ✏️</button>
                  <button type="button" onClick={() => handleDeleteOrder(o.id)} className="text-red-500 font-black bg-red-50 px-2.5 py-1 rounded-xl cursor-pointer">🗑️</button>
                </div>
              </div>
              <p className="font-black text-base text-slate-900">{o.address}</p>
              <p className="text-sm text-slate-800 font-medium">🛍️ {o.items}</p>
              {o.comment && <p className="text-xs text-amber-800 font-mono bg-amber-50 p-2 rounded-xl">💡 {o.comment}</p>}
              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-50 text-slate-500 font-medium">
                <span>Курьер: <strong className="text-slate-900 font-bold">{couriers.find(c => c.username === o.courier_id)?.full_name || o.courier_id || 'Не назначен'}</strong></span>
                <span className="font-black text-slate-900 text-base">{o.price}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ВСПЛЫВАЮЩАЯ ШТОРКА РЕДАКТИРОВАНИЯ */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-t-3xl p-5 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto text-sm text-slate-900">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-black text-lg text-slate-900">Заказ №{editingOrder.id}</h3>
              <button type="button" onClick={() => setEditingOrder(null)} className="text-slate-500 font-bold p-1 text-base">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Статус</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl border-0 text-sm font-bold text-slate-900">
                  <option value="new">Новый</option><option value="in_transit">В пути</option><option value="delivered">Доставлен</option><option value="canceled">Отказ 🛑</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Тип</label>
                <select value={editType} onChange={(e) => setEditType(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl border-0 text-sm font-bold text-slate-900">
                  <option value="city_delivery">🏙️ По городу</option><option value="minibus_send">🚌 Отправка маршруткой</option><option value="courier_service">📦 Курьерская сл.</option><option value="pickup">🏪 Самовывоз</option><option value="minibus_pickup">📥 Забор маршрутки</option><option value="errand">🏃 Поручение</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Курьер</label>
                <select value={editCourier} onChange={(e) => setEditCourier(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl border-0 text-sm font-bold text-slate-900">
                  <option value="">-- Общий пул (Не назначен) --</option>
                  {couriers.map((c) => <option key={c.username} value={c.username}>👤 {c.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Адрес</label>
                <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} required className="w-full p-3 bg-slate-50 rounded-xl border-0 text-sm font-bold text-slate-900" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Время</label>
                  <input type="text" value={editTime} onChange={(e) => setEditTime(e.target.value)} placeholder="Время" className="w-full p-3 bg-slate-50 rounded-xl border-0 text-sm font-bold text-slate-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Телефон</label>
                  <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required placeholder="Телефон" className="w-full p-3 bg-slate-50 rounded-xl border-0 text-sm font-bold text-slate-900" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Товары в заказе</label>
                <input type="text" value={editItems} onChange={(e) => setEditItems(e.target.value)} required className="w-full p-3 bg-slate-50 rounded-xl border-0 text-sm font-bold text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Сумма к оплате</label>
                <input type="text" value={editPriceString} onChange={(e) => setEditPriceString(e.target.value)} required className="w-full p-3 bg-slate-50 rounded-xl border-0 text-sm font-black text-slate-900 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Комментарий</label>
                <input type="text" value={editComment} onChange={(e) => setEditComment(e.target.value)} placeholder="Комментарий" className="w-full p-3 bg-slate-50 rounded-xl border-0 text-sm font-bold text-slate-900" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white p-3.5 rounded-xl font-bold text-base cursor-pointer active:scale-95 transition-transform shadow-md">Сохранить заказ</button>
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
