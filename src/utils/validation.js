/**
 * Funciones de validación para el sistema de fichas
 */

/**
 * Valida un número telefónico
 * @param {string} telefono - Número telefónico a validar
 * @returns {Object} Resultado de la validación
 */
export const validarTelefono = (telefono) => {
  // Verificar que no sea vacío
  if (!telefono || telefono.trim() === '') {
    return { 
      valido: false, 
      mensaje: 'El número telefónico es requerido' 
    };
  }
  
  // Verificar formato: solo dígitos y opcionalmente un + al inicio
  if (!/^\+?\d+$/.test(telefono)) {
    return { 
      valido: false, 
      mensaje: 'El número telefónico solo puede contener dígitos y opcionalmente un + al inicio' 
    };
  }
  
  // Verificar longitud mínima (10 dígitos)
  const digitosCount = telefono.replace(/\D/g, '').length;
  if (digitosCount < 10) {
    return { 
      valido: false, 
      mensaje: 'El número telefónico debe tener al menos 10 dígitos' 
    };
  }
  
  // Verificar longitud máxima (13 caracteres incluyendo el +)
  if (telefono.length > 13) {
    return { 
      valido: false, 
      mensaje: 'El número telefónico no debe exceder los 13 caracteres' 
    };
  }
  
  return { valido: true };
};

/**
 * Valida un valor numérico positivo
 * @param {string|number} valor - Valor a validar
 * @param {string} campo - Nombre del campo para el mensaje de error
 * @param {boolean} requerido - Indica si el campo es obligatorio
 * @returns {Object} Resultado de la validación
 */
export const validarNumeroPositivo = (valor, campo, requerido = true) => {
  // Convertir a string para validar
  const valorStr = String(valor).trim();
  
  // Verificar si es requerido
  if (requerido && (!valorStr || valorStr === '0')) {
    return { 
      valido: false, 
      mensaje: `El campo ${campo} es requerido y debe ser mayor a 0` 
    };
  }
  
  // Si no es requerido y está vacío, es válido
  if (!requerido && (!valorStr || valorStr === '')) {
    return { valido: true };
  }
  
  // Verificar que sea un número
  if (!/^\d+$/.test(valorStr)) {
    return { 
      valido: false, 
      mensaje: `El campo ${campo} debe ser un número positivo` 
    };
  }
  
  // Verificar que sea mayor a 0
  const num = parseInt(valorStr, 10);
  if (num <= 0) {
    return { 
      valido: false, 
      mensaje: `El campo ${campo} debe ser mayor a 0` 
    };
  }
  
  return { valido: true };
};

/**
 * Valida el precio y la comisión de una ficha
 * @param {string|number} precio - Precio a validar
 * @param {string|number} comision - Comisión a validar
 * @returns {Object} Resultado de la validación
 */
export const validarPrecioComision = (precio, comision) => {
  // Validar precio
  const validacionPrecio = validarNumeroPositivo(precio, 'precio');
  if (!validacionPrecio.valido) {
    return validacionPrecio;
  }
  
  // Validar comisión
  const validacionComision = validarNumeroPositivo(comision, 'comisión');
  if (!validacionComision.valido) {
    return validacionComision;
  }
  
  // Validar que la comisión no sea mayor al precio
  const precioNum = parseInt(precio, 10);
  const comisionNum = parseInt(comision, 10);
  
  if (comisionNum >= precioNum) {
    return { 
      valido: false, 
      mensaje: 'La comisión no puede ser mayor o igual al precio' 
    };
  }
  
  return { valido: true };
};

/**
 * Valida los datos de un nuevo revendedor
 * @param {Object} revendedor - Datos del revendedor
 * @returns {Object} Resultado de la validación
 */
export const validarRevendedor = (revendedor) => {
  // Validar nombre
  if (!revendedor.nombre || revendedor.nombre.trim() === '') {
    return { 
      valido: false, 
      mensaje: 'El nombre del negocio es requerido' 
    };
  }
  
  // Validar responsable
  if (!revendedor.responsable || revendedor.responsable.trim() === '') {
    return { 
      valido: false, 
      mensaje: 'El nombre del responsable es requerido' 
    };
  }
  
  // Validar teléfono
  const validacionTelefono = validarTelefono(revendedor.telefono);
  if (!validacionTelefono.valido) {
    return validacionTelefono;
  }
  
  // Validar que tenga configuración de precios y comisiones
  if (!revendedor.precios || Object.keys(revendedor.precios).length === 0) {
    return { 
      valido: false, 
      mensaje: 'El revendedor debe tener configuración de precios' 
    };
  }
  
  if (!revendedor.comisiones || Object.keys(revendedor.comisiones).length === 0) {
    return { 
      valido: false, 
      mensaje: 'El revendedor debe tener configuración de comisiones' 
    };
  }
  
  // Validar cada precio y comisión
  for (const tipo in revendedor.precios) {
    const precio = revendedor.precios[tipo];
    const comision = revendedor.comisiones[tipo];
    
    const validacion = validarPrecioComision(precio, comision);
    if (!validacion.valido) {
      return {
        valido: false,
        mensaje: `Error en ficha ${tipo}: ${validacion.mensaje}`
      };
    }
  }
  
  return { valido: true };
};
