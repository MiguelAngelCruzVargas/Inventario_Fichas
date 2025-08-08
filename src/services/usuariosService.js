// services/usuariosService.js
import { apiClient } from './apiClient';

class UsuariosService {
  // ==================================================
  // MÉTODOS GENÉRICOS DE USUARIOS (PARA ADMINS)
  // ==================================================

  // Obtener todos los usuarios (vista consolidada) - con retry automático
  async obtenerUsuarios(retryCount = 0) {
    const maxRetries = 3;
    
    try {
      const response = await apiClient.get('/usuarios');
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error al obtener usuarios (intento ${retryCount + 1}):`, error);
      
      // Si es error de throttling y tenemos retries disponibles
      if (error.message?.includes('throttled') && retryCount < maxRetries) {
        const delay = (retryCount + 1) * 500; // 500ms, 1000ms, 1500ms
        console.log(`⏳ Reintentando en ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.obtenerUsuarios(retryCount + 1);
      }
      
      // Error final o no es throttling
      const errorMessage = error.message?.includes('throttled') 
        ? 'Sistema ocupado, reintentando automáticamente...'
        : error.response?.data?.message || 'Error al obtener usuarios';
        
      return { success: false, error: errorMessage };
    }
  }

  // Crear nuevo usuario (usado principalmente para el rol de 'admin') - con retry automático
  async crearUsuario(datosUsuario, retryCount = 0) {
    const maxRetries = 2;
    
    try {
      const response = await apiClient.post('/usuarios', datosUsuario);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error al crear usuario (intento ${retryCount + 1}):`, error);
      
      // Si es error de throttling y tenemos retries disponibles
      if (error.message?.includes('throttled') && retryCount < maxRetries) {
        const delay = (retryCount + 1) * 400;
        console.log(`⏳ Reintentando creación en ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.crearUsuario(datosUsuario, retryCount + 1);
      }
      
      // Error final
      const errorMessage = error.message?.includes('throttled') 
        ? 'Sistema ocupado, reintentando automáticamente...'
        : error.response?.data?.message || 'Error al crear usuario';
        
      return { success: false, error: errorMessage };
    }
  }

  // Actualizar usuario (usado principalmente para el rol de 'admin') - con retry automático
  async actualizarUsuario(id, datosUsuario, retryCount = 0) {
    const maxRetries = 2;
    
    try {
      const response = await apiClient.put(`/usuarios/${id}`, datosUsuario);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error al actualizar usuario (intento ${retryCount + 1}):`, error);
      
      if (error.message?.includes('throttled') && retryCount < maxRetries) {
        const delay = (retryCount + 1) * 400;
        console.log(`⏳ Reintentando actualización en ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.actualizarUsuario(id, datosUsuario, retryCount + 1);
      }
      
      const errorMessage = error.message?.includes('throttled') 
        ? 'Sistema ocupado, reintentando automáticamente...'
        : error.response?.data?.message || 'Error al actualizar usuario';
        
      return { success: false, error: errorMessage };
    }
  }

  // Eliminar usuario (usado principalmente para el rol de 'admin') - con retry automático  
  async eliminarUsuario(id, retryCount = 0) {
    const maxRetries = 2;
    
    try {
      const response = await apiClient.delete(`/usuarios/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error al eliminar usuario (intento ${retryCount + 1}):`, error);
      
      // Retry solo para errores de throttling
      if (error.message?.includes('throttled') && retryCount < maxRetries) {
        const delay = (retryCount + 1) * 400;
        console.log(`⏳ Reintentando eliminación en ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.eliminarUsuario(id, retryCount + 1);
      }
      
      // Para otros errores, mantener la lógica original de manejo de errores
      // Solo hacer log del error si es necesario para debugging, no mostrar detalles técnicos al usuario
      console.debug('Detalles técnicos del error:', error.response?.status, error.response?.statusText);
      
      // Extraer el mensaje de error más específico del backend
      let errorMessage = 'Error al eliminar usuario';
      
      if (error.message?.includes('throttled')) {
        errorMessage = 'Sistema ocupado, reintentando automáticamente...';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 400) {
        errorMessage = 'No se puede eliminar el usuario. Verifique que no tenga tareas pendientes asignadas.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Usuario no encontrado';
      } else if (error.response?.status === 403) {
        // Verificar si es el error específico de eliminación de admin
        if (error.response?.data?.error === 'ADMIN_DELETION_FORBIDDEN') {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = 'No tienes permisos para eliminar este usuario';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // ==================================================
  // MÉTODOS ESPECÍFICOS PARA REVENDEDORES
  // ==================================================

  async crearRevendedor(datosUsuario) {
    try {
      // NOTA: La API en /revendedores se encargará de crear el usuario Y el revendedor.
      const response = await apiClient.post('/revendedores', datosUsuario);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al crear revendedor:', error);
      return { success: false, error: error.response?.data?.message || 'Error al crear el revendedor' };
    }
  }

  async actualizarRevendedor(id, datosUsuario) {
    try {
      // NOTA: La API en /revendedores/:id se encargará de actualizar ambas tablas si es necesario.
      const response = await apiClient.put(`/revendedores/${id}`, datosUsuario);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al actualizar revendedor:', error);
      return { success: false, error: error.response?.data?.message || 'Error al actualizar el revendedor' };
    }
  }

  async eliminarRevendedor(id) {
    try {
      // NOTA: La API en /revendedores/:id se encargará de la lógica de borrado en ambas tablas.
      const response = await apiClient.delete(`/revendedores/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al eliminar revendedor:', error);
      return { success: false, error: error.response?.data?.message || 'Error al eliminar el revendedor' };
    }
  }

  // ==================================================
  // MÉTODOS ESPECÍFICOS PARA TRABAJADORES
  // ==================================================

  async crearTrabajador(datosUsuario) {
    try {
      // NOTA: La API en /trabajadores se encargará de crear el usuario Y el trabajador.
      const response = await apiClient.post('/trabajadores', datosUsuario);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al crear trabajador:', error);
      return { success: false, error: error.response?.data?.message || 'Error al crear el trabajador' };
    }
  }

  async actualizarTrabajador(id, datosUsuario) {
    try {
      // NOTA: La API en /trabajadores/:id se encargará de actualizar ambas tablas si es necesario.
      const response = await apiClient.put(`/trabajadores/${id}`, datosUsuario);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al actualizar trabajador:', error);
      return { success: false, error: error.response?.data?.message || 'Error al actualizar el trabajador' };
    }
  }

  async eliminarTrabajador(id) {
    try {
      // NOTA: La API en /trabajadores/:id se encargará de la lógica de borrado en ambas tablas.
      const response = await apiClient.delete(`/trabajadores/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al eliminar trabajador:', error);
      return { success: false, error: error.response?.data?.message || 'Error al eliminar el trabajador' };
    }
  }

  // ==================================================
  // MÉTODOS DE PERFIL Y UTILIDADES (Sin cambios)
  // ==================================================

  // Cambiar contraseña (usuario actual)
  async cambiarPassword(currentPassword, newPassword) {
    try {
      const response = await apiClient.post('/usuarios/cambiar-password', { currentPassword, newPassword });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      return { success: false, error: error.response?.data?.message || 'Error al cambiar contraseña' };
    }
  }

  // Actualizar perfil del usuario actual
  async actualizarMiPerfil(datosUsuario) {
    try {
      const response = await apiClient.put('/usuarios/mi-perfil', datosUsuario);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      return { success: false, error: error.response?.data?.message || 'Error al actualizar perfil' };
    }
  }

  // Obtener vista previa de eliminación
  async obtenerVistaEliminacion(id) {
    try {
      const response = await apiClient.get(`/usuarios/${id}/deletion-preview`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al obtener vista previa de eliminación:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Error al obtener información de eliminación' 
      };
    }
  }

  // Alternar estado activo/inactivo
  async toggleEstadoUsuario(id) {
    try {
      const response = await apiClient.patch(`/usuarios/${id}/toggle-active`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al cambiar estado del usuario:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Error al cambiar estado del usuario' 
      };
    }
  }

  // Validaciones (sin cambios)
  validarDatosUsuario(datos, esEdicion = false) {
    const errores = [];
    if (!datos.username || datos.username.trim() === '') {
      errores.push('El nombre de usuario es requerido');
    }
    if (!esEdicion && (!datos.password || datos.password.trim() === '')) {
      errores.push('La contraseña es requerida');
    }
    if (!datos.role || !['admin', 'trabajador', 'revendedor'].includes(datos.role)) {
      errores.push('Debe seleccionar un rol válido');
    }
    return errores;
  }
}

export default new UsuariosService();
