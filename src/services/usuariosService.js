// services/usuariosService.js
import { apiClient } from './apiClient';

class UsuariosService {
  // ==================================================
  // MÉTODOS GENÉRICOS DE USUARIOS (PARA ADMINS)
  // ==================================================

  // Obtener todos los usuarios (vista consolidada)
  async obtenerUsuarios() {
    try {
      const response = await apiClient.get('/usuarios');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      return { success: false, error: error.response?.data?.message || 'Error al obtener usuarios' };
    }
  }

  // Crear nuevo usuario (usado principalmente para el rol de 'admin')
  async crearUsuario(datosUsuario) {
    try {
      const response = await apiClient.post('/usuarios', datosUsuario);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al crear usuario genérico:', error);
      return { success: false, error: error.response?.data?.message || 'Error al crear usuario' };
    }
  }

  // Actualizar usuario (usado principalmente para el rol de 'admin')
  async actualizarUsuario(id, datosUsuario) {
    try {
      const response = await apiClient.put(`/usuarios/${id}`, datosUsuario);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al actualizar usuario genérico:', error);
      return { success: false, error: error.response?.data?.message || 'Error al actualizar usuario' };
    }
  }

  // Eliminar usuario (usado principalmente para el rol de 'admin')
  async eliminarUsuario(id) {
    try {
      const response = await apiClient.delete(`/usuarios/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      // Solo hacer log del error si es necesario para debugging, no mostrar detalles técnicos al usuario
      console.debug('Detalles técnicos del error:', error.response?.status, error.response?.statusText);
      
      // Extraer el mensaje de error más específico del backend
      let errorMessage = 'Error al eliminar usuario';
      
      if (error.response?.data?.message) {
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
