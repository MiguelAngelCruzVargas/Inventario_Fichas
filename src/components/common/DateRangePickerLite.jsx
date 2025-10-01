import React, { useCallback, useEffect, useRef, useState } from 'react';

// Utilidades de fecha simples (sin libs externas)
const toISO = (d) => {
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
};
const parseISO = (s) => {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
};

const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const weekdayShort = ['D','L','M','X','J','V','S'];

export default function DateRangePickerLite({ valueDesde, valueHasta, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const [panelDate, setPanelDate] = useState(() => parseISO(valueDesde) || new Date());
  const [tempDesde, setTempDesde] = useState(valueDesde || '');
  const [tempHasta, setTempHasta] = useState(valueHasta || '');
  const wrapperRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  // Cerrar al hacer click afuera
  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) close(); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  // Sincronizar props externas
  useEffect(()=>{ setTempDesde(valueDesde || ''); },[valueDesde]);
  useEffect(()=>{ setTempHasta(valueHasta || ''); },[valueHasta]);

  const selectDay = (d) => {
    const iso = toISO(d);
    // Lógica selección de rango: si no hay desde -> asignar; si hay desde y no hay hasta y day >= desde -> asignar hasta; si day < desde -> reiniciar desde
    const currentDesde = tempDesde; const currentHasta = tempHasta;
    if (!currentDesde) {
      setTempDesde(iso); setTempHasta(''); onChange?.({ desde: iso, hasta: '' }); return;
    }
    if (currentDesde && !currentHasta) {
      if (iso < currentDesde) { // invertir
        setTempDesde(iso); setTempHasta(currentDesde); onChange?.({ desde: iso, hasta: currentDesde }); return;
      }
      if (iso === currentDesde) { // mismo día -> rango de un día
        setTempHasta(iso); onChange?.({ desde: currentDesde, hasta: iso }); return;
      }
      setTempHasta(iso); onChange?.({ desde: currentDesde, hasta: iso }); return;
    }
    // Si ya hay ambos -> iniciar nuevo rango
    setTempDesde(iso); setTempHasta(''); onChange?.({ desde: iso, hasta: '' });
  };

  const buildDays = () => {
    const y = panelDate.getFullYear();
    const m = panelDate.getMonth();
    const first = new Date(y, m, 1);
    const firstWeekday = first.getDay(); // 0 domingo
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const cells = [];
    // padding prev
    for (let i=0;i<firstWeekday;i++) cells.push(null);
    for (let d=1; d<=daysInMonth; d++) cells.push(new Date(y,m,d));
    return cells;
  };

  const cells = buildDays();
  const isInRange = (d) => {
    if (!d || !tempDesde || !tempHasta) return false;
    return toISO(d) >= tempDesde && toISO(d) <= tempHasta;
  };
  const isEdge = (d) => d && (toISO(d) === tempDesde || toISO(d) === tempHasta);

  const quick = (type) => {
    const today = new Date();
    if (type === 'today') {
      const iso = toISO(today);
      setTempDesde(iso); setTempHasta(iso); onChange?.({ desde: iso, hasta: iso });
    } else if (type === 'last7') {
      const d7 = new Date(); d7.setDate(d7.getDate()-6); // incluye hoy
      const iso1 = toISO(d7); const iso2 = toISO(today);
      setTempDesde(iso1); setTempHasta(iso2); onChange?.({ desde: iso1, hasta: iso2 });
      setPanelDate(d7);
    } else if (type === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(),1);
      const end = new Date(today.getFullYear(), today.getMonth()+1,0);
      const iso1 = toISO(start); const iso2 = toISO(end);
      setTempDesde(iso1); setTempHasta(iso2); onChange?.({ desde: iso1, hasta: iso2 });
      setPanelDate(start);
    } else if (type === 'clear') {
      setTempDesde(''); setTempHasta(''); onChange?.({ desde:'', hasta:'' });
    }
  };

  const nav = (delta) => {
    setPanelDate(p => new Date(p.getFullYear(), p.getMonth()+delta, 1));
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="flex items-end gap-2">
        <div className="flex flex-col">
          <label className="text-[11px] uppercase tracking-wide text-gray-500">Desde</label>
          <input
            type="text"
            value={tempDesde ? tempDesde.split('-').reverse().join('/') : ''}
            onChange={(e)=>{
              const raw = e.target.value.replace(/[^\d/]/g,'');
              const parts = raw.split('/');
              if (parts.length===3 && parts[0].length===2 && parts[1].length===2 && parts[2].length===4) {
                const iso = `${parts[2]}-${parts[1]}-${parts[0]}`;
                setTempDesde(iso); onChange?.({ desde: iso, hasta: tempHasta });
              } else if (!raw) { setTempDesde(''); onChange?.({ desde:'', hasta: tempHasta }); }
            }}
            onFocus={()=>setOpen(true)}
            placeholder="dd/mm/aaaa"
            className="border rounded-lg px-2 py-1 text-sm w-[110px]"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[11px] uppercase tracking-wide text-gray-500">Hasta</label>
          <input
            type="text"
            value={tempHasta ? tempHasta.split('-').reverse().join('/') : ''}
            onChange={(e)=>{
              const raw = e.target.value.replace(/[^\d/]/g,'');
              const parts = raw.split('/');
              if (parts.length===3 && parts[0].length===2 && parts[1].length===2 && parts[2].length===4) {
                const iso = `${parts[2]}-${parts[1]}-${parts[0]}`;
                setTempHasta(iso); onChange?.({ desde: tempDesde, hasta: iso });
              } else if (!raw) { setTempHasta(''); onChange?.({ desde: tempDesde, hasta:'' }); }
            }}
            onFocus={()=>setOpen(true)}
            placeholder="dd/mm/aaaa"
            className="border rounded-lg px-2 py-1 text-sm w-[110px]"
          />
        </div>
        <button type="button" onClick={()=>setOpen(o=>!o)} className="mt-5 text-xs border rounded-lg px-2 py-1 bg-white hover:bg-gray-50">📅</button>
        {(tempDesde || tempHasta) && (
          <button type="button" onClick={()=>quick('clear')} className="mt-5 text-xs text-gray-500 hover:text-gray-700 underline">Limpiar</button>
        )}
      </div>
      {open && (
        <div className="absolute z-40 mt-2 w-[320px] bg-white border rounded-xl shadow-lg p-3 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={()=>nav(-1)} className="p-1 text-gray-600 hover:bg-gray-100 rounded">◀</button>
            <div className="text-sm font-medium select-none">{monthNames[panelDate.getMonth()]} {panelDate.getFullYear()}</div>
            <button type="button" onClick={()=>nav(1)} className="p-1 text-gray-600 hover:bg-gray-100 rounded">▶</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-500 mb-1">
            {weekdayShort.map(d=> <div key={d} className="text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {cells.map((d,i)=>{
              if (!d) return <div key={i} className="h-8" />;
              const iso = toISO(d);
              const selected = isInRange(d);
              const edge = isEdge(d);
              return (
                <button key={iso}
                  type="button"
                  onClick={()=>selectDay(d)}
                  className={`h-8 rounded-md border text-center transition-colors relative 
                    ${edge ? 'bg-emerald-600 text-white border-emerald-600' : selected ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'}
                  `}
                  title={iso.split('-').reverse().join('/')}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <button type="button" onClick={()=>quick('today')} className="px-2 py-1 rounded border bg-white hover:bg-gray-50">Hoy</button>
            <button type="button" onClick={()=>quick('last7')} className="px-2 py-1 rounded border bg-white hover:bg-gray-50">Últimos 7</button>
            <button type="button" onClick={()=>quick('month')} className="px-2 py-1 rounded border bg-white hover:bg-gray-50">Mes actual</button>
            <button type="button" onClick={()=>quick('clear')} className="px-2 py-1 rounded border bg-white hover:bg-gray-50">Limpiar</button>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={close} className="text-xs text-emerald-700 font-medium hover:underline">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
