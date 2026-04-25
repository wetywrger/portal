export default function DepartmentList({ departments, selected, onSelect }) {
  if (departments.length === 0) return <p className="text-slate-400 text-sm">Загрузка...</p>;
  
  return (
    <ul className="space-y-1">
      <li>
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${!selected ? 'bg-brand-100 text-brand-800 font-medium' : 'hover:bg-brand-50 text-slate-600'}`}
        >
          Все подразделения
        </button>
      </li>
      {departments.map(dept => (
        <li key={dept}>
          <button
            onClick={() => onSelect(dept)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selected === dept ? 'bg-warm-100 text-warm-800 font-medium' : 'hover:bg-warm-50 text-slate-600'}`}
          >
            {dept}
          </button>
        </li>
      ))}
    </ul>
  );
}
