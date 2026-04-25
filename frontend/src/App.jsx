import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SearchBar from './components/SearchBar';
import DepartmentList from './components/DepartmentList';
import EmployeeList from './components/EmployeeList';
import EmployeeCard from './components/EmployeeCard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { publicApi } from './api';

function PublicPortal() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.departments()
      .then(setDepartments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    publicApi.employees({ department: selectedDept || '', search })
      .then(data => { setEmployees(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedDept, search]);

  const openCard = (id) => publicApi.employee(id).then(setSelectedEmployee).catch(console.error);

  return (
    <div className="min-h-screen bg-brand-50 text-slate-800">
      <header className="bg-white shadow-sm border-b border-brand-100 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Логотип" className="w-40 h-10 object-contain" />
          <h1 className="text-2xl font-bold text-brand-700">Корпоративный справочник</h1>
        </div>
        <div className="flex gap-3">
          <SearchBar value={search} onChange={setSearch} />
          <a href="/admin" className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">🔐 Админ</a>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6 grid md:grid-cols-4 gap-6">
        <aside className="md:col-span-1 bg-white rounded-xl shadow-sm p-4 h-fit border border-warm-100">
          <h2 className="text-lg font-semibold mb-3 text-warm-600">🏢 Подразделения</h2>
          <DepartmentList departments={departments} selected={selectedDept} onSelect={(d) => setSelectedDept(d === selectedDept ? null : d)} />
        </aside>
        <section className="md:col-span-3">
          <EmployeeList employees={employees} loading={loading} onSelect={openCard} />
        </section>
      </main>
      {selectedEmployee && <EmployeeCard employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem('admin_token'); } catch { return null; }
  });

  const handleLogin = (t) => setToken(t);
  const handleLogout = () => { localStorage.removeItem('admin_token'); setToken(null); };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicPortal />} />
        <Route path="/admin" element={token ? <AdminDashboard token={token} onLogout={handleLogout} /> : <AdminLogin onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
