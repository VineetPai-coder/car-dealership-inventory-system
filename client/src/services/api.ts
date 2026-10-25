export const TOKEN_STORAGE_KEY = 'northstar-token';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  category: string;
  color: string;
  price: number;
  quantity: number;
  description: string;
  dealerId?: number | null;
  createdAt?: string;
}

export type VehiclePayload = Omit<Vehicle, 'id' | 'createdAt'>;

export interface VehicleSearchFilters {
  q?: string;
  make?: string;
  model?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
}

interface AuthResult {
  token: string;
  user: AuthUser;
}

interface AuthProfile {
  user: AuthUser;
}

/** Makes an authenticated JSON request to the local API. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`/api${path}`, { ...init, headers });
  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(body.error || 'The request could not be completed.');
  return body;
}

export const authApi = {
  login(email: string, password: string): Promise<AuthResult> {
    return request<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register(name: string, email: string, password: string): Promise<AuthResult> {
    return request<AuthResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  currentUser(): Promise<AuthProfile> {
    return request<AuthProfile>('/auth/me', { method: 'GET' });
  },
};

export const vehicleApi = {
  list(): Promise<Vehicle[]> {
    return request<Vehicle[]>('/vehicles', { method: 'GET' });
  },

  search(filters: VehicleSearchFilters): Promise<Vehicle[]> {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value?.trim()) query.set(key, value.trim());
    });
    return request<Vehicle[]>(`/vehicles/search?${query.toString()}`, { method: 'GET' });
  },

  create(vehicle: VehiclePayload): Promise<Vehicle> {
    return request<Vehicle>('/vehicles', { method: 'POST', body: JSON.stringify(vehicle) });
  },

  update(id: number, vehicle: VehiclePayload): Promise<Vehicle> {
    return request<Vehicle>(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(vehicle) });
  },

  delete(id: number): Promise<void> {
    return request<void>(`/vehicles/${id}`, { method: 'DELETE' });
  },
};
