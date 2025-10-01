# 🌐 Sistema de Fichas Internet

Sistema completo de gestión de fichas WiFi con backend Node.js/Express y frontend React.

## 🚀 Scripts de NPM (Recomendado para Producción)

### **Desarrollo Local**

```bash
# 1. Instalar todas las dependencias
npm run install:all

# 2. Configurar base de datos (solo primera vez)
cd backend && npm run setup:db

# 3. Iniciar todo (backend + frontend simultáneamente)
npm run dev:full

# O por separado:
npm run dev:backend    # Solo backend (puerto 3001)
npm run dev:frontend   # Solo frontend (puerto 5173)
```

### **Producción**

```bash
# 1. Construir frontend
npm run build

# 2. Iniciar frontend en modo producción
npm start

# 3. Iniciar backend (en otra terminal)
cd backend && npm start
```

## ⚙️ Configuración de Entorno

### Backend (`backend/.env`)
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=inventario_fichas_wifi
JWT_SECRET=tu_jwt_secret_seguro
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
LOGIN_RATE_LIMIT_MAX=20
LOGIN_RATE_LIMIT_WINDOW_MINUTES=15
```

### Variables de Entorno para Hosting

**Para Railway/Heroku/Render:**
```bash
PORT=3001  # Puerto del backend
DATABASE_URL=mysql://...  # URL de MySQL
JWT_SECRET=secreto_super_seguro
NODE_ENV=production
ALLOWED_ORIGINS=https://tu-frontend.vercel.app
LOGIN_RATE_LIMIT_MAX=20
LOGIN_RATE_LIMIT_WINDOW_MINUTES=15
```

**Para Vercel (Frontend):**
```bash
VITE_API_URL=https://tu-backend.railway.app
```

## 🔐 Credenciales de Prueba

```
👑 Admin:        admin / admin123
🔧 Trabajador:   trabajador / trabajador123  
🏪 Revendedor 1: cyber_andes / revendedor123
🏪 Revendedor 2: internet_sur / revendedor456
```

## 📁 Estructura de Scripts NPM

```json
{
  "scripts": {
    // Desarrollo
    "dev:full": "concurrently backend+frontend",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "npm run dev",
    
    // Producción
    "build": "vite build",
    "start": "vite preview",
    
    // Utilidades
    "install:all": "instala todas las dependencias",
    "lint": "eslint ."
  }
}
```

## 🌍 Despliegue en Servicios

### **Opción 1: Separado (Recomendado)**

**Frontend en Vercel:**
1. Conectar repo → Seleccionar carpeta raíz
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Env: `VITE_API_URL=https://backend-url`

**Backend en Railway:**
1. Conectar repo → Seleccionar carpeta `/backend`
2. Start Command: `npm start`
3. Variables: todas las del .env

### **Opción 2: Monorepo (Alternativa)**

**Todo en Railway:**
```json
{
  "scripts": {
    "build": "npm run build && cd backend && npm install",
    "start": "cd backend && npm start"
  }
}
```

## 🔧 Comandos de Mantenimiento

```bash
# Backend: Recrear usuarios
cd backend && npm run create:users

# Backend: Actualizar esquema de DB
cd backend && npm run update:db

# Frontend: Linting
npm run lint

# Todo: Reinstalar dependencias
rm -rf node_modules backend/node_modules
npm run install:all
```

## 📋 Checklist para Producción

- [ ] Variables de entorno configuradas
- [ ] Base de datos MySQL creada
- [ ] CORS configurado correctamente
- [ ] JWT_SECRET seguro y único
- [ ] Puerto del backend disponible
- [ ] Frontend construido (`npm run build`)
- [ ] URLs de API actualizadas

**🎯 Con estos scripts NPM, el sistema está listo para desarrollo local y despliegue en cualquier servicio de hosting moderno.**

## 🔒 Cambios de Seguridad Recientes

- Validación de variables de entorno críticas al arranque (el servidor no inicia si faltan).
- Unificación de puerto backend (3001) y proxy actualizado.
- Rate limit específico para login vía `LOGIN_RATE_LIMIT_MAX`.
- Eliminada búsqueda parcial en `/auth/login` para mitigar enumeración.
- Búsqueda parcial controlada (longitud >=3) en `/auth/detect-role` bajo rate limit.
- Nuevo endpoint `/auth/search` sólo para admin.
- CORS dinamizado con `ALLOWED_ORIGINS`.
- Cabecera de advertencia `X-Token-Warning` expuesta.

