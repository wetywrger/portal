import { useState } from 'react';

// Вспомогательная функция для форматирования даты (только день и месяц)
const formatDateShort = (dateString) => {
  if (!dateString) return '';
  
  // Пытаемся создать объект Date из строки YYYY-MM-DD
  const date = new Date(dateString);
  
  // Проверка на валидность даты
  if (isNaN(date.getTime())) return dateString; 
  
  const day = date.getDate();
  const monthIndex = date.getMonth();
  
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  
  return `${day} ${months[monthIndex]}`;
};

export default function EmployeeCard({ employee, onClose }) {
  const [showEnlarged, setShowEnlarged] = useState(false);

  const handleImageClick = () => {
    if (employee.photo_url) setShowEnlarged(true);
  };

  return (
    <>
      {/* Основная карточка сотрудника */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative animate-scale-in" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition">&times;</button>
          
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="relative group">
              <img 
                src={employee.photo_url || '/placeholder.jpg'} 
                alt="Фото" 
                onClick={handleImageClick}
                className={`w-32 h-32 rounded-2xl object-cover border-4 border-warm-100 bg-slate-50 shadow-sm transition-all ${employee.photo_url ? 'cursor-pointer hover:opacity-90 hover:scale-[1.02]' : ''}`} 
              />
              {employee.photo_url && (
                <div className="absolute inset-0 bg-black/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-brand-800">{employee.full_name}</h2>
              <p className="text-warm-600 font-medium text-lg">{employee.position}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {/* Убран статус "На месте/В отпуске" */}
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{employee.department}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoBlock label="Подразделение" value={employee.department} />
            <InfoBlock label="Рабочее место" value={employee.location} />
            <InfoBlock label="Эл. почта" value={employee.email} />
            <InfoBlock label="Рабочий телефон" value={employee.phone_work} />
            <InfoBlock label="Личный телефон" value={employee.phone_personal} />
            {/* Убран Часовой пояс */}
            
            {/* Измененное отображение даты рождения */}
            <InfoBlock label="Дата рождения" value={formatDateShort(employee.birth_date)} />
            
            {employee.deputy_id && <InfoBlock label="Заместитель" value={employee.deputy_name || `ID: ${employee.deputy_id}`} />}
          </div>
        </div>
      </div>

      {/* Лайтбокс для увеличенного фото */}
      {showEnlarged && employee.photo_url && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-fade-in" onClick={() => setShowEnlarged(false)}>
          <button onClick={() => setShowEnlarged(false)} className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition">&times;</button>
          <img 
            src={employee.photo_url} 
            alt="Увеличенное фото" 
            className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain cursor-default select-none" 
            onClick={e => e.stopPropagation()}
          />
          <p className="absolute bottom-6 text-white/60 text-sm">Кликните на фон или нажмите ✕ чтобы закрыть</p>
        </div>
      )}
    </>
  );
}

const InfoBlock = ({ label, value }) => (
  <div className="bg-brand-50/50 p-3 rounded-lg border border-brand-100">
    <div className="text-brand-500 text-xs uppercase tracking-wider mb-1">{label}</div>
    <div className="text-slate-800 font-medium text-sm">{value}</div>
  </div>
);
