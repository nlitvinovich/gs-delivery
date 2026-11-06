'use client';

export default function CourierOrderCard({ order, onStatusChange, getTypeName }: { order: any, onStatusChange: (order: any, st: string) => void, getTypeName: (t: string) => string }) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3 text-slate-900">
      <div className="flex justify-between items-center text-xs">
        <span className="font-bold px-2.5 py-1 bg-slate-100 rounded-full">{getTypeName(order.type)}</span>
        <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{order.delivery_time || 'Время не указано'}</span>
      </div>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{order.address}</p>
        <a href={`yandexmaps://maps.yandex.ru/?text=${encodeURIComponent(order.address)}`} className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0">Карта 🗺️</a>
      </div>
      <p className="text-xs text-gray-500">Клиент: <a href={`tel:${order.phone}`} className="text-indigo-600 font-bold underline">{order.phone}</a></p>
      <div className="text-sm bg-slate-50/50 p-3 rounded-xl border border-dashed">
        <span className="font-medium">Товары:</span> {order.items}
        {order.comment && <p className="text-xs text-amber-700 mt-1 font-mono">💡 {order.comment}</p>}
      </div>
      <div className="flex justify-between items-center pt-2 gap-2">
        <p className="text-base font-black break-all flex-1">{order.price}</p>
        <select 
          value={order.status} 
          onChange={(e) => onStatusChange(order, e.target.value)} 
          className="p-2 bg-slate-100 font-bold text-xs rounded-xl border-0 text-slate-800 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="new">🆕 Новый</option>
          <option value="in_transit">🚀 В пути</option>
          <option value="delivered">✅ Выполнено</option>
          <option value="canceled">🛑 Отказ</option>
        </select>
      </div>
    </div>
  );
}
