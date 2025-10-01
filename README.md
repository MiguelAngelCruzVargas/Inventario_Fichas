# 🌐 Sistema de Fichas Internet

Sistema completo de gestión de fichas WiFi (clientes, revendedores, trabajadores, gastos, inventario y tareas) con backend **Node.js/Express + MySQL** y frontend **React (Vite)**.

---
## 📌 Tabla de Contenido
1. [Resumen Rápido](#-resumen-rápido)
2. [Características Principales](#-características-principales)
3. [Requisitos Previos](#-requisitos-previos)
4. [Instalación y Puesta en Marcha](#-instalación-y-puesta-en-marcha)
5. [Variables de Entorno](#-configuración-de-entorno)
6. [Interfaz Visual (Frontend)](#-interfaz-visual-frontend)
7. [Operaciones Comunes Paso a Paso](#-operaciones-comunes-paso-a-paso)
8. [Modelo de Soft Delete (Borrado Lógico)](#-modelo-de-soft-delete-borrado-lógico)
9. [Subida y Compresión de Imágenes](#-notas-de-trabajadores-con-imágenes)
10. [SSE / Tiempo Real](#-tiempo-real-sse)
11. [Módulo de Exportación / Archivado (Opcional)](#-módulo-de-archivadoexport-opcional)
12. [Scripts de Mantenimiento](#-comandos-de-mantenimiento)
13. [Seguridad](#-cambios-de-seguridad-recientes)
14. [Despliegue](#-despliegue-en-servicios)
15. [Solución de Problemas](#-troubleshooting)
16. [Próximas Mejores (Roadmap)](#-roadmap)

---
## ⚡ Resumen Rápido

```bash
git clone <repo>
cd Inventario_Fichas
npm run install:all          # Instala frontend + backend
cd backend && npm run setup:db  # (Solo primera vez) crea tablas y usuarios demo
cd ..
npm run dev:full             # Arranca frontend (5173) + backend (3001)
```

Accede en el navegador: http://localhost:5173
Ingresa con usuario admin (ver sección Credenciales).

---
## 🧩 Características Principales
- Gestión de usuarios (admin, revendedores, trabajadores, clientes)
- Control de inventario y equipos asociados a clientes
- Registro de gastos con filtros avanzados
- Ventas, cortes de caja, abonos revendedores
- Notas de trabajadores con foto comprimida automática
- Tareas de mantenimiento con soporte de imágenes
- Soft delete centralizado (no se pierde historial)
- SSE (Server-Sent Events) para notificaciones en tiempo real (Fase 1)
- Módulo de exportación/archivado totalmente deshabilitado por defecto (base instalada)
- Seguridad: cookies httpOnly, rate limiting, control de orígenes, validaciones básicas

---

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

---
## 🖥️ Interfaz Visual (Frontend)

Rutas típicas (pueden variar según evolución UI):
- `/login` → Acceso al sistema
- `/dashboard` → Resumen métricas (puede usar datos cacheables)
- `/clientes` → Lista, creación, edición y (soft) desactivación de clientes
- `/revendedores` → Gestión de revendedores y abonos
- `/usuarios` → Administración global de cuentas (control roles)
- `/equipos` → Equipos por cliente / inventario
- `/inventario` → Inventario global de equipos disponibles
- `/gastos` → Registro y filtros de gastos (usa parámetros fecha, tipo)
- `/tareas` → Tareas de mantenimiento (estado abierta/cerrada, imágenes)
- `/notas` → Notas de trabajadores con fotos
- `/cortes-caja` → Cortes y arqueos
- `/ventas` / `/ventas-ocasionales` → Registro de ventas directas

La mayoría de las vistas usan carga diferida: al estar en `/login` no se hacen llamadas pesadas.

---
## 🛠️ Operaciones Comunes Paso a Paso

### 1. Crear un Cliente
1. Ir a `/clientes`
2. Botón "Nuevo" → Completar datos básicos
3. Guardar → Aparece en la lista (estado activo)

### 2. Asociar Equipo a Cliente
1. Crear equipo en `/equipos` o desde detalle cliente (si la UI lo soporta)
2. Seleccionar cliente al crear el equipo
3. Equipo aparece ahora filtrable por `client_ref`

### 3. Registrar Gasto
1. Ir a `/gastos`
2. Click "Agregar gasto"
3. Seleccionar tipo, monto, fecha
4. Consultar luego con filtros de fecha/tipo

### 4. Crear Nota con Foto
1. Ir a `/notas`
2. Escribir título y descripción
3. Adjuntar imagen (cualquier formato soportado)
4. El backend comprimirá y convertirá a JPEG

### 5. Desactivar (Soft Delete) un Usuario/Cliente/Revendedor
1. Ir a `/usuarios` o la sección específica
2. Usar acción "Desactivar" → El registro se marca inactivo
3. Sigue existiendo para historial y relaciones

### 6. Subir Tarea de Mantenimiento con Imagen
1. Ir a `/tareas`
2. Crear tarea → marcar abierta/cerrada según avance
3. Adjuntar imágenes si aplica

### 7. Ver Cambios en Tiempo Real
1. Mantener abierta una vista con SSE (ej. dashboard)
2. Al crear o actualizar entidades se emitirán eventos (tipos filtrables internamente)

---
## 🗑️ Modelo de Soft Delete (Borrado Lógico)
En vez de eliminar filas críticas, se marca `activo = 0` (o campo similar). Beneficios:
- Historial de ventas/gastos intacto
- Integridad referencial simplificada
- Posible restauración futura (feature pendiente)

Hard delete sólo se permite si no existe historial asociado (casos excepcionales o tablas puente).

---
## 🔔 Tiempo Real (SSE)
- Endpoint SSE unificado (gestionado por un `SSEManager` interno)
- Soporta filtros por tipo de evento (`?types=clientes,gastos` en futuras versiones públicas)
- Eventos incluyen: `ready`, `ping` y payloads con `id` incremental
- Uso actual: transparente para el frontend (suscripción interna)

Próximas mejoras planeadas (no aún activas):
- Replay de últimos N eventos tras reconexión
- Scope por usuario / aislamiento de flujo privado
- Integración con Redis para escalar horizontalmente

---
## 📦 Módulo de Archivado/Export (Opcional)
Infraestructura incluida pero DESACTIVADA por defecto:
- Bandera: `ENABLE_DATA_EXPORT=0` (si está ausente se asume desactivado)
- Requisitos al activarlo: header secreto (`ARCHIVE_OPS_KEY`), rol admin + IP permitida
- Endpoints (cuando activos): `/api/admin/archive/preview` y `/api/admin/archive/export`
- Uso actual previsto: exportar subconjunto de tablas a JSON para archivado anual manual

No habilites esto en producción sin controles y pruebas previas.

---
## 🧪 Troubleshooting
| Síntoma | Causa posible | Solución |
|--------|---------------|----------|
| 401 tras login | Cookie no seteada / dominio túnel inseguro | Verifica SameSite y usar https/ngrok si es remoto |
| Imágenes no aparecen | Ruta estática no servida | Confirmar `/uploads` configurado y permisos de carpeta |
| Timeout en túnel | Latencia túnel gratuita | Aumentar timeout Axios (ya adaptado) o usar plan mejor |
| Cliente "fantasma" | Soft delete no filtrado | Asegurar queries filtran `activo = 1` en frontend |
| Error DB al iniciar | Falta migración | Ejecutar `cd backend && npm run update:db` |
| Fotos grandes pesan mucho | Parámetros compresión muy altos | Ajustar variables NOTE_IMAGE_* |

---
## 🧭 Roadmap (Resumen)
- [ ] Restaurar entidades soft-deleted (`/restore`)
- [ ] SSE Fase 2: buffer replay + scope usuario
- [ ] Caché en endpoints de dashboard
- [ ] Import inverso de snapshot exportado
- [ ] Métricas (Prometheus) y logs estructurados
- [ ] UI para archivado (cuando se active feature)

---
## 📝 Notas Rápidas
- Si usas Windows PowerShell, los scripts declarados funcionan igual; evita usar `rm -rf`, usa `Remove-Item -Recurse -Force`.
- Asegura que MySQL tenga juego de caracteres UTF8MB4.
- Para exponer tu entorno temporalmente: ngrok ó localtunnel (recordar efectos en SameSite cookie).

---
aaah otra cosa: las fotos pesadas ya se comprimen automáticamente a un tamaño óptimo siguiendo la lógica de Compresión Adaptativa (ver más abajo).

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

// Para tareas (si deseas valores distintos a las notas; heredan de NOTE_ si no se definen)
TASK_IMAGE_MAX_INPUT_MB=12      # Límite por archivo tareas
TASK_IMAGES_MAX=3               # Número máximo de imágenes por actualización
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

### Endurecimiento de Seguridad Reciente
- Validación estricta de mimetypes permitidos (rechaza otros tipos).
- Límite de tamaño por archivo configurable vía env.
- Límite de número de imágenes por tarea / nota.
- Validación de contraseña fuerte (>=10 chars, mayúscula, minúscula, número, símbolo, sin espacios).