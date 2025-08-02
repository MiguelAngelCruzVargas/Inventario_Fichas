/**
 * Controlador para gestión de revendedores
 */

import { validarRevendedor, validarPrecioComision, validarTelefono } from '../utils/validation.js';

/**
 * Base de datos simulada
 */
let revendedores = [];
let tiposFicha = ['1 hora', '2 horas', '3 horas', '5 horas'];

/**
 * Obtiene todos los revendedores
 * @returns {Object} Respuesta con los revendedores
 */
export const getRevendedores = (req, res) => {
  return {
    success: true,
    data: revendedores
  };
};

/**
 * Crea un nuevo revendedor
 * @param {Object} data - Datos del revendedor
 * @returns {Object} Respuesta con el resultado
 */
export const crearRevendedor = (data) => {
  // Validar datos
  const validacion = validarRevendedor(data);
  if (!validacion.valido) {
    return {
      success: false,
      message: validacion.mensaje
    };
  }
  
  try {
    // Crear inventario inicial para todos los tipos de ficha
    const inventarioInicial = {};
    
    tiposFicha.forEach(tipo => {
      const tipoKey = tipo.replace(' ', '').replace('horas', 'h').replace('hora', 'h');
      const fieldName = `fichas${tipoKey}`;
      inventarioInicial[fieldName] = 0;
    });
    
    // Crear nuevo revendedor con ID único
    const nuevoRevendedor = {
      id: Date.now().toString(),
      nombre: data.nombre.trim(),
      responsable: data.responsable.trim(),
      telefono: data.telefono.trim(),
      direccion: data.direccion ? data.direccion.trim() : '',
      precios: data.precios,
      comisiones: data.comisiones,
      ...inventarioInicial
    };
    
    // Agregar a la lista
    revendedores.push(nuevoRevendedor);
    
    return {
      success: true,
      data: nuevoRevendedor,
      message: 'Revendedor creado exitosamente'
    };
  } catch (error) {
    console.error('Error al crear revendedor:', error);
    return {
      success: false,
      message: 'Error al crear el revendedor'
    };
  }
};

/**
 * Actualiza el inventario de un revendedor
 * @param {String} id - ID del revendedor
 * @param {Object} inventario - Nuevo inventario
 * @returns {Object} Respuesta con el resultado
 */
export const actualizarInventario = (id, inventario) => {
  try {
    const index = revendedores.findIndex(r => r.id === id);
    if (index === -1) {
      return {
        success: false,
        message: 'Revendedor no encontrado'
      };
    }
    
    // Validar que todos los valores de inventario sean números positivos
    for (const key in inventario) {
      if (!/^fichas\w+$/.test(key)) continue; // Solo procesar campos de inventario
      
      const valor = inventario[key];
      if (typeof valor !== 'number' || valor < 0 || !Number.isInteger(valor)) {
        return {
          success: false,
          message: `El valor de inventario para ${key} debe ser un número entero positivo`
        };
      }
    }
    
    // Actualizar revendedor
    revendedores[index] = {
      ...revendedores[index],
      ...inventario
    };
    
    return {
      success: true,
      data: revendedores[index],
      message: 'Inventario actualizado correctamente'
    };
  } catch (error) {
    console.error('Error al actualizar inventario:', error);
    return {
      success: false,
      message: 'Error al actualizar el inventario'
    };
  }
};

/**
 * Actualiza los precios y comisiones de un revendedor
 * @param {String} id - ID del revendedor
 * @param {Object} precios - Nuevos precios
 * @param {Object} comisiones - Nuevas comisiones
 * @returns {Object} Respuesta con el resultado
 */
export const actualizarPreciosComisiones = (id, precios, comisiones) => {
  try {
    const index = revendedores.findIndex(r => r.id === id);
    if (index === -1) {
      return {
        success: false,
        message: 'Revendedor no encontrado'
      };
    }
    
    // Validar cada par de precio y comisión
    for (const tipo in precios) {
      const precio = precios[tipo];
      const comision = comisiones[tipo];
      
      const validacion = validarPrecioComision(precio, comision);
      if (!validacion.valido) {
        return {
          success: false,
          message: `Error en tipo ${tipo}: ${validacion.mensaje}`
        };
      }
    }
    
    // Actualizar revendedor
    revendedores[index] = {
      ...revendedores[index],
      precios,
      comisiones
    };
    
    return {
      success: true,
      data: revendedores[index],
      message: 'Precios y comisiones actualizados correctamente'
    };
  } catch (error) {
    console.error('Error al actualizar precios y comisiones:', error);
    return {
      success: false,
      message: 'Error al actualizar precios y comisiones'
    };
  }
};

/**
 * Agrega un nuevo tipo de ficha
 * @param {String} nombre - Nombre del tipo de ficha
 * @param {Number} precio - Precio base para todos los revendedores
 * @param {Number} comision - Comisión base para todos los revendedores
 * @returns {Object} Respuesta con el resultado
 */
export const agregarTipoFicha = (nombre, precio, comision) => {
  try {
    // Validar que el tipo no exista
    if (tiposFicha.includes(nombre)) {
      return {
        success: false,
        message: 'Este tipo de ficha ya existe'
      };
    }
    
    // Validar precio y comisión
    const validacion = validarPrecioComision(precio, comision);
    if (!validacion.valido) {
      return {
        success: false,
        message: validacion.mensaje
      };
    }
    
    // Agregar el nuevo tipo
    tiposFicha.push(nombre);
    
    // Actualizar todos los revendedores
    const tipoKey = nombre.replace(' ', '').replace('horas', 'h').replace('hora', 'h');
    const fieldName = `fichas${tipoKey}`;
    
    revendedores.forEach(revendedor => {
      revendedor[fieldName] = 0;
      revendedor.precios[tipoKey] = parseInt(precio);
      revendedor.comisiones[tipoKey] = parseInt(comision);
    });
    
    return {
      success: true,
      data: {
        tiposFicha,
        nombre,
        precio,
        comision
      },
      message: `Tipo de ficha "${nombre}" agregado exitosamente`
    };
  } catch (error) {
    console.error('Error al agregar tipo de ficha:', error);
    return {
      success: false,
      message: 'Error al agregar el tipo de ficha'
    };
  }
};

// Exportar todas las funciones para uso en el frontend o en una API REST
export default {
  getRevendedores,
  crearRevendedor,
  actualizarInventario,
  actualizarPreciosComisiones,
  agregarTipoFicha
};
