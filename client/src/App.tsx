import { useEffect, useState } from 'react';
import { AuthForm, type AuthMode } from './components/AuthForm.js';
import { InventoryDashboard } from './components/InventoryDashboard.js';
import { VehicleEditor } from './components/VehicleEditor.js';
import {
  authApi,
  TOKEN_STORAGE_KEY,
  vehicleApi,
  type AuthUser,
  type Vehicle,
  type VehiclePayload,
  type VehicleSearchFilters,
} from './services/api.js';

const EMPTY_FILTERS: VehicleSearchFilters = { q: '', make: '', model: '', category: '', minPrice: '', maxPrice: '' };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filters, setFilters] = useState<VehicleSearchFilters>(EMPTY_FILTERS);
  const [editorVehicle, setEditorVehicle] = useState<Vehicle | null | 'new'>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(Boolean(token));
  const [searching, setSearching] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [deletingVehicleId, setDeletingVehicleId] = useState<number | null>(null);
  const [authError, setAuthError] = useState('');
  const [dashboardError, setDashboardError] = useState('');
  const [editorError, setEditorError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!token) {
      setInventoryLoading(false);
      setUser(null);
      setVehicles([]);
      return;
    }

    let active = true;
    setInventoryLoading(true);

    void (async () => {
      try {
        const profile = await authApi.currentUser();
        if (!active) return;
        setUser(profile.user);
        setAuthError('');

        try {
          const inventory = await vehicleApi.list();
          if (active) setVehicles(inventory);
        } catch (error) {
          if (active) setDashboardError(errorMessage(error, 'Could not load vehicle inventory.'));
        }
      } catch (error) {
        if (active) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
          setUser(null);
          setAuthError(errorMessage(error, 'Your session has expired. Please sign in again.'));
        }
      } finally {
        if (active) setInventoryLoading(false);
      }
    })();

    return () => { active = false; };
  }, [token]);

  async function submitAuth(values: { name: string; email: string; password: string }): Promise<void> {
    setAuthBusy(true);
    setAuthError('');
    try {
      const result = authMode === 'register'
        ? await authApi.register(values.name, values.email, values.password)
        : await authApi.login(values.email, values.password);
      localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
      setUser(result.user);
      setToken(result.token);
    } catch (error) {
      setAuthError(errorMessage(error, 'Unable to sign in. Please try again.'));
    } finally {
      setAuthBusy(false);
    }
  }

  async function searchVehicles(searchFilters: VehicleSearchFilters): Promise<void> {
    setSearching(true);
    setDashboardError('');
    setNotice('');
    try {
      const hasFilters = Object.values(searchFilters).some((value) => Boolean(value?.trim()));
      const results = hasFilters ? await vehicleApi.search(searchFilters) : await vehicleApi.list();
      setVehicles(results);
    } catch (error) {
      setDashboardError(errorMessage(error, 'Search failed. Please try again.'));
    } finally {
      setSearching(false);
    }
  }

  async function saveVehicle(payload: VehiclePayload): Promise<void> {
    const isNew = editorVehicle === 'new';
    if (!editorVehicle) return;

    setSavingVehicle(true);
    setEditorError('');
    setNotice('');
    try {
      const saved = editorVehicle === 'new'
        ? await vehicleApi.create(payload)
        : await vehicleApi.update(editorVehicle.id, payload);
      setVehicles((current) => isNew
        ? [saved, ...current]
        : current.map((vehicle) => vehicle.id === saved.id ? saved : vehicle));
      setEditorVehicle(null);
      setNotice(isNew ? 'Vehicle added to inventory.' : 'Vehicle details updated.');
    } catch (error) {
      setEditorError(errorMessage(error, 'Unable to save this vehicle. Please try again.'));
    } finally {
      setSavingVehicle(false);
    }
  }

  async function removeVehicle(vehicle: Vehicle): Promise<void> {
    if (!window.confirm(`Delete ${vehicle.make} ${vehicle.model} from inventory?`)) return;

    setDeletingVehicleId(vehicle.id);
    setDashboardError('');
    setNotice('');
    try {
      await vehicleApi.delete(vehicle.id);
      setVehicles((current) => current.filter((item) => item.id !== vehicle.id));
      setNotice('Vehicle removed from inventory.');
    } catch (error) {
      setDashboardError(errorMessage(error, 'Unable to delete this vehicle. Please try again.'));
    } finally {
      setDeletingVehicleId(null);
    }
  }

  function signOut() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setVehicles([]);
    setFilters(EMPTY_FILTERS);
    setDashboardError('');
    setNotice('');
  }

  if (!token) {
    return <AuthForm mode={authMode} busy={authBusy} error={authError} onModeChange={setAuthMode} onSubmit={submitAuth} />;
  }

  if (!user && inventoryLoading) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-600"><p role="status">Checking your session…</p></main>;
  }

  if (!user) return <AuthForm mode={authMode} busy={authBusy} error={authError} onModeChange={setAuthMode} onSubmit={submitAuth} />;

  const canManage = user.role === 'admin';
  const editingVehicle = editorVehicle && editorVehicle !== 'new' ? editorVehicle : null;

  return (
    <>
      <InventoryDashboard
        user={user}
        vehicles={vehicles}
        filters={filters}
        loading={inventoryLoading}
        searching={searching}
        saving={savingVehicle}
        deletingVehicleId={deletingVehicleId}
        error={dashboardError}
        notice={notice}
        onSignOut={signOut}
        onFiltersChange={setFilters}
        onSearch={searchVehicles}
        onAdd={() => { setEditorError(''); setEditorVehicle('new'); }}
        onEdit={(vehicle) => { setEditorError(''); setEditorVehicle(vehicle); }}
        onDelete={(vehicle) => void removeVehicle(vehicle)}
      />
      {editorVehicle !== null && canManage && (
        <VehicleEditor
          vehicle={editingVehicle}
          dealerId={user.id}
          busy={savingVehicle}
          error={editorError}
          onCancel={() => { setEditorVehicle(null); setEditorError(''); }}
          onSave={saveVehicle}
        />
      )}
    </>
  );
}
