import type { Vehicle } from '../services/api.js';

interface VehicleCardProps {
  vehicle: Vehicle;
  canManage: boolean;
  deleting: boolean;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
}

export function VehicleCard({ vehicle, canManage, deleting, onEdit, onDelete }: VehicleCardProps) {
  const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(vehicle.price);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex h-32 items-center justify-center bg-gradient-to-br from-slate-800 via-slate-700 to-blue-900 text-6xl sm:h-36" aria-hidden="true">🚘</div>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{vehicle.year} · {vehicle.category}</p>
            <h3 className="mt-1 break-words text-lg font-bold text-slate-950"><span>{vehicle.make}</span> <span>{vehicle.model}</span></h3>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${vehicle.quantity ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {vehicle.quantity ? `${vehicle.quantity} in stock` : 'Out of stock'}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-500">{vehicle.description || `${vehicle.color} ${vehicle.make} ${vehicle.model}`}</p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xl font-bold text-slate-950">{price}</p>
          <span className="text-xs font-medium text-slate-500">{vehicle.color}</span>
        </div>
        {canManage && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" disabled={deleting} onClick={() => onEdit(vehicle)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50">Edit</button>
            <button type="button" disabled={deleting} onClick={() => onDelete(vehicle)} className="rounded-lg border border-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60">{deleting ? 'Deleting…' : 'Delete'}</button>
          </div>
        )}
      </div>
    </article>
  );
}
