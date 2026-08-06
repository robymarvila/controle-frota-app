import React from 'react';
import { ChevronLeft, ChevronRight, Check, Lock, CheckCheck } from 'lucide-react';

const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function CalendarioGrid({ 
  currentDate, 
  setCurrentDate, 
  activities, 
  onDayClick,
  catConfig,
  viewMode = 'mes'
}) {
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const getStrDate = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const todayStr = getStrDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const navigateMonth = (dir) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + dir);
    setCurrentDate(newDate);
  };

  const isExpired = (dateStr, timeStr) => {
    const [y, m, d] = dateStr.split('-');
    const [h, min] = timeStr.split(':');
    const taskDate = new Date(y, m-1, d, h, min);
    const limitDate = new Date(taskDate.getTime() + 24 * 60 * 60 * 1000); 
    return new Date() > limitDate;
  };

  const calculateDayProgress = (dayTasks) => {
    if (dayTasks.length === 0) return { total: 0, completed: 0, pct: 0 };
    const comp = dayTasks.filter(t => t.status === 'EXECUTADO').length;
    return { total: dayTasks.length, completed: comp, pct: Math.round((comp / dayTasks.length) * 100) };
  };

  // Build grid data
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevTotalDays = new Date(currentYear, currentMonth, 0).getDate();
  
  const gridCells = [];

  // Previous month
  for(let i = firstDayIndex; i > 0; i--) {
    gridCells.push({
      type: 'other-month',
      dayNum: prevTotalDays - i + 1
    });
  }

  // Current month
  for(let d = 1; d <= totalDays; d++) {
    const dStr = getStrDate(currentYear, currentMonth, d);
    const dayTasks = activities.filter(a => a.data_programada === dStr);
    const progress = calculateDayProgress(dayTasks);
    
    const isPast = dStr < todayStr;
    const isIncomplete = progress.total > 0 && progress.pct < 100;
    
    let flagClass = '';
    if (progress.total > 0 && progress.pct === 100) {
        flagClass = 'ring-2 ring-emerald-400 ring-inset bg-emerald-50/30 border-transparent';
    } else if (isPast && isIncomplete) {
        flagClass = 'ring-2 ring-rose-400 ring-inset bg-rose-50/60 border-transparent';
    } else if (dStr === todayStr) {
        flagClass = 'ring-2 ring-blue-600 ring-inset bg-blue-50/30 border-transparent';
    } else {
        flagClass = 'border border-slate-200';
    }

    gridCells.push({
      type: 'current-month',
      dateStr: dStr,
      dayNum: d,
      flagClass,
      progress,
      tasks: dayTasks.sort((a,b) => a.horario_programado.localeCompare(b.horario_programado))
    });
  }

  // Next month
  const gridCount = firstDayIndex + totalDays;
  const nextDays = gridCount % 7 === 0 ? 0 : 7 - (gridCount % 7);
  for(let n = 1; n <= nextDays; n++) {
    gridCells.push({
      type: 'other-month',
      dayNum: n
    });
  }

  let finalCells = gridCells;
  if (viewMode === 'semana') {
      const todayIdx = gridCells.findIndex(c => c.dateStr === todayStr);
      let targetIdx = todayIdx;
      
      if (todayIdx === -1) {
          targetIdx = gridCells.findIndex(c => c.type === 'current-month');
      }
      
      const weekStartIdx = Math.floor(targetIdx / 7) * 7;
      finalCells = gridCells.slice(weekStartIdx, weekStartIdx + 7);
  }

  return (
    <div className="flex flex-col gap-6 flex-grow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
              <button onClick={() => navigateMonth(-1)} className="w-9 h-9 border border-slate-300 rounded-lg flex items-center justify-center hover:bg-slate-50 transition"><ChevronLeft size={16} className="text-slate-600" /></button>
              <h2 className="text-lg font-extrabold text-slate-800 min-w-[160px] text-center capitalize">{meses[currentMonth]} {currentYear}</h2>
              <button onClick={() => navigateMonth(1)} className="w-9 h-9 border border-slate-300 rounded-lg flex items-center justify-center hover:bg-slate-50 transition"><ChevronRight size={16} className="text-slate-600" /></button>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-100 border border-sky-300"></span> DDS</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span> Momento ENEL</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-100 border border-rose-300"></span> Parada de Segurança</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span> Repasse</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-50 ring-1 ring-rose-400"></span> Pendência Passada</span>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-grow flex flex-col">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-extrabold text-slate-500 uppercase tracking-wider py-3">
              <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
          </div>
          <div className={`grid grid-cols-7 flex-grow bg-slate-200 gap-[1px] ${viewMode === 'semana' ? 'min-h-[250px]' : ''}`}>
            {finalCells.map((cell, idx) => {
              if (cell.type === 'other-month') {
                return <div key={`other-${idx}`} className={`min-h-[120px] bg-slate-50/50 opacity-45 pointer-events-none p-2 ${viewMode === 'semana' ? 'min-h-[250px]' : ''}`}><div className="text-xs font-bold text-slate-400">{cell.dayNum}</div></div>;
              }

              const { dateStr, dayNum, flagClass, progress, tasks } = cell;
              const isToday = dateStr === todayStr;

              const tooltipPositionClass = (idx < 7) 
                  ? "top-[105%] mt-2" 
                  : "bottom-[105%] mb-2";
              
              const arrowPositionClass = (idx < 7)
                  ? "absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-t border-l border-slate-700"
                  : "absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-b border-r border-slate-700";

              return (
                <div 
                  key={dateStr} 
                  className={`min-h-[120px] bg-white transition-all duration-200 hover:bg-slate-50 hover:-translate-y-[1px] hover:z-10 hover:shadow-lg cursor-pointer flex flex-col justify-between p-2 relative group ${flagClass} ${viewMode === 'semana' ? 'min-h-[250px]' : ''}`}
                  onClick={() => onDayClick(dateStr)}
                >
                  <div className={`absolute ${tooltipPositionClass} left-1/2 -translate-x-1/2 w-max min-w-[200px] max-w-xs bg-slate-900 text-white text-xs rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-2xl hidden group-hover:block border border-slate-700`}>
                     <p className="font-extrabold mb-1.5 border-b border-slate-700 pb-1.5 flex justify-between">
                        <span>Resumo Diário</span>
                        <span className="text-slate-400">{dayNum} {meses[currentMonth].substring(0,3)}</span>
                     </p>
                     {tasks.length === 0 ? <p className="text-slate-400 font-medium">Nenhuma atividade programada.</p> : tasks.map((t, i) => (
                        <div key={i} className="flex justify-between items-center gap-4 mb-1.5 last:mb-0">
                            <span className="opacity-70 font-medium">{t.horario_programado.substring(0,5)}</span>
                            <span className="font-bold flex items-center gap-1.5 text-right">{t.tipo} <span className={`w-2 h-2 rounded-full ${t.status === 'EXECUTADO' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span></span>
                        </div>
                     ))}
                     <div className={arrowPositionClass}></div>
                  </div>
                  <div className="flex justify-between items-start">
                      <span className={`text-sm font-extrabold ${isToday ? 'text-blue-900 bg-white px-1.5 py-0.5 rounded-md shadow-sm border border-blue-200' : 'text-slate-700'}`}>{dayNum}</span>
                      {progress.total > 0 && progress.pct === 100 && <span className="text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded text-[10px]"><CheckCheck size={12} /></span>}
                  </div>
                  <div className="mt-2 flex-grow flex flex-col justify-end gap-0.5">
                    {tasks.slice(0, viewMode === 'semana' ? 8 : 3).map(t => {
                      const cfg = catConfig[t.tipo] || { badge: 'bg-slate-100 text-slate-600 border-slate-300' };
                      const expired = t.status !== 'EXECUTADO' && isExpired(dateStr, t.horario_programado);
                      const isCompleted = t.status === 'EXECUTADO';
                      
                      const styleClass = isCompleted 
                        ? cfg.badge 
                        : (expired ? 'bg-rose-50 text-rose-800 border-rose-400 border-l-2' : 'bg-slate-50 text-slate-600 border-slate-300 border-l-2');

                      return (
                        <div key={t.id} className={`text-[10px] font-bold px-1.5 py-0.5 rounded truncate flex justify-between items-center shadow-sm ${styleClass}`}>
                            <span className="truncate"><span className="opacity-60 mr-0.5">{t.horario_programado.substring(0,5)}</span>{t.tipo}</span>
                            {isCompleted ? <Check size={10} className="text-emerald-600 shrink-0 ml-1" /> : (expired ? <Lock size={10} className="text-rose-500 shrink-0 ml-1" /> : null)}
                        </div>
                      )
                    })}
                    {tasks.length > (viewMode === 'semana' ? 8 : 3) && <div className="text-[9px] text-slate-500 font-bold text-center mt-1">+ {tasks.length - (viewMode === 'semana' ? 8 : 3)} itens</div>}
                  </div>
                  
                  {/* Progress Bar */}
                  {progress.total > 0 && (
                      <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div className={`h-full transition-all duration-500 ${progress.pct === 100 ? 'bg-emerald-500' : (progress.pct > 0 ? 'bg-blue-500' : 'bg-slate-300')}`} style={{ width: `${progress.pct}%` }}></div>
                      </div>
                  )}

                </div>
              )
            })}
          </div>
      </div>
    </div>
  );
}
