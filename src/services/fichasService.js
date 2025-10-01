import { apiHelpers } from './apiClient';

class FichasService {
  constructor() {
    this.endpoints = {
      // Revendedores
      revendedores: '/revendedores',
      revendedor: (id) => `/revendedores/${id}`,
      
      // Tipos de ficha
      tiposFicha: '/tipos-ficha',
      tipoFicha: (id) => `/tipos-ficha/${id}`,
      
      // Inventarios
      inventarioRevendedor: (id) => `/inventarios/revendedor/${id}`,
      ajustarInventario: '/inventarios/ajustar',
      
      // Precios
      preciosRevendedor: (id) => `/precios/revendedor/${id}`,
      precios: '/precios',
      precio: (id) => `/precios/${id}`,
      
      // Entregas
      entregas: '/entregas',
  entregasHistorial: '/entregas/historial',
      entregasRevendedor: (id) => `/entregas/revendedor/${id}`,
      
      // Ventas
      ventas: '/ventas',
      ventasRevendedor: (id) => `/ventas/revendedor/${id}`,
      
      // Stock global
    stockGlobal: '/stock-global'
  , notas: '/notas',
  // Equipos (inventario de equipos asignados a clientes)
  equipos: '/equipos',
  // Inventario simple de equipos
  equiposInventario: '/equipos-inventario'
    };

    // Cache interno simple (memoria) con TTL
    // Estructura: { key: { data, expiresAt } }
    this._cache = new Map();
    this.defaultTTL = 10000; // 10s por defecto para panel admin
  }

  // Obtener del cache o ejecutar fetcher
  async _getCached(key, fetcher, { ttl = this.defaultTTL, forceRefresh = false } = {}) {
    try {
      if (!forceRefresh && this._cache.has(key)) {
        const entry = this._cache.get(key);
        if (Date.now() < entry.expiresAt) {
          return entry.data;
        } else {
          // Expirado
          this._cache.delete(key);
        }
      }
      const data = await fetcher();
      this._cache.set(key, { data, expiresAt: Date.now() + ttl });
      return data;
    } catch (e) {
      // Si falla y hay cache viejo aún válido, devolverlo como fallback silencioso
      if (this._cache.has(key)) {
        const entry = this._cache.get(key);
        if (Date.now() < entry.expiresAt) return entry.data;
      }
      throw e;
    }
  }

  _invalidate(pattern) {
    for (const key of this._cache.keys()) {
      if (key.includes(pattern)) this._cache.delete(key);
    }
  }

  // ===== REVENDEDORES =====
  
  async obtenerRevendedores(options = {}) {
  // Por defecto ocultar inactivos; los admins pueden pedir includeInactive explícito
  const url = `${this.endpoints.revendedores}?includeInactive=0`;
  return await this._getCached('revendedores', () => apiHelpers.get(url), options);
  }

  async obtenerRevendedor(id, options = {}) {
    return await this._getCached(`revendedor:${id}`, () => apiHelpers.get(this.endpoints.revendedor(id)), options);
  }

  async obtenerRevendedorActual(options = {}) {
    return await this._getCached('revendedor:me', () => apiHelpers.get('/revendedores/me'), options);
  }

  async crearRevendedor(revendedorData) {
  if (import.meta.env.DEV) console.log('fichasService.crearRevendedor - datos recibidos:', revendedorData);
    
    const payload = {
      nombre_negocio: revendedorData.nombre, // El campo 'nombre' del frontend va a 'nombre_negocio'
      nombre: revendedorData.nombre, // Mismo valor para ambos campos
      responsable: revendedorData.responsable,
      telefono: revendedorData.telefono,
      direccion: revendedorData.direccion || null
    };
    
  if (import.meta.env.DEV) console.log('fichasService.crearRevendedor - payload enviado:', payload);
    
    return await apiHelpers.post(this.endpoints.revendedores, payload);
  }

  async actualizarRevendedor(id, updates) {
    const res = await apiHelpers.put(this.endpoints.revendedor(id), updates);
    this._invalidate('revendedor');
    return res;
  }

  async eliminarRevendedor(id) {
    const res = await apiHelpers.delete(this.endpoints.revendedor(id));
    this._invalidate('revendedor');
    return res;
  }

  // ===== USUARIOS/TRABAJADORES =====
  
  async obtenerUsuarios() {
    return await apiHelpers.get('/auth/users');
  }

  async eliminarUsuario(id) {
    return await apiHelpers.delete(`/auth/users/${id}`);
  }

