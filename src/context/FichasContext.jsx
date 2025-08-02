import React, { createContext, useContext, useState, useEffect } from 'react';
import { fichasService } from '../services/fichasService';
import { tareasService } from '../services/tareasService';
import { cortesCajaService } from '../services/cortesCajaService';
import { useAuth } from './AuthContext';
import { useUsers } from './UsersContext';

const FichasContext = createContext();

// Exportar el contexto como named export por si se necesita en algún lugar
export { FichasContext };

export const useFichas = () => {
  const context = useContext(FichasContext);
  if (!context) {
    throw new Error('useFichas debe ser usado dentro de un FichasProvider');
  }
  return context;
};

export const FichasProvider = ({ children }) => {
  const authContext = useAuth();
  const { notifyRevendedoresChanged, notifyTrabajadoresChanged, notifyUsersChanged, updateTrigger } = useUsers();
  const isAuthenticated = authContext?.isAuthenticated || false;
  const user = authContext?.user || null;
  // Buscar el rol en múltiples campos por compatibilidad
  const userRole = user?.tipo_usuario || user?.role;
  
  // Estados principales
  const [revendedores, setRevendedores] = useState([]);
  const [tiposFicha, setTiposFicha] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [inventarios, setInventarios] = useState([]);
  const [stockGlobal, setStockGlobal] = useState({});
  const [corteCaja, setCorteCaja] = useState({});
  const [historialCortes, setHistorialCortes] = useState([]);
  const [reportesFichas, setReportesFichas] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [tareasMantenimiento, setTareasMantenimiento] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función específica para recargar trabajadores
  const recargarTrabajadores = async () => {
    try {
      console.log('🔄 Recargando trabajadores disponibles desde API...');
      const result = await tareasService.obtenerTrabajadoresDisponibles();
      if (result.success) {
        console.log('✅ Trabajadores disponibles recargados:', result.trabajadores);
        setTrabajadores(result.trabajadores);
      } else {
        console.error('❌ Error al recargar trabajadores disponibles:', result.error);
      }
    } catch (error) {
      console.error('❌ Error al recargar trabajadores disponibles:', error);
    }
  };

  // Función específica para recargar revendedores
  const recargarRevendedores = async () => {
    try {
      console.log('🔄 Recargando revendedores desde API...');
      const result = await fichasService.obtenerRevendedores();
      console.log('✅ Revendedores recargados:', result);
      setRevendedores(result);
    } catch (error) {
      console.error('❌ Error al recargar revendedores:', error);
    }
  };

  // Cargar datos iniciales con throttling
  useEffect(() => {
    let timeoutId;
    
    if (isAuthenticated && user) {
      // Throttling: esperar 1 segundo antes de cargar datos
      timeoutId = setTimeout(() => {
        loadAllData();
      }, 1000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAuthenticated, user?.tipo_usuario]); // Removido user?.revendedor_id para reducir triggers

  // DESHABILITADO: Reaccionar a cambios en usuarios para evitar rate limiting
  // useEffect(() => {
  //   if (isAuthenticated && user && userRole === 'admin' && updateTrigger > 0) {
  //     console.log('🔄 Detectado cambio en usuarios, recargando trabajadores y revendedores...');
  //     // Throttling más agresivo: 5 segundos
  //     const timeoutId = setTimeout(() => {
  //       recargarTrabajadores();
  //       recargarRevendedores();
  //     }, 5000);
  //     
  //     return () => clearTimeout(timeoutId);
  //   }
  // }, [updateTrigger, isAuthenticated, user, userRole]);

  const loadAllData = async (forceRefresh = false) => {
    if (loading && !forceRefresh) {
      console.log('⚠️ Carga ya en progreso, evitando duplicación');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('📦 Cargando datos esenciales...', { userRole, forceRefresh });
      
      // PASO 1: Cargar solo datos esenciales con delay mínimo
      const tiposFichaData = await fichasService.obtenerTiposFicha();
      setTiposFicha(tiposFichaData);
      console.log('✅ Tipos de fichas cargados');

      // PASO 2: Cargar datos específicos con throttling agresivo
      if (userRole === 'admin') {
        // Solo datos críticos para admin con delays
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const [revendedoresData, stockGlobalData] = await Promise.allSettled([
          fichasService.obtenerRevendedores(),
          fichasService.obtenerStockGlobal().catch(() => [])
        ]);

        if (revendedoresData.status === 'fulfilled') {
          setRevendedores(revendedoresData.value);
          console.log('✅ Revendedores cargados');
        }

        if (stockGlobalData.status === 'fulfilled') {
          setStockGlobal(stockGlobalData.value);
          console.log('✅ Stock global cargado');
        }

        // Cargar trabajadores solo si es necesario (con delay adicional)
        setTimeout(async () => {
          try {
            const result = await tareasService.obtenerTrabajadoresDisponibles();
            if (result.success) {
              setTrabajadores(result.trabajadores);
              console.log('✅ Trabajadores disponibles cargados (background):', result.trabajadores.length);
            } else {
              console.warn('⚠️ Error obteniendo trabajadores disponibles:', result.error);
              setTrabajadores([]);
            }
          } catch (error) {
            console.warn('⚠️ Error cargando trabajadores en background:', error);
            setTrabajadores([]);
          }
        }, 1000);
        
      } else if (userRole === 'revendedor' && user?.revendedor_id) {
        // Para revendedores: solo datos críticos
        await new Promise(resolve => setTimeout(resolve, 200));
        
        try {
          console.log('🔍 Intentando cargar datos del revendedor:', {
            userRole,
            userId: user?.id,
            revendedorId: user?.revendedor_id,
            username: user?.username,
            fullUser: user
          });
          
          const misDatos = await fichasService.obtenerRevendedorActual();
          setRevendedores([misDatos]);
          console.log('✅ Datos del revendedor cargados:', misDatos);
        } catch (error) {
          console.error('❌ Error cargando datos del revendedor:', {
            error: error.message,
            status: error.response?.status,
            data: error.response?.data,
            userInfo: {
              id: user?.id,
              username: user?.username,
              role: user?.role || user?.tipo_usuario,
              revendedor_id: user?.revendedor_id
            }
          });
          
          // Si es error 403, podría ser un problema de permisos o configuración backend
          if (error.response?.status === 403) {
            console.warn('🚫 Error 403: Problema de autorización en el backend');
            console.warn('💡 Verificar que el middleware de autenticación esté correctamente configurado');
            
            // Intentar cargar datos básicos como fallback
            try {
              console.log('🔄 Intentando cargar datos básicos como fallback...');
              const revendedoresData = await fichasService.obtenerRevendedores();
              const miRevendedor = revendedoresData.find(r => r.id === user?.revendedor_id);
              
              if (miRevendedor) {
                setRevendedores([miRevendedor]);
                console.log('✅ Datos básicos del revendedor cargados como fallback:', miRevendedor);
              } else {
                console.error('❌ No se encontró el revendedor con ID:', user?.revendedor_id);
                setError('No se pudo encontrar tu información de revendedor. Contacta al administrador.');
                setRevendedores([]);
              }
            } catch (fallbackError) {
              console.error('❌ Error en fallback:', fallbackError);
              setError('Error de conexión. Verifica tu conexión a internet.');
              setRevendedores([]);
            }
          } else {
            setError(`Error al cargar datos: ${error.message}`);
            setRevendedores([]);
          }
          
          setEntregas([]);
        }
      } else if (userRole === 'trabajador') {
        // Para trabajadores: datos mínimos
        await new Promise(resolve => setTimeout(resolve, 200));
        
        try {
          const revendedoresData = await fichasService.obtenerRevendedores();
          setRevendedores(revendedoresData);
          console.log('✅ Datos para trabajador cargados');
        } catch (error) {
          console.warn('⚠️ Error cargando datos para trabajador:', error);
          setRevendedores([]);
        }
      }

      console.log('✅ Carga de datos esenciales completada');
      
    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
      setError(error.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Revendedores
  const agregarRevendedor = async (revendedorData) => {
    try {
      const nuevoRevendedor = await fichasService.crearRevendedor(revendedorData);
      setRevendedores(prev => [...prev, nuevoRevendedor]);
      
      // Notificar cambios para actualizar otros componentes
      notifyRevendedoresChanged();
      
      return { success: true, data: nuevoRevendedor };
    } catch (error) {
      console.error('Error al agregar revendedor:', error);
      return { success: false, error: error.message };
    }
  };

  const actualizarRevendedor = async (id, revendedorData) => {
    try {
      const revendedorActualizado = await fichasService.actualizarRevendedor(id, revendedorData);
      setRevendedores(prev => 
        prev.map(r => r.id === id ? revendedorActualizado : r)
      );
      
      // Notificar cambios para actualizar otros componentes
      notifyRevendedoresChanged();
      
      return { success: true, data: revendedorActualizado };
    } catch (error) {
      console.error('Error al actualizar revendedor:', error);
      return { success: false, error: error.message };
    }
  };

  const eliminarRevendedor = async (id) => {
    try {
      await fichasService.eliminarRevendedor(id);
      setRevendedores(prev => prev.filter(r => r.id !== id));
      
      // Notificar cambios para actualizar otros componentes
      notifyRevendedoresChanged();
      
      return { success: true };
    } catch (error) {
      console.error('Error al eliminar revendedor:', error);
      return { success: false, error: error.message };
    }
  };

  const eliminarTrabajador = async (id) => {
    try {
      console.log(`Intentando eliminar trabajador con ID: ${id}`);
      
      const resultado = await fichasService.eliminarUsuario(id);
      console.log('Resultado del servicio:', resultado);
      
      setTrabajadores(prev => prev.filter(t => t.id !== id));
      return { success: true };
    } catch (error) {
      console.error('Error al eliminar trabajador:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error desconocido';
      
      return { success: false, error: errorMessage };
    }
  };

  const crearTrabajador = async (trabajadorData) => {
    try {
      const resultado = await fichasService.crearTrabajador(trabajadorData);
      
      // Agregar el nuevo trabajador al estado local
      setTrabajadores(prev => [...prev, resultado.usuario]);
      
      return { 
        success: true, 
        data: resultado.usuario,
        credenciales: resultado.credenciales 
      };
    } catch (error) {
      console.error('Error al crear trabajador:', error);
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  };

  // CRUD Tipos de Ficha
  const agregarTipoFicha = async (tipoFichaData) => {
    try {
      const nuevoTipo = await fichasService.crearTipoFicha(tipoFichaData);
      setTiposFicha(prev => [...prev, nuevoTipo]);
      return { success: true, data: nuevoTipo };
    } catch (error) {
      console.error('Error al agregar tipo de ficha:', error);
      return { success: false, error: error.message };
    }
  };

  const actualizarTipoFicha = async (id, tipoFichaData) => {
    try {
      const tipoActualizado = await fichasService.actualizarTipoFicha(id, tipoFichaData);
      setTiposFicha(prev => 
        prev.map(t => t.id === id ? tipoActualizado : t)
      );
      return { success: true, data: tipoActualizado };
    } catch (error) {
      console.error('Error al actualizar tipo de ficha:', error);
      return { success: false, error: error.message };
    }
  };

  const eliminarTipoFicha = async (id) => {
    try {
      await fichasService.eliminarTipoFicha(id);
      setTiposFicha(prev => prev.filter(t => t.id !== id));
      return { success: true };
    } catch (error) {
      console.error('Error al eliminar tipo de ficha:', error);
      return { success: false, error: error.message };
    }
  };

  // Gestión de Inventarios
  const ajustarInventario = async (revendedorId, tipoFichaId, campo, cantidad) => {
    try {
      const resultado = await fichasService.ajustarInventario({
        revendedorId,
        tipoFichaId,
        campo,
        cantidad
      });

      // Actualizar el estado local
      setRevendedores(prev => 
        prev.map(r => {
          if (r.id === revendedorId) {
            const tipoKey = tiposFicha.find(t => t.id === tipoFichaId)?.nombre
              ?.replace(' ', '').replace('horas', 'h').replace('hora', 'h');
            
            if (tipoKey) {
              const fieldName = `${campo}${tipoKey}`;
              return {
                ...r,
                [fieldName]: resultado.nuevoValor
              };
            }
          }
          return r;
        })
      );

      return { success: true, data: resultado };
    } catch (error) {
      console.error('Error al ajustar inventario:', error);
      return { success: false, error: error.message };
    }
  };

  const actualizarPrecios = async (revendedorId, precios, comisiones) => {
    try {
      const resultado = await fichasService.updatePrecios(revendedorId, { precios, comisiones });
      
      // Actualizar el estado local
      setRevendedores(prev => 
        prev.map(r => 
          r.id === revendedorId 
            ? { ...r, precios, comisiones }
            : r
        )
      );

      return { success: true, data: resultado };
    } catch (error) {
      console.error('Error al actualizar precios:', error);
      return { success: false, error: error.message };
    }
  };

  // Reportes
  const getResumenFinanciero = async (revendedorId) => {
    try {
      const resumen = await fichasService.getResumenFinanciero(revendedorId);
      return { success: true, data: resumen };
    } catch (error) {
      console.error('Error al obtener resumen financiero:', error);
      return { success: false, error: error.message };
    }
  };

  const getAllResumenesFinancieros = async () => {
    try {
      const resumenes = await fichasService.getAllResumenesFinancieros();
      return { success: true, data: resumenes };
    } catch (error) {
      console.error('Error al obtener resúmenes financieros:', error);
      return { success: false, error: error.message };
    }
  };

  // Calcular resumen financiero local (para UI)
  const calcularResumenFinanciero = (revendedor) => {
    let totalFichasEntregadas = 0;
    let totalFichasVendidas = 0;
    let totalFichasExistentes = 0;
    let totalSubtotal = 0;
    let totalComision = 0;
    let totalFinal = 0;
    const detallesPorTipo = [];

    (tiposFicha || []).forEach(tipoObj => {
      const tipoNombre = tipoObj.nombre || tipoObj;
      const tipoKey = tipoNombre.replace(' ', '').replace('horas', 'h').replace('hora', 'h');
      const entregadas = revendedor[`entregadas${tipoKey}`] || 0;
      const vendidas = revendedor[`vendidas${tipoKey}`] || 0;
      const existentes = entregadas - vendidas;
      const precio = revendedor.precios?.[tipoKey] || 0;
      const comision = revendedor.comisiones?.[tipoKey] || 0;

      if (entregadas > 0 || vendidas > 0) {
        const subtotal = vendidas * precio;
        const comisionTotal = vendidas * comision;
        const total = subtotal - comisionTotal;

        detallesPorTipo.push({
          tipo: tipoNombre,
          fichasEntregadas: entregadas,
          fichasVendidas: vendidas,
          fichasExistentes: existentes,
          precio,
          subtotal,
          comision: comisionTotal,
          total
        });

        totalFichasEntregadas += entregadas;
        totalFichasVendidas += vendidas;
        totalFichasExistentes += existentes;
        totalSubtotal += subtotal;
        totalComision += comisionTotal;
        totalFinal += total;
      }
    });

    return {
      detallesPorTipo,
      totalFichasEntregadas,
      totalFichasVendidas,
      totalFichasExistentes,
      totalSubtotal,
      totalComision,
      totalFinal,
      tieneInventario: detallesPorTipo.length > 0
    };
  };

  const actualizarPorcentajeComision = async (revendedorId, porcentajeComision) => {
    try {
      const response = await fichasService.actualizarPorcentajeComision(revendedorId, porcentajeComision);
      
      // Actualizar el revendedor en el estado local
      setRevendedores(prev => 
        prev.map(r => r.id === revendedorId ? { ...r, porcentaje_comision: porcentajeComision } : r)
      );
      
      return { success: true, data: response };
    } catch (error) {
      console.error('Error al actualizar porcentaje de comisión:', error);
      return { success: false, error: error.message };
    }
  };

  // ========================
  // FUNCIONES DE TAREAS
  // ========================

  const crearTarea = async (tareaData) => {
    try {
      const resultado = await tareasService.crearTarea(tareaData);
      if (resultado.success) {
        setTareasMantenimiento(prev => [...prev, resultado.tarea]);
        return resultado;
      }
      return resultado;
    } catch (error) {
      console.error('Error al crear tarea:', error);
      return { success: false, error: error.message };
    }
  };

  const actualizarEstadoTarea = async (tareaId, estado, notas = '') => {
    try {
      const resultado = await tareasService.actualizarEstadoTarea(tareaId, estado, notas);
      if (resultado.success) {
        setTareasMantenimiento(prev => 
          prev.map(tarea => 
            tarea.id === tareaId 
              ? { 
                  ...tarea, 
                  estado, 
                  notas,
                  fecha_completado: estado === 'Completado' ? new Date().toISOString().split('T')[0] : null
                }
              : tarea
          )
        );
      }
      return resultado;
    } catch (error) {
      console.error('Error al actualizar estado de tarea:', error);
      return { success: false, error: error.message };
    }
  };

  const eliminarTarea = async (tareaId) => {
    try {
      const resultado = await tareasService.eliminarTarea(tareaId);
      if (resultado.success) {
        setTareasMantenimiento(prev => prev.filter(tarea => tarea.id !== tareaId));
      }
      return resultado;
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      return { success: false, error: error.message };
    }
  };

  const crearTrabajadorMantenimiento = async (trabajadorData) => {
    try {
      const resultado = await tareasService.crearTrabajador(trabajadorData);
      if (resultado.success) {
        // Recargar trabajadores desde el servidor para obtener los datos completos
        const trabajadoresActualizados = await tareasService.obtenerTrabajadores();
        if (trabajadoresActualizados.success) {
          setTrabajadores(trabajadoresActualizados.trabajadores);
        }
      }
      return resultado;
    } catch (error) {
      console.error('Error al crear trabajador:', error);
      return { success: false, error: error.message };
    }
  };

  const eliminarTrabajadorMantenimiento = async (trabajadorId) => {
    try {
      const resultado = await tareasService.eliminarTrabajador(trabajadorId);
      if (resultado.success) {
        setTrabajadores(prev => prev.filter(trabajador => trabajador.id !== trabajadorId));
        // También eliminar tareas asignadas a este trabajador
        setTareasMantenimiento(prev => prev.filter(tarea => tarea.trabajador_id !== trabajadorId));
      }
      return resultado;
    } catch (error) {
      console.error('Error al eliminar trabajador:', error);
      return { success: false, error: error.message };
    }
  };

  const recargarTareas = async () => {
    try {
      const resultado = await tareasService.obtenerTareas();
      if (resultado.success) {
        setTareasMantenimiento(resultado.tareas);
      }
      return resultado;
    } catch (error) {
      console.error('Error al recargar tareas:', error);
      return { success: false, error: error.message };
    }
  };

  // Gestión de Cortes de Caja
  const cargarHistorialCortes = async (params = {}) => {
    try {
      const resultado = await cortesCajaService.obtenerHistorial(params);
      if (resultado.success) {
        setHistorialCortes(resultado.data);
      }
      return resultado;
    } catch (error) {
      console.error('Error al cargar historial de cortes:', error);
      return { success: false, error: error.message };
    }
  };

  const guardarCorte = async (datosCorte) => {
    try {
      const resultado = await cortesCajaService.guardarCorte(datosCorte);
      if (resultado.success) {
        // Agregar el nuevo corte al historial local
        setHistorialCortes(prev => [resultado.data, ...prev]);
      }
      return resultado;
    } catch (error) {
      console.error('Error al guardar corte:', error);
      return { success: false, error: error.message };
    }
  };

  const eliminarCorte = async (id) => {
    try {
      const resultado = await cortesCajaService.eliminarCorte(id);
      if (resultado.success) {
        setHistorialCortes(prev => prev.filter(corte => corte.id !== id));
      }
      return resultado;
    } catch (error) {
      console.error('Error al eliminar corte:', error);
      return { success: false, error: error.message };
    }
  };

  const obtenerEstadisticasCortes = async (params = {}) => {
    try {
      const resultado = await cortesCajaService.obtenerEstadisticas(params);
      return resultado;
    } catch (error) {
      console.error('Error al obtener estadísticas de cortes:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    // Estados
    revendedores,
    tiposFicha,
    entregas,
    inventarios,
    stockGlobal,
    corteCaja,
    historialCortes,
    reportesFichas,
    trabajadores,
    tareasMantenimiento,
    loading,
    error,
    
    // Setters para compatibilidad con componentes existentes
    setRevendedores,
    setTiposFicha,
    setEntregas,
    setStockGlobal,
    setCorteCaja,
    setHistorialCortes,
    setReportesFichas,
    setTrabajadores,
    setTareasMantenimiento,
    
    // Funciones
    loadAllData,
    agregarRevendedor,
    actualizarRevendedor,
    eliminarRevendedor,
    agregarTipoFicha,
    actualizarTipoFicha,
    eliminarTipoFicha,
    ajustarInventario,
    actualizarPrecios,
    getResumenFinanciero,
    getAllResumenesFinancieros,
    calcularResumenFinanciero,
    eliminarTrabajador,
    crearTrabajador,
    actualizarPorcentajeComision,
    
    // Funciones de tareas
    crearTarea,
    actualizarEstadoTarea,
    eliminarTarea,
    crearTrabajadorMantenimiento,
    eliminarTrabajadorMantenimiento,
    recargarTareas,
    recargarTrabajadores, // Nueva función para recargar trabajadores
    recargarRevendedores, // Nueva función para recargar revendedores
    
    // Funciones de cortes de caja
    cargarHistorialCortes,
    guardarCorte,
    eliminarCorte,
    obtenerEstadisticasCortes
  };

  return (
    <FichasContext.Provider value={value}>
      {children}
    </FichasContext.Provider>
  );
};
