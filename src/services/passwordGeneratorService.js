/**
 * Servicio de generación de contraseñas seguras y personalizadas
 * Genera contraseñas basadas en datos del usuario/negocio más caracteres seguros
 */

class PasswordGeneratorService {
  constructor() {
    // Caracteres seguros para añadir a las contraseñas
    this.secureChars = {
      numbers: '23456789', // Excluimos 0 y 1 para evitar confusión
      symbols: '@#$%&*+',
      uppercase: 'ABCDEFGHJKLMNPQRSTUVWXYZ', // Excluimos I y O para evitar confusión
      lowercase: 'abcdefghjkmnpqrstuvwxyz'   // Excluimos i, l, o para evitar confusión
    };
  }

  /**
   * Normaliza texto removiendo acentos y caracteres especiales
   */
  normalizeText(text) {
    if (!text) return '';
    
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-zA-Z0-9]/g, '')    // Solo letras y números
      .toLowerCase();
  }

  /**
   * Capitaliza la primera letra de una palabra y convierte el resto a minúsculas
   */
  capitalize(word) {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  /**
   * Obtiene caracteres aleatorios de un conjunto
   */
  getRandomChars(charset, count) {
    let result = '';
    for (let i = 0; i < count; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Genera contraseña para revendedor
   * Formato: [PrimerasLetrasNegocio][PrimerasLetrasNombre][Números][Símbolos]
   * Ejemplo: TienMaria23@
   */
  generateRevendedorPassword(nombreCompleto, nombreNegocio) {
    try {
      // Validar datos de entrada
      if (!nombreCompleto || nombreCompleto.trim() === '') {
        throw new Error('Nombre completo es requerido para revendedores');
      }
      
      // Si no hay nombre de negocio, usar el nombre completo como base
      const negocioBase = nombreNegocio && nombreNegocio.trim() ? nombreNegocio.trim() : nombreCompleto.trim();

      // Normalizar y procesar nombre del negocio
      const negocioNorm = this.normalizeText(negocioBase);
      let negocioPart = '';
      
      if (negocioNorm.length >= 4) {
        negocioPart = this.capitalize(negocioNorm.substring(0, 4));
      } else if (negocioNorm.length > 0) {
        // Si el nombre del negocio es muy corto, usar todo y completar
        negocioPart = this.capitalize(negocioNorm) + 
                     this.capitalize(this.getRandomChars(this.secureChars.lowercase, 4 - negocioNorm.length));
      } else {
        // Fallback si no hay nombre de negocio válido
        negocioPart = 'Shop';
      }

      // Normalizar y procesar nombre de la persona
      const nombreNorm = this.normalizeText(nombreCompleto.trim());
      const nombreWords = nombreNorm.split(/\s+/).filter(word => word.length > 0);
      
      let nombrePart = '';
      if (nombreWords.length >= 2) {
        // Tomar primeras letras del nombre y apellido
        const nombre = nombreWords[0].substring(0, 2).padEnd(2, 'x');
        const apellido = nombreWords[1].substring(0, 2).padEnd(2, 'x');
        nombrePart = this.capitalize(nombre) + this.capitalize(apellido);
      } else if (nombreWords.length === 1 && nombreWords[0].length > 0) {
        // Solo un nombre, tomar 4 caracteres
        const soloNombre = nombreWords[0].substring(0, 4).padEnd(4, 'x');
        nombrePart = this.capitalize(soloNombre);
      } else {
        nombrePart = 'User';
      }

      // Generar parte numérica (2 dígitos)
      const numberPart = this.getRandomChars(this.secureChars.numbers, 2);
      
      // Generar símbolo
      const symbolPart = this.getRandomChars(this.secureChars.symbols, 1);

      const password = `${negocioPart}${nombrePart}${numberPart}${symbolPart}`;
      
      return {
        password,
        strength: this.calculatePasswordStrength(password),
        components: {
          negocio: negocioPart,
          nombre: nombrePart,
          numeros: numberPart,
          simbolo: symbolPart
        }
      };
    } catch (error) {
      console.error('Error generando contraseña de revendedor:', error);
      return this.generateFallbackPassword();
    }
  }

  /**
   * Genera contraseña para trabajador
   * Formato: [PrimerasLetrasNombre][PrimerasLetrasApellido][Números][Símbolos]
   * Ejemplo: JuanPerez47#
   */
  generateTrabajadorPassword(nombreCompleto) {
    try {
      // Validar datos de entrada
      if (!nombreCompleto || nombreCompleto.trim() === '') {
        throw new Error('Nombre completo es requerido para trabajadores');
      }

      const nombreNorm = this.normalizeText(nombreCompleto.trim());
      const nombreWords = nombreNorm.split(/\s+/).filter(word => word.length > 0);
      
      let nombrePart = '';
      if (nombreWords.length >= 2) {
        // Nombre y apellido
        const nombre = nombreWords[0].substring(0, 4).padEnd(4, 'x');
        const apellido = nombreWords[1].substring(0, 4).padEnd(4, 'x');
        nombrePart = this.capitalize(nombre) + this.capitalize(apellido);
      } else if (nombreWords.length === 1 && nombreWords[0].length > 0) {
        // Solo un nombre
        const soloNombre = nombreWords[0].substring(0, 6).padEnd(6, 'x');
        nombrePart = this.capitalize(soloNombre);
      } else {
        nombrePart = 'Trabajador';
      }

      // Generar parte numérica (2 dígitos)
      const numberPart = this.getRandomChars(this.secureChars.numbers, 2);
      
      // Generar símbolo
      const symbolPart = this.getRandomChars(this.secureChars.symbols, 1);

      const password = `${nombrePart}${numberPart}${symbolPart}`;
      
      return {
        password,
        strength: this.calculatePasswordStrength(password),
        components: {
          nombre: nombrePart,
          numeros: numberPart,
          simbolo: symbolPart
        }
      };
    } catch (error) {
      console.error('Error generando contraseña de trabajador:', error);
      return this.generateFallbackPassword();
    }
  }

  /**
   * Genera contraseña para administrador
   * Formato: Admin[PrimerasLetrasNombre][Números][Símbolos]
   * Ejemplo: AdminJuan85@
   */
  generateAdminPassword(nombreCompleto) {
    try {
      // Validar datos de entrada
      if (!nombreCompleto || nombreCompleto.trim() === '') {
        throw new Error('Nombre completo es requerido para administradores');
      }

      const nombreNorm = this.normalizeText(nombreCompleto.trim());
      const nombreWords = nombreNorm.split(/\s+/).filter(word => word.length > 0);
      
      let nombrePart = '';
      if (nombreWords.length > 0 && nombreWords[0].length > 0) {
        nombrePart = this.capitalize(nombreWords[0].substring(0, 4).padEnd(4, 'x'));
      } else {
        nombrePart = 'User';
      }

      // Generar parte numérica (2 dígitos)
      const numberPart = this.getRandomChars(this.secureChars.numbers, 2);
      
      // Generar símbolo
      const symbolPart = this.getRandomChars(this.secureChars.symbols, 1);

      const password = `Admin${nombrePart}${numberPart}${symbolPart}`;
      
      return {
        password,
        strength: this.calculatePasswordStrength(password),
        components: {
          prefijo: 'Admin',
          nombre: nombrePart,
          numeros: numberPart,
          simbolo: symbolPart
        }
      };
    } catch (error) {
      console.error('Error generando contraseña de administrador:', error);
      return this.generateFallbackPassword();
    }
  }

  /**
   * Calcula la fortaleza de la contraseña
   */
  calculatePasswordStrength(password) {
    let score = 0;
    let feedback = [];

    // Longitud
    if (password.length >= 8) score += 25;
    else feedback.push('Muy corta');

    // Mayúsculas
    if (/[A-Z]/.test(password)) score += 25;
    else feedback.push('Falta mayúscula');

    // Minúsculas
    if (/[a-z]/.test(password)) score += 25;
    else feedback.push('Falta minúscula');

    // Números
    if (/[0-9]/.test(password)) score += 15;
    else feedback.push('Falta número');

    // Símbolos
    if (/[^A-Za-z0-9]/.test(password)) score += 10;
    else feedback.push('Falta símbolo');

    let level = 'Muy débil';
    let color = 'red';

    if (score >= 90) {
      level = 'Muy fuerte';
      color = 'green';
    } else if (score >= 70) {
      level = 'Fuerte';
      color = 'blue';
    } else if (score >= 50) {
      level = 'Moderada';
      color = 'yellow';
    } else if (score >= 30) {
      level = 'Débil';
      color = 'orange';
    }

    return {
      score,
      level,
      color,
      feedback: feedback.length > 0 ? feedback : ['Contraseña segura']
    };
  }

  /**
   * Genera contraseña de respaldo en caso de error
   */
  generateFallbackPassword() {
    const randomPart = this.getRandomChars(this.secureChars.uppercase, 2) +
                      this.getRandomChars(this.secureChars.lowercase, 2) +
                      this.getRandomChars(this.secureChars.numbers, 2) +
                      this.getRandomChars(this.secureChars.symbols, 1);
    
    return {
      password: `Safe${randomPart}`,
      strength: this.calculatePasswordStrength(`Safe${randomPart}`),
      components: {
        prefijo: 'Safe',
        random: randomPart
      }
    };
  }

  /**
   * Método principal para generar contraseña según el tipo de usuario
   */
  generatePassword(tipo, nombreCompleto, nombreNegocio = null) {
    switch (tipo.toLowerCase()) {
      case 'revendedor':
        return this.generateRevendedorPassword(nombreCompleto, nombreNegocio);
      case 'trabajador':
        return this.generateTrabajadorPassword(nombreCompleto);
      case 'admin':
      case 'administrador':
        return this.generateAdminPassword(nombreCompleto);
      default:
        return this.generateFallbackPassword();
    }
  }

  /**
   * Valida si una contraseña es segura
   */
  validatePassword(password) {
    const strength = this.calculatePasswordStrength(password);
    return {
      isValid: strength.score >= 50,
      strength,
      requirements: {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumbers: /[0-9]/.test(password),
        hasSymbols: /[^A-Za-z0-9]/.test(password)
      }
    };
  }
}

// Exportar instancia singleton
const passwordGeneratorService = new PasswordGeneratorService();
export default passwordGeneratorService;
