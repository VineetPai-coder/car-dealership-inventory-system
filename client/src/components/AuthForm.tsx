import { useState, type FormEvent } from 'react';
import { authInputClass, fieldLabelClass } from './formStyles.js';

export type AuthMode = 'login' | 'register';

interface AuthFormProps {
  mode: AuthMode;
  busy: boolean;
  error: string;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (values: { name: string; email: string; password: string }) => Promise<void>;
}

export function AuthForm({ mode, busy, error, onModeChange, onSubmit }: AuthFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const registering = mode === 'register';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ name, email, password });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-900 sm:py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-blue-950/30 sm:p-10">
        <div className="mb-7 flex items-center gap-3 sm:mb-8">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-700 text-2xl text-white" aria-hidden="true">🚘</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">AutoDealer</p>
            <p className="text-sm text-slate-500">Inventory, in one place</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {registering ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {registering ? 'Join your dealership workspace.' : 'Sign in to manage your dealership inventory.'}
        </p>

        <form className="mt-7 space-y-4 sm:mt-8 sm:space-y-5" onSubmit={submit}>
          {registering && (
            <label className={fieldLabelClass}>
              Full name
              <input autoComplete="name" className={authInputClass} value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
            </label>
          )}
          <label className={fieldLabelClass}>
            Email
            <input type="email" autoComplete="email" className={authInputClass} value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className={fieldLabelClass}>
            Password
            <input type="password" autoComplete={registering ? 'new-password' : 'current-password'} className={authInputClass} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={registering ? 8 : undefined} />
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button className="w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-60" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : registering ? 'Register' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 sm:mt-7">
          {registering ? 'Already have an account?' : 'New to AutoDealer?'}{' '}
          <button className="font-semibold text-blue-700 hover:text-blue-900" type="button" onClick={() => onModeChange(registering ? 'login' : 'register')}>
            {registering ? 'Sign in' : 'Create account'}
          </button>
        </p>
      </section>
    </main>
  );
}

