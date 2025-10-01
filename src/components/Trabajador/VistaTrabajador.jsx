// VistaTrabajador.jsx
//importaciones
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { tareasService } from '@services/tareasService';
import { fichasService } from '@services/fichasService';
import { connectRealtime } from '@services/realtimeService';
import { 
  CheckCircle, 
  Clock, 
  User, 
  Building2, 
  Calendar, 
  AlertTriangle, 
  MessageSquare, 
  Flag, 
  Zap, 
  Target,
  LogOut,
  Award,
  TrendingUp,
  X,
  FileText,
  Package,
  Wrench,
  MapPin
} from 'lucide-react';
import { formatClienteNombre, formatClienteLargo } from '@shared/index';
import notasService from '@services/notasService';

// Helpers de coordenadas seguros
const parseCoord = (v) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return NaN;
    const n = parseFloat(s);
    return n;
  }
  return NaN;
};

const hasValidCoords = (lat, lng) => {
  const la = parseCoord(lat);
  const lo = parseCoord(lng);
  return Number.isFinite(la) && Number.isFinite(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
};

// Modal personalizada para notas de trabajo
const ModalNotas = ({ isOpen, onClose, onConfirm, titulo = 'Completar Tarea', maxImages = 3 }) => {
  const [notas, setNotas] = useState('');
  const [files, setFiles] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // data URLs
  const [errorImg, setErrorImg] = useState(null);
  useEffect(() => { if (isOpen) { setNotas(''); setFiles([]); setPreviews([]); setErrorImg(null);} }, [isOpen]);
  if (!isOpen) return null;
  const handleConfirm = () => { onConfirm(notas, files); onClose(); };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleConfirm();
    if (e.key === 'Escape') onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{titulo}</h3>
              <p className="text-sm text-gray-500">Agregar notas del trabajo realizado</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <FileText className="w-4 h-4 inline mr-2" />
            Notas del trabajo realizado (opcional):
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe brevemente el trabajo realizado, observaciones, materiales utilizados, etc."
            className="w-full h-32 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none text-sm"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2">Ctrl+Enter para completar</p>
          {/* Subida de imágenes (máx 3 por ahora solo frontend) */}
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-gray-700">Imágenes (opcional)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              onChange={(e)=>{
                const list = Array.from(e.target.files||[]);
                if (!list.length) { setFiles([]); setPreviews([]); setErrorImg(null); return; }
                if (list.length > maxImages) { setErrorImg(`Máximo ${maxImages} imágenes`); return; }
                for (const f of list) { if (f.size > 2*1024*1024) { setErrorImg(`Imagen supera 2MB: ${f.name}`); return; } }
                setErrorImg(null);
                setFiles(list);
                Promise.all(list.map(f=> new Promise(res=>{ const r=new FileReader(); r.onload=ev=>res(ev.target.result); r.readAsDataURL(f);})))
                  .then(arr=> setPreviews(arr));
              }}
              className="w-full text-xs border rounded-lg px-3 py-2"
            />
            {errorImg && <div className="text-xs text-red-600">{errorImg}</div>}
            {previews.length>0 && (
              <div className="flex flex-wrap gap-2">
                {previews.map((p,i)=>(
                  <div key={`prev-${i}-${typeof p==='string'?p.slice(-12):'x'}`} className="relative group">
                    <img src={p} alt={`prev-${i}`} className="h-14 w-14 object-cover rounded-lg border" />
                    <button type="button" onClick={()=>{
                      setFiles(f=>{ const c=[...f]; c.splice(i,1); return c;});
                      setPreviews(pr=>{ const c=[...pr]; c.splice(i,1); return c;});
                    }} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[11px] hidden group-hover:flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            )}
            {previews.length>0 && (
              <button type="button" onClick={()=>{ setFiles([]); setPreviews([]); }} className="text-[11px] text-red-600 hover:underline">Limpiar</button>
            )}
            <p className="text-[10px] text-gray-500">Máx {maxImages} imágenes • Cada una ≤2MB</p>
          </div>
        </div>
        <div className="flex space-x-3 p-6 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cancelar</button>
          <button onClick={handleConfirm} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium">Completar Tarea</button>
        </div>
      </div>
    </div>
  );
};

// Modal liviana para mostrar mapa y navegación
const MapModal = ({ open, onClose, title = 'Ubicación', lat, lng, direccion }) => {
  if (!open) return null;
  const validCoords = hasValidCoords(lat, lng);
  const la = parseCoord(lat);
  const lo = parseCoord(lng);
  const bbox = validCoords
    ? `${lo-0.005}%2C${la-0.005}%2C${lo+0.005}%2C${la+0.005}`
    : null;
  const marker = validCoords ? `${la}%2C${lo}` : null;
  const navUrl = validCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}`
    : (direccion ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}` : null);
  const searchUrl = direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}` : null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {direccion && (
            <div className="text-sm text-gray-700 truncate"><span className="text-gray-500">Dirección:</span> {direccion}</div>
          )}
          {validCoords ? (
            <div className="w-full h-72 rounded-lg overflow-hidden border">
              <iframe
                title="mapa-ubicacion"
                className="w-full h-full"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`}
              />
            </div>
          ) : (
            <div className="w-full h-72 rounded-lg border border-dashed bg-gray-50 flex items-center justify-center text-center p-4">
              <div className="text-sm text-gray-600">
                No hay coordenadas válidas guardadas para este cliente.<br />
                Usa los enlaces de abajo para navegar con la dirección.
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 pt-1">
            {navUrl && (
              <a href={navUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs">Navegar</a>
            )}
            {searchUrl && (
              <a href={searchUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-xs">Buscar</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================
// Componente principal
// =====================
const VistaTrabajador = ({ currentUser, onLogout, revendedores, graceExpired = true, initialPendingWindow = false }) => {
  // Estado general / tareas
  const [misTareas, setMisTareas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('pendientes');
  const [activeTab, setActiveTab] = useState('tareas');
  const location = useLocation?.() || { search: '' };
  const navigate = useNavigate?.();

  // Modal completar tarea
  const [modalNotasAbierto, setModalNotasAbierto] = useState(false);
  const [tareaCompletandoId, setTareaCompletandoId] = useState(null);
  const [tareaEditandoImagenesId, setTareaEditandoImagenesId] = useState(null); // reutiliza modal para reemplazo

  // Notas
  const [notas, setNotas] = useState([]);
  const [notasLoading, setNotasLoading] = useState(false);
  const [notaError, setNotaError] = useState(null);
  const [notaForm, setNotaForm] = useState({ titulo: '', contenido: '', revendedor_id: '', imagenes: [] });
  const [notaPreviews, setNotaPreviews] = useState([]); // dataURLs
  const [imageModal, setImageModal] = useState({ open: false, images: [], index: 0 });
  // Resuelve URL de imagen dev/producción. Si ya es absoluta, la retorna.
  const resolveImageUrl = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url; // ya absoluta
    // Backend sirve /uploads/* desde la misma raíz (proxy vite.config.js)
    return url.startsWith('/') ? url : `/${url}`;
  };

  const openImagesLightbox = (imgs, idx=0) => {
    setImageModal({ open: true, images: imgs.map(resolveImageUrl), index: idx });
  };
  const closeImagesLightbox = () => setImageModal(m => ({ ...m, open: false }));
  const nextImage = () => setImageModal(m => ({ ...m, index: (m.index + 1) % m.images.length }));
  const prevImage = () => setImageModal(m => ({ ...m, index: (m.index - 1 + m.images.length) % m.images.length }));
  // Edición de notas existentes
  const [editandoNotaId, setEditandoNotaId] = useState(null);
  const [editForm, setEditForm] = useState({ titulo: '', contenido: '' });
  const [editReplacingImages, setEditReplacingImages] = useState(false);
  const [editNewImages, setEditNewImages] = useState([]); // File[] nuevos
  const [editNewPreviews, setEditNewPreviews] = useState([]); // dataURLs
  const [editLoading, setEditLoading] = useState(false);
  const MAX_IMAGES = 3; // Limite frontend (coincide con backend NOTE_IMAGES_MAX default)

  // Entregas / stock
  const [stockDisponible, setStockDisponible] = useState([]);
  const [cargandoStock, setCargandoStock] = useState(false);
  const [revendedoresLista, setRevendedoresLista] = useState([]);
  const [cargandoRevendedores, setCargandoRevendedores] = useState(false);
  const [entregaForm, setEntregaForm] = useState({ revendedor_id: '', tipo_ficha_id: '', cantidad: '', nota: '' });
  const [entregaLoading, setEntregaLoading] = useState(false);
  const [entregaMensaje, setEntregaMensaje] = useState(null);
  const [entregaError, setEntregaError] = useState(null);
  const [cargandoEntregas, setCargandoEntregas] = useState(false);
  const [misEntregasRecientes, setMisEntregasRecientes] = useState([]);

  // Map modal & clientes
  const [mapModal, setMapModal] = useState({ open: false, title: '', lat: null, lng: null, direccion: '' });
  const [clienteFiltro, setClienteFiltro] = useState('');

  // Cargar datos iniciales y subscripciones
  useEffect(() => {
    // Al montar: restaurar pestaña activa desde ?tab o localStorage
    try {
      const params = new URLSearchParams(location.search || '');
      const tabFromQuery = params.get('tab');
      const allowed = ['tareas','entrega','direcciones','notas','resumen'];
      if (tabFromQuery && allowed.includes(tabFromQuery)) {
        setActiveTab(tabFromQuery);
        localStorage.setItem('trabajador.activeTab', tabFromQuery);
      } else {
        const stored = localStorage.getItem('trabajador.activeTab');
        if (stored && allowed.includes(stored)) setActiveTab(stored);
      }
    } catch {}

    cargarMisTareas();
    cargarStockDisponible();
    cargarRevendedores();
    cargarNotas();
    cargarMisEntregasRecientes();

    let debounceTimer = null;
    const pending = { tareas: false, notas: false, stock: false, entregas: false };
    const scheduleFlush = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          if (pending.tareas) await cargarMisTareas();
          if (pending.notas) await cargarNotas();
          if (pending.stock) await cargarStockDisponible();
          if (pending.entregas) await cargarMisEntregasRecientes();
        } finally {
          pending.tareas = pending.notas = pending.stock = pending.entregas = false;
        }
      }, 250);
    };

    const disconnect = connectRealtime((type, payload) => {
      switch (type) {
        case 'tarea-creada':
        case 'tarea-actualizada':
        case 'tarea-completada':
        case 'tarea-aceptada':
          pending.tareas = true; scheduleFlush();
          break;
        case 'nota-creada':
        case 'nota-actualizada':
        case 'nota-eliminada':
          pending.notas = true; scheduleFlush();
          break;
        case 'inventario-actualizado':
          pending.stock = true; scheduleFlush();
          break;
        case 'entrega-creada':
          if (payload && (
            (payload.usuario_id && currentUser?.id && payload.usuario_id === currentUser.id) ||
            (payload.usuario_entrega && payload.usuario_entrega === (currentUser?.username))
          )) {
            setMisEntregasRecientes(prev => {
              const existe = prev.some(e => e.id === payload.id);
              if (existe) return prev;
              const nuevo = [{
                id: payload.id,
                revendedor_id: payload.revendedor_id,
                revendedor_nombre: payload.revendedor_nombre,
                tipo_ficha_id: payload.tipo_ficha_id,
                tipo_ficha_nombre: payload.tipo_ficha_nombre,
                cantidad: payload.cantidad,
                tipo_movimiento: payload.tipo_movimiento,
                fecha_entrega: payload.fecha_entrega,
                usuario_id: payload.usuario_id,
                usuario_entrega: payload.usuario_entrega
              }, ...prev];
              return nuevo.slice(0, 10);
            });
          }
          pending.entregas = true;
          pending.stock = true;
          scheduleFlush();
          break;
        default:
          break;
      }
    });
    return () => { if (debounceTimer) clearTimeout(debounceTimer); disconnect?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistir cambios de pestaña en localStorage
  useEffect(() => {
    try { localStorage.setItem('trabajador.activeTab', activeTab); } catch {}
  }, [activeTab]);

  const cargarMisTareas = async () => {
    try {
      setCargando(true);
      setError(null);
      const resultado = await tareasService.obtenerMisTareas();
      if (resultado.success) {
        setMisTareas(resultado.tareas || []);
      } else {
        setError(resultado.error);
      }
    } catch (e) {
      setError('Error al cargar las tareas');
    } finally {
      setCargando(false);
    }
  };

  const aceptarTareaAbierta = async (tareaId) => {
    try {
      const res = await tareasService.aceptarTareaAbierta(tareaId);
      if (res.success) {
        await cargarMisTareas();
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError('No se pudo aceptar la tarea');
    }
  };

  const cargarMisEntregasRecientes = async () => {
    try {
      setCargandoEntregas(true);
      setEntregaError(null);
  const res = await fichasService.obtenerHistorialEntregas({ page: 1, pageSize: 50 });
  const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
  const uid = currentUser?.id;
  const username = currentUser?.username || '';
  const propias = uid ? items.filter(it => it.usuario_id === uid) : (username ? items.filter(it => it.usuario_entrega === username) : items);
      setMisEntregasRecientes(propias.slice(0, 10));
    } catch (e) {
      // silencioso
    } finally {
      setCargandoEntregas(false);
    }
  };

  const cargarNotas = async () => {
    try {
      setNotasLoading(true);
      setNotaError(null);
      const res = await notasService.listar({ page: 1, pageSize: 10 });
      const items = res?.items || res || [];
      setNotas(items);
    } catch (e) {
      setNotaError('No se pudieron cargar las notas');
    } finally {
      setNotasLoading(false);
    }
  };

  const cargarStockDisponible = async () => {
    try {
      setCargandoStock(true);
      const data = await fichasService.obtenerStockGlobal({ forceRefresh: true });
      const filtrado = (data || []).filter(s => (s.cantidad_disponible || 0) > 0);
      setStockDisponible(filtrado);
    } catch (e) {
      console.error('Error cargando stock disponible:', e);
    } finally {
      setCargandoStock(false);
    }
  };

  const cargarRevendedores = async () => {
    try {
      if (revendedores && revendedores.length) {
        setRevendedoresLista(revendedores);
        return;
      }
      setCargandoRevendedores(true);
      const data = await fichasService.obtenerRevendedores({ forceRefresh: true });
      setRevendedoresLista(data || []);
    } catch (e) {
      console.error('Error cargando revendedores:', e);
    } finally {
      setCargandoRevendedores(false);
    }
  };

  const selectedStock = stockDisponible.find(s => s.tipo_ficha_id === Number(entregaForm.tipo_ficha_id));
  const maxCantidad = selectedStock ? selectedStock.cantidad_disponible : 0;
  const selectedCliente = revendedoresLista.find(r => r.id === Number(entregaForm.revendedor_id));

  const formValido = entregaForm.revendedor_id && entregaForm.tipo_ficha_id && entregaForm.cantidad && Number(entregaForm.cantidad) > 0 && Number(entregaForm.cantidad) <= maxCantidad;

  const manejarCambioForm = (field, value) => {
    setEntregaForm(f => ({ ...f, [field]: value }));
    setEntregaMensaje(null);
    setEntregaError(null);
  };

  const realizarEntrega = async (e) => {
    e.preventDefault();
    if (!formValido || entregaLoading) return;
    try {
      setEntregaLoading(true);
      setEntregaError(null);
      const payload = {
        revendedor_id: Number(entregaForm.revendedor_id),
        tipo_ficha_id: Number(entregaForm.tipo_ficha_id),
        cantidad: Number(entregaForm.cantidad),
        tipo_movimiento: 'entrega',
        nota: entregaForm.nota?.trim() || ''
      };
  const res = await fichasService.crearEntrega(payload);
  const entregaId = res?.id ?? res?.insertId ?? res?.data?.id ?? res?.data?.insertId;
  const clienteNombre = selectedCliente ? (selectedCliente.responsable || selectedCliente.nombre || selectedCliente.nombre_negocio) : res?.revendedor_nombre;
  setEntregaMensaje(`Fichas entregadas correctamente a ${clienteNombre || 'cliente'}.`);
      // Refrescar stock
      await cargarStockDisponible();
      // Refrescar mini-historial
      await cargarMisEntregasRecientes();
      // Reset parcial cantidad
      setEntregaForm(f => ({ ...f, cantidad: '' }));
    } catch (e) {
      console.error('Error realizando entrega:', e);
      setEntregaError(e?.message || 'Error al entregar fichas');
    } finally {
      setEntregaLoading(false);
    }
  };
  
  // Filtrar tareas por estado
  const tareasPendientes = misTareas.filter(t => t.estado === 'Pendiente');
  const tareasEnProgreso = misTareas.filter(t => t.estado === 'En Progreso');
  const tareasCompletadas = misTareas.filter(t => t.estado === 'Completado');

  // (mantenido como estado arriba)

  if (!currentUser || (cargando || !graceExpired || initialPendingWindow)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Cargando datos del trabajador...</p>
          <p className="text-gray-400 text-sm mt-2">Preparando tu panel</p>
        </div>
      </div>
    );
  }

  // Si hay error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar tareas</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={cargarMisTareas}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const completarTarea = async (tareaId, notas, imagenes = []) => {
    try {
      const resultado = await tareasService.actualizarEstadoMiTarea(tareaId, 'Completado', notas, imagenes);
      if (resultado.success) {
        // Actualizar el estado local
        const tareasActualizadas = misTareas.map(t =>
          t.id === tareaId
            ? { ...t, estado: 'Completado', notas, fecha_completado: new Date().toISOString().split('T')[0], imagenes: (imagenes && imagenes.length ? imagenes.map(f=>URL.createObjectURL(f)) : t.imagenes || []) }
            : t
        );
        setMisTareas(tareasActualizadas);
      } else {
        console.error('Error al completar tarea:', resultado.error);
        setError(resultado.error);
      }
    } catch (error) {
      console.error('Error al completar tarea:', error);
      setError('Error al completar la tarea');
    }
  };

  const abrirModalCompletar = (tareaId) => {
    setTareaCompletandoId(tareaId);
    setModalNotasAbierto(true);
  };

  const manejarConfirmacionModal = (notas, imagenesAdjuntas = []) => {
    if (tareaCompletandoId) {
      completarTarea(tareaCompletandoId, notas || '', imagenesAdjuntas);
      setTareaCompletandoId(null);
      // TODO backend: enviar imagenesAdjuntas cuando exista endpoint que las procese
    }
    // Reemplazo solo de imágenes (sin cambiar notas si no se envía) - placeholder hasta backend
    if (tareaEditandoImagenesId) {
      // Aquí en el futuro: llamada a endpoint específico para reemplazar imágenes.
      setMisTareas(prev => prev.map(t => t.id === tareaEditandoImagenesId ? { ...t, imagenes: imagenesAdjuntas.map(f=>URL.createObjectURL(f)) } : t));
      setTareaEditandoImagenesId(null);
    }
  };

  const cerrarModal = () => {
    setModalNotasAbierto(false);
    setTareaCompletandoId(null);
  };

  const iniciarTarea = async (tareaId) => {
    try {
      const resultado = await tareasService.actualizarEstadoMiTarea(tareaId, 'En Progreso', '');
      if (resultado.success) {
        // Actualizar el estado local
        const tareasActualizadas = misTareas.map(t =>
          t.id === tareaId
            ? { ...t, estado: 'En Progreso' }
            : t
        );
        setMisTareas(tareasActualizadas);
      } else {
        console.error('Error al iniciar tarea:', resultado.error);
        setError(resultado.error);
      }
    } catch (error) {
      console.error('Error al iniciar tarea:', error);
      setError('Error al iniciar la tarea');
    }
  };

  const getPrioridadColor = (prioridad) => {
    const colores = {
      'Baja': 'bg-green-100 text-green-800 border-green-200',
      'Media': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Alta': 'bg-orange-100 text-orange-800 border-orange-200',
      'Urgente': 'bg-red-100 text-red-800 border-red-200'
    };
    return colores[prioridad] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPrioridadIcon = (prioridad) => {
    return prioridad === 'Urgente' || prioridad === 'Alta' ? Zap : Flag;
  };

  const tareasFiltradas = filtro === 'pendientes' ? tareasPendientes : 
                         filtro === 'progreso' ? tareasEnProgreso :
                         filtro === 'completadas' ? tareasCompletadas : misTareas;

  // Métrica básica usada todavía en el resumen (antes formaba parte de la pestaña rendimiento)
  const tasaCompletado = misTareas.length > 0 ? (tareasCompletadas.length / misTareas.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Optimizado para móvil */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">Panel del Técnico</h1>
                <p className="text-sm sm:text-base text-gray-600">
                  <span className="font-medium">
                    {currentUser.nombre_completo || currentUser.nombre || currentUser.username || 'Usuario'}
                  </span>
                  {(currentUser.especialidad) && (
                    <>
                      <span className="mx-1 sm:mx-2">-</span>
                      <span className="text-blue-600 font-medium">{currentUser.especialidad}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium transition-colors px-3 py-2 rounded-xl hover:bg-red-50 text-sm sm:text-base"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </button>
          </div>
          {/* Tabs (Desktop/Tablet) */}
          <div className="hidden sm:flex flex-wrap gap-2 pb-4">
            {[
              { key: 'tareas', label: `Mis Tareas (${misTareas.length})` },
              { key: 'entrega', label: 'Entregar Fichas' },
              { key: 'direcciones', label: 'Direcciones' },
              { key: 'notas', label: 'Notas' },
              { key: 'resumen', label: 'Resumen' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  try {
                    const params = new URLSearchParams(location.search || '');
                    params.set('tab', tab.key);
                    navigate && navigate({ search: params.toString() }, { replace: false });
                  } catch {}
                }}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 pb-16 sm:pb-8">
        {/* Sección Entrega de Fichas */}
        {activeTab === 'entrega' && (
        <div id="section-entrega" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Entregar Fichas a Clientes</h2>
          <form onSubmit={realizarEntrega} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select
                  value={entregaForm.revendedor_id}
                  onChange={(e) => manejarCambioForm('revendedor_id', e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccione...</option>
                  {cargandoRevendedores && <option>Cargando...</option>}
                  {revendedoresLista
                    .slice()
                    .sort((a,b) => formatClienteNombre(a).localeCompare(formatClienteNombre(b)))
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {`${formatClienteLargo(r)}#${r.id}`}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Tipo de Ficha (Stock)</label>
                <select
                  value={entregaForm.tipo_ficha_id}
                  onChange={(e) => manejarCambioForm('tipo_ficha_id', e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccione...</option>
                  {cargandoStock && <option>Cargando...</option>}
                  {stockDisponible.map(s => (
                    <option key={s.tipo_ficha_id} value={s.tipo_ficha_id}>
                      {s.tipo_ficha_nombre} (disp: {s.cantidad_disponible})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  max={maxCantidad || 1}
                  value={entregaForm.cantidad}
                  onChange={(e) => manejarCambioForm('cantidad', e.target.value)}
                  placeholder={selectedStock ? `Máx ${maxCantidad}` : '—'}
                  className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  required
                />
                {selectedStock && entregaForm.cantidad && (Number(entregaForm.cantidad) > maxCantidad) && (
                  <span className="text-xs text-red-600 mt-1">Excede el stock disponible</span>
                )}
              </div>
              <div className="flex flex-col md:col-span-1">
                <label className="text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
                <input
                  type="text"
                  maxLength={120}
                  value={entregaForm.nota}
                  onChange={(e) => manejarCambioForm('nota', e.target.value)}
                  placeholder="Referencia..."
                  className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <div className="text-xs text-gray-500">
                {selectedStock ? `Stock disponible: ${selectedStock.cantidad_disponible}` : 'Seleccione un tipo de ficha'}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setEntregaForm({ revendedor_id:'', tipo_ficha_id:'', cantidad:'', nota:'' }); setEntregaError(null); setEntregaMensaje(null); }}
                  className="px-4 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50"
                  disabled={entregaLoading}
                >Limpiar</button>
                <button
                  type="submit"
                  disabled={!formValido || entregaLoading}
                  className={`px-5 py-2.5 text-sm font-medium rounded-lg text-white transition-colors ${formValido && !entregaLoading ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400 cursor-not-allowed'}`}
                >{entregaLoading ? 'Entregando...' : 'Entregar Fichas'}</button>
              </div>
            </div>
            {entregaMensaje && <div className="text-sm text-emerald-600 font-medium">{entregaMensaje}</div>}
            {entregaError && <div className="text-sm text-red-600 font-medium">{entregaError}</div>}
          </form>

          {/* Vista rápida de dirección del cliente seleccionado */}
          {selectedCliente && (selectedCliente.direccion || hasValidCoords(selectedCliente.latitud, selectedCliente.longitud)) && (
            <div className="mt-5 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-500">Dirección del cliente seleccionado</div>
                  {selectedCliente.direccion && (
                    <div className="font-medium text-gray-900 truncate">{selectedCliente.direccion}</div>
                  )}
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setMapModal({ open: true, title: `Ubicación de ${formatClienteLargo(selectedCliente)}`, lat: selectedCliente.latitud, lng: selectedCliente.longitud, direccion: selectedCliente.direccion })}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800 text-xs"
                    >
                      Ver mapa
                    </button>
                    {(() => {
                      const la = parseCoord(selectedCliente.latitud); const lo = parseCoord(selectedCliente.longitud); const dir = selectedCliente.direccion;
                      const hasCoords = hasValidCoords(la, lo);
                      const navUrl = hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}` : (dir ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dir)}` : null);
                      return navUrl ? (
                        <a href={navUrl} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs">Navegar</a>
                      ) : null;
                    })()}
                    {selectedCliente.direccion && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCliente.direccion)}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-xs">Google Maps (dirección)</a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Mini historial de mis entregas */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">Mis últimas entregas</h3>
              <button
                type="button"
                onClick={cargarMisEntregasRecientes}
                className="text-xs text-blue-600 hover:text-blue-800"
                disabled={cargandoEntregas}
              >{cargandoEntregas ? 'Actualizando…' : 'Actualizar'}</button>
            </div>
            {cargandoEntregas ? (
              <div className="text-sm text-gray-500">Cargando...</div>
            ) : misEntregasRecientes.length === 0 ? (
              <div className="text-sm text-gray-500">Sin entregas recientes.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {misEntregasRecientes.map((e, idx) => (
                  <li key={`${e.id ?? 'noid'}-${e.revendedor_id}-${e.tipo_ficha_id}-${e.fecha_entrega}-${idx}`} className="py-2 text-sm flex items-center justify-between">
                    <div className="min-w-0 pr-3">
                      <div className="font-medium text-gray-900 truncate">#{e.id} • {e.revendedor_nombre}</div>
                      <div className="text-gray-600 truncate">{e.tipo_ficha_nombre} × {e.cantidad}</div>
                    </div>
                    <div className="text-xs text-gray-500 flex-shrink-0">{new Date(e.fecha_entrega).toLocaleString('es-MX')}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
    )}

    {/* Sección Notas Rápidas */}
    {activeTab === 'notas' && (
  <div id="section-notas" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Notas del Técnico</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              setNotasLoading(true);
              const nueva = await notasService.crear({
                titulo: notaForm.titulo,
                contenido: notaForm.contenido,
                revendedor_id: notaForm.revendedor_id || undefined,
                imagenes: notaForm.imagenes
              });
              setNotas(n => [nueva, ...n]);
              setNotaForm({ titulo: '', contenido: '', revendedor_id: '', imagenes: [] });
              setNotaPreviews([]);
            } catch (err) {
              setNotaError('No se pudo crear la nota');
            } finally {
              setNotasLoading(false);
            }
          }} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              <input
                type="text"
                placeholder="Título (ej. Cliente solicita revisión)"
                value={notaForm.titulo}
                onChange={(e)=>setNotaForm(f=>({...f, titulo: e.target.value}))}
                className="md:col-span-2 px-3 py-2 border rounded-lg text-sm"
                required
              />
              <select
                value={notaForm.revendedor_id}
                onChange={(e)=>setNotaForm(f=>({...f, revendedor_id: e.target.value}))}
                className="md:col-span-1 px-3 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="">Sin cliente</option>
                {revendedoresLista
                  .slice()
                  .sort((a,b)=> formatClienteNombre(a).localeCompare(formatClienteNombre(b)))
                  .map(r => (
                    <option key={r.id} value={r.id}>{formatClienteLargo(r)}</option>
                  ))}
              </select>
              <input
                type="text"
                placeholder="Descripción breve"
                value={notaForm.contenido}
                onChange={(e)=>setNotaForm(f=>({...f, contenido: e.target.value}))}
                className="md:col-span-2 px-3 py-2 border rounded-lg text-sm"
                required
              />
              <div className="md:col-span-2 flex flex-col gap-1">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) { setNotaForm(f=>({...f, imagenes: []})); setNotaPreviews([]); return; }
                    if (files.length > MAX_IMAGES) { setNotaError(`Máximo ${MAX_IMAGES} imágenes`); return; }
                    for (const f of files) {
                      if (f.size > 2*1024*1024) { setNotaError(`Imagen supera 2MB: ${f.name}`); return; }
                    }
                    setNotaError(null);
                    setNotaForm(f=>({...f, imagenes: files }));
                    Promise.all(files.map(f=> new Promise(res=>{ const r=new FileReader(); r.onload=ev=>res(ev.target.result); r.readAsDataURL(f);})))
                      .then(pre=> setNotaPreviews(pre));
                  }}
                  className="px-2 py-2 border rounded-lg text-xs bg-white"
                />
                {notaPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {notaPreviews.map((src,i)=>(
                      <div key={`nota-prev-${i}-${typeof src==='string'?src.slice(-12):'x'}`} className="relative group">
                        <img src={src} alt={`pre-${i}`} className="h-12 w-12 object-cover rounded-lg border" />
                        <button type="button" onClick={()=>{
                          setNotaForm(f=>{ const arr=[...f.imagenes]; arr.splice(i,1); return {...f, imagenes: arr}; });
                          setNotaPreviews(p=>{ const arr=[...p]; arr.splice(i,1); return arr; });
                        }} className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full w-5 h-5 text-[10px] hidden group-hover:flex items-center justify-center">×</button>
                      </div>
                    ))}
                  </div>
                )}
                {notaPreviews.length > 0 && (
                  <button type="button" onClick={()=>{ setNotaForm(f=>({...f, imagenes: []})); setNotaPreviews([]); }} className="text-[11px] text-red-600 hover:underline self-start">Limpiar</button>
                )}
                <span className="text-[10px] text-gray-500">Máx {MAX_IMAGES} imágenes • Cada una ≤2MB</span>
              </div>
              <button type="submit" disabled={notasLoading || !notaForm.titulo || !notaForm.contenido} className="md:col-span-1 px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-sm">Agregar</button>
            </div>
          </form>
          {notaError && <div className="text-sm text-red-600 mt-2">{notaError}</div>}
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Recientes</h3>
            <ul className="divide-y divide-gray-100">
              {notasLoading ? (
                <li className="py-3 text-gray-500 text-sm">Cargando...</li>
              ) : notas.length === 0 ? (
                <li className="py-3 text-gray-500 text-sm">Sin notas</li>
              ) : (
                notas.map(n => (
                  <li key={n.id} className="py-3 text-sm flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {editandoNotaId === n.id ? (
                        <form onSubmit={async (e)=>{
                          e.preventDefault();
                          try {
                            setEditLoading(true);
                            let payload = { titulo: editForm.titulo, contenido: editForm.contenido };
                            if (editReplacingImages && editNewImages.length) {
                              payload.imagenes = editNewImages; // reemplazo completo
                            }
                            const actualizada = await notasService.actualizar(n.id, payload);
                            setNotas(prev => prev.map(x => x.id === n.id ? actualizada : x));
                            setEditandoNotaId(null); setEditForm({ titulo:'', contenido:'' }); setEditReplacingImages(false); setEditNewImages([]); setEditNewPreviews([]);
                          } catch(err){
                            setNotaError('No se pudo actualizar la nota');
                          } finally { setEditLoading(false); }
                        }} className="space-y-2">
                          <input
                            type="text"
                            value={editForm.titulo}
                            onChange={(e)=>setEditForm(f=>({...f,titulo:e.target.value}))}
                            className="w-full px-2 py-1.5 border rounded-lg text-xs"
                            maxLength={150}
                            required
                          />
                          <textarea
                            value={editForm.contenido}
                            onChange={(e)=>setEditForm(f=>({...f,contenido:e.target.value}))}
                            className="w-full px-2 py-1.5 border rounded-lg text-xs h-20 resize-y"
                            required
                          />
                          <div className="space-y-2">
                            {!editReplacingImages && (
                              <div className="text-[11px] text-gray-500 flex flex-wrap gap-2 items-center">
                                {Array.isArray(n.imagenes) && n.imagenes.length > 0 ? (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {n.imagenes.slice(0,MAX_IMAGES).map((img,i)=>(
                                      <img key={`${n.id}-${i}`} src={img} alt={`img-${i}`} className="h-12 w-12 object-cover rounded border" />
                                    ))}
                                  </div>
                                ) : <span>Sin imágenes</span>}
                                <button type="button" onClick={()=>{ setEditReplacingImages(true); setEditNewImages([]); setEditNewPreviews([]); }} className="text-blue-600 hover:underline ml-2">Reemplazar imágenes</button>
                              </div>
                            )}
                            {editReplacingImages && (
                              <div className="flex flex-col gap-2">
                                <input
                                  type="file"
                                  multiple
                                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                                  onChange={(e)=>{
                                    const files = Array.from(e.target.files||[]);
                                    if (files.length > MAX_IMAGES) { setNotaError(`Máximo ${MAX_IMAGES} imágenes`); return; }
                                    for (const f of files) { if (f.size>2*1024*1024) { setNotaError(`Imagen supera 2MB: ${f.name}`); return; } }
                                    setNotaError(null);
                                    setEditNewImages(files);
                                    Promise.all(files.map(f=> new Promise(res=>{ const r=new FileReader(); r.onload=ev=>res(ev.target.result); r.readAsDataURL(f);})))
                                      .then(pre=> setEditNewPreviews(pre));
                                  }}
                                  className="px-2 py-1.5 border rounded-lg text-[11px] bg-white"
                                />
                                {editNewPreviews.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {editNewPreviews.map((src,i)=>(
                                      <div key={`edit-prev-${i}-${typeof src==='string'?src.slice(-12):'x'}`} className="relative group">
                                        <img src={src} alt={`new-${i}`} className="h-12 w-12 object-cover rounded border" />
                                        <button type="button" onClick={()=>{
                                          setEditNewImages(f=>{ const arr=[...f]; arr.splice(i,1); return arr; });
                                          setEditNewPreviews(p=>{ const arr=[...p]; arr.splice(i,1); return arr; });
                                        }} className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full w-5 h-5 text-[10px] hidden group-hover:flex items-center justify-center">×</button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-500">Máx {MAX_IMAGES} imágenes • Cada una ≤2MB</span>
                                  <button type="button" onClick={()=>{ setEditReplacingImages(false); setEditNewImages([]); setEditNewPreviews([]); }} className="text-[11px] text-gray-500 hover:underline">Cancelar reemplazo</button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button type="submit" disabled={editLoading || !editForm.titulo || !editForm.contenido} className="px-3 py-1.5 rounded-lg text-xs text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400">Guardar</button>
                            <button type="button" onClick={()=>{ setEditandoNotaId(null); setEditForm({ titulo:'', contenido:'' }); setEditReplacingImages(false); setEditNewImages([]); setEditNewPreviews([]); }} className="px-3 py-1.5 rounded-lg text-xs border bg-white hover:bg-gray-50">Cancelar</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="font-medium text-gray-900 break-words">{n.titulo}</div>
                          <div className="text-gray-600 break-words whitespace-pre-wrap">{n.contenido}</div>
                          <div className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString('es-MX')} {n.revendedor_nombre ? `• ${n.revendedor_nombre}` : ''}</div>
                          {Array.isArray(n.imagenes) && n.imagenes.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {n.imagenes.slice(0,MAX_IMAGES).map((img,i)=>(
                                <button
                                  key={`${n.id}-${i}`}
                                  type="button"
                                  onClick={() => openImagesLightbox(n.imagenes.slice(0,MAX_IMAGES), i)}
                                  className="relative group focus:outline-none"
                                >
                                  <img src={resolveImageUrl(img)} alt={`nota-${i}`} className="h-20 w-20 object-cover rounded-lg border" loading="lazy" />
                                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-colors" />
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {editandoNotaId === n.id ? null : (
                      <div className="flex flex-col gap-2 items-end flex-shrink-0">
                        {n.estado === 0 || n.estado === '0' || n.estado === undefined ? (
                          <button
                            type="button"
                            onClick={()=>{ setEditandoNotaId(n.id); setEditForm({ titulo: n.titulo || '', contenido: n.contenido || '' }); setEditReplacingImages(false); setEditNewImages([]); setEditNewPreviews([]); setNotaError(null); }}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >Editar</button>
                        ) : (
                          <span className="text-[10px] text-gray-400">Realizada</span>
                        )}
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        )}

      {/* Direcciones de Clientes */}
      {activeTab === 'direcciones' && (
        <div id="section-direcciones" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Direcciones de Clientes</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <input
                type="text"
                placeholder="Buscar cliente por nombre, negocio o dirección"
                onChange={(e) => setClienteFiltro(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">Consejo: guarda lat/lng en el cliente para navegación precisa.</p>
            </div>
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(() => {
                  const filtro = (clienteFiltro || '').toLowerCase();
                  const lista = (revendedoresLista || []).filter(r => {
                    if (!filtro) return true;
                    const texto = `${r.responsable||''} ${r.nombre||''} ${r.nombre_negocio||''} ${r.direccion||''}`.toLowerCase();
                    return texto.includes(filtro);
                  }).slice(0, 12);
                  if (!lista.length) return <div className="text-sm text-gray-500">Sin resultados.</div>;
                  return lista.map(r => (
                    <div key={r.id} className="p-3 border rounded-xl flex items-start gap-3">
                      <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">{formatClienteLargo(r)}</div>
                        <div className="text-sm text-gray-600 truncate">{r.direccion || 'Sin dirección registrada'}</div>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setMapModal({ open: true, title: `Ubicación de ${formatClienteLargo(r)}`, lat: r.latitud, lng: r.longitud, direccion: r.direccion })}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800 text-xs"
                          >
                            Ver mapa
                          </button>
                          {(() => {
                            const lat = r.latitud; const lng = r.longitud; const dir = r.direccion;
                            const navUrl = (lat && lng) ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : (dir ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dir)}` : null);
                            return navUrl ? (
                              <a href={navUrl} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs">Navegar</a>
                            ) : null;
                          })()}
                          {r.direccion && (
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.direccion)}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-xs">Google Maps (dirección)</a>
                          )}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
        
    {/* Resumen y Estadísticas */}
    {activeTab === 'resumen' && (
  <div id="section-resumen" className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                  <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide truncate">Total</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{misTareas.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                  <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide truncate">Pendientes</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-amber-600">{tareasPendientes.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                  <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide truncate">Progreso</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{tareasEnProgreso.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                  <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide truncate">Completadas</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{tareasCompletadas.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Quinta card para eficiencia - solo visible en lg+ */}
          <div className="hidden lg:block lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-slate-500" />
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Eficiencia</p>
                </div>
                <p className="text-3xl font-bold text-blue-600">{tasaCompletado.toFixed(0)}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
    )}

  {/* Filtros de Tareas */}
  {activeTab === 'tareas' && (
  <div id="section-mis-tareas" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Mis Tareas</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFiltro('pendientes')}
                className={`px-3 py-2 rounded-xl font-medium transition-colors text-sm ${
                  filtro === 'pendientes' 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="hidden sm:inline">Pendientes </span>
                <span className="sm:hidden">Pend. </span>
                ({tareasPendientes.length})
              </button>
              <button
                onClick={() => setFiltro('progreso')}
                className={`px-3 py-2 rounded-xl font-medium transition-colors text-sm ${
                  filtro === 'progreso' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="hidden sm:inline">En Progreso </span>
                <span className="sm:hidden">Prog. </span>
                ({tareasEnProgreso.length})
              </button>
              <button
                onClick={() => setFiltro('completadas')}
                className={`px-3 py-2 rounded-xl font-medium transition-colors text-sm ${
                  filtro === 'completadas' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="hidden sm:inline">Completadas </span>
                <span className="sm:hidden">Comp. </span>
                ({tareasCompletadas.length})
              </button>
              <button
                onClick={() => setFiltro('todas')}
                className={`px-3 py-2 rounded-xl font-medium transition-colors text-sm ${
                  filtro === 'todas' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todas ({misTareas.length})
              </button>
            </div>
          </div>
        </div>
    )}

    {/* Lista de Tareas */}
    {activeTab === 'tareas' && (
  <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 sm:pr-2">
          {tareasFiltradas.length > 0 ? (
            tareasFiltradas
              .sort((a, b) => {
                // Prioridad: Urgentes primero, luego por fecha
                if (a.estado === 'Pendiente' && b.estado === 'Pendiente') {
                  const prioridades = { 'Urgente': 4, 'Alta': 3, 'Media': 2, 'Baja': 1 };
                  const difPrioridad = (prioridades[b.prioridad] || 0) - (prioridades[a.prioridad] || 0);
                  if (difPrioridad !== 0) return difPrioridad;
                }
                // Comparar por fecha de vencimiento
                const fechaA = a.fecha_vencimiento ? new Date(a.fecha_vencimiento) : new Date();
                const fechaB = b.fecha_vencimiento ? new Date(b.fecha_vencimiento) : new Date();
                return fechaA - fechaB;
              })
              .map(tarea => {
                // Mapear los campos del backend al formato esperado por el frontend
                const tareaFormateada = {
                  ...tarea,
                  revendedorId: tarea.revendedor_id,
                  trabajadorId: tarea.trabajador_id,
                  esAbierta: !!tarea.es_abierta,
                  acceptedAt: tarea.accepted_at || null,
                  fechaAsignacion: tarea.fecha_asignacion ? new Date(tarea.fecha_asignacion).toISOString().split('T')[0] : null,
                  fechaVencimiento: tarea.fecha_vencimiento ? new Date(tarea.fecha_vencimiento).toISOString().split('T')[0] : null,
                  fechaCompletado: tarea.fecha_completado ? new Date(tarea.fecha_completado).toISOString().split('T')[0] : null,
                };
                const isOpenUnaccepted = tareaFormateada.esAbierta && (!tareaFormateada.trabajadorId || tareaFormateada.trabajadorId === 0) && !tareaFormateada.acceptedAt;
                
                // Crear objeto revendedor desde los campos del join
                const revendedor = {
                  id: tarea.revendedor_id,
                  nombre: tarea.nombre_revendedor,
                  responsable: tarea.responsable_revendedor,
                  telefono: tarea.telefono_revendedor
                };
                
                const PrioridadIcon = getPrioridadIcon(tareaFormateada.prioridad);
                
                return (
                  <div key={tareaFormateada.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header de la Tarea - Optimizado para móvil */}
                    <div className="bg-gray-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                        <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 break-words">{tareaFormateada.titulo}</h3>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-gray-600">
                              <span className="flex items-center">
                                <Building2 className="w-4 h-4 mr-1 flex-shrink-0" />
                                <span className="truncate">{formatClienteNombre(revendedor) || 'Cliente no especificado'}</span>
                              </span>
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                                <span className="truncate">
                                  <span className="sm:hidden">Asig: </span>
                                  <span className="hidden sm:inline">Asignada: </span>
                                  {tareaFormateada.fechaAsignacion ? new Date(tareaFormateada.fechaAsignacion).toLocaleDateString('es-MX') : 'Sin fecha'}
                                </span>
                              </span>
                              <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                                <span className="truncate">
                                  <span className="sm:hidden">Venc: </span>
                                  <span className="hidden sm:inline">Vencimiento: </span>
                                  {tareaFormateada.fechaVencimiento ? new Date(tareaFormateada.fechaVencimiento).toLocaleDateString('es-MX') : 'Sin límite'}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-row lg:flex-col items-start lg:items-end space-x-3 lg:space-x-0 lg:space-y-3 flex-shrink-0">
                          <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border ${getPrioridadColor(tareaFormateada.prioridad)}`}>
                            <PrioridadIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            <span className="hidden sm:inline">{tareaFormateada.prioridad}</span>
                            <span className="sm:hidden">{tareaFormateada.prioridad.charAt(0)}</span>
                          </span>
                          {tareaFormateada.esAbierta && (
                            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                              Abierta
                            </span>
                          )}
                          
                          <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                            tareaFormateada.estado === 'Completado' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : tareaFormateada.estado === 'En Progreso'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {tareaFormateada.estado === 'Completado' && <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />}
                            {tareaFormateada.estado === 'En Progreso' && <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />}
                            {tareaFormateada.estado === 'Pendiente' && <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />}
                            <span className="hidden sm:inline">{tareaFormateada.estado}</span>
                            <span className="sm:hidden">
                              {tareaFormateada.estado === 'Completado' && 'Comp'}
                              {tareaFormateada.estado === 'En Progreso' && 'Prog'}
                              {tareaFormateada.estado === 'Pendiente' && 'Pend'}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contenido de la Tarea - Optimizado para móvil */}
                    <div className="p-4 sm:p-6 lg:p-8">
                      <div className="mb-4 sm:mb-6">
                        <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Descripción del Trabajo</h4>
                        <p className="text-gray-700 leading-relaxed text-sm sm:text-base break-words">{tareaFormateada.descripcion}</p>
                      </div>

          {/* Información del Cliente - Optimizado para móvil */}
                      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-xl">
                        <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Información del Cliente</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm">
                          <div>
            <span className="text-gray-500 block">Cliente:</span>
            <p className="font-medium text-gray-900 break-words">{revendedor?.responsable || revendedor?.nombre || 'No especificado'}</p>
                          </div>
                          <div>
            <span className="text-gray-500 block">Negocio:</span>
            <p className="font-medium text-gray-900 break-words">{revendedor?.nombre && revendedor?.responsable && revendedor?.nombre !== revendedor?.responsable ? revendedor?.nombre : (revendedor?.nombre_negocio || 'No especificado')}</p>
                          </div>
                          <div className="sm:col-span-2 lg:col-span-1">
                            <span className="text-gray-500 block">Teléfono:</span>
                            <p className="font-medium text-gray-900">{revendedor?.telefono || 'No especificado'}</p>
                          </div>
                        </div>
                        {/* Dirección y navegación: usar dirección si existe, y mapa si hay coordenadas */}
                        {(() => {
                          const direccion = tarea.cliente_direccion || tarea.revendedor_direccion;
                          const la = parseCoord(tarea.cliente_latitud ?? tarea.revendedor_latitud);
                          const lo = parseCoord(tarea.cliente_longitud ?? tarea.revendedor_longitud);
                          const coordsOk = hasValidCoords(la, lo);
                          const navigateUrl = coordsOk
                            ? `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}`
                            : (direccion ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}` : null);
                          if (!direccion && !coordsOk) return null;
                          return (
                            <div className="mt-2 text-sm text-gray-700">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                {direccion && (
                                  <div className="truncate"><span className="text-gray-500">Dirección:</span> {direccion}</div>
                                )}
                                <div className="flex-shrink-0 flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setMapModal({ open: true, title: 'Ubicación del cliente', lat, lng, direccion })}
                                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800 text-xs sm:text-sm"
                                  >
                                    Ver mapa
                                  </button>
                                  {navigateUrl && (
                                    <a
                                      href={navigateUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs sm:text-sm"
                                    >
                                      Navegar
                                    </a>
                                  )}
                                  {direccion && (
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      Google Maps (dirección)
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Mapa si hay coordenadas del cliente de servicio o del revendedor */}
                        {(() => {
                          const la = parseCoord(tarea.cliente_latitud ?? tarea.revendedor_latitud);
                          const lo = parseCoord(tarea.cliente_longitud ?? tarea.revendedor_longitud);
                          if (!hasValidCoords(la, lo)) return null;
                          const bbox = `${lo-0.005}%2C${la-0.005}%2C${lo+0.005}%2C${la+0.005}`;
                          const marker = `${la}%2C${lo}`;
                          return (
                            <div className="mt-4">
                              <div className="text-sm text-gray-600 mb-2">Ubicación aproximada</div>
                              <div className="w-full h-64 rounded-lg overflow-hidden border">
                                <iframe
                                  title={`mapa-${tareaFormateada.id}`}
                                  className="w-full h-full"
                                  loading="lazy"
                                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`}
                                />
                              </div>
                              <div className="mt-2 text-right">
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${la},${lo}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  Abrir en Google Maps
                                </a>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Acciones para Tareas Pendientes / Abiertas - Optimizado para móvil */}
                      {tareaFormateada.estado === 'Pendiente' && (
                        <div className="border-t border-gray-100 pt-4 sm:pt-6">
                          {isOpenUnaccepted ? (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                              <div className="text-sm text-gray-600">
                                Esta es una tarea abierta. Acéptala para reclamarla y comenzar.
                              </div>
                              <button
                                onClick={() => aceptarTareaAbierta(tareaFormateada.id)}
                                className="inline-flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-colors text-sm sm:text-base w-full sm:w-auto"
                              >
                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span>Aceptar Tarea</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                              <div className="text-sm text-gray-600">
                                ¿Listo para comenzar este trabajo?
                              </div>
                              <button
                                onClick={() => iniciarTarea(tareaFormateada.id)}
                                className="inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-colors text-sm sm:text-base w-full sm:w-auto"
                              >
                                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span>Iniciar Trabajo</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Acciones para Tareas En Progreso - Optimizado para móvil */}
                      {tareaFormateada.estado === 'En Progreso' && (
                        <div className="border-t border-gray-100 pt-4 sm:pt-6">
                          <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200 mb-4">
                            <div className="flex items-start space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-blue-800 mb-1 text-sm sm:text-base">Trabajo en Progreso</div>
                                <div className="text-sm text-blue-600">
                                  Este trabajo está actualmente en desarrollo.
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                            <div className="text-sm text-gray-600">
                              ¿Has completado este trabajo?
                            </div>
                            <button
                              onClick={() => abrirModalCompletar(tareaFormateada.id)}
                              className="inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-colors text-sm sm:text-base w-full sm:w-auto"
                            >
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                              <span className="hidden sm:inline">Marcar como Completado</span>
                              <span className="sm:hidden">Completar</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Información de Finalización - Optimizado para móvil */}
                      {tareaFormateada.estado === 'Completado' && (
                        <div className="border-t border-gray-100 pt-4 sm:pt-6">
                          <div className="bg-emerald-50 rounded-xl p-4 sm:p-6 border border-emerald-200">
                            <div className="flex items-start space-x-3">
                              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-emerald-800 mb-1 text-sm sm:text-base">Trabajo Completado</div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  {tareaFormateada.fechaCompletado && (
                                    <p>Finalizado el {new Date(tareaFormateada.fechaCompletado).toLocaleDateString('es-MX')}</p>
                                  )}
                                  {tareaFormateada.notas && (
                                    <div>
                                      <p className="font-medium text-gray-700 mt-2">Notas del trabajo:</p>
                                      <p className="text-gray-700 bg-white p-3 rounded-lg mt-1 border border-emerald-200 break-words">
                                        {tareaFormateada.notas}
                                      </p>
                                    </div>
                                  )}
                                  {Array.isArray(tarea.imagenes) && tarea.imagenes.length > 0 && (
                                    <div className="mt-3">
                                      <p className="font-medium text-gray-700">Imágenes:</p>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {tarea.imagenes.map((img,i)=>(
                                          <button key={`${tareaFormateada.id}-${i}`} type="button" onClick={()=>openImagesLightbox(tarea.imagenes, i)} className="group relative">
                                            <img src={resolveImageUrl(img)} alt={`tarea-img-${i}`} className="h-20 w-20 object-cover rounded-lg border" />
                                            <span className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/25 transition-colors" />
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {(() => {
                                    // Permitir reemplazo dentro de 24h (frontend placeholder)
                                    if (!tarea.fecha_completado) return null;
                                    const fin = new Date(tarea.fecha_completado).getTime();
                                    const ahora = Date.now();
                                    const dentroVentana = (ahora - fin) < 24*60*60*1000;
                                    if (!dentroVentana) return null;
                                    return (
                                      <div className="mt-3 flex flex-col gap-1">
                                        <p className="text-[11px] text-emerald-700">Puedes agregar o reemplazar imágenes dentro de las primeras 24h.</p>
                                        <button
                                          type="button"
                                          onClick={()=>{ setTareaEditandoImagenesId(tareaFormateada.id); setModalNotasAbierto(true); }}
                                          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs w-fit"
                                        >Agregar / Reemplazar Imágenes</button>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                {filtro === 'pendientes' && <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />}
                {filtro === 'progreso' && <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />}
                {filtro === 'completadas' && <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />}
                {filtro === 'todas' && <Target className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />}
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                {filtro === 'pendientes' && 'No tienes tareas pendientes'}
                {filtro === 'progreso' && 'No tienes tareas en progreso'}
                {filtro === 'completadas' && 'No has completado tareas aún'}
                {filtro === 'todas' && 'No tienes tareas asignadas'}
              </h3>
              <p className="text-gray-500 text-sm sm:text-base">
                {filtro === 'pendientes' && '¡Excelente trabajo! Todas tus tareas están al día.'}
                {filtro === 'progreso' && 'Las tareas en desarrollo aparecerán aquí.'}
                {filtro === 'completadas' && 'Las tareas completadas aparecerán aquí.'}
                {filtro === 'todas' && 'El administrador aún no te ha asignado tareas de mantenimiento.'}
              </p>
            </div>
          )}
        </div>
  )}

  {/* Sección de Rendimiento eliminada */}
      </div>
      {/* Navegación móvil fija */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
    <div className="grid grid-cols-4 h-14">
          {[ 
      { key: 'tareas', label: 'Tareas', icon: Wrench },
      { key: 'entrega', label: 'Entregar', icon: Package },
      { key: 'direcciones', label: 'Mapas', icon: MapPin },
      { key: 'notas', label: 'Notas', icon: FileText }
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
        key={item.key}
        onClick={() => {
          setActiveTab(item.key);
          try {
            const params = new URLSearchParams(location.search || '');
            params.set('tab', item.key);
            navigate && navigate({ search: params.toString() }, { replace: false });
          } catch {}
        }}
        className={`flex flex-col items-center justify-center space-y-1 ${activeTab === item.key ? 'text-blue-700' : 'text-gray-700'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Modal para completar tarea */}
      <ModalNotas
        isOpen={modalNotasAbierto}
        onClose={cerrarModal}
        onConfirm={manejarConfirmacionModal}
        titulo="Completar Tarea"
      />
      <MapModal
        open={mapModal.open}
        onClose={() => setMapModal(m => ({ ...m, open: false }))}
        title={mapModal.title}
        lat={mapModal.lat}
        lng={mapModal.lng}
        direccion={mapModal.direccion}
      />
      {imageModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={closeImagesLightbox}>
          <div className="relative max-w-3xl w-full" onClick={e=>e.stopPropagation()}>
            <button onClick={closeImagesLightbox} className="absolute -top-10 right-0 text-white/80 hover:text-white p-2">✕</button>
            <div className="relative bg-black rounded-lg overflow-hidden flex flex-col items-center">
              <img
                src={imageModal.images[imageModal.index]}
                alt={`img-${imageModal.index}`}
                className="max-h-[70vh] object-contain select-none"
                draggable={false}
              />
              {imageModal.images.length > 1 && (
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2">
                  <button onClick={prevImage} className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-full">‹</button>
                  <button onClick={nextImage} className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-full">›</button>
                </div>
              )}
              <div className="p-2 text-xs text-white/70 w-full flex items-center justify-center gap-2 bg-black/60">
                <span>{imageModal.index + 1} / {imageModal.images.length}</span>
              </div>
              <div className="flex flex-wrap gap-2 p-3 bg-black/60 w-full justify-center">
                {imageModal.images.map((im, idx) => (
                  <button
                    type="button"
                    key={`thumb-${idx}-${typeof im==='string'?im.slice(-8):'x'}`}
                    onClick={()=>setImageModal(m=>({...m,index:idx}))}
                    className={`border ${idx===imageModal.index?'border-white':'border-transparent'} rounded-md overflow-hidden h-14 w-14`}
                  >
                    <img src={im} alt={`thumb-${idx}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaTrabajador;