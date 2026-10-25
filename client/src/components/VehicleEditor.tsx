import { useState, type FormEvent } from 'react';
import type { Vehicle, VehiclePayload } from '../services/api.js';
import { fieldLabelClass, textInputClass } from './formStyles.js';

interface VehicleEditorProps {
  vehicle: Vehicle | null;
  dealerId: number;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSave: (payload: VehiclePayload) => Promise<void>;
}

type VehicleFormValues = {
  make: string;
  model: string;
  year: string;
  category: string;
  color: string;
  price: string;
  quantity: string;
  description: string;
  dealerId?: number | null;
};

function emptyVehicleForm(): VehicleFormValues {
  return { make: '', model: '', year: '', category: '', color: 'White', price: '', quantity: '', description: '' };
}

function vehicleToForm(vehicle: Vehicle): VehicleFormValues {
  return {
    make: vehicle.make,
    model: vehicle.model,
    year: String(vehicle.year),
    category: vehicle.category,
    color: vehicle.color,
    price: String(vehicle.price),
    quantity: String(vehicle.quantity),
    description: vehicle.description,
    dealerId: vehicle.dealerId,
  };
}

function formToVehicle(values: VehicleFormValues, defaultDealerId: number): VehiclePayload {
  return {
    make: values.make.trim(),
    model: values.model.trim(),
    year: Number(values.year),
    category: values.category.trim(),
    color: values.color.trim() || 'White',
    price: Number(values.price),
    quantity: Number(values.quantity),
    description: values.description.trim(),
    dealerId: values.dealerId ?? defaultDealerId,
  };
}

export function VehicleEditor({ vehicle, dealerId, busy, error, onCancel, onSave }: VehicleEditorProps) {
  const [values, setValues] = useState<VehicleFormValues>(() => vehicle ? vehicleToForm(vehicle) : emptyVehicleForm());
  const updateField = (field: keyof VehicleFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(formToVehicle(values, dealerId));
  }

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 sm:items-center sm:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="vehicle-form-title" className="my-2 max-h-[calc(100vh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:my-auto sm:max-h-[calc(100vh-3rem)] sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Inventory</p>
            <h2 id="vehicle-form-title" className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">{vehicle ? 'Edit vehicle' : 'Add a vehicle'}</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close vehicle form" className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100">✕</button>
        </div>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <label className={fieldLabelClass}>Make<input className={textInputClass} value={values.make} onChange={(event) => updateField('make', event.target.value)} required /></label>
          <label className={fieldLabelClass}>Model<input className={textInputClass} value={values.model} onChange={(event) => updateField('model', event.target.value)} required /></label>
          <label className={fieldLabelClass}>Year<input className={textInputClass} type="number" min="1886" value={values.year} onChange={(event) => updateField('year', event.target.value)} required /></label>
          <label className={fieldLabelClass}>Category<input className={textInputClass} value={values.category} onChange={(event) => updateField('category', event.target.value)} required /></label>
          <label className={fieldLabelClass}>Price<input className={textInputClass} type="number" min="0" step="0.01" value={values.price} onChange={(event) => updateField('price', event.target.value)} required /></label>
          <label className={fieldLabelClass}>Quantity<input className={textInputClass} type="number" min="0" step="1" value={values.quantity} onChange={(event) => updateField('quantity', event.target.value)} required /></label>
          <label className={fieldLabelClass}>Color<input className={textInputClass} value={values.color} onChange={(event) => updateField('color', event.target.value)} /></label>
          <label className={`${fieldLabelClass} sm:col-span-2`}>Description<textarea className={textInputClass} rows={3} value={values.description} onChange={(event) => updateField('description', event.target.value)} /></label>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 sm:col-span-2">{error}</p>}
          <div className="mt-2 flex flex-col-reverse justify-end gap-2 sm:col-span-2 sm:flex-row sm:gap-3">
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{busy ? 'Saving…' : vehicle ? 'Save changes' : 'Save vehicle'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