<!-- Usuario: juan_1
Contraseña: Juanpe62& -->

<!-- Usuario: maria_juana
Contraseña: CafeMari92* -->

aaah otra cosa si las fotos son muy pesadas (a vecees tiene la maxima claidad que las comprima tambien a un tamaño optimo)

## 🧮 Filtros de Gastos

El endpoint de gastos acepta filtros opcionales para paginar y refinar resultados:

Parámetros (query string):
- `fecha_desde` (YYYY-MM-DD) – inclusive
- `fecha_hasta` (YYYY-MM-DD) – inclusive
- `tipo` (string) – valor del enum tipo (ej: `servicio`, `compra`, `otro`)
- `page` (int) – página (default 1)
- `pageSize` (int) – tamaño página (max 100)

Ejemplo:
```
GET /api/gastos?fecha_desde=2025-09-01&fecha_hasta=2025-09-15&tipo=servicio&page=1&pageSize=25
```

## 🖥️ Filtro Equipos por Cliente Activo

Se añadió soporte para filtrar equipos por cliente activo asociado.

Parámetros:
- `client_ref` (string) – identificador o parte del nombre del cliente

Ejemplo:
```
GET /api/equipos?client_ref=marcos
```
Devuelve sólo los equipos asociados a clientes cuyo nombre (o campo relevante) coincide parcialmente.

## 🖼️ Notas de Trabajadores con Imágenes

Ahora las notas pueden incluir una foto opcional (técnicos / trabajadores). Características:
- Formatos aceptados de entrada: JPG, JPEG, PNG, WEBP, HEIC, HEIF.
- Todas las imágenes se convierten a JPEG final.
- Se sirve públicamente desde `/uploads/notas/<archivo>.jpg`.
- Vista Admin muestra miniatura, modal de detalle y lightbox con zoom, abrir en nueva pestaña y descarga directa.

### Compresión Adaptativa

Para evitar que fotos muy pesadas saturen el almacenamiento:
1. Se acepta una imagen de hasta `NOTE_IMAGE_MAX_INPUT_MB` (por defecto 12MB).
2. Se redimensiona al lado máximo `NOTE_IMAGE_MAX_DIM` (por defecto 1600px) manteniendo proporción.
3. Se intenta alcanzar un peso aproximado `NOTE_IMAGE_TARGET_MAX_KB` (por defecto 600KB) reduciendo calidad en pasos de 5.
4. Si llega a `NOTE_IMAGE_MIN_QUALITY` (default 55) y aún es grande, reduce dimensiones gradualmente hasta `NOTE_IMAGE_MIN_DIM` (default 800px) o se detiene.
5. Salida final: JPEG optimizado (mozjpeg) con orientación EXIF corregida.

### Variables de Entorno (Backend)
Puedes ajustar el comportamiento añadiendo al `.env` del backend:
```
NOTE_IMAGE_MAX_INPUT_MB=12      # Tamaño máximo aceptado del archivo original
NOTE_IMAGE_MAX_DIM=1600         # Dimensión (ancho/alto) inicial máxima
NOTE_IMAGE_TARGET_MAX_KB=600    # Objetivo de peso final aproximado
NOTE_IMAGE_START_QUALITY=82     # Calidad JPEG inicial
NOTE_IMAGE_MIN_QUALITY=55       # Calidad mínima
NOTE_IMAGE_MIN_DIM=800          # Dimensión mínima al reducir
```

### Ejemplo de Respuesta de Nota
```json
{
  "id": 123,
  "usuario_id": 5,
  "titulo": "Router cambiado",
  "contenido": "Se reemplazó equipo dañado",
  "imagen": "/uploads/notas/nota_1726500000000_123456.jpg",
  "estado": 0,
  "created_at": "2025-09-16T15:30:00.000Z",
  "username": "trabajador_1",
  "revendedor_nombre": "maria juana"
}
```

### Buenas Prácticas para Técnicos
- Intentar tomar la foto enfocada y con suficiente iluminación.
- Evitar capturas de pantalla innecesarias (pesan más sin aportar valor técnico).
- Una sola evidencia suele ser suficiente; subir múltiples fotos similares duplica almacenamiento.