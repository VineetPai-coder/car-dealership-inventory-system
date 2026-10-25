import type { FormEvent } from 'react';
import type { VehicleSearchFilters } from '../services/api.js';
import { filterLabelClass, textInputClass } from './formStyles.js';

interface VehicleFiltersProps {
  filters: VehicleSearchFilters;
  busy: boolean;
  onChange: (filters: VehicleSearchFilters) => void;
  onSearch: (filters: VehicleSearchFilters) => Promise<void>;
}

export function VehicleFilters({ filters, busy, onChange, onSearch }: VehicleFiltersProps) {
  function update(field: keyof VehicleSearchFilters, value: string) {
    onChange({ ...filters, [field]: value });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSearch(filters);
  }

  return (
    <form onSubmit={submit} className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      <label className={`${filterLabelClass} sm:col-span-2`}>Search vehicles
        <input aria-label="Search vehicles" className={textInputClass} placeholder="Make, model, or keyword" value={filters.q ?? ''} onChange={(event) => update('q', event.target.value)} />
      </label>
      <label className={filterLabelClass}>Make
        <input className={textInputClass} value={filters.make ?? ''} onChange={(event) => update('make', event.target.value)} />
      </label>
      <label className={filterLabelClass}>Model
        <input className={textInputClass} value={filters.model ?? ''} onChange={(event) => update('model', event.target.value)} />
      </label>
      <label className={filterLabelClass}>Category
        <input className={textInputClass} value={filters.category ?? ''} onChange={(event) => update('category', event.target.value)} />
      </label>
      <label className={filterLabelClass}>Minimum price
        <input aria-label="Minimum price" type="number" min="0" className={textInputClass} value={filters.minPrice ?? ''} onChange={(event) => update('minPrice', event.target.value)} />
      </label>
      <label className={filterLabelClass}>Maximum price
        <input aria-label="Maximum price" type="number" min="0" className={textInputClass} value={filters.maxPrice ?? ''} onChange={(event) => update('maxPrice', event.target.value)} />
      </label>
      <div className="flex gap-2 sm:col-span-2 xl:col-span-4 xl:justify-end 2xl:col-span-7">
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-60 sm:w-auto">
          {busy ? 'Searching…' : 'Apply filters'}
        </button>
        <button type="button" disabled={busy} onClick={() => { const cleared = { q: '', make: '', model: '', category: '', minPrice: '', maxPrice: '' }; onChange(cleared); void onSearch(cleared); }} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Clear</button>
      </div>
    </form>
  );
}

