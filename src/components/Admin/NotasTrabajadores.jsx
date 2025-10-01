import React, { useEffect, useMemo, useState } from 'react';
import { notasService } from '@services';
import { useFichas } from '@context/FichasContext';
import { Filter, Search, Trash2, Eye, ChevronLeft, ChevronRight, CheckCircle, RotateCcw, Image as ImageIcon, ExternalLink, FileText } from 'lucide-react';

const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const sizeClasses = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-5xl' : 'max-w-2xl';
  const padding = size === 'sm' ? 'p-3' : 'p-4';
  const titleSize = size === 'sm' ? 'text-base' : 'text-lg';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white w-full ${sizeClasses} rounded-xl shadow-xl border ${padding} max-h-[85vh] overflow-auto`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`${titleSize} font-semibold truncate pr-8`}>{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const NotasTrabajadores = () => {
  const { revendedores, trabajadores, recargarTrabajadores } = useFichas();
  const [data, setData] = useState({ items: [], page: 1, pageSize: 25, total: 0 });
  const [filters, setFilters] = useState({ usuario_id: '', revendedor_id: '', page: 1, pageSize: 25 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState({ open: false, item: null });
  const [confirmDel, setConfirmDel] = useState({ open: false, id: null });
  const [lightbox, setLightbox] = useState({ open:false, items:[], index:0, titulo:'' });
  const [contenidoModal, setContenidoModal] = useState({ open:false, titulo:'', contenido:'' });

  const totalPages = useMemo(() => Math.max(1, Math.ceil((data.total || 0) / (data.pageSize || 25))), [data.total, data.pageSize]);

  // Formatea la fecha a español MX dd/mm/aaaa hh:mm:ss
  const formatDateTime = (value) => {
    if (!value) return '-';
    try {
      // Si viene como ISO, que es lo más común
      const d = value.includes('T') ? new Date(value) : new Date(value.replace(' ', 'T'));
      if (isNaN(d.getTime())) return String(value).slice(0, 19).replace('T', ' ');
      return d.toLocaleString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
    } catch {
      return String(value).slice(0, 19).replace('T', ' ');
    }
  };

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const res = await notasService.listar(filters);
      setData(res);
    } catch (e) {
      setError('No se pudo cargar');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filters.page, filters.pageSize]);
  // Asegurar que la lista de trabajadores esté disponible para el filtro
  useEffect(() => { if (!trabajadores || trabajadores.length === 0) recargarTrabajadores?.(); }, []);

  const onChangeFilter = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }));

  const eliminar = async (id) => {
    try {
      await notasService.eliminar(id);
      setConfirmDel({ open: false, id: null });
      fetchData();
    } catch (e) {
      alert('No se pudo eliminar');
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Notas de Trabajadores</h2>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="max-w-xs">
            <label className="block text-sm text-gray-600 mb-1">Trabajador</label>
            <select value={filters.usuario_id} onChange={e=>onChangeFilter('usuario_id', e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="">Todos</option>
              {(trabajadores || []).map(t => (
                <option key={t.id} value={t.id}>{t.nombre_completo || t.username}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Cliente</label>
            <select value={filters.revendedor_id} onChange={e=>onChangeFilter('revendedor_id', e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="">Todos</option>
              {revendedores.map(r => <option key={r.id} value={r.id}>{r.responsable || r.nombre || r.nombre_negocio}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 w-full">Filtrar</button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
          <div className="inline-flex items-center gap-2"><Filter className="w-4 h-4" /> Usa filtros y paginación</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-sm border-separate border-spacing-0">
            <thead className="bg-gray-50 text-gray-700 text-left">
              <tr className="divide-x divide-gray-200">
                <th className="px-3 py-2 w-44">Fecha</th>
                <th className="px-3 py-2 w-32">Estado</th>
                <th className="px-3 py-2 w-40">Trabajador</th>
                <th className="px-3 py-2 w-56">Cliente</th>
                <th className="px-3 py-2 w-64">Título</th>
                <th className="px-3 py-2 w-28">Imágenes</th>
                <th className="px-3 py-2 w-16">Contenido</th>
                <th className="px-3 py-2 w-40">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="px-3 py-6 text-center text-gray-500">Cargando...</td></tr>
              ) : error ? (
                <tr><td colSpan="7" className="px-3 py-6 text-center text-red-600">{error}</td></tr>
              ) : data.items.length === 0 ? (
                <tr><td colSpan="7" className="px-3 py-6 text-center text-gray-500">Sin resultados</td></tr>
              ) : (
                data.items.map((n) => (
                  <tr key={n.id} className="border-t border-gray-200 divide-x divide-gray-100 odd:bg-white even:bg-gray-50/20">
                    <td className="px-3 py-2">{formatDateTime(n.created_at)}</td>
                    <td className="px-3 py-2">
                      {Number(n.estado) === 1 ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 text-xs font-medium px-2 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Realizada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 text-xs font-medium px-2 py-1 rounded-full">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{n.username}</td>
                    <td className="px-3 py-2">
                      {n.revendedor_nombre && n.revendedor_nombre.trim() !== '' ? (
                        n.revendedor_nombre
                      ) : (
                        <span className="text-gray-500 italic">Sin cliente</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium max-w-[16rem] truncate" title={n.titulo || ''}>{n.titulo}</td>
                    <td className="px-3 py-2">
                      { (Array.isArray(n.imagenes) && n.imagenes.length) || n.imagen ? (
                        <div className="flex items-center gap-1">
                          <div className="grid grid-cols-3 gap-[2px]">
                            {(n.imagenes && n.imagenes.length ? n.imagenes : (n.imagen ? [n.imagen] : []))
                              .slice(0,3)
                              .map((img,i,arr)=> (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={()=>setDetail({ open:true, item:n, index:i })}
                                  className="relative group w-10 h-10 rounded-md overflow-hidden border bg-gray-100"
                                  title={`Ver imagen ${i+1}`}
                                >
                                  <img src={img} alt={`img-${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                                  {i === 2 && (n.imagenes?.length || 0) > 3 && (
                                    <span className="absolute inset-0 bg-black/50 text-white text-[10px] flex items-center justify-center font-medium">+{(n.imagenes.length-3)}</span>
                                  )}
                                </button>
                              ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs inline-flex items-center gap-1"><ImageIcon className="w-3 h-3" /> -</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setContenidoModal({ open:true, titulo: n.titulo || 'Contenido', contenido: n.contenido || '' })}
                        className="p-2 rounded-md hover:bg-gray-100"
                        title="Ver contenido"
                        aria-label="Ver contenido"
                      >
                        <FileText className="w-5 h-5 text-gray-700" />
                      </button>
                    </td>
                    <td className="px-3 py-2 space-x-2">
                      <button
                        onClick={async ()=>{
                          try {
                            const nuevo = Number(n.estado) === 1 ? 'pendiente' : 'realizada';
                            await notasService.cambiarEstado(n.id, nuevo);
                            setData(d => ({ ...d, items: d.items.map(it => it.id===n.id ? { ...it, estado: nuevo==='realizada'?1:0 } : it) }));
                          } catch {
                            alert('No se pudo cambiar estado');
                          }
                        }}
                        className={"inline-flex items-center gap-1 px-3 py-1 rounded-md border text-xs " + (Number(n.estado)===1 ? 'bg-white hover:bg-gray-50' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100')}
                        title={Number(n.estado)===1 ? 'Marcar pendiente' : 'Marcar realizada'}
                      >
                        {Number(n.estado)===1 ? <RotateCcw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />} {Number(n.estado)===1 ? 'Pendiente' : 'Hecha'}
                      </button>
                      <button onClick={()=>setDetail({ open:true, item:n })} className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-slate-100"><Eye className="w-4 h-4" /> Ver</button>
                      <button onClick={()=>setConfirmDel({ open:true, id:n.id })} className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-red-50 text-red-700"><Trash2 className="w-4 h-4" /> Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3 border-t bg-gray-50 text-sm">
          <div>Mostrando {data.items.length} de {data.total} registros</div>
          <div className="flex items-center gap-2">
            <button disabled={filters.page<=1} onClick={()=>setFilters(f=>({...f, page: Math.max(1, f.page-1)}))} className="px-2 py-1 rounded border bg-white disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
            <span>Página {data.page} de {totalPages}</span>
            <button disabled={filters.page>=totalPages} onClick={()=>setFilters(f=>({...f, page: f.page+1}))} className="px-2 py-1 rounded border bg-white disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
            <select value={filters.pageSize} onChange={(e)=>setFilters(f=>({...f, pageSize: parseInt(e.target.value)||25, page:1}))} className="ml-2 border rounded px-2 py-1">
              {[10,25,50,100].map(s=> <option key={s} value={s}>{s}/página</option>)}
            </select>
          </div>
        </div>
      </div>

      <Modal open={detail.open} onClose={()=>setDetail({ open:false, item:null })} title={detail.item ? detail.item.titulo : 'Nota'}>
        {detail.item && (()=>{
          const imgs = (detail.item.imagenes && detail.item.imagenes.length) ? detail.item.imagenes : (detail.item.imagen ? [detail.item.imagen] : []);
          const [currentIndex] = [detail.index || 0];
          return (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">Creada: {formatDateTime(detail.item.created_at)} por <span className="font-medium">{detail.item.username}</span></div>
              <div className="text-sm">Cliente: {detail.item.revendedor_nombre && detail.item.revendedor_nombre.trim() !== '' ? detail.item.revendedor_nombre : 'Sin cliente'}</div>
              {imgs.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs text-gray-500 font-medium flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Evidencias ({imgs.length})</div>
                  <div className="relative border rounded-lg p-2 bg-gray-50 flex flex-col items-center">
                    <div className="relative w-full flex items-center justify-center max-h-80">
                      <img
                        key={imgs[currentIndex]}
                        src={imgs[currentIndex]}
                        alt={`img-${currentIndex+1}`}
                        className="max-h-72 object-contain cursor-zoom-in rounded"
                        onClick={()=>setLightbox({ open:true, items:imgs, index: currentIndex, titulo: detail.item.titulo||'Imagen' })}
                      />
                      {imgs.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={()=>setDetail(d=>({...d, index: (currentIndex-1+imgs.length)%imgs.length }))}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center"
                            aria-label="Anterior"
                          ><ChevronLeft className="w-5 h-5" /></button>
                          <button
                            type="button"
                            onClick={()=>setDetail(d=>({...d, index: (currentIndex+1)%imgs.length }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center"
                            aria-label="Siguiente"
                          ><ChevronRight className="w-5 h-5" /></button>
                        </>
                      )}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[11px] px-2 py-1 rounded-full">{currentIndex+1} / {imgs.length}</div>
                    </div>
                    {imgs.length > 1 && (
                      <div className="mt-3 flex flex-wrap gap-2 justify-center">
                        {imgs.map((img,i)=>(
                          <button
                            key={i}
                            onClick={()=>setDetail(d=>({...d, index:i }))}
                            className={"w-14 h-14 border rounded overflow-hidden relative group " + (i===currentIndex ? 'ring-2 ring-blue-500' : 'opacity-70 hover:opacity-100')}
                          >
                            <img src={img} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-2 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}
              <div className="whitespace-pre-wrap break-words text-gray-800 border rounded-lg p-3 max-h-60 overflow-auto">{detail.item.contenido}</div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal de contenido (tamaño fijo) */}
      <Modal open={contenidoModal.open} onClose={()=>setContenidoModal({ open:false, titulo:'', contenido:'' })} title={contenidoModal.titulo || 'Contenido'}>
        <div className="w-[640px] h-[360px] max-w-full">
          <div className="w-full h-full border rounded-lg p-3 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words text-gray-800">
            {contenidoModal.contenido || 'Sin contenido'}
          </div>
        </div>
      </Modal>

      {lightbox.open && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-xl"
            onClick={()=>setLightbox({ open:false, items:[], index:0, titulo:'' })}
            aria-label="Cerrar"
          >✕</button>
          <div className="max-w-6xl max-h-[88vh] w-full sm:w-auto relative p-4 flex flex-col items-center">
            <div className="relative flex items-center justify-center w-full">
              {lightbox.items.length > 1 && (
                <button
                  onClick={()=>setLightbox(lb=>({...lb, index: (lb.index-1+lb.items.length)%lb.items.length }))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center"
                  aria-label="Anterior"
                ><ChevronLeft className="w-6 h-6" /></button>
              )}
              <img
                src={lightbox.items[lightbox.index]}
                alt={lightbox.titulo}
                className="max-h-[75vh] max-w-full object-contain rounded shadow-lg select-none"
              />
              {lightbox.items.length > 1 && (
                <button
                  onClick={()=>setLightbox(lb=>({...lb, index: (lb.index+1)%lb.items.length }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center"
                  aria-label="Siguiente"
                ><ChevronRight className="w-6 h-6" /></button>
              )}
              {lightbox.items.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">{lightbox.index+1} / {lightbox.items.length}</div>
              )}
            </div>
            <div className="mt-4 text-center text-sm text-white/80 flex flex-col items-center gap-3 w-full">
              <span className="font-medium text-white">{lightbox.titulo}</span>
              <div className="flex gap-3 flex-wrap justify-center">
                <a href={lightbox.items[lightbox.index]} download className="px-3 py-1 rounded-md bg-white/10 text-white text-xs hover:bg-white/20 border border-white/20">Descargar</a>
                <a href={lightbox.items[lightbox.index]} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-md bg-white/10 text-white text-xs hover:bg-white/20 border border-white/20 inline-flex items-center gap-1">Abrir <ExternalLink className="w-3 h-3" /></a>
                <button onClick={()=>setLightbox({ open:false, items:[], index:0, titulo:'' })} className="px-3 py-1 rounded-md bg-white/10 text-white text-xs hover:bg-white/20 border border-white/20">Cerrar</button>
              </div>
              {lightbox.items.length > 1 && (
                <div className="flex gap-2 flex-wrap justify-center max-w-full">
                  {lightbox.items.map((img,i)=>(
                    <button
                      key={i}
                      onClick={()=>setLightbox(lb=>({...lb, index:i }))}
                      className={"w-14 h-14 rounded border overflow-hidden " + (i===lightbox.index ? 'ring-2 ring-blue-400' : 'opacity-60 hover:opacity-100')}
                    >
                      <img src={img} alt={`lb-thumb-${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación (compacta) */}
      <Modal open={confirmDel.open} onClose={()=>setConfirmDel({ open:false, id:null })} title="Eliminar nota" size="sm">
        <div className="space-y-3 text-sm">
          <p>Esta acción no se puede deshacer. ¿Deseas eliminar la nota seleccionada?</p>
          <div className="flex justify-end gap-2">
            <button className="px-2.5 py-1.5 rounded-md border bg-white hover:bg-gray-50" onClick={()=>setConfirmDel({ open:false, id:null })}>Cancelar</button>
            <button className="px-2.5 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700" onClick={()=>eliminar(confirmDel.id)}>Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NotasTrabajadores;
