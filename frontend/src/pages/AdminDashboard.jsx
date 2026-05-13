import { useState, useEffect } from 'react';

const INITIAL_EMP = { 
  full_name: '', position: '', department: '', email: '', phone_personal: '', 
  phone_work: '', birth_date: '', location: '', deputy_id: null, photo_url: '' 
};

export default function AdminDashboard({ token, onLogout }) {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [editEmp, setEditEmp] = useState(null);
  const [form, setForm] = useState(INITIAL_EMP);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [importStatus, setImportStatus] = useState(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const empRes = await fetch('/api/admin/employees', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!empRes.ok) { alert('Ошибка загрузки сотрудников'); setEmployees([]); setFilteredEmployees([]); return; }
      const data = await empRes.json();
      setEmployees(data);
      setFilteredEmployees(data);

      const deptRes = await fetch('/api/departments');
      if (deptRes.ok) setDepartments(await deptRes.json());
    } catch (e) { console.error(e); alert('Ошибка сети'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [token]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredEmployees(employees);
    } else {
      const s = search.toLowerCase();
      const filtered = employees.filter(emp => 
        emp.full_name.toLowerCase().includes(s) ||
        emp.position.toLowerCase().includes(s) ||
        emp.department.toLowerCase().includes(s) ||
        emp.email.toLowerCase().includes(s)
      );
      setFilteredEmployees(filtered);
    }
  }, [search, employees]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editEmp ? 'PUT' : 'POST';
    const url = editEmp ? `/api/admin/employees/${editEmp.id}` : '/api/admin/employees';
    try {
      const res = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) {
        let errMsg = `Ошибка HTTP ${res.status}`;
        const rawText = await res.text();
        try {
          const errData = JSON.parse(rawText);
          errMsg = errData.detail?.[0]?.msg || errData.detail || errMsg;
        } catch {
          errMsg = rawText.slice(0, 150) || errMsg;
        }
        throw new Error(errMsg);
      }
      setEditEmp(null); setForm(INITIAL_EMP); setUploading(false);
      setSearch('');
      fetchData();
    } catch (e) { alert(`Не удалось сохранить: ${e.message}`); }
  };

  const handleDelete = async (id) => { 
    if(!confirm('Удалить сотрудника?')) return;
    try { 
      const res = await fetch(`/api/admin/employees/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Ошибка удаления');
      fetchData(); 
    } catch (e) { alert(e.message); }
  };

  const handleDeleteDept = async (name) => { 
    if(!confirm(`Удалить подразделение "${name}"?`)) return;
    try { 
      const res = await fetch(`/api/admin/departments/${encodeURIComponent(name)}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) {
        const txt = await res.text();
        alert(txt || 'Ошибка');
      } else { fetchData(); }
    } catch (e) { alert(e.message || 'Ошибка сети'); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload-photo', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setForm(prev => ({ ...prev, photo_url: data.url }));
    } catch (err) { alert('Не удалось загрузить фото'); }
    finally { setUploading(false); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.xlsx')) {
      alert('Пожалуйста, выберите файл формата .xlsx');
      e.target.value = '';
      return;
    }

    setImportStatus('Загрузка и обработка...');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/import-employees', { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${token}` }, 
        body: formData 
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Ошибка HTTP ${res.status}`);
      }
      
      const result = await res.json();
      
      let msgParts = [];
      if (result.created_count > 0) {
        msgParts.push(`Добавлены сотрудники (${result.created_count}):\n• ${result.created_names.join('\n• ')}`);
      }
      if (result.updated_count > 0) {
        msgParts.push(`Обновлена информация по сотрудникам (${result.updated_count}):\n• ${result.updated_names.join('\n• ')}`);
      }
      if (result.errors.length > 0) {
        msgParts.push(`Ошибок: ${result.errors.length}. См. консоль.`);
        console.warn('Ошибки импорта:', result.errors);
      }

      setImportStatus(msgParts.length > 0 ? msgParts.join('\n\n') : 'Изменений не обнаружено.');
      fetchData(); 
    } catch (err) {
      setImportStatus('Ошибка импорта');
      alert(`Не удалось загрузить файл:\n${err.message}`);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Загрузка данных...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-brand-700">⚙️ Административная панель</h1>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <input type="text" placeholder="Поиск сотрудника..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2 pl-10 rounded-lg border border-brand-200 bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all" />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <a href="/" aria-label="На главную" className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 hover:border-brand-300 text-slate-700 transition-all shadow-sm flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </a>
            <button onClick={onLogout} className="text-sm text-slate-500 hover:text-red-500 font-medium whitespace-nowrap px-2">Выйти</button>
          </div>
        </div>

        <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-700">Импорт сотрудников из Excel</h3>
            <p className="text-xs text-slate-500 mt-1">Файл .xlsx. Данные с 3-й строки. Заголовки во 2-й.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Выбрать файл
              <input type="file" accept=".xlsx" onChange={handleImport} className="hidden" />
            </label>
            {importStatus && <span className={`text-sm whitespace-pre-line ${importStatus.includes('Ошибка') ? 'text-red-500' : 'text-green-600'}`}>{importStatus}</span>}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold mb-4 text-brand-600">Сотрудники {search && <span className="text-slate-400 font-normal text-base">(найдено: {filteredEmployees.length})</span>}</h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {filteredEmployees.map(e => (
                <div key={e.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-brand-200 transition">
                  <div className="flex items-center gap-3">
                    {e.photo_url ? (
                      <img src={e.photo_url} className="w-10 h-10 rounded-full object-cover border border-warm-100 bg-slate-50" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200"></div>
                    )}
                    <div>
                      <span className="font-medium text-slate-800">{e.full_name}</span>
                      <span className="text-slate-400 text-sm ml-2">| {e.department}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditEmp(e); setForm({...INITIAL_EMP, ...e}); }} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition">Изм.</button>
                    <button onClick={() => handleDelete(e.id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition">Удал.</button>
                  </div>
                </div>
              ))}
              {filteredEmployees.length === 0 && <p className="text-slate-400 text-sm text-center py-4">{search ? 'Сотрудники не найдены по вашему запросу' : 'Сотрудники не найдены'}</p>}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold mb-4 text-warm-600">{editEmp ? 'Редактирование' : 'Добавить сотрудника'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="block font-medium text-slate-700 mb-2">Фотография</label>
                <div className="flex items-center gap-3">
                  {form.photo_url ? (
                    <>
                      <img src={form.photo_url} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-slate-200 bg-white" />
                      <button type="button" onClick={() => setForm(prev => ({ ...prev, photo_url: '' }))} className="text-xs text-red-500 hover:underline whitespace-nowrap">Удалить фото</button>
                    </>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-slate-200 bg-white flex items-center justify-center flex-shrink-0">
                      <span className="text-slate-300 text-xs">Нет фото</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-brand-100 file:text-brand-700 hover:file:bg-brand-200 cursor-pointer" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-medium text-slate-600">ФИО</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none" placeholder="Фамилия Имя Отчество" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="block font-medium text-slate-600">Должность</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none" placeholder="Например: Менеджер" value={form.position} onChange={e => setForm({...form, position: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="block font-medium text-slate-600">Подразделение</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none" placeholder="Например: Продажи" value={form.department} onChange={e => setForm({...form, department: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block font-medium text-slate-600">Эл. почта</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none" placeholder="email@corp.ru" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="block font-medium text-slate-600">Рабочее место</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none" placeholder="Город / Офис" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block font-medium text-slate-600">Личный телефон</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none" placeholder="+7..." value={form.phone_personal} onChange={e => setForm({...form, phone_personal: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="block font-medium text-slate-600">Рабочий телефон</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none" placeholder="+7..." value={form.phone_work} onChange={e => setForm({...form, phone_work: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block font-medium text-slate-600">Дата рождения</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none" type="date" value={form.birth_date} onChange={e => setForm({...form, birth_date: e.target.value})} />
              </div>
              
              <button disabled={uploading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white py-2 rounded-lg font-medium mt-2 transition" type="submit">
                {uploading ? 'Загрузка...' : (editEmp ? 'Сохранить изменения' : 'Добавить сотрудника')}
              </button>
              {editEmp && <button type="button" onClick={() => { setEditEmp(null); setForm(INITIAL_EMP); setUploading(false); }} className="w-full mt-2 text-slate-500 text-sm hover:underline py-1">Отмена</button>}
            </form>
          </div>
        </div>

        <div className="mt-6 bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-4 text-brand-600">Управление подразделениями</h2>
          <div className="flex flex-wrap gap-2">
            {departments.map(d => (
              <div key={d} className="flex items-center bg-warm-50 border border-warm-100 rounded-lg px-3 py-1.5">
                <span className="text-sm font-medium text-warm-800 mr-2">{d}</span>
                <button onClick={() => handleDeleteDept(d)} className="text-red-500 hover:text-red-700 text-xs font-bold px-1 rounded hover:bg-red-50">✕</button>
              </div>
            ))}
            {departments.length === 0 && <span className="text-slate-400 text-sm">Подразделения формируются автоматически при добавлении сотрудников</span>}
          </div>
          <p className="text-xs text-slate-400 mt-3">💡 Подразделения создаются автоматически. Удалить можно только пустые подразделения.</p>
        </div>
      </div>
    </div>
  );
}
