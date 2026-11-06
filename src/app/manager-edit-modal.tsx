'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface EditOrderItem { name: string; price: string; currency: string; }

export default function ManagerEditModal({ order, couriers, onClose, onUpdated }: { order: any, couriers: any[], onClose: () => void, onUpdated: () => void }) {
  const [editStatus, setEditStatus] = useState(order.status || 'new');
  const [editType, setEditType] = useState(order.type || 'city_delivery');
  const [editCourier, setEditCourier] = useState(order.courier_id || '');
  const [editAddress, setEditAddress] = useState(order.address || '');
  const [editTime, setEditTime] = useState(order.delivery_time || '');
  const [editPhone, setEditPhone] = useState(order.phone || '');
  const [editComment, setEditComment] = useState(order.comment || '');
  
  // Изначально пустой массив, который заполнится при старте
  const [editItemsList, setEditItemsList] = useState<EditOrderItem[]>([]);
  const [computedPriceString, setComputedPriceString] = useState('0.00 BYN');

  // Разбираем строку товаров из базы данных при открытии шторки
  useEffect(() => {
    try {
      if (order.items && order.items.includes('(')) {
        // Разделяем строку вида "Товар 1 (100 USD), Товар 2 (50 RUB)"
        const parts = order.items.split(', ');
        const parsed = parts.map((p: string) => {
          // Регулярное выражение вытаскивает отдельно Название, Цену и Валюту
          const match = p.match(/(.+)\s\(([\d.]+)\s(BYN|USD|RUB)\)/);
          if (match) {
            return { name: match[1].trim(), price: match[2], currency: match[3] };
          }
          return { name: p.trim(), price: '', currency: 'BYN' };
        });
        setEditItemsList(parsed);
      } else {
        // Если это старый формат или обычный текст
        setEditItemsList([{ name: order.items || '', price: '', currency: 'BYN' }]);
      }
    } catch (e) {
      setEditItemsList([{ name: order.items || '', price: '', currency: 'BYN' }]);
    }
  }, [order]);

  // На лету пересчитываем мультивалютный итог
  useEffect(() => {
    if (editItemsList.length === 0) return;
    const totals: Record<string, number> = {};
    editItemsList.forEach((item) => {
      const itemPrice = parseFloat(item.price);
      if (!isNaN(itemPrice) && itemPrice > 0) totals[item.currency] = (totals[item.currency] || 0) + itemPrice;
    });
    const parts = Object.entries(totals).map(([curr, sum]) => `${sum.toFixed(2)} ${curr}`);
    setComputedPriceString(parts.length > 0 ? parts.join(' + ') : '0.00 BYN');
  }, [editItemsList]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalItemsText = editItemsList.filter(i => i.name.trim().length > 0).map(i => `${i.name.trim()} (${i.price || 0} ${i.currency})`).join(', ');
    if (!finalItemsText) { alert('Добавьте товар'); return; }

    await supabase.from('orders').update({
      status: editStatus, type: editType, courier_id: editCourier || null,
      address: editAddress, delivery_time: editTime, phone: editPhone,
      items: finalItemsText, price: computedPriceString, comment: editComment
    }).eq('id', order.id);
    
    onUpdated();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-sm rounded-t-3xl p-5 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto text-sm text-slate-900">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-black text-lg">Заказ №{order.id}</h3>
          <button type="button" onClick={onClose} className="text-slate-500 font-bold p-1">✕</button>
        </div>
        <form onSubmit={handleUpdate} className="space-y-3">
          <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full p-2.5 bg-slate-50 rounded-xl border-0 font-bold"><option value="new">Новый</option><option value="in_transit">В пути</option><option value="delivered">Доставлен</option><option value="canceled">Отказ 🛑</option></select>
          <select value={editType} onChange={(e) => setEditType(e.target.value)} className="w-full p-2.5 bg-slate-50 rounded-xl border-0 font-bold"><option value="city_delivery">🏙️ По городу</option><option value="minibus_send">🚌 Отправка маршруткой</option><option value="courier_service">📦 Курьерская сл.</option><option value="pickup">🏪 Самовывоз</option><option value="minibus_pickup">Забор маршрутки</option><option value="errand">Поручение</option></select>
          <select value={editCourier} onChange={(e) => setEditCourier(e.target.value)} className="w-full p-2.5 bg-slate-50 rounded-xl border-0 font-bold"><option value="">-- Общий пул --</option>{couriers.map((c) => <option key={c.username} value={c.username}>👤 {c.full_name}</option>)}</select>
          <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} required placeholder="Адрес" className="w-full p-2.5 bg-slate-50 rounded-xl border-0 font-bold" />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={editTime} onChange={(e) => setEditTime(e.target.value)} placeholder="Время" className="w-full p-2.5 bg-slate-50 rounded-xl border-0 font-bold" />
            <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required placeholder="Телефон" className="w-full p-2.5 bg-slate-50 rounded-xl border-0 font-bold" />
          </div>
          <div className="space-y-1.5 border-t pt-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Товары и цены</label>
            {editItemsList.map((item, index) => (
              <div key={index} className="flex gap-1 items-center">
                <input type="text" value={item.name} onChange={(e) => { const u = [...editItemsList]; u[index].name = e.target.value; setEditItemsList(u); }} required placeholder="Товар" className="flex-1 p-2.5 bg-slate-50 rounded-xl border-0 text-xs font-bold" />
                <input type="number" step="0.01" value={item.price} onChange={(e) => { const u = [...editItemsList]; u[index].price = e.target.value; setEditItemsList(u); }} required placeholder="Цена" className="w-14 p-2.5 bg-slate-50 rounded-xl border-0 text-xs text-center font-bold" />
                <select value={item.currency} onChange={(e) => { const u = [...editItemsList]; u[index].currency = e.target.value; setEditItemsList(u); }} className="w-14 p-2.5 bg-slate-50 rounded-xl border-0 font-black text-[10px]"><option value="BYN">BYN</option><option value="USD">USD</option><option value="RUB">RUB</option></select>
                {editItemsList.length > 1 && <button type="button" onClick={() => setEditItemsList(editItemsList.filter((_, i) => i !== index))} className="p-2.5 text-red-500 bg-red-50 rounded-xl text-xs font-bold">✕</button>}
              </div>
            ))}
            <button type="button" onClick={() => setEditItemsList([...editItemsList, { name: '', price: '', currency: 'BYN' }])} className="text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-xl font-bold text-[10px]">+ Добавить товар</button>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-dashed text-center font-mono font-black text-sm">{computedPriceString}</div>
          <input type="text" value={editComment} onChange={(e) => setEditComment(e.target.value)} placeholder="Комментарий" className="w-full p-2.5 bg-slate-50 rounded-xl border-0 font-bold" />
          <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold text-base shadow-md">Сохранить изменения</button>
        </form>
      </div>
    </div>
  );
}
