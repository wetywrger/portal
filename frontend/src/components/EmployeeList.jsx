export default function EmployeeList({ employees, loading, onSelect }) {
  if (loading) return <div className="p-4 text-center text-slate-500">Загрузка данных...</div>;
  if (employees.length === 0) return <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-500">Сотрудники не найдены</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Заголовки таблицы (десктоп) */}
      <div className="hidden md:grid grid-cols-10 gap-4 px-6 py-3 bg-brand-50/50 border-b border-brand-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <div className="col-span-5">Сотрудник</div>
        <div className="col-span-3">Должность</div>
        <div className="col-span-2">Подразделение</div>
      </div>

      {/* Список строк */}
      <div className="divide-y divide-slate-100">
        {employees.map(emp => (
          <div
            key={emp.id}
            onClick={() => onSelect(emp.id)}
            className="grid grid-cols-1 md:grid-cols-10 gap-2 md:gap-4 px-6 py-4 hover:bg-brand-50/70 cursor-pointer transition-colors items-center group"
          >
            {/* Фото и Имя */}
            <div className="col-span-12 md:col-span-5 flex items-center gap-4">
              {emp.photo_url ? (
                <img 
                  src={emp.photo_url} 
                  alt="" 
                  className="w-12 h-12 rounded-full object-cover border-2 border-warm-100 bg-slate-50 flex-shrink-0 group-hover:border-warm-300 transition" 
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-200 flex-shrink-0"></div>
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800 truncate group-hover:text-brand-700 transition">{emp.full_name}</h3>
                <p className="text-sm text-slate-500 md:hidden truncate">{emp.position} • {emp.department}</p>
              </div>
            </div>

            {/* Должность */}
            <div className="col-span-12 md:col-span-3 hidden md:block text-sm text-slate-600 truncate">{emp.position}</div>

            {/* Подразделение */}
            <div className="col-span-12 md:col-span-2 hidden md:block text-sm text-slate-500 truncate">{emp.department}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
