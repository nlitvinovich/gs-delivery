'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface OrderItem { name: string; price: string; currency: string; }

export default function ManagerCreateModal({ couriers, onClose, onCreated }: { couriers: any[], onClose: () => void, onCreated: () => void }) {
  const [type, setType] = useState('city_delivery');
  const [address, setAddress] = useState('');
  const [time, setTime] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [phone, setPhone] = useState('');
  const [itemsList, setItemsList] = useState<OrderItem[]>([{ name: '', price: '', currency: 'BYN' }]);
  const [comment, setComment] = useState('');
  const [selectedCourier, setSelectedCourier] = useState('');
  const [loading, setLoading] = useState(false);

  const finalPriceString = itemsList.reduce((acc, item) => {
    const p = parseFloat(item.price);
    if (!isNaN(p) && p > 0) acc[item.currency] = (acc[item.currency] || 0) + p;
    return acc;
  }, {} as Record<string, number>);

  const totalPriceString = Object.entries(finalPriceString)
    .map(([curr, sum]) => `${sum.toFixed(2)} ${curr}`)
    .join(' + ') || '0.00 BYN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const finalItemsText = itemsList.filter(i => i.name.trim().length > 0).map(i => `${i.name.trim()} (${i.price || 0} ${i.currency})`).join(', ');
    if (!finalItemsText) { alert('Добавьте товар'); setLoading(false); return; }

    const { error } = await supabase.from('orders').insert([{
  type, 
  address, 
  delivery_time: time, 
  phone, 
  items: finalItemsText,
  price: totalPriceString, 
  currency: 'MULTI', 
  comment, 
  status: 'new', 
  courier_id: selectedCourier || null,
  order_date: orderDate // <-- Добавлено сохранение даты
}]);
    
    setLoading(false);
    if (error) alert('Ошибка: ' + error.message);
    else { alert('Заказ создан!'); onCreated(); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-sm rounded-t-3xl p-5 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto text-sm text-slate-900">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-black text-lg">➕ Новый заказ</h3>
          <button type="button" onClick={onClose} className="text-slate-500 font-bold p-1">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-2.5 bg-slate-50 rounded-xl border-0 font-bold">
            <option value="city_delivery">🏙️ По городу</option><option value="minibus_send">🚌 Отправка маршруткой</option><option value="courier_service">📦 Курьерская сл.</option><option value="pickup">🏪 Самовывоз</option>
          </select>
          <select value={selectedCourier} onChange={(e) => setSelectedCourier(e.target.value)} className="w-full p-2.5 bg-slate-50 rounded-xl border-0 font-bold">
            <option value="">-- Общий пул (Не назначен) --</option>
            {couriers.map((c) => <option key={c.username} value={c.username}>👤 {c.full_name}</option>)}
          </select>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="Адрес доставки" className="w-full p-2.5 bg-slate-50 rounded-xl border-0 font-bold" />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={time} onChange={(e) => setTime(e.target.value)} placeholder="Время (до 18:00)" className="w-full p-2.5 bg-slate-50 rounded-xl border-0 font-bold" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="Телефон" className="w-full p-2.5 bg-slate-50 rounded-xl border-0 font-bold" />
          </div>
          <div className="space-y-1.5 border-t pt-2">
            <label className="text-xs font-bold text-slate-400 uppercase">Товары</label>
            {itemsList.map((item, index) => (
              <div key={index} className="flex gap-1 items-center">
                <input type="text" value={item.name} onChange={(e) => { const u = [...itemsList]; u[index].name = e.target.value; setItemsList(u); }} required placeholder="Товар" className="flex-1 p-2 bg-slate-50 rounded-xl border-0 text-xs font-bold" />
                <input type="number" step="0.01" value={item.price} onChange={(e) => { const u = [...itemsList]; u[index].price = e.target.value; setItemsList(u); }} required placeholder="Цена" className="w-14 p-2 bg-slate-50 rounded-xl border-0 text-xs text-center font-bold" />
                <select value={item.currency} onChange={(e) => { const u = [...itemsList]; u[index].currency = e.target.value; setItemsList(u); }} className="w-14 p-2 bg-slate-50 rounded-xl border-0 font-black text-[10px]"><option value="BYN">BYN</option><option value="USD">USD</option><option value="RUB">RUB</option></select>
                {itemsList.length > 1 && <button type="button" onClick={() => setItemsList(itemsList.filter((_, i) => i !== index))} className="p-2 text-red-500 bg-red-50 rounded-xl text-xs font-bold">✕</button>}
              </div>
            ))}
            <button type="button" onClick={() => setItemsList([...itemsList, { name: '', price: '', currency: 'BYN' }])} className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg font-bold text-[10px]">+ Добавить товар</button>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-dashed text-center font-mono font-black text-xs">Итог: {totalPriceString}</div>
          <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий" className="w-full p-2.5 bg-slate-50 rounded-xl border-0 font-bold" />
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold text-base shadow-md disabled:opacity-50">{loading ? 'Создание...' : 'Создать заказ'}</button>
        </form>
      </div>
    </div>
  );
}
