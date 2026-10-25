import type { AuthUser, Vehicle, VehicleSearchFilters } from '../services/api.js';
import { VehicleCard } from './VehicleCard.js';
import { VehicleFilters } from './VehicleFilters.js';

interface InventoryDashboardProps {
  user: AuthUser;
  vehicles: Vehicle[];
  filters: VehicleSearchFilters;
  loading: boolean;
  searching: boolean;
  saving: boolean;
  deletingVehicleId: number | null;
  purchasingVehicleId: number | null;
  error: string;
  notice: string;
  onSignOut: () => void;
  onFiltersChange: (filters: VehicleSearchFilters) => void;
  onSearch: (filters: VehicleSearchFilters) => Promise<void>;
  onAdd: () => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  onPurchase: (vehicle: Vehicle) => void;
}

export function InventoryDashboard({
  user,
  vehicles,
  filters,
  loading,
  searching,
  saving,
  deletingVehicleId,
  purchasingVehicleId,
  error,
  notice,
  onSignOut,
  onFiltersChange,
  onSearch,
  onAdd,
  onEdit,
  onDelete,
  onPurchase,
}: InventoryDashboardProps) {
  const canManage = user.role === 'admin';
  const unitsInStock = vehicles.reduce((total, vehicle) => total + vehicle.quantity, 0);
  const inventoryValue = vehicles.reduce((total, vehicle) => total + vehicle.price * vehicle.quantity, 0);
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-700 text-xl text-white" aria-hidden="true">🚘</span>
            <div className="min-w-0"><p className="truncate font-bold text-slate-950">AutoDealer</p><p className="hidden text-xs text-slate-500 sm:block">Inventory workspace</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user.name}</p><p className="text-xs capitalize text-slate-500">{user.role}</p></div>
            <button type="button" onClick={onSignOut} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 p-5 text-white shadow-lg sm:p-8 lg:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">Dealership overview</p>
          <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><h1 className="text-2xl font-bold sm:text-4xl">Vehicle inventory</h1><p className="mt-2 max-w-xl text-sm text-slate-300">Keep every listing up to date and ready for your next customer.</p></div>
            {canManage && <button type="button" disabled={saving} onClick={onAdd} className="w-full rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-amber-300 disabled:opacity-60 sm:w-auto">＋ Add vehicle</button>}
          </div>
        </section>

        <section aria-label="Inventory summary" className="mt-5 grid grid-cols-1 gap-3 sm:mt-7 sm:grid-cols-3 sm:gap-4">
          <SummaryCard label="Listed vehicles" value={String(vehicles.length)} />
          <SummaryCard label="Units in stock" value={String(unitsInStock)} />
          <SummaryCard label="Inventory value" value={money.format(inventoryValue)} />
        </section>

        <section className="mt-7 sm:mt-9">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-xl font-bold text-slate-950">Your vehicles</h2><p className="mt-1 text-sm text-slate-500">Browse, filter, and manage current listings.</p></div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{vehicles.length} listings</span>
          </div>
          <VehicleFilters filters={filters} busy={searching} onChange={onFiltersChange} onSearch={onSearch} />

          {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

          {loading ? (
            <LoadingPanel message="Loading your inventory…" />
          ) : searching ? (
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500" role="status"><Spinner />Updating results…</div>
          ) : null}

          {!loading && vehicles.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {vehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  canManage={canManage}
                  deleting={deletingVehicleId === vehicle.id}
                  purchasing={purchasingVehicleId === vehicle.id}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPurchase={onPurchase}
                />
              ))}
            </div>
          )}

          {!loading && !searching && vehicles.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center sm:px-6 sm:py-14">
              <p className="text-lg font-semibold text-slate-800">No vehicles found</p>
              <p className="mt-1 text-sm text-slate-500">Try changing your filters or add a vehicle to the inventory.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 break-words text-2xl font-bold sm:text-3xl">{value}</p></div>;
}

function LoadingPanel({ message }: { message: string }) {
  return <div className="grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-white" role="status"><div className="flex items-center gap-3 text-sm font-medium text-slate-600"><Spinner />{message}</div></div>;
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />;
}
