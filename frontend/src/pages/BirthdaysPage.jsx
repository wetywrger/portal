import { useState, useEffect } from 'react';
import EmployeeCard from '../components/EmployeeCard';

export default function BirthdaysPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmp, setSelectedEmp] = useState(null);

  useEffect(() => {
    fetch('/api/birthdays')
      .then(async res => {
        if (!res.ok) throw new Error(`Сервер вернул ${res.status}`);
        return res.json();
      })
      .then(data => {
        setEmployees(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const getBadge = (days) => {
    if (days === 0) return { text: '🎉 Сегодня!', bg: 'bg-green-100 text-green-700' };
    if (days > 0 && days <= 5) return { text: `Через ${days} дн.`, bg: 'bg-brand-100 text-brand-700' };
    return { text: `Было ${Math.abs(days)} дн. назад`, bg: 'bg-slate-100 text-slate-600' };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Загрузка...</div>;
  if (error) return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-2">⚠️ Ошибка загрузки</h1>
      <p className="text-slate-500 mb-4">{error}</p>
      <a href="/" className="text-sm text-brand-600 hover:underline">← На главную</a>
    </div>
  );
  if (employees.length === 0) return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold text-brand-700 mb-2">🎂 Именинники недели</h1>
      <p className="text-slate-500">В ближайшие 5 дней именинников не найдено.</p>
      <a href="/" className="mt-6 text-sm text-brand-600 hover:underline">← На главную</a>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-brand-700">🎂 Именинники недели</h1>
          <a href="/" className="text-sm text-slate-500 hover:text-brand-600">← На главную</a>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden">
          {employees.map(emp => {
            const badge = getBadge(emp.days_until_birthday);
            return (
              <div key={emp.id} onClick={() => setSelectedEmp(emp)} className="flex items-center gap-4 p-4 border-b border-slate-100 last:border-b-0 hover:bg-brand-50 cursor-pointer transition">
                {emp.photo_url ? (
                  <img src={emp.photo_url} className="w-14 h-14 rounded-full object-cover border-2 border-warm-100 bg-slate-50 flex-shrink-0" alt="" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-200 flex-shrink-0"></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-slate-800 truncate">{emp.full_name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${badge.bg}`}>{badge.text}</span>
                  </div>
                  <p className="text-sm text-slate-500 truncate">{emp.position}</p>
                  <p className="text-xs text-brand-600">{emp.department}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedEmp && <EmployeeCard employee={selectedEmp} onClose={() => setSelectedEmp(null)} />}
    </div>
  );
}
