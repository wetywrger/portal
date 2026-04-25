import { useState } from 'react';
import { adminApi } from '../api';

export default function AdminLogin({ onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const data = await adminApi().login(user, pass);
      localStorage.setItem('admin_token', data.access_token);
      onLogin(data.access_token);
    } catch { setErr('Неверный логин или пароль'); }
  };

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm border border-brand-100">
        <h2 className="text-2xl font-bold text-brand-700 mb-6 text-center">🔐 Вход в админ-панель</h2>
        <input className="w-full mb-3 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400" placeholder="Логин" value={user} onChange={e => setUser(e.target.value)} />
        <input className="w-full mb-4 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400" type="password" placeholder="Пароль" value={pass} onChange={e => setPass(e.target.value)} />
        <button className="w-full bg-warm-500 hover:bg-warm-600 text-white font-semibold py-2 rounded-lg transition" type="submit">Войти</button>
        {err && <p className="text-red-500 text-sm mt-3 text-center">{err}</p>}
      </form>
    </div>
  );
}
