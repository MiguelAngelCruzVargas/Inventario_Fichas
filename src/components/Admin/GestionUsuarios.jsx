// components/Admin/GestionUsuarios.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Eye,
  EyeOff,
  Key,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  RefreshCw,
  Shield,
  User,
  UserCheck,
  Copy,
  AlertTriangle,
  Info,
  Database,
  Building2,
  ExternalLink,
  X,
  Edit3,
  Trash2
} from 'lucide-react';
import { useUsers } from '@context/UsersContext';
import usuariosService from '@services/usuariosService';
import passwordGeneratorService from '@services/passwordGeneratorService';
import clientesService from '@services/clientesService';

// Simple notification banner
const Notification = ({ notification, onClose }) => {
  if (!notification?.show) return null;
  const type = notification.type || 'info';
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  return (
    <div className={`mb-4 p-3 border rounded-lg flex items-center justify-between ${styles[type] || styles.info}`}>
      <div className="flex items-center gap-2">
        {type === 'success' && <CheckCircle className="w-4 h-4" />}
        {type === 'error' && <AlertCircle className="w-4 h-4" />}
        {type === 'warning' && <AlertTriangle className="w-4 h-4" />}
        {type === 'info' && <Info className="w-4 h-4" />}
        <span className="text-sm">{notification.message}</span>
      </div>
      <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Cerrar">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Simple error modal
const ErrorModal = ({ errorModal, onClose }) => {
  if (!errorModal?.show) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ocurrió un error</h3>
          <p className="text-sm text-gray-600 mb-6">{errorModal.message || 'Ha ocurrido un error inesperado.'}</p>
          <div className="flex space-x-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal para mostrar credenciales creadas
const CredentialsModal = ({ modalConfig, onClose, onCopy }) => {
  if (!modalConfig?.show) return null;
  const { usuario, password, nombre } = modalConfig;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Usuario Creado Exitosamente</h3>
          <p className="text-sm text-gray-600 mb-6">
            Guarda estas credenciales para <strong>{nombre || 'el nuevo usuario'}</strong>. No se mostrarán de nuevo.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3 text-left border">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Usuario:</span>
              <code className="text-sm bg-white px-2 py-1 rounded border">{usuario}</code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Contraseña:</span>
              <code className="text-sm bg-white px-2 py-1 rounded border">{password}</code>
            </div>
                <p className="text-xs text-gray-500 mt-1">Sugerencia: si seleccionas "Fecha del primer corte", autollenaremos este día automáticamente (máximo 28).</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => onCopy?.(`Usuario: ${usuario}\nContraseña: ${password}`)}
              className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" /> Copiar
            </button>
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal rápido para crear Cliente (servicio, ocasional) o Revendedor
const QuickAddClienteModal = ({ isOpen, onClose, onCreated, onShowCredentials }) => {
  const [form, setForm] = useState({
    tipo: 'servicio', // 'servicio' | 'ocasional' | 'revendedor'
    // comunes
    nombre_completo: '',
    telefono: '',
    email: '',
    direccion: '',
    latitud: '',
    longitud: '',
    // servicio
    plan: '',
    velocidad_mbps: '',
    cuota_mensual: '',
    fecha_instalacion: '',
  fecha_primer_corte: '',
    dia_corte: '',
    estado: 'activo',
    activo: true,
    // revendedor
    nombre_negocio: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrResults, setAddrResults] = useState([]);
  const [addrSearched, setAddrSearched] = useState(false);
  const [showAdvancedLocation, setShowAdvancedLocation] = useState(false);

  // Helpers para generar username a partir del nombre y asegurar unicidad
  const normalize = (str) => (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const buildBaseUsername = (nombre) => {
    const n = normalize(nombre);
    if (!n) return `cliente${Math.floor(Math.random()*1000)}`;
    const parts = n.split(' ').filter(Boolean);
    const base = (parts[0] || 'cliente') + (parts[1] ? '_' + parts[1] : '');
    return base.slice(0, 20);
  };

  const tryCreateClienteUser = async ({ clienteId, nombreCompleto, telefono, email }) => {
    const base = buildBaseUsername(nombreCompleto);
    const maxTries = 6; // base + 5 sufijos
    let lastError = null;
    // Generar contraseña usando el generador común (cae en fallback si no hay tipo específico)
    const passGen = passwordGeneratorService.generatePassword('cliente', nombreCompleto);
    const password = passGen?.password || `Cli${Math.random().toString(36).slice(2, 10)}`;
    for (let i = 0; i < maxTries; i++) {
      const username = i === 0 ? base : `${base}${i}`;
      try {
        const res = await usuariosService.crearUsuario({
          username,
          password,
          role: 'cliente',
          nombre_completo: nombreCompleto,
          telefono: telefono || null,
          email: email || null,
          active: true,
          cliente_id: clienteId,
        });
        if (res?.success) {
          return { success: true, username, password };
        }
        lastError = res?.error || 'Error desconocido';
        // Si el error indica conflicto de username, intenta con el siguiente
        if (!/usuario.*existe|nombre de usuario ya existe|ya está en uso/i.test(String(lastError))) {
          break; // error no relacionado a duplicado -> no seguir probando
        }
      } catch (e) {
        lastError = e?.response?.data?.message || e?.message || 'Error al crear usuario cliente';
        if (!/usuario.*existe|nombre de usuario ya existe|ya está en uso/i.test(String(lastError))) break;
      }
    }
    return { success: false, error: lastError };
  };

  // Extra: permite pegar una URL de Google Maps o "lat, lng" y obtener coordenadas
  const parseLatLngFromText = (text) => {
    if (!text) return null;
    const t = String(text).trim();
    // 1) lat,lng directos
    const m1 = t.match(/(-?\d{1,2}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/);
    if (m1) {
      const lat = parseFloat(m1[1]);
      const lon = parseFloat(m1[2]);
      if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
    }
    // 2) URL de Google Maps con @lat,lng
    if (/google\.\w+\/maps/i.test(t) && t.includes('@')) {
      const at = t.split('@')[1];
      if (at) {
        const parts = at.split(',');
        if (parts.length >= 2) {
          const lat = parseFloat(parts[0]);
          const lon = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
        }
      }
    }
    // 3) URL con ?query=lat,lng
    try {
      const u = new URL(t);
      const q = u.searchParams.get('query') || u.searchParams.get('q');
      if (q) {
        const m2 = q.match(/(-?\d{1,2}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/);
        if (m2) {
          const lat = parseFloat(m2[1]);
          const lon = parseFloat(m2[2]);
          if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
        }
      }
    } catch {}
    return null;
  };

  if (!isOpen) return null;

  const validate = () => {
    const e = {};
    if (!['servicio', 'ocasional', 'revendedor'].includes(form.tipo)) e.tipo = 'Selecciona un tipo válido';
    if (form.tipo === 'revendedor') {
      if (!form.nombre_negocio?.trim()) e.nombre_negocio = 'Nombre del negocio requerido';
      if (!form.nombre_completo?.trim()) e.nombre_completo = 'Responsable requerido';
      if (!form.telefono?.trim()) e.telefono = 'Teléfono requerido';
      // Dirección opcional pero si la escribe, sugerimos fijar ubicación
    }
    if (form.tipo === 'servicio') {
      if (!form.nombre_completo?.trim()) e.nombre_completo = 'Nombre completo requerido';
      // Para clientes de servicio, sugerimos/forzamos capturar ubicación precisa
      if (!form.latitud || !form.longitud) e.ubicacion = 'Selecciona la ubicación exacta (usa Buscar o Mi ubicación)';
      if (form.cuota_mensual === '' || isNaN(Number(form.cuota_mensual)) || Number(form.cuota_mensual) <= 0) e.cuota_mensual = 'Cuota mensual requerida (> 0)';
      if (!form.fecha_instalacion) e.fecha_instalacion = 'Fecha de instalación requerida';
      // Si no hay fecha_primer_corte, requerimos el día de corte manual
      if (!form.fecha_primer_corte) {
        const dia = parseInt(form.dia_corte, 10);
        if (!dia || dia < 1 || dia > 31) e.dia_corte = 'Día de corte 1-31 requerido';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: type === 'checkbox' ? checked : value };
      // Autollenar día de corte al elegir fecha_primer_corte
      if (name === 'fecha_primer_corte' && value) {
        try {
          const d = new Date(value + 'T00:00:00');
          if (!isNaN(d.getTime())) {
            let day = d.getUTCDate();
            if (day > 28) day = 28; // evitar fechas inválidas en meses cortos
            next.dia_corte = String(day);
          }
        } catch {}
      }
      // Auto-generar email para SERVICIO basado en nombre_completo (igual que en modal de usuarios)
      if (name === 'nombre_completo' && (f.tipo === 'servicio')) {
        const trimmed = (value || '').trim();
        const prevAutoBase = buildBaseUsername(f.nombre_completo || '');
        const wasAuto = !f.email || f.email === '' || f.email === `${prevAutoBase}@empresa.com` || f.email.endsWith('@empresa.com');
        if (trimmed && wasAuto) {
          const candidate = buildBaseUsername(trimmed);
          next.email = `${candidate}@empresa.com`;
        } else if (!trimmed && f.email && f.email.endsWith('@empresa.com')) {
          next.email = '';
        }
      }
      // Auto-generar email para REVENDEDOR basado en nombre_negocio (igual que en modal de usuarios)
      if (name === 'nombre_negocio') {
        const trimmed = (value || '').trim();
        const prevAutoBase = buildBaseUsername(f.nombre_negocio || '');
        const wasAuto = !f.email || f.email === '' || f.email === `${prevAutoBase}@empresa.com` || f.email.endsWith('@empresa.com');
        if (trimmed && wasAuto) {
          const candidate = buildBaseUsername(trimmed);
          next.email = `${candidate}@empresa.com`;
        } else if (!trimmed && f.email && f.email.endsWith('@empresa.com')) {
          next.email = '';
        }
      }
      return next;
    });
    if (name === 'direccion') {
      setAddrResults([]);
      setAddrSearched(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (form.tipo === 'revendedor') {
        // Crear revendedor a través de la API dedicada; el backend generará usuario y contraseña
        const res = await usuariosService.crearRevendedor({
          nombre_negocio: form.nombre_negocio.trim(),
          nombre: form.nombre_negocio.trim(),
          responsable: form.nombre_completo.trim(),
          telefono: form.telefono?.trim() || '',
          direccion: form.direccion?.trim() || '',
          email: form.email?.trim() || null,
          // porcentaje opcional: usar default backend
        });
        if (res?.success) {
          // Mostrar credenciales si el backend las envía
          const creds = res.data?.temp_credentials;
          if (creds && onShowCredentials) {
            onShowCredentials({ usuario: creds.username, password: creds.password, nombre: form.nombre_negocio });
          }
          // Normalizar objeto para callback (reutiliza mensaje genérico de éxito)
          onCreated?.({ id: res.data?.id, nombre_completo: form.nombre_negocio, tipo: 'revendedor' });
          onClose?.();
        } else {
          setErrors({ general: res?.error || 'No se pudo crear el revendedor' });
        }
      } else {
        // Crear cliente servicio/ocasional
        const payload = {
          tipo: form.tipo,
          nombre_completo: form.nombre_completo.trim(),
          telefono: form.telefono?.trim() || null,
          email: form.email?.trim() || null,
          direccion: form.direccion?.trim() || null,
          latitud: form.latitud !== '' ? Number(form.latitud) : null,
          longitud: form.longitud !== '' ? Number(form.longitud) : null,
          plan: null,
          velocidad_mbps: null,
          cuota_mensual: form.tipo === 'servicio' && form.cuota_mensual !== '' ? Number(form.cuota_mensual) : null,
          fecha_instalacion: form.tipo === 'servicio' ? form.fecha_instalacion || null : null,
          fecha_primer_corte: form.tipo === 'servicio' ? (form.fecha_primer_corte || null) : null,
          dia_corte: form.tipo === 'servicio' && form.dia_corte !== '' ? parseInt(form.dia_corte, 10) : null,
          estado: null,
          activo: form.activo ? 1 : 0,
        };
        const res = await clientesService.crear(payload);
        if (res?.success) {
          const nuevoCliente = res.cliente || {};
          // Si es servicio, crear también el usuario vinculado y mostrar credenciales
          if (form.tipo === 'servicio' && nuevoCliente?.id) {
            const r = await tryCreateClienteUser({
              clienteId: nuevoCliente.id,
              nombreCompleto: payload.nombre_completo,
              telefono: payload.telefono,
              email: payload.email,
            });
            if (r?.success && onShowCredentials) {
              onShowCredentials({ usuario: r.username, password: r.password, nombre: payload.nombre_completo });
            }
          }
          onCreated?.(nuevoCliente);
          onClose?.();
        } else {
          setErrors({ general: res?.error || 'No se pudo crear el cliente' });
        }
      }
    } catch (err) {
      setErrors({ general: err.response?.data?.error || 'Error al crear cliente' });
    } finally {
      setLoading(false);
    }
  };

  const buscarDireccion = async () => {
    const addr = (form.direccion || '').trim();
    if (!addr) {
      setErrors((e) => ({ ...e, direccion: 'Ingresa una dirección para buscar' }));
      return;
    }
    // Si el usuario pegó lat,lng o una URL de Google Maps, úsalo directamente
    const parsed = parseLatLngFromText(addr);
    if (parsed) {
      const nf = { ...form, latitud: parsed.lat.toFixed(6), longitud: parsed.lon.toFixed(6) };
      setForm(nf);
      setErrors((e) => ({ ...e, ubicacion: undefined }));
      setAddrResults([]);
      setAddrSearched(true);
      return;
    }
    // Si es una URL de Google Maps (incluyendo maps.app.goo.gl), resuélvela vía backend
    if (/(maps\.app\.goo\.gl|goo\.gl\/maps|google\.[a-z.]+\/maps)/i.test(addr)) {
      try {
        setAddrLoading(true);
        setAddrSearched(true);
        const res = await fetch(`/api/geo/resolve?url=${encodeURIComponent(addr)}`, { headers: { Accept: 'application/json' } });
        const data = await res.json();
        if (data?.success && (data.lat && data.lon)) {
          const nf = { ...form, latitud: Number(data.lat).toFixed(6), longitud: Number(data.lon).toFixed(6) };
          if (data.display_name) nf.direccion = data.display_name;
          setForm(nf);
          setErrors((e) => ({ ...e, ubicacion: undefined }));
          setAddrResults([]);
          return; // done
        }
      } catch (e) {
        // fallback to normal geocoding below
      } finally {
        setAddrLoading(false);
      }
    }
    setAddrLoading(true);
  setAddrSearched(true);
    setErrors((e) => ({ ...e, direccion: undefined }));
    try {
      const res = await fetch(`/api/geo/search?limit=5&q=${encodeURIComponent(addr)}`, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      if (data?.success) setAddrResults(Array.isArray(data.results) ? data.results : []);
      else setAddrResults([]);
    } catch (e) {
      setAddrResults([]);
    } finally {
      setAddrLoading(false);
    }
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setErrors((e) => ({ ...e, ubicacion: 'Geolocalización no disponible en este navegador' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude).toFixed(6);
        const lon = Number(pos.coords.longitude).toFixed(6);
        setForm((f) => ({ ...f, latitud: lat, longitud: lon }));
        setErrors((e) => ({ ...e, ubicacion: undefined }));
      },
      () => setErrors((e) => ({ ...e, ubicacion: 'No se pudo obtener tu ubicación' })),
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // This variable was referenced but not defined earlier; define it based on current form.direccion
  const mapsSearchUrl = form?.direccion?.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.direccion.trim())}`
    : '';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Nuevo Cliente
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">{errors.general}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select
              name="tipo"
              value={form.tipo}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.tipo ? 'border-red-500' : 'border-gray-200'}`}
            >
              <option value="servicio">Servicio mensual</option>
              <option value="ocasional">Ocasional</option>
              <option value="revendedor">Revendedor</option>
            </select>
            {errors.tipo && <p className="text-xs text-red-600 mt-1">{errors.tipo}</p>}
          </div>
          {form.tipo === 'revendedor' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Negocio *</label>
                <input
                  name="nombre_negocio"
                  value={form.nombre_negocio}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.nombre_negocio ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="Tienda de Juan"
                />
                {errors.nombre_negocio && <p className="text-xs text-red-600 mt-1">{errors.nombre_negocio}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsable *</label>
                <input
                  name="nombre_completo"
                  value={form.nombre_completo}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.nombre_completo ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="Ej. Juan Pérez"
                />
                {errors.nombre_completo && <p className="text-xs text-red-600 mt-1">{errors.nombre_completo}</p>}
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
              <input
                name="nombre_completo"
                value={form.nombre_completo}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.nombre_completo ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="Ej. Juan Pérez"
              />
              {errors.nombre_completo && <p className="text-xs text-red-600 mt-1">{errors.nombre_completo}</p>}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.telefono ? 'border-red-500' : 'border-gray-200'}`}
              placeholder="555-1234567"
            />
            {errors.telefono && <p className="text-xs text-red-600 mt-1">{errors.telefono}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 border-gray-200"
              placeholder="cliente@correo.com"
            />
            {form.tipo === 'servicio' && !form.email && form.nombre_completo?.trim() && (
              <p className="text-xs text-gray-500 mt-1">
                Se generará automáticamente: {buildBaseUsername(form.nombre_completo)}@empresa.com
              </p>
            )}
            {form.tipo === 'revendedor' && !form.email && form.nombre_negocio?.trim() && (
              <p className="text-xs text-gray-500 mt-1">
                Se generará automáticamente: {buildBaseUsername(form.nombre_negocio)}@empresa.com
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <div className="flex flex-wrap items-stretch gap-2">
              <input
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
                className={`min-w-0 flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.direccion ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="Calle y colonia, ciudad"
              />
              <button
                type="button"
                onClick={buscarDireccion}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                disabled={addrLoading}
              >
                {addrLoading ? 'Buscando…' : 'Buscar'}
              </button>
              <button
                type="button"
                onClick={usarMiUbicacion}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
              >
                Mi ubicación
              </button>
              {mapsSearchUrl && (
                <a
                  href={mapsSearchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm flex items-center gap-1"
                  title="Abrir la dirección escrita en Google Maps"
                >
                  <ExternalLink className="w-4 h-4" /> Abrir en Maps
                </a>
              )}
            </div>
            {errors.ubicacion && <p className="text-xs text-red-600 mt-1">{errors.ubicacion}</p>}
            {addrResults.length > 0 && (
              <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-sm max-h-48 overflow-auto">
                {addrResults.map((r, idx) => (
                  <div key={`${r.place_id || idx}`} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-50 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        const lat = parseFloat(r.lat).toFixed(6);
                        const lon = parseFloat(r.lon).toFixed(6);
                        const nf = { ...form, direccion: r.display_name || form.direccion, latitud: lat, longitud: lon };
                        setForm(nf);
                        setErrors((e) => ({ ...e, ubicacion: undefined }));
                        setAddrResults([]);
                      }}
                      className="text-left flex-1 truncate"
                      title="Usar esta dirección y coordenadas"
                    >
                      {r.display_name || `${r.lat}, ${r.lon}`}
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.display_name || '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
                      title="Ver en Google Maps"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
            {addrSearched && addrResults.length === 0 && !addrLoading && form.direccion?.trim() && (
              <div className="mt-2 text-xs text-gray-500">No se encontraron resultados. Intenta ser más específico (calle, colonia, ciudad).</div>
            )}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowAdvancedLocation(!showAdvancedLocation)}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                {showAdvancedLocation ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
              </button>
            </div>
            {showAdvancedLocation && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitud</label>
                  <input
                    name="latitud"
                    type="number"
                    step="0.000001"
                    value={form.latitud}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 19.4326"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitud</label>
                  <input
                    name="longitud"
                    type="number"
                    step="0.000001"
                    value={form.longitud}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: -99.1332"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const addr = (form.direccion || '').trim();
                        if (!addr) {
                          setErrors((e) => ({ ...e, direccion: 'Ingresa una dirección para geocodificar' }));
                          return;
                        }
                        const url = `/api/geo/search?format=json&limit=1&q=${encodeURIComponent(addr)}`;
                        const res = await fetch(url, { headers: { Accept: 'application/json' } });
                        const data = await res.json();
                        const results = Array.isArray(data?.results) ? data.results : [];
                        if (results.length > 0) {
                          const { lat, lon } = results[0];
                          const nf = { ...form, latitud: parseFloat(lat).toFixed(6), longitud: parseFloat(lon).toFixed(6) };
                          setForm(nf);
                          setErrors((e) => ({ ...e, ubicacion: undefined }));
                        }
                      } catch {}
                    }}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Coordenadas desde dirección
                  </button>
                  {form.latitud && form.longitud && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${form.latitud},${form.longitud}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                    >
                      Abrir en Google Maps
                    </a>
                  )}
                </div>
              </div>
            )}
            {form.latitud && form.longitud && (
              <div className="mt-3">
                <div className="text-xs text-gray-600 mb-1">Vista previa del mapa</div>
                <div className="w-full h-56 rounded-lg overflow-hidden border">
                  {(() => {
                    const lat = form.latitud;
                    const lng = form.longitud;
                    const bbox = `${Number(lng)-0.005}%2C${Number(lat)-0.005}%2C${Number(lng)+0.005}%2C${Number(lat)+0.005}`;
                    const marker = `${lat}%2C${lng}`;
                    return (
                      <iframe
                        title="mapa-cliente-nuevo"
                        className="w-full h-full"
                        loading="lazy"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`}
                      />
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {form.tipo === 'servicio' && (
          <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-900 mb-3">Datos del servicio</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuota mensual *</label>
                <input
                  name="cuota_mensual"
                  value={form.cuota_mensual}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.cuota_mensual ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="350"
                />
                {errors.cuota_mensual && <p className="text-xs text-red-600 mt-1">{errors.cuota_mensual}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de instalación *</label>
                <input
                  type="date"
                  name="fecha_instalacion"
                  value={form.fecha_instalacion}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.fecha_instalacion ? 'border-red-500' : 'border-gray-200'}`}
                />
                {errors.fecha_instalacion && <p className="text-xs text-red-600 mt-1">{errors.fecha_instalacion}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del primer corte (opcional)</label>
                <input
                  type="date"
                  name="fecha_primer_corte"
                  value={form.fecha_primer_corte}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 border-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{form.fecha_primer_corte ? 'Día de corte (auto)' : 'Día de corte *'}</label>
                <input
                  name="dia_corte"
                  value={form.dia_corte}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.dia_corte ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="1-31"
                />
                {errors.dia_corte && <p className="text-xs text-red-600 mt-1">{errors.dia_corte}</p>}
                <p className="text-xs text-gray-500 mt-1">Si eliges "Fecha del primer corte", este día se autollenará (máximo 28).</p>
              </div>
            </div>
          </div>
        )}

        {form.tipo === 'servicio' && (
          <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
            Al crear un Cliente de servicio se generará automáticamente un usuario y contraseña asociados. Podrás copiar las credenciales al finalizar.
          </div>
        )}

        {/* Nota informativa para revendedor */}
        {form.tipo === 'revendedor' && (
          <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
            Al crear un Revendedor se generará automáticamente un usuario y contraseña. Podrás copiar las credenciales al finalizar.
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="activo" checked={!!form.activo} onChange={handleChange} /> Activo
          </label>
          <div className="flex gap-2">
            <button onClick={onClose} type="button" className="px-4 py-2 text-gray-600 hover:text-gray-800">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Crear</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmationModal = ({ modalConfig, onConfirm, onClose, loading }) => {
  if (!modalConfig.show) return null;

  const { usuario, deletionInfo } = modalConfig;

  if (!deletionInfo) {
    // Modal simple si no hay información detallada
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar Eliminación</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Estás seguro de eliminar a <strong className="text-red-600">"{usuario?.username}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                {loading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { canDelete, warnings, criticalData, recommendations } = deletionInfo;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div
            className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
              canDelete ? 'bg-yellow-100' : 'bg-red-100'
            }`}
          >
            {canDelete ? <AlertTriangle className="h-6 w-6 text-yellow-600" /> : <AlertCircle className="h-6 w-6 text-red-600" />}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {canDelete ? '⚠️ Eliminación con Pérdida de Datos' : '🚫 Eliminación Bloqueada'}
          </h3>
          <p className="text-sm text-gray-600">
            Usuario: <strong className="text-red-600">"{usuario?.username}"</strong> ({usuario?.role})
          </p>
        </div>

        {/* Información crítica */}
        {Object.keys(criticalData).length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Database className="w-4 h-4 mr-2" />
              Datos que se eliminarán permanentemente:
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {usuario?.role === 'revendedor' && (
                <>
                  <div className="flex justify-between">
                    <span>📦 Inventarios:</span>
                    <span className="font-semibold">{criticalData.inventarios || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🎫 Fichas pendientes:</span>
                    <span className="font-semibold text-red-600">{criticalData.fichas_pendientes || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💰 Ventas registradas:</span>
                    <span className="font-semibold">{criticalData.ventas || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💵 Monto total ventas:</span>
                    <span className="font-semibold">${criticalData.monto_total_ventas || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>📋 Entregas:</span>
                    <span className="font-semibold">{criticalData.entregas || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🏦 Cortes de caja:</span>
                    <span className="font-semibold">{criticalData.cortes_caja || 0}</span>
                  </div>
                </>
              )}
              {usuario?.role === 'trabajador' && (
                <>
                  <div className="flex justify-between">
                    <span>⏳ Tareas pendientes:</span>
                    <span className="font-semibold text-red-600">{criticalData.tareas_pendientes || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>✅ Tareas completadas:</span>
                    <span className="font-semibold">{criticalData.tareas_completadas || 0}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Advertencias */}
        {warnings.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Advertencias importantes:
            </h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {warnings.map((warning) => {
                const key = `warn-${Math.abs((warning || '').split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0))}`;
                return (
                  <li key={key} className="flex items-start">
                    <span className="mr-2">•</span>
                    {warning}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Recomendaciones */}
        {recommendations.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
              <Info className="w-4 h-4 mr-2" />
              Recomendaciones:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {recommendations.map((recommendation) => {
                const key = `rec-${Math.abs((recommendation || '').split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0))}`;
                return (
                  <li key={key} className="flex items-start">
                    <span className="mr-2">💡</span>
                    {recommendation}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Botones */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>

          {canDelete ? (
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              {loading ? 'Eliminando...' : 'Eliminar Definitivamente'}
            </button>
          ) : (
            <div className="flex-1 px-4 py-2 text-sm bg-gray-100 text-gray-500 rounded-lg text-center">Eliminación Bloqueada</div>
          )}
        </div>

        {canDelete && <p className="text-xs text-gray-500 text-center mt-3">⚠️ Esta acción es irreversible. Todo el historial se perderá para siempre.</p>}
      </div>
    </div>
  );
};

const UserFormModal = ({ isOpen, onClose, usuarioEditando, onSave, loading, showNotification }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: '',
    active: true,
    nombre_completo: '',
    telefono: '',
    email: '',
    nombre_negocio: '',
    direccion: '',
    latitud: '',
    longitud: '',
    especialidad: '',
  });
  const [errors, setErrors] = useState({});
  const [mostrarPassword, setMostrarPassword] = useState(false);
  // UX de ubicación
  const [addrResults, setAddrResults] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [showAdvancedLocation, setShowAdvancedLocation] = useState(false);
  // Clientes (para rol "cliente")
  const [clientesLista, setClientesLista] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [clientesFiltro, setClientesFiltro] = useState('');
  const [isQuickClienteOpen, setIsQuickClienteOpen] = useState(false);

  const validateForm = useCallback(
    (data) => {
      const newErrors = {};
      if (!data.username?.trim()) newErrors.username = 'El nombre de usuario es requerido.';
      if (!data.role) newErrors.role = 'El rol es requerido.';
      if (!data.nombre_completo?.trim()) newErrors.nombre_completo = 'El nombre completo es requerido.';
      if (!usuarioEditando && !data.password?.trim()) newErrors.password = 'La contraseña es requerida para nuevos usuarios.';
  if (data.role === 'cliente' && !data.cliente_id) newErrors.cliente_id = 'Selecciona un cliente para asociar.';
      // Validación de email solo si se proporciona
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        newErrors.email = 'El formato del email no es válido.';
      }
      return newErrors;
    },
    [usuarioEditando]
  );

  useEffect(() => {
    if (isOpen) {
      const initialData = usuarioEditando
        ? {
            username: usuarioEditando.username || '',
            password: '',
            role: usuarioEditando.role || '',
            active: usuarioEditando.active !== undefined ? usuarioEditando.active : true,
            nombre_completo: usuarioEditando.nombre_completo || '',
            telefono: usuarioEditando.telefono || '',
            email: usuarioEditando.email || '',
            nombre_negocio: usuarioEditando.nombre_negocio || '',
            direccion: usuarioEditando.direccion || '',
            latitud: usuarioEditando.latitud ?? '',
            longitud: usuarioEditando.longitud ?? '',
            especialidad: usuarioEditando.especialidad || '',
            cliente_id: usuarioEditando.cliente_id ?? '',
          }
        : {
            username: '',
            password: '',
            role: '',
            active: true,
            nombre_completo: '',
            telefono: '',
            email: '',
            nombre_negocio: '',
            direccion: '',
            latitud: '',
            longitud: '',
            especialidad: '',
            cliente_id: '',
          };
      setFormData(initialData);
      setErrors(validateForm(initialData));
    }
  }, [isOpen, usuarioEditando, validateForm]);

  // Cargar clientes activos cuando el rol sea "cliente"
  useEffect(() => {
    const loadClientes = async () => {
      try {
        setClientesLoading(true);
        const res = await clientesService.listar({ activo: true });
        const list = res?.clientes || [];
        setClientesLista(list);
      } catch (e) {
        showNotification?.('No se pudieron cargar los clientes activos', 'error');
        setClientesLista([]);
      } finally {
        setClientesLoading(false);
      }
    };
    if (isOpen && formData.role === 'cliente') {
      loadClientes();
    }
  }, [isOpen, formData.role]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newFormData = { ...formData, [name]: type === 'checkbox' ? checked : value };

    // Auto-generar email cuando cambie el username
    if (name === 'username') {
      // Si hay username y el email está vacío O es un email auto-generado previo
      if (
        value &&
        value.trim() &&
        (!formData.email ||
          formData.email === '' ||
          formData.email === `${formData.username}@empresa.com` ||
          formData.email.endsWith('@empresa.com'))
      ) {
        newFormData.email = `${value.trim()}@empresa.com`;
      }
      // Si se borra el username, limpiar el email auto-generado
      else if ((!value || value.trim() === '') && formData.email && formData.email.endsWith('@empresa.com')) {
        newFormData.email = '';
      }
    }

    setFormData(newFormData);
    setErrors(validateForm(newFormData));
  };

  const handleGeneratePassword = () => {
    if (!formData.role || !formData.nombre_completo) {
      showNotification('Selecciona un rol e ingresa el nombre completo primero.', 'error');
      return;
    }
    try {
      // Para revendedores, informar sobre el nombre del negocio
      if (formData.role === 'revendedor' && (!formData.nombre_negocio || formData.nombre_negocio.trim() === '')) {
        showNotification('💡 Tip: Si agregas el nombre del negocio, la contraseña será más específica y fácil de recordar.', 'info');
      }

      const result = passwordGeneratorService.generatePassword(
        formData.role,
        formData.nombre_completo,
        formData.nombre_negocio
      );
      const newFormData = { ...formData, password: result.password };
      setFormData(newFormData);
      setErrors(validateForm(newFormData));
      showNotification(`✅ Contraseña generada exitosamente`, 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const handleSave = () => {
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showNotification('Por favor, corrige los errores marcados.', 'error');
      return;
    }
    onSave(formData);
  };

  const buscarDireccion = async () => {
    try {
      const addr = (formData.direccion || '').trim();
      if (!addr) {
        showNotification('Ingresa una dirección para buscar', 'error');
        return;
      }
      setAddrLoading(true);
      setAddrResults([]);
  const url = `/api/geo/search?format=json&limit=5&q=${encodeURIComponent(addr)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  setAddrResults(results);
  if (results.length === 0) showNotification('No se encontraron resultados para esa dirección', 'warning');
    } catch (e) {
      showNotification('Error al buscar dirección', 'error');
    } finally {
      setAddrLoading(false);
    }
  };

  const usarMiUbicacion = async () => {
    try {
      if (!navigator.geolocation) {
        showNotification('Geolocalización no disponible en este navegador', 'error');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const newFormData = { ...formData, latitud: Number(lat).toFixed(6), longitud: Number(lon).toFixed(6) };
          try {
            const rev = await fetch(`/api/geo/reverse?lat=${lat}&lon=${lon}`, { headers: { Accept: 'application/json' } });
            const revData = await rev.json();
            const display = revData?.result?.display_name || revData?.display_name;
            if (display) newFormData.direccion = display;
          } catch {}
          setFormData(newFormData);
          setErrors(validateForm(newFormData));
          showNotification('Ubicación establecida', 'success');
        },
        (err) => {
          showNotification('No se pudo obtener la ubicación', 'error');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch (e) {
      showNotification('No se pudo obtener la ubicación', 'error');
    }
  };

  if (!isOpen) return null;

  const isSaveDisabled = loading || Object.keys(errors).length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{usuarioEditando ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Información de campos obligatorios */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Campos obligatorios (*):</span> Nombre de Usuario, Rol, Nombre Completo
            {!usuarioEditando && ', Contraseña'}
          </p>
          <p className="text-xs text-blue-600 mt-1">Los demás campos son opcionales. El email se genera automáticamente si no se especifica.</p>
          {!usuarioEditando && (
            <p className="text-xs text-blue-700 mt-1">
              Para crear Revendedores o Clientes, usa el botón <strong>Nuevo Cliente</strong>.
            </p>
          )}
        </div>

        <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5 mb-6">
            {/* Campos del formulario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Usuario *</label>
              <input
                name="username"
                type="text"
                value={formData.username || ''}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.username ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="maria_juana"
              />
              {errors.username && <p className="text-xs text-red-600 mt-1">{errors.username}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
              <select
                name="role"
                value={formData.role || ''}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.role ? 'border-red-500' : 'border-gray-200'}`}
              >
                <option value="">Seleccionar rol</option>
                <option value="admin">Administrador</option>
                <option value="trabajador">Trabajador</option>
                {usuarioEditando && (formData.role === 'revendedor') && (
                  <option value="revendedor">Revendedor (solo edición)</option>
                )}
                {usuarioEditando && (formData.role === 'cliente') && (
                  <option value="cliente">Cliente (solo edición)</option>
                )}
              </select>
              {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
              {!usuarioEditando && (
                <p className="text-xs text-gray-500 mt-1">Para Revendedor/Cliente, usa "Nuevo Cliente".</p>
              )}
            </div>
            {formData.role === 'cliente' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente asociado *</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-stretch">
                    <input
                      type="text"
                      placeholder="Filtrar clientes por nombre..."
                      value={clientesFiltro}
                      onChange={(e) => setClientesFiltro(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setIsQuickClienteOpen(true)}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4" /> Nuevo cliente
                    </button>
                  </div>
                  <select
                    name="cliente_id"
                    value={formData.cliente_id ?? ''}
                    onChange={handleChange}
                    disabled={clientesLoading}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.cliente_id ? 'border-red-500' : 'border-gray-200'}`}
                  >
                    <option value="">{clientesLoading ? 'Cargando clientes...' : 'Selecciona un cliente'}</option>
                    {clientesLista
                      .filter((c) =>
                        !clientesFiltro?.trim()
                          ? true
                          : (c.nombre_completo || '').toLowerCase().includes(clientesFiltro.toLowerCase())
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre_completo} {c.tipo ? `(${c.tipo})` : ''}
                        </option>
                      ))}
                  </select>
                  {errors.cliente_id && <p className="text-xs text-red-600">{errors.cliente_id}</p>}
                </div>
                {/* Quick add cliente modal inline */}
                <QuickAddClienteModal
                  isOpen={isQuickClienteOpen}
                  onClose={() => setIsQuickClienteOpen(false)}
                  onCreated={(cliente) => {
                    if (cliente?.id) {
                      setClientesLista((prev) => [cliente, ...prev]);
                      const newFormData = { ...formData, cliente_id: cliente.id };
                      setFormData(newFormData);
                      setErrors(validateForm(newFormData));
                      showNotification?.(`Cliente creado: ${cliente?.nombre_completo || ''}`, 'success');
                    }
                  }}
                />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña {!usuarioEditando && '*'}</label>
              <div className="flex items-stretch gap-2">
                <div className="relative flex-1">
                  <input
                    name="password"
                    type={mostrarPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder={usuarioEditando ? 'Dejar vacío para no cambiar' : 'Contraseña'}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="px-2 sm:px-3 py-2 text-xs sm:text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1"
                  title="Generar contraseña"
                >
                  <Key className="w-4 h-4" />
                  <span>Generar</span>
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
              <input
                name="nombre_completo"
                type="text"
                value={formData.nombre_completo || ''}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.nombre_completo ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="Juan Pérez"
              />
              {errors.nombre_completo && <p className="text-xs text-red-600 mt-1">{errors.nombre_completo}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono <span className="text-gray-400 text-xs">(opcional)</span>
              </label>
              <input
                name="telefono"
                type="tel"
                value={formData.telefono || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="555-1234567 (opcional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-gray-400 text-xs">(opcional - se genera automáticamente)</span>
              </label>
              <div className="flex items-stretch gap-2">
                <input
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className={`min-w-0 flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="usuario@empresa.com (se genera automático)"
                />
                {formData.email && (
                  <button
                    type="button"
                    onClick={() => {
                      const newFormData = { ...formData };
                      if (formData.username && formData.username.trim()) {
                        newFormData.email = `${formData.username.trim()}@empresa.com`;
                      } else {
                        newFormData.email = '';
                      }
                      setFormData(newFormData);
                      setErrors(validateForm(newFormData));
                    }}
                    className="px-2 sm:px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm"
                    title="Regenerar email automático basado en el username"
                  >
                    Auto
                  </button>
                )}
              </div>
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              {!formData.email && formData.username && (
                <p className="text-xs text-gray-500 mt-1">Se generará automáticamente: {formData.username}@empresa.com</p>
              )}
              {!formData.email && !formData.username && (
                <p className="text-xs text-gray-500 mt-1">Se generará automáticamente cuando ingreses el nombre de usuario</p>
              )}
            </div>
            {formData.role === 'revendedor' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Negocio <span className="text-gray-400 text-xs">(recomendado para contraseñas)</span>
                  </label>
                  <input
                    name="nombre_negocio"
                    type="text"
                    value={formData.nombre_negocio || ''}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.nombre_negocio ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="Tienda de Juan (opcional)"
                  />
                  {errors.nombre_negocio && <p className="text-xs text-red-600 mt-1">{errors.nombre_negocio}</p>}
                  <p className="text-xs text-gray-500 mt-1">Se usa para generar contraseñas más específicas</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección <span className="text-gray-400 text-xs">(más fácil)</span>
                  </label>
                  <div className="flex flex-wrap items-stretch gap-2">
                    <input
                      name="direccion"
                      type="text"
                      value={formData.direccion || ''}
                      onChange={handleChange}
                      className="min-w-0 flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Calle y colonia, ciudad"
                    />
                    <button
                      type="button"
                      onClick={buscarDireccion}
                      className="px-2 sm:px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs sm:text-sm"
                      disabled={addrLoading}
                    >
                      {addrLoading ? 'Buscando…' : 'Buscar'}
                    </button>
                    <button
                      type="button"
                      onClick={usarMiUbicacion}
                      className="px-2 sm:px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs sm:text-sm"
                    >
                      Mi ubicación
                    </button>
                  </div>
                  {addrResults.length > 0 && (
                    <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-sm max-h-48 overflow-auto">
                      {addrResults.map((r, idx) => (
                        <div key={`${r.place_id || idx}`} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-50 text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              const newFormData = {
                                ...formData,
                                direccion: r.display_name,
                                latitud: parseFloat(r.lat).toFixed(6),
                                longitud: parseFloat(r.lon).toFixed(6),
                              };
                              setFormData(newFormData);
                              setErrors(validateForm(newFormData));
                              setAddrResults([]);
                              showNotification('Dirección seleccionada', 'success');
                            }}
                            className="text-left flex-1 truncate"
                            title="Usar esta dirección y coordenadas"
                          >
                            {r.display_name}
                          </button>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.display_name || '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
                            title="Ver en Google Maps"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedLocation(!showAdvancedLocation)}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      {showAdvancedLocation ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
                    </button>
                  </div>
                  {showAdvancedLocation && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Latitud</label>
                        <input
                          name="latitud"
                          type="number"
                          step="0.000001"
                          value={formData.latitud}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ej: 19.4326"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Longitud</label>
                        <input
                          name="longitud"
                          type="number"
                          step="0.000001"
                          value={formData.longitud}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ej: -99.1332"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const addr = (formData.direccion || '').trim();
                              if (!addr) {
                                showNotification('Ingresa una dirección para geocodificar', 'error');
                                return;
                              }
                              const url = `/api/geo/search?format=json&limit=1&q=${encodeURIComponent(addr)}`;
                              const res = await fetch(url, { headers: { Accept: 'application/json' } });
                              const data = await res.json();
                              const results = Array.isArray(data?.results) ? data.results : [];
                              if (results.length > 0) {
                                const { lat, lon } = results[0];
                                const newFormData = {
                                  ...formData,
                                  latitud: parseFloat(lat).toFixed(6),
                                  longitud: parseFloat(lon).toFixed(6),
                                };
                                setFormData(newFormData);
                                setErrors(validateForm(newFormData));
                                showNotification('Coordenadas establecidas desde la dirección', 'success');
                              } else {
                                showNotification('No se encontraron coordenadas para esa dirección', 'error');
                              }
                            } catch (e) {
                              showNotification('Error al geocodificar la dirección', 'error');
                            }
                          }}
                          className="px-2 sm:px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs sm:text-sm"
                        >
                          Coords
                        </button>
                      </div>
                    </div>
                  )}
                  {formData.latitud && formData.longitud && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                      <div className="w-full h-48 overflow-hidden rounded-lg border">
                        <iframe
                          title="Mapa"
                          className="w-full h-full"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                            Number(formData.longitud) - 0.01
                          }%2C${Number(formData.latitud) - 0.01}%2C${Number(formData.longitud) + 0.01}%2C${
                            Number(formData.latitud) + 0.01
                          }&layer=mapnik&marker=${formData.latitud}%2C${formData.longitud}`}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Se guardarán las coordenadas junto con el revendedor.</p>
                    </div>
                  )}
                </div>
              </>
            )}
            {formData.role === 'trabajador' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especialidad <span className="text-gray-400 text-xs">(opcional)</span>
                </label>
                <input
                  name="especialidad"
                  type="text"
                  value={formData.especialidad || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Técnico en Redes (opcional - default: General)"
                />
                <p className="text-xs text-gray-500 mt-1">Si se deja vacío, se asignará "General"</p>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  name="active"
                  type="checkbox"
                  checked={formData.active || false}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Usuario activo</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{usuarioEditando ? 'Actualizar' : 'Crear'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Componente Principal ---
const GestionUsuarios = () => {
  const { notifyUsersChanged, notifyTrabajadoresChanged, notifyRevendedoresChanged } = useUsers();

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // Estado para manejar errores
  const [filtro, setFiltro] = useState('');
  const [filtroRole, setFiltroRole] = useState('');
  const [filtroEstado, setFiltroEstado] = useState(''); // '' = todos, 'activo' = solo activos, 'inactivo' = solo inactivos
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [modalCredenciales, setModalCredenciales] = useState({ show: false, usuario: '', password: '', nombre: '' });
  const [modalEliminar, setModalEliminar] = useState({ show: false, usuario: null, deletionInfo: null });
  const [errorModal, setErrorModal] = useState({ show: false, message: '' });

  // Función para abrir modal de eliminación con vista previa
  const abrirModalEliminacion = async (usuario) => {
    try {
      setLoading(true);

      // Obtener información detallada antes de mostrar el modal
      const result = await usuariosService.obtenerVistaEliminacion(usuario.id);

      if (result.success) {
        setModalEliminar({ show: true, usuario: usuario, deletionInfo: result.data });
      } else {
        // Si hay error, mostrar modal simple
        setModalEliminar({ show: true, usuario: usuario, deletionInfo: null });
        console.error('Error al obtener vista previa:', result.error);
      }
    } catch (error) {
      console.error('Error al abrir modal de eliminación:', error);
      // Modal simple en caso de error
      setModalEliminar({ show: true, usuario: usuario, deletionInfo: null });
    } finally {
      setLoading(false);
    }
  };

  // Toggle para ver inactivos (debe declararse antes de usarlo en dependencias)
  const [verInactivos, setVerInactivos] = useState(false);

  // Sistema de carga optimizado con retry integrado en el servicio
  const cargarUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      // Por defecto activos; si verInactivos está activo, pedimos todos
      let result = await usuariosService.obtenerUsuarios();
      if (verInactivos) {
        const { apiClient } = await import('@services/apiClient');
        const resp = await apiClient.get('/usuarios?includeInactive=1');
        result = { success: true, data: resp.data.usuarios };
      }

      if (result.success) {
        setUsuarios(result.data);
        setError(''); // Limpiar errores previos
        // Opcional: Mostrar notificación de éxito solo si había error previo
        if (error) {
          mostrarNotificacion('✅ Usuarios cargados exitosamente', 'success');
        }
      } else {
        // El servicio ya manejó los retries, este es el error final
        setError(result.error);
        mostrarNotificacion(result.error, 'error');
        // En caso de error, mantener lista vacía para evitar crashes
        setUsuarios([]);
      }
    } catch (error) {
      setError('Error inesperado al cargar usuarios');
      mostrarNotificacion('Error inesperado al cargar usuarios', 'error');
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, [verInactivos]); // Refrescar cuando cambia el toggle

  // Carga inicial con delay para evitar conflictos con otras cargas
  useEffect(() => {
    const timeout = setTimeout(() => {
      cargarUsuarios();
    }, 150);

    return () => clearTimeout(timeout);
  }, [cargarUsuarios]);

  const mostrarNotificacion = (message, type = 'success') => {
    setNotification({ show: true, message, type });
  };

  const abrirFormularioNuevo = () => {
    setUsuarioEditando(null);
    setIsFormOpen(true);
  };

  const abrirModalCliente = () => {
    setIsClienteModalOpen(true);
  };

  const editarUsuario = (usuario) => {
    setUsuarioEditando(usuario);
    setIsFormOpen(true);
  };

  const guardarUsuario = async (formData) => {
    const datosParaEnvio = { ...formData };
    if (usuarioEditando && !datosParaEnvio.password) {
      delete datosParaEnvio.password;
    }

    // Asegurar que siempre haya un email válido ANTES de enviar
    if (!datosParaEnvio.email || datosParaEnvio.email.trim() === '') {
      if (datosParaEnvio.username && datosParaEnvio.username.trim()) {
        datosParaEnvio.email = `${datosParaEnvio.username.trim()}@empresa.com`;
      } else {
        datosParaEnvio.email = 'usuario@empresa.com';
      }
    }

    Object.keys(datosParaEnvio).forEach((key) => {
      if (typeof datosParaEnvio[key] === 'string' && datosParaEnvio[key].trim() === '') {
        if (key === 'email') {
          datosParaEnvio[key] = `${datosParaEnvio.username || 'usuario'}@empresa.com`;
        } else if (key !== 'especialidad') {
          datosParaEnvio[key] = null;
        }
      }
    });



    // Normalizar coordenadas si es revendedor
    if (datosParaEnvio.role === 'revendedor') {
      if (datosParaEnvio.latitud !== undefined) {
        datosParaEnvio.latitud =
          datosParaEnvio.latitud === null || datosParaEnvio.latitud === '' ? null : Number(datosParaEnvio.latitud);
      }
      if (datosParaEnvio.longitud !== undefined) {
        datosParaEnvio.longitud =
          datosParaEnvio.longitud === null || datosParaEnvio.longitud === '' ? null : Number(datosParaEnvio.longitud);
      }
    }

    setLoading(true);
    try {
      let result;
      const isEditing = !!usuarioEditando;

      if (isEditing) {
        result = await usuariosService.actualizarUsuario(usuarioEditando.id, datosParaEnvio);
      } else {
        result = await usuariosService.crearUsuario(datosParaEnvio);
      }

      if (result.success) {
        if (!isEditing) {
          setModalCredenciales({
            show: true,
            usuario: formData.username,
            password: formData.password,
            nombre: formData.nombre_completo,
          });
        }
        mostrarNotificacion(isEditing ? 'Usuario actualizado' : 'Usuario creado', 'success');
        setIsFormOpen(false);

        // Notificar a los contextos para que otras partes de la app se actualicen
        if (formData.role === 'trabajador') notifyTrabajadoresChanged();
        if (formData.role === 'revendedor') notifyRevendedoresChanged();
        notifyUsersChanged();

        // Recargar lista local con delay pequeño
        setTimeout(() => {
          cargarUsuarios();
        }, 300);
      } else {
        mostrarNotificacion(result.error, 'error');
      }
    } catch (error) {
      mostrarNotificacion(error.message || 'Error al guardar usuario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleEstadoUsuario = async (usuario) => {
    setLoading(true);
    try {
      const result = await usuariosService.toggleEstadoUsuario(usuario.id);

      if (result.success) {
        // Mostrar mensaje principal
        mostrarNotificacion(result.data.message, 'success');

        // Si hay advertencia de stock, mostrarla como notificación adicional
        if (result.data.warning) {
          setTimeout(() => {
            mostrarNotificacion(result.data.warning, 'warning');
          }, 1000);
        }

        // Notificaciones a contextos
        if (usuario.role === 'trabajador') notifyTrabajadoresChanged();
        if (usuario.role === 'revendedor') notifyRevendedoresChanged();
        notifyUsersChanged();

        // Recargar con delay
        setTimeout(() => {
          cargarUsuarios();
        }, 200);
      } else {
        setErrorModal({ show: true, message: result.error || 'Error al cambiar estado del usuario' });
      }
    } catch (error) {
      setErrorModal({ show: true, message: 'Error inesperado al cambiar estado del usuario' });
    } finally {
      setLoading(false);
    }
  };

  const confirmarEliminacion = async () => {
    const usuarioAEliminar = modalEliminar.usuario;
    if (!usuarioAEliminar) return;

    setLoading(true);
    try {
      const result = await usuariosService.eliminarUsuario(usuarioAEliminar.id);

      if (result.success) {
        mostrarNotificacion('Usuario eliminado exitosamente', 'success');

        if (usuarioAEliminar.role === 'trabajador') notifyTrabajadoresChanged();
        if (usuarioAEliminar.role === 'revendedor') notifyRevendedoresChanged();
        notifyUsersChanged();

        setModalEliminar({ show: false, usuario: null, deletionInfo: null });

        setTimeout(() => {
          cargarUsuarios();
        }, 200);
      } else {
        setModalEliminar({ show: false, usuario: null, deletionInfo: null });
        setErrorModal({ show: true, message: result.error || 'Error desconocido al eliminar usuario' });
      }
    } catch (error) {
      setModalEliminar({ show: false, usuario: null, deletionInfo: null });
      setErrorModal({ show: true, message: 'Error inesperado al comunicarse con el servidor. Por favor intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      (!filtro ||
        u.username.toLowerCase().includes(filtro.toLowerCase()) ||
        (u.nombre_completo || '').toLowerCase().includes(filtro.toLowerCase())) &&
      (!filtroRole || u.role === filtroRole) &&
      (!filtroEstado || (filtroEstado === 'activo' ? u.active : !u.active))
  );

  const getRoleInfo = (role) =>
    ({
      admin: { icon: Shield, color: 'bg-red-100 text-red-800' },
      trabajador: { icon: UserCheck, color: 'bg-blue-100 text-blue-800' },
  revendedor: { icon: User, color: 'bg-green-100 text-green-800' },
  cliente: { icon: User, color: 'bg-purple-100 text-purple-800' },
    }[role] || { icon: User, color: 'bg-gray-100 text-gray-800' });

  // Rol a mostrar: si falta pero tiene cliente_id, asumimos 'cliente'
  const getDisplayRole = (u) => {
    const r = (u?.role || '').trim();
    if (r) return r;
    if (u?.cliente_id || u?.clienteId) return 'cliente';
    return '';
  };

  // Detectar el tipo de cliente (solo mostramos 'Servicio' para rol 'cliente')
  // Usamos getDisplayRole para cubrir casos donde el rol venga vacío pero tenga cliente_id.
  const getClienteTipo = (u) => (getDisplayRole(u) === 'cliente' ? 'Servicio' : '');

  return (
    <div className="p-4 sm:p-6 w-full bg-gray-50 min-h-screen">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <Users className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-gray-600">Administra, crea y edita los usuarios del sistema.</p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap w-full sm:w-auto">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} /> Ver
            inactivos
          </label>
          <button
            onClick={abrirFormularioNuevo}
            className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
          <button
            onClick={abrirModalCliente}
            className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Building2 className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
          <button
            onClick={cargarUsuarios}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </header>

      <Notification notification={notification} onClose={() => setNotification({ show: false, message: '', type: '' })} />

      {/* Modal rápido para crear cliente */}
      <QuickAddClienteModal
        isOpen={isClienteModalOpen}
        onClose={() => setIsClienteModalOpen(false)}
        onShowCredentials={({ usuario, password, nombre }) => {
          setModalCredenciales({ show: true, usuario, password, nombre });
        }}
        onCreated={(cliente) => {
          mostrarNotificacion(`Cliente creado: ${cliente?.nombre_completo || ''}`, 'success');
          // Refrescar la lista de usuarios por si se creó un Revendedor (crea también un usuario)
          setTimeout(() => cargarUsuarios(), 300);
        }}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o usuario..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filtroRole}
            onChange={(e) => setFiltroRole(e.target.value)}
            className="sm:w-48 w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los roles</option>
            <option value="admin">Administradores</option>
            <option value="trabajador">Trabajadores</option>
            <option value="revendedor">Revendedores</option>
            <option value="cliente">Clientes</option>
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="sm:w-48 w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Solo activos</option>
            <option value="inactivo">Solo inactivos</option>
          </select>
        </div>
      </div>

      {/* Mobile cards view */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center text-gray-500">Cargando...</div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center text-gray-500">No se encontraron usuarios.</div>
        ) : (
          usuariosFiltrados.map((usuario) => {
            const displayRole = getDisplayRole(usuario);
            const { icon: RoleIcon, color } = getRoleInfo(displayRole);
            return (
              <div
                key={usuario.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${!usuario.active ? 'opacity-75' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-base font-semibold ${usuario.active ? 'text-gray-900' : 'text-gray-500'}`}>
                      {usuario.nombre_completo || usuario.username}
                    </div>
                    <div className="text-sm text-gray-500">@{usuario.username}</div>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1 text-xs font-medium ${
                      usuario.active ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                    } px-2 py-1 rounded-full whitespace-nowrap`}
                  >
                    {usuario.active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {usuario.active ? 'Activo' : 'Inactivo'}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${color} ${
                      !usuario.active ? 'opacity-60' : ''
                    }`}
                  >
                    <RoleIcon className="w-3 h-3" />
                    {displayRole || '—'}
                  </span>
      {(getDisplayRole(usuario) === 'cliente') && getClienteTipo(usuario) && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-full ${
        getClienteTipo(usuario).toLowerCase() === 'servicio'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      } ${!usuario.active ? 'opacity-60' : ''}`}
                    >
                      {getClienteTipo(usuario)}
                    </span>
                  )}
                  <span className="text-xs text-gray-600">{usuario.telefono || '-'}</span>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button onClick={() => editarUsuario(usuario)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg" title="Editar">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleEstadoUsuario(usuario)}
                    className={`p-2 rounded-lg ${usuario.active ? 'text-orange-600 hover:bg-orange-100' : 'text-green-600 hover:bg-green-100'}`}
                    title={usuario.active ? 'Desactivar' : 'Activar'}
                    disabled={loading}
                  >
                    {usuario.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => abrirModalEliminacion(usuario)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                    title="Eliminar"
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop/tablet table view */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center p-8 text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : usuariosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center p-8 text-gray-500">
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
               usuariosFiltrados.map((usuario) => {
                 const displayRole = getDisplayRole(usuario);
                 const { icon: RoleIcon, color } = getRoleInfo(displayRole);
                return (
                  <tr key={usuario.id} className={`hover:bg-gray-50 ${!usuario.active ? 'bg-gray-50 opacity-75' : ''}`}>
                    <td className="px-4 py-4">
                      <div className={`text-sm font-medium ${usuario.active ? 'text-gray-900' : 'text-gray-500'}`}>
                        {usuario.nombre_completo || usuario.username}
                        {!usuario.active && (
                          <span className="ml-2 text-xs text-red-500 font-normal">(Inactivo)</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">@{usuario.username}</div>
                    </td>
                     <td className="px-4 py-4">
                       <div className="flex flex-wrap items-center gap-2">
                         <span
                           className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${color} ${
                             !usuario.active ? 'opacity-60' : ''
                           }`}
                         >
                           <RoleIcon className="w-3 h-3" />
                           {displayRole || '—'}
                         </span>
         {(getDisplayRole(usuario) === 'cliente') && getClienteTipo(usuario) && (
                           <span
                             className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-full ${
           getClienteTipo(usuario).toLowerCase() === 'servicio'
                                 ? 'bg-emerald-100 text-emerald-800'
                                 : 'bg-amber-100 text-amber-800'
                             } ${!usuario.active ? 'opacity-60' : ''}`}
                           >
                             {getClienteTipo(usuario)}
                           </span>
                         )}
                       </div>
                     </td>
                    <td className="px-4 py-4">
                      <div
                        className={`inline-flex items-center gap-1 text-sm font-medium ${
                          usuario.active ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                        } px-2 py-1 rounded-full`}
                      >
                        {usuario.active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {usuario.active ? 'Activo' : 'Inactivo'}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{usuario.telefono || '-'}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button onClick={() => editarUsuario(usuario)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg" title="Editar">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleEstadoUsuario(usuario)}
                          className={`p-2 rounded-lg ${
                            usuario.active ? 'text-orange-600 hover:bg-orange-100' : 'text-green-600 hover:bg-green-100'
                          }`}
                          title={usuario.active ? 'Desactivar' : 'Activar'}
                          disabled={loading}
                        >
                          {usuario.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => abrirModalEliminacion(usuario)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                          title="Eliminar"
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        usuarioEditando={usuarioEditando}
        onSave={guardarUsuario}
        loading={loading}
        showNotification={mostrarNotificacion}
      />
      <CredentialsModal
        modalConfig={modalCredenciales}
        onClose={() => setModalCredenciales({ show: false })}
        onCopy={(text) => navigator.clipboard.writeText(text).then(() => mostrarNotificacion('Copiado al portapapeles'))}
      />
      <DeleteConfirmationModal
        modalConfig={modalEliminar}
        onConfirm={confirmarEliminacion}
        onClose={() => setModalEliminar({ show: false, usuario: null, deletionInfo: null })}
        loading={loading}
      />
      <ErrorModal errorModal={errorModal} onClose={() => setErrorModal({ show: false, message: '' })} />
    </div>
  );
};

export default GestionUsuarios;
