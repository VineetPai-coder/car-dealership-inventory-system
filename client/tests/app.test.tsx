/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.js';

const admin = { id: 7, name: 'Avery Admin', email: 'avery@example.com', role: 'admin' };
const vehicles = [
  {
    id: 1,
    make: 'Toyota',
    model: 'Camry',
    year: 2024,
    category: 'Sedan',
    color: 'Blue',
    price: 28000,
    quantity: 4,
    description: 'Reliable family sedan',
    dealerId: 7,
  },
];

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response;
}

const fetchMock = jest.fn<typeof fetch>();

function mockAdminDashboard(): void {
  localStorage.setItem('northstar-token', 'admin-token');
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ user: admin }))
    .mockResolvedValueOnce(jsonResponse(vehicles));
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

describe('authentication forms', () => {
  it('submits login credentials to the backend login endpoint', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: 'signed.jwt', user: admin }))
      .mockResolvedValueOnce(jsonResponse({ user: admin }))
      .mockResolvedValueOnce(jsonResponse([]));
    render(<App />);

    await user.type(screen.getByLabelText(/email/i), 'buyer@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret-pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'buyer@example.com', password: 'secret-pass' }),
        }),
      );
    });
    await waitFor(() => expect(localStorage.getItem('northstar-token')).toBe('signed.jwt'));
  });

  it('submits registration details to the backend register endpoint', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: 'registered.jwt', user: admin }, 201))
      .mockResolvedValueOnce(jsonResponse({ user: admin }))
      .mockResolvedValueOnce(jsonResponse([]));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /create account/i }));
    await user.type(screen.getByLabelText(/name/i), 'Casey Buyer');
    await user.type(screen.getByLabelText(/email/i), 'casey@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secure-pass-1');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Casey Buyer',
            email: 'casey@example.com',
            password: 'secure-pass-1',
          }),
        }),
      );
    });
    await waitFor(() => expect(localStorage.getItem('northstar-token')).toBe('registered.jwt'));
  });

  it('shows a backend error when sign in fails', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Email or password is incorrect.' }, 401));
    render(<App />);

    await user.type(screen.getByLabelText(/email/i), 'buyer@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect((await screen.findByRole('alert')).textContent).toContain('Email or password is incorrect.');
    expect(localStorage.getItem('northstar-token')).toBeNull();
  });
});

describe('protected vehicle inventory dashboard', () => {
  it('requires authentication before showing inventory', async () => {
    render(<App />);

    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalledWith('/api/vehicles', expect.anything());
  });

  it('loads vehicle listings and exposes inventory filters and admin actions', async () => {
    mockAdminDashboard();
    render(<App />);

    expect(await screen.findByText('Camry')).toBeTruthy();
    expect(screen.getByText('Toyota')).toBeTruthy();
    expect(screen.getByLabelText(/search vehicles/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /add vehicle/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /edit/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /delete/i })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vehicles',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }) }),
    );
  });

  it('shows a loading state while the protected inventory request is pending', async () => {
    localStorage.setItem('northstar-token', 'admin-token');
    let resolveInventory!: (response: Response) => void;
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ user: admin }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveInventory = resolve; }));
    render(<App />);

    expect(screen.getByRole('status').textContent).toMatch(/checking|loading/i);
    expect(await screen.findByText(/loading your inventory/i)).toBeTruthy();
    await act(async () => { resolveInventory(jsonResponse(vehicles)); });
    expect(await screen.findByText('Camry')).toBeTruthy();
  });

  it('submits search filters to the backend vehicle search endpoint', async () => {
    const user = userEvent.setup();
    mockAdminDashboard();
    fetchMock.mockResolvedValueOnce(jsonResponse(vehicles));
    render(<App />);

    await user.type(await screen.findByLabelText(/search vehicles/i), 'Toyota');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/vehicles/search'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(fetchMock.mock.calls[2][0]).toContain('Toyota');
    });
  });

  it('shows backend search errors without hiding the dashboard', async () => {
    const user = userEvent.setup();
    mockAdminDashboard();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Search is temporarily unavailable.' }, 500));
    render(<App />);

    await user.type(await screen.findByLabelText(/search vehicles/i), 'Toyota');
    await user.keyboard('{Enter}');

    expect((await screen.findByRole('alert')).textContent).toContain('Search is temporarily unavailable.');
    expect(screen.getByText('Vehicle inventory')).toBeTruthy();
  });

  it('submits a new vehicle form to the backend create endpoint', async () => {
    const user = userEvent.setup();
    mockAdminDashboard();
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...vehicles[0], id: 2, make: 'Honda', model: 'Civic' }, 201));
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /add vehicle/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^make$/i), 'Honda');
    await user.type(within(dialog).getByLabelText(/^model$/i), 'Civic');
    await user.type(within(dialog).getByLabelText(/^year$/i), '2025');
    await user.type(within(dialog).getByLabelText(/^category$/i), 'Sedan');
    await user.type(within(dialog).getByLabelText(/^price$/i), '26000');
    await user.type(within(dialog).getByLabelText(/^quantity$/i), '3');
    await user.click(screen.getByRole('button', { name: /save vehicle/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/vehicles',
        expect.objectContaining({ method: 'POST', body: expect.stringContaining('Honda') }),
      );
    });
  });

  it('shows vehicle save errors inside the open editor', async () => {
    const user = userEvent.setup();
    mockAdminDashboard();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Inventory write failed.' }, 500));
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /add vehicle/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^make$/i), 'Honda');
    await user.type(within(dialog).getByLabelText(/^model$/i), 'Civic');
    await user.type(within(dialog).getByLabelText(/^year$/i), '2025');
    await user.type(within(dialog).getByLabelText(/^category$/i), 'Sedan');
    await user.type(within(dialog).getByLabelText(/^price$/i), '26000');
    await user.type(within(dialog).getByLabelText(/^quantity$/i), '3');
    await user.click(within(dialog).getByRole('button', { name: /save vehicle/i }));

    expect((await within(dialog).findByRole('alert')).textContent).toContain('Inventory write failed.');
  });

  it('submits vehicle edits to the backend update endpoint', async () => {
    const user = userEvent.setup();
    mockAdminDashboard();
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...vehicles[0], price: 27000 }));
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /edit/i }));
    const dialog = screen.getByRole('dialog');
    await user.clear(within(dialog).getByLabelText(/^price$/i));
    await user.type(within(dialog).getByLabelText(/^price$/i), '27000');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/vehicles/1',
        expect.objectContaining({ method: 'PUT', body: expect.stringContaining('27000') }),
      );
    });
  });

  it('submits vehicle deletion to the backend delete endpoint', async () => {
    const user = userEvent.setup();
    mockAdminDashboard();
    fetchMock.mockResolvedValueOnce(jsonResponse(null, 204));
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/vehicles/1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
