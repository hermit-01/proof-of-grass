import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Welcome() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = mode === 'signup' ? form : { email: form.email, password: form.password };
      const { user } = await api(`/api/auth/${mode}`, { method: 'POST', body });
      setUser(user);
      navigate(mode === 'signup' ? '/setup' : '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="welcome">
      <h1>Proof of Grass</h1>
      <p className="lede">
        Promise yourself a walk. Prove it with a photo of a tree, the sky or a bird. An open AI model checks it on
        your phone, and the photo never leaves it.
      </p>
      <form onSubmit={submit} className="card stack">
        <h2>{mode === 'signup' ? 'Make an account' : 'Log in'}</h2>
        {mode === 'signup' && (
          <label>
            Name
            <input autoComplete="name" required maxLength={40} {...field('name')} />
          </label>
        )}
        <label>
          Email
          <input type="email" autoComplete="email" required {...field('email')} />
        </label>
        <label>
          Password
          <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} {...field('password')} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'One moment…' : mode === 'signup' ? 'Sign up' : 'Log in'}</button>
      </form>
      <button className="link" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}>
        {mode === 'signup' ? 'Already have an account? Log in' : 'New here? Make an account'}
      </button>
    </main>
  );
}
