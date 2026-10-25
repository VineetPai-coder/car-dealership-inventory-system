import { useEffect, useState, type FormEvent } from 'react';
import {
  authApi,
  TOKEN_STORAGE_KEY,
  vehicleApi,
  type AuthUser,
  type Vehicle,
  type VehiclePayload,
} from './services/api.js';

type AuthMode = 'login' | 'register';
type VehicleFilters = { q: string; make: string; model: string; category: string; minPrice: string; maxPrice: string };
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

const EMPTY_FILTERS: VehicleFilters = { q: '', make: '', model: '', category: '', minPrice: '', maxPrice: '' };

function emptyVehicleForm(): VehicleFormValues {
  return {
    make: '',
    model: '',
    year: '',
    category: '',
    color: 'White',
    price: '',
    quantity: '',
    description: '',
  };
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

interface AuthFormProps {
  mode: AuthMode;
  busy: boolean;
  error: string;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (values: { name: string; email: string; password: string }) => Promise<void>;
}

function AuthForm({ mode, busy, error, onModeChange, onSubmit }: AuthFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ name, email, password });
  }

  const registering = mode === 'register';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl shadow-blue-950/30 sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-700 text-2xl text-white" aria-hidden="true">🚘</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">AutoDealer</p>
            <p className="text-sm text-slate-500">Inventory, in one place</p>
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          {registering ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {registering ? 'Join your dealership workspace.' : 'Sign in to manage your dealership inventory.'}
        </p>

        <form className="mt-8 space-y-5" onSubmit={submit}>
          {registering && (
            <label className="block text-sm font-semibold text-slate-700">
              Full name
              <input
                autoComplete="name"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
              />
            </label>
          )}
          <label className="block text-sm font-semibold text-slate-700">
            Email
            <input
              type="email"
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input
              type="password"
              autoComplete={registering ? 'new-password' : 'current-password'}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={registering ? 8 : undefined}
            />
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button
            className="w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Please wait…' : registering ? 'Register' : 'Sign in'}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-500">
          {registering ? 'Already have an account?' : 'New to AutoDealer?'}{' '}
          <button
            className="font-semibold text-blue-700 hover:text-blue-900"
            type="button"
            onClick={() => onModeChange(registering ? 'login' : 'register')}
          >
            {registering ? 'Sign in' : 'Create account'}
          </button>
        </p>
      </section>
    </main>
  );
}

interface VehicleEditorProps {
  vehicle: Vehicle | null;
  dealerId: number;
  busy: boolean;
  onCancel: () => void;
  onSave: (payload: VehiclePayload) => Promise<void>;
}

