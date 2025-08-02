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
      entregasRevendedor: (id) => `/entregas/revendedor/${id}`,
      
      // Ventas
      ventas: '/ventas',
      ventasRevendedor: (id) => `/ventas/revendedor/${id}`,
      
      // Stock global
      stockGlobal: '/stock-global'
    };
  }

  // ===== REVENDEDORES =====
  
  async obtenerRevendedores() {
    return await apiHelpers.get(this.endpoints.revendedores);
  }

  async obtenerRevendedor(id) {
    return await apiHelpers.get(this.endpoints.revendedor(id));
  }

  async obtenerRevendedorActual() {
    return await apiHelpers.get('/revendedores/me');
  }

  async crearRevendedor(revendedorData) {
    console.log('fichasService.crearRevendedor - datos recibidos:', revendedorData);
    
    const payload = {
      nombre_negocio: revendedorData.nombre, // El campo 'nombre' del frontend va a 'nombre_negocio'
      nombre: revendedorData.nombre, // Mismo valor para ambos campos
      responsable: revendedorData.responsable,
      telefono: revendedorData.telefono,
      direccion: revendedorData.direccion || null
    };
    
    console.log('fichasService.crearRevendedor - payload enviado:', payload);
    
    return await apiHelpers.post(this.endpoints.revendedores, payload);
  }

  async actualizarRevendedor(id, updates) {
    return await apiHelpers.put(this.endpoints.revendedor(id), updates);
  }

  async eliminarRevendedor(id) {
    return await apiHelpers.delete(this.endpoints.revendedor(id));
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
  
  async obtenerTiposFicha() {
    return await apiHelpers.get(this.endpoints.tiposFicha);
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
  
  async obtenerInventarioRevendedor(revendedorId) {
    return await apiHelpers.get(this.endpoints.inventarioRevendedor(revendedorId));
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
  
  async obtenerPreciosRevendedor(revendedorId) {
    return await apiHelpers.get(this.endpoints.preciosRevendedor(revendedorId));
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
  
  async obtenerEntregas() {
    return await apiHelpers.get(this.endpoints.entregas);
  }

  async obtenerEntregasRevendedor(revendedorId) {
    return await apiHelpers.get(this.endpoints.entregasRevendedor(revendedorId));
  }

  async obtenerMisEntregas() {
    return await apiHelpers.get('/entregas/me');
  }

  async crearEntrega(entregaData) {
    return await apiHelpers.post(this.endpoints.entregas, entregaData);
  }

  // ===== VENTAS =====
  
  async obtenerVentas() {
    return await apiHelpers.get(this.endpoints.ventas);
  }

  async obtenerVentasRevendedor(revendedorId) {
    return await apiHelpers.get(this.endpoints.ventasRevendedor(revendedorId));
  }

  async crearVenta(ventaData) {
    return await apiHelpers.post(this.endpoints.ventas, ventaData);
  }

  // ===== STOCK GLOBAL =====
  
  async obtenerStockGlobal() {
    return await apiHelpers.get(this.endpoints.stockGlobal);
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
    return await apiHelpers.put(`/configuracion/${clave}`, {
      valor,
      descripcion
    });
  }

  async crearConfiguracion(clave, valor, descripcion, tipo = 'number') {
    return await apiHelpers.post('/configuracion', {
      clave,
      valor,
      descripcion,
      tipo
    });
  }
}

export const fichasService = new FichasService();
