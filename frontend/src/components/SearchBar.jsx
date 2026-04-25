export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative w-full md:w-80">
      <input
        type="text"
        placeholder="Поиск по имени, должности..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 pl-10 rounded-lg border border-brand-200 bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all"
      />
      <svg className="absolute left-3 top-2.5 w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );
}