  async crearTrabajador(trabajadorData) {
    return await apiHelpers.post('/auth/crear-trabajador', trabajadorData);
  }

  // ===== TIPOS DE FICHA =====
  
  async obtenerTiposFicha(options = {}) {
    return await this._getCached('tiposFicha', () => apiHelpers.get(this.endpoints.tiposFicha), options);
  }

  async crearTipoFicha(tipoData) {
    return await apiHelpers.post(this.endpoints.tiposFicha, {
      nombre: tipoData.nombre,
      duracion_horas: tipoData.duracion_horas,
      precio_compra: parseFloat(tipoData.precio_compra || 0),
      precio_venta: parseFloat(tipoData.precio_venta || 0),
      descripcion: tipoData.descripcion || ''
    });
  }

  async actualizarTipoFicha(id, updates) {
    return await apiHelpers.put(this.endpoints.tipoFicha(id), updates);
  }

  async eliminarTipoFicha(id) {
    return await apiHelpers.delete(this.endpoints.tipoFicha(id));
  }

  // ===== INVENTARIOS =====
  
  async obtenerInventarioRevendedor(revendedorId, options = {}) {
    return await this._getCached(`inventario:${revendedorId}`, () => apiHelpers.get(this.endpoints.inventarioRevendedor(revendedorId)), options);
  }

  async ajustarInventarioExcel(revendedorId, tipoFichaId, campo, cantidad) {
    return await apiHelpers.post(this.endpoints.ajustarInventario, {
      revendedor_id: revendedorId,
      tipo_ficha_id: tipoFichaId,
      campo: campo,
      cantidad: cantidad
    });
  }

  async actualizarVendidasDirecto(revendedorId, tipoFichaId, nuevaCantidad) {
    return await apiHelpers.put('/inventarios/vendidas-directo', {
      revendedor_id: revendedorId,
      tipo_ficha_id: tipoFichaId,
      cantidad_vendidas: nuevaCantidad
    });
  }

  // ===== PRECIOS =====
  
  async obtenerPreciosRevendedor(revendedorId, options = {}) {
    return await this._getCached(`precios:${revendedorId}`, () => apiHelpers.get(this.endpoints.preciosRevendedor(revendedorId)), options);
  }

  async crearPrecioRevendedor(precioData) {
    return await apiHelpers.post(this.endpoints.precios, precioData);
  }

  async actualizarPrecioRevendedor(precioId, updates) {
    return await apiHelpers.put(this.endpoints.precio(precioId), updates);
  }

  async actualizarPreciosCompletos(revendedorId, precios, comisiones) {
    // Actualizar múltiples precios de un revendedor
    const promises = [];
    
    for (const [tipoKey, precio] of Object.entries(precios)) {
      const comision = comisiones[tipoKey] || 0;
      
      // Aquí necesitarías mapear tipoKey a tipo_ficha_id
      // Por simplicidad, asumimos que existe un endpoint para esto
      promises.push(
        this.crearPrecioRevendedor({
          revendedor_id: revendedorId,
          tipo_ficha_id: this.mapTipoKeyToId(tipoKey),
          precio: parseFloat(precio),
          comision: parseFloat(comision)
        })
      );
    }
    
    return await Promise.all(promises);
  }

  async actualizarPreciosRevendedor(revendedorId, precios) {
    try {
      // Obtener todos los tipos de ficha para mapear los keys
      const tiposFicha = await this.obtenerTiposFicha();
      const promises = [];
      
      for (const [tipoKey, precio] of Object.entries(precios)) {
        // Buscar el tipo de ficha que corresponde al tipoKey
        const tipo = tiposFicha.find(t => {
          const keyFromNombre = t.nombre?.replace(/\s+/g, '').replace('horas', 'h').replace('hora', 'h');
          return keyFromNombre === tipoKey;
        });
        
        if (tipo && precio > 0) {
          promises.push(
            apiHelpers.post(this.endpoints.precios, {
              revendedor_id: revendedorId,
              tipo_ficha_id: tipo.id,
              precio: parseFloat(precio)
            })
          );
        }
      }
      
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error al actualizar precios del revendedor:', error);
      throw error;
    }
  }

  // ===== ENTREGAS =====
  
  async obtenerEntregas(options = {}) {
    return await this._getCached('entregas', () => apiHelpers.get(this.endpoints.entregas), options);
  }