function VehicleEditor({ vehicle, dealerId, busy, onCancel, onSave }: VehicleEditorProps) {
  const [values, setValues] = useState<VehicleFormValues>(vehicle ? vehicleToForm(vehicle) : emptyVehicleForm());
  const updateField = (field: keyof VehicleFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(formToVehicle(values, dealerId));
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100';

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="vehicle-form-title" className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Inventory</p>
            <h2 id="vehicle-form-title" className="mt-1 text-2xl font-bold text-slate-950">{vehicle ? 'Edit vehicle' : 'Add a vehicle'}</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close vehicle form" className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100">✕</button>
        </div>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Make<input className={inputClass} value={values.make} onChange={(event) => updateField('make', event.target.value)} required /></label>
          <label className="text-sm font-semibold text-slate-700">Model<input className={inputClass} value={values.model} onChange={(event) => updateField('model', event.target.value)} required /></label>
          <label className="text-sm font-semibold text-slate-700">Year<input className={inputClass} type="number" min="1886" value={values.year} onChange={(event) => updateField('year', event.target.value)} required /></label>
          <label className="text-sm font-semibold text-slate-700">Category<input className={inputClass} value={values.category} onChange={(event) => updateField('category', event.target.value)} required /></label>
          <label className="text-sm font-semibold text-slate-700">Price<input className={inputClass} type="number" min="0" step="0.01" value={values.price} onChange={(event) => updateField('price', event.target.value)} required /></label>
          <label className="text-sm font-semibold text-slate-700">Quantity<input className={inputClass} type="number" min="0" step="1" value={values.quantity} onChange={(event) => updateField('quantity', event.target.value)} required /></label>
          <label className="text-sm font-semibold text-slate-700">Color<input className={inputClass} value={values.color} onChange={(event) => updateField('color', event.target.value)} /></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Description<textarea className={inputClass} rows={3} value={values.description} onChange={(event) => updateField('description', event.target.value)} /></label>
          <div className="mt-2 flex justify-end gap-3 sm:col-span-2">
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{busy ? 'Saving…' : vehicle ? 'Save changes' : 'Save vehicle'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

interface VehicleCardProps {
  vehicle: Vehicle;
  canManage: boolean;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
}

function VehicleCard({ vehicle, canManage, onEdit, onDelete }: VehicleCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex h-36 items-center justify-center bg-gradient-to-br from-slate-800 via-slate-700 to-blue-900 text-6xl" aria-hidden="true">🚘</div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{vehicle.year} · {vehicle.category}</p>
            <h3 className="mt-1 text-lg font-bold text-slate-950"><span>{vehicle.make}</span> <span>{vehicle.model}</span></h3>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${vehicle.quantity ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {vehicle.quantity ? `${vehicle.quantity} in stock` : 'Out of stock'}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-500">{vehicle.description || `${vehicle.color} ${vehicle.make} ${vehicle.model}`}</p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xl font-bold text-slate-950">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(vehicle.price)}</p>
          <span className="text-xs font-medium text-slate-500">{vehicle.color}</span>
        </div>
        {canManage && (
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => onEdit(vehicle)} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">Edit</button>
            <button type="button" onClick={() => onDelete(vehicle)} className="flex-1 rounded-lg border border-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Delete</button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filters, setFilters] = useState<VehicleFilters>(EMPTY_FILTERS);
  const [editorVehicle, setEditorVehicle] = useState<Vehicle | null | 'new'>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setUser(null);
      setVehicles([]);
      return;
    }

    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const profile = await authApi.currentUser();
        const inventory = await vehicleApi.list();
        if (active) {
          setUser(profile.user);
          setVehicles(inventory);
          setError('');
        }
      } catch (caught) {
        if (active) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
          setUser(null);
          setError(caught instanceof Error ? caught.message : 'Your session has expired. Please sign in again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [token]);

  async function submitAuth(values: { name: string; email: string; password: string }): Promise<void> {
    setBusy(true);
    setError('');
    try {
      const result = authMode === 'register'
        ? await authApi.register(values.name, values.email, values.password)
        : await authApi.login(values.email, values.password);
      localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
      setUser(result.user);
      setToken(result.token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value.trim() !== ''),
      ) as Partial<VehicleFilters>;
      const results = Object.keys(activeFilters).length
        ? await vehicleApi.search(activeFilters)
        : await vehicleApi.list();
      setVehicles(results);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Search failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function saveVehicle(payload: VehiclePayload): Promise<void> {
    setBusy(true);
    setError('');
    try {
      const saved = editorVehicle === 'new'
        ? await vehicleApi.create(payload)
        : await vehicleApi.update(editorVehicle!.id, payload);
      setVehicles((current) => editorVehicle === 'new'
        ? [saved, ...current]
        : current.map((vehicle) => vehicle.id === saved.id ? saved : vehicle));
      setEditorVehicle(null);
      setNotice(editorVehicle === 'new' ? 'Vehicle added to inventory.' : 'Vehicle details updated.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save this vehicle.');
    } finally {
      setBusy(false);
    }
  }

  async function removeVehicle(vehicle: Vehicle): Promise<void> {
    if (!window.confirm(`Delete ${vehicle.make} ${vehicle.model} from inventory?`)) return;
    setBusy(true);
    setError('');
    try {
      await vehicleApi.delete(vehicle.id);
      setVehicles((current) => current.filter((item) => item.id !== vehicle.id));
      setNotice('Vehicle removed from inventory.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete this vehicle.');
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setVehicles([]);
    setNotice('');
  }

  if (!token) {
    return <AuthForm mode={authMode} busy={busy} error={error} onModeChange={setAuthMode} onSubmit={submitAuth} />;
  }

  if (loading || !user) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-600"><p role="status">Loading your inventory…</p></main>;
  }

  const canManage = user.role === 'admin';
  const editingVehicle = editorVehicle && editorVehicle !== 'new' ? editorVehicle : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-xl text-white" aria-hidden="true">🚘</span>
            <div><p className="font-bold text-slate-950">AutoDealer</p><p className="text-xs text-slate-500">Inventory workspace</p></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user.name}</p><p className="text-xs capitalize text-slate-500">{user.role}</p></div>
            <button type="button" onClick={signOut} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 p-7 text-white shadow-lg sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">Dealership overview</p>
          <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><h1 className="text-3xl font-bold sm:text-4xl">Vehicle inventory</h1><p className="mt-2 max-w-xl text-sm text-slate-300">Keep every listing up to date and ready for your next customer.</p></div>
            {canManage && <button type="button" onClick={() => { setEditorVehicle('new'); setError(''); }} className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-amber-300">＋ Add vehicle</button>}
          </div>
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Listed vehicles</p><p className="mt-2 text-3xl font-bold">{vehicles.length}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Units in stock</p><p className="mt-2 text-3xl font-bold">{vehicles.reduce((total, vehicle) => total + vehicle.quantity, 0)}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Inventory value</p><p className="mt-2 text-3xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(vehicles.reduce((total, vehicle) => total + vehicle.price * vehicle.quantity, 0))}</p></div>
        </section>

        <section className="mt-9">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-xl font-bold text-slate-950">Your vehicles</h2><p className="mt-1 text-sm text-slate-500">Browse, filter, and manage current listings.</p></div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{vehicles.length} listings</span>
          </div>
          <form onSubmit={submitSearch} className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs font-semibold text-slate-600 lg:col-span-2">Search vehicles
              <input aria-label="Search vehicles" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="Make, model, or keyword" value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} />
            </label>
            <label className="text-xs font-semibold text-slate-600">Make
              <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={filters.make} onChange={(event) => setFilters((current) => ({ ...current, make: event.target.value }))} />
            </label>
            <label className="text-xs font-semibold text-slate-600">Category
              <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} />
            </label>
            <label className="text-xs font-semibold text-slate-600">Minimum price
              <input aria-label="Minimum price" type="number" min="0" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={filters.minPrice} onChange={(event) => setFilters((current) => ({ ...current, minPrice: event.target.value }))} />
            </label>
            <label className="text-xs font-semibold text-slate-600">Maximum price
              <input aria-label="Maximum price" type="number" min="0" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={filters.maxPrice} onChange={(event) => setFilters((current) => ({ ...current, maxPrice: event.target.value }))} />
            </label>
            <button type="submit" disabled={busy} className="self-end rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">Apply filters</button>
          </form>

          {(error || notice) && <p role={error ? 'alert' : 'status'} className={`mb-4 rounded-xl px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{error || notice}</p>}

          {vehicles.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {vehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} canManage={canManage} onEdit={setEditorVehicle} onDelete={(item) => void removeVehicle(item)} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><p className="text-lg font-semibold text-slate-800">No vehicles found</p><p className="mt-1 text-sm text-slate-500">Try changing your filters or add a vehicle to the inventory.</p></div>
          )}
        </section>
      </main>

      {editorVehicle !== null && canManage && (
        <VehicleEditor vehicle={editingVehicle} dealerId={user.id} busy={busy} onCancel={() => setEditorVehicle(null)} onSave={saveVehicle} />
      )}
    </div>
  );
}
