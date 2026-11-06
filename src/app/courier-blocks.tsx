'use client';

export default function CourierBlock({ title, items, color, getTypeName, onStatusChange }: { title: string, items: any[], color: string, getTypeName: (t: string) => string, onStatusChange: (o: any, s: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h2 className={`text-xs font-black uppercase tracking-wider px-1 ${color}`}>{title} ({items.length})</h2>
      {items.map((order) => (
        <div key={order.id} className="bg-white rounded-xl p-2.5 shadow-xs border border-gray-100 space-y-1 text-slate-900">
          <div className="flex justify-between items-center text-[11px] gap-1.5 overflow-x-auto whitespace-nowrap">
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-black text-indigo-600">№{order.id}</span>
              <span className="font-bold px-1.5 py-0.5 bg-slate-50 text-gray-600 rounded-md">{getTypeName(order.type)}</span>
            </div>
            <a href={`tel:${order.phone}`} className="text-indigo-600 font-bold underline shrink-0">{order.phone}</a>
            <span className="font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md shrink-0">{order.delivery_time || 'Пул'}</span>
          </div>
          <div className="flex items-start justify-between gap-2 pt-0.5">
            <p className="text-xs font-bold text-gray-800 flex-1 leading-tight">{order.address}</p>
            <a href={`yandexmaps://maps.yandex.ru/?text=${encodeURIComponent(order.address)}`} className="bg-amber-50 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0">Карта 🗺️</a>
          </div>
          <div className="text-[11px] bg-slate-50/60 p-1.5 rounded-lg text-gray-700 leading-tight">
            <span className="font-medium text-gray-400">Товары:</span> {order.items}
            {order.comment && <p className="text-xs text-amber-700 mt-0.5 font-mono">💡 {order.comment}</p>}
          </div>
          <div className="flex justify-between items-center pt-0.5 gap-2 border-t border-gray-50">
            <p className="text-xs font-black text-gray-900 flex-1 truncate">{order.price}</p>
            <select value={order.status} onChange={(e) => onStatusChange(order, e.target.value)} className="p-0.5 bg-slate-50 font-bold text-[10px] rounded-md border-0 text-slate-800">
              <option value="new">🆕 Новый</option><option value="in_transit">🚀 В пути</option><option value="delivered">✅ Вып.</option><option value="canceled">🛑 Отказ</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