  async obtenerHistorialEntregas({ page = 1, pageSize = 25, revendedor, revendedor_id, tipo_ficha_id, desde, hasta } = {}) {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (pageSize) params.set('pageSize', pageSize);
    if (revendedor) params.set('revendedor', revendedor);
    if (revendedor_id) params.set('revendedor_id', revendedor_id);
    if (tipo_ficha_id) params.set('tipo_ficha_id', tipo_ficha_id);
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const url = `${this.endpoints.entregasHistorial}?${params.toString()}`;
    return await apiHelpers.get(url);
  }

  async obtenerEntregasRevendedor(revendedorId, options = {}) {
    return await this._getCached(`entregas:${revendedorId}`, () => apiHelpers.get(this.endpoints.entregasRevendedor(revendedorId)), options);
  }

  async obtenerMisEntregas(options = {}) {
    return await this._getCached('entregas:me', () => apiHelpers.get('/entregas/me'), options);
  }

  async crearEntrega(entregaData) {
    return await apiHelpers.post(this.endpoints.entregas, entregaData);
  }

  // ===== VENTAS =====
  
  async obtenerVentas(options = {}) {
    return await this._getCached('ventas', () => apiHelpers.get(this.endpoints.ventas), options);
  }

  async obtenerVentasRevendedor(revendedorId, options = {}) {
    return await this._getCached(`ventas:${revendedorId}`, () => apiHelpers.get(this.endpoints.ventasRevendedor(revendedorId)), options);
  }

  async crearVenta(ventaData) {
    return await apiHelpers.post(this.endpoints.ventas, ventaData);
  }

  // ===== STOCK GLOBAL =====
  
  async obtenerStockGlobal(options = {}) {
    return await this._getCached('stockGlobal', () => apiHelpers.get(this.endpoints.stockGlobal), options);
  }

  async crearStockGlobal(stockData) {
    return await apiHelpers.post(this.endpoints.stockGlobal, stockData);
  }

  async actualizarStockGlobal(stockId, updates) {
    return await apiHelpers.put(`${this.endpoints.stockGlobal}/${stockId}`, updates);
  }

  async abastecerStock(abastecimientoData) {
    return await apiHelpers.post(`${this.endpoints.stockGlobal}/abastecimiento`, abastecimientoData);
  }

  async entregarFichasDeStock(entregaData) {
    return await apiHelpers.post(`${this.endpoints.entregas}`, entregaData);
  }

  // ===== NOTAS TRABAJADORES =====
  async crearNota({ titulo, contenido, revendedor_id }) {
    return await apiHelpers.post(this.endpoints.notas, { titulo, contenido, revendedor_id });
  }

  async listarNotas({ revendedor_id, q, page = 1, pageSize = 25 } = {}) {
    const params = new URLSearchParams();
    if (revendedor_id) params.set('revendedor_id', revendedor_id);
    if (q) params.set('q', q);
    if (page) params.set('page', page);
    if (pageSize) params.set('pageSize', pageSize);
    const url = `${this.endpoints.notas}?${params.toString()}`;
    return await apiHelpers.get(url);
  }

  async actualizarNota(id, { titulo, contenido }) {
    return await apiHelpers.put(`${this.endpoints.notas}/${id}`, { titulo, contenido });
  }

  async eliminarNota(id) {
    return await apiHelpers.delete(`${this.endpoints.notas}/${id}`);
  }

  // ===== EQUIPOS =====
  async listarEquipos({ revendedor_id, cliente_id, includeInactive, client_ref } = {}) {
    const params = new URLSearchParams();
    if (client_ref) params.set('client_ref', client_ref);
    if (revendedor_id) params.set('revendedor_id', revendedor_id);
    if (cliente_id) params.set('cliente_id', cliente_id);
    if (includeInactive) params.set('includeInactive', '1');
    const url = params.toString()
      ? `${this.endpoints.equipos}?${params.toString()}`
      : this.endpoints.equipos;
    const res = await apiHelpers.get(url);
    return res?.items || [];
  }

  async crearEquipo({ nombre, descripcion, revendedor_id, cliente_id }) {
    const payload = { nombre, descripcion };
    if (revendedor_id !== undefined && revendedor_id !== null) payload.revendedor_id = revendedor_id;
    if (cliente_id !== undefined && cliente_id !== null) payload.cliente_id = cliente_id;
    return await apiHelpers.post(this.endpoints.equipos, payload);
  }

  async actualizarEquipo(id, updates) {
    return await apiHelpers.put(`${this.endpoints.equipos}/${id}`, updates);
  }

  async eliminarEquipo(id) {
    return await apiHelpers.delete(`${this.endpoints.equipos}/${id}`);
  }

  async devolverEquipo(id) {
    return await apiHelpers.post(`${this.endpoints.equipos}/${id}/devolver`, {});
  }

  // ===== EQUIPOS INVENTARIO SIMPLE =====
  async listarEquiposInventario() {
    const res = await apiHelpers.get(this.endpoints.equiposInventario);
    return res?.items || [];
  }

  async crearEquipoInventario({ nombre, cantidad = 0, estado = 'nuevo', descripcion }) {
    return await apiHelpers.post(this.endpoints.equiposInventario, { nombre, cantidad, estado, descripcion });
  }

  async actualizarEquipoInventario(id, updates) {
    return await apiHelpers.put(`${this.endpoints.equiposInventario}/${id}`, updates);
  }

  async eliminarEquipoInventario(id) {
    return await apiHelpers.delete(`${this.endpoints.equiposInventario}/${id}`);
  }

  // Clientes activos combinados para equipos
  async obtenerClientesEquiposActivos() {
    const url = `${this.endpoints.equipos}/clientes-activos`;
    const res = await apiHelpers.get(url);
    return res?.items || [];
  }

  // ===== HELPERS =====
  
  // Mapear tipo key (ej: "1h") a ID de tipo de ficha
  mapTipoKeyToId(tipoKey) {
    const mapping = {
      '1h': 1,
      '2h': 2, 
      '3h': 3,
      '5h': 4
    };
    return mapping[tipoKey] || 1;
  }

  // Mapear nombre de tipo a ID
  async mapTipoNombreToId(nombre) {
    try {
      const tipos = await this.obtenerTiposFicha();
      const tipo = tipos.find(t => t.nombre === nombre);
      return tipo?.id || null;
    } catch (error) {
      console.error('Error mapping tipo nombre to ID:', error);
      return null;
    }
  }

  // Validar datos antes de enviar
  validateRevendedorData(data) {
    const errors = [];
    
    if (!data.nombre || data.nombre.trim().length < 2) {
      errors.push('El nombre del negocio debe tener al menos 2 caracteres');
    }
    
    if (!data.responsable || data.responsable.trim().length < 2) {
      errors.push('El nombre del responsable debe tener al menos 2 caracteres');
    }
    
    if (data.telefono && data.telefono.length > 13) {
      errors.push('El teléfono no puede tener más de 13 caracteres');
    }
    
    return errors;
  }

  validateTipoFichaData(data) {
    const errors = [];
    
    if (!data.nombre || data.nombre.trim().length < 2) {
      errors.push('El nombre del tipo de ficha es obligatorio');
    }
    
    if (data.precio && (isNaN(data.precio) || parseFloat(data.precio) < 0)) {
      errors.push('El precio debe ser un número positivo');
    }
    
    if (data.comision && (isNaN(data.comision) || parseFloat(data.comision) < 0)) {
      errors.push('La comisión debe ser un número positivo');
    }
    
    return errors;
  }

  // ===== COMISION =====
  
  async actualizarPorcentajeComision(revendedorId, porcentajeComision) {
    return await apiHelpers.put(`/revendedores/${revendedorId}/comision`, {
      porcentaje_comision: porcentajeComision
    });
  }

  // ===== CONFIGURACIÓN GLOBAL =====
  
  async obtenerConfiguracion() {
    return await apiHelpers.get('/configuracion');
  }

  async obtenerConfiguracionClave(clave) {
    return await apiHelpers.get(`/configuracion/${clave}`);
  }

  async actualizarConfiguracion(clave, valor, descripcion) {
    const res = await apiHelpers.put(`/configuracion/${clave}`, {
      valor,
      descripcion
    });
    try {
      // Emitir evento de cambio de configuración
      window.dispatchEvent(new CustomEvent('configChanged', { detail: { clave, valor } }));
    } catch (_) { /* no-op en SSR/tests */ }
    return res;
  }

  async crearConfiguracion(clave, valor, descripcion, tipo = 'number') {
    const res = await apiHelpers.post('/configuracion', {
      clave,
      valor,
      descripcion,
      tipo
    });
    try {
      window.dispatchEvent(new CustomEvent('configChanged', { detail: { clave, valor } }));
    } catch (_) { /* no-op */ }
    return res;
  }
}

export const fichasService = new FichasService();
