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
```

### Variables de Entorno para Hosting

**Para Railway/Heroku/Render:**
```bash
PORT=3001  # Puerto del backend
DATABASE_URL=mysql://...  # URL de MySQL
JWT_SECRET=secreto_super_seguro
NODE_ENV=production
ALLOWED_ORIGINS=https://tu-frontend.vercel.app
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

<!-- Usuario: juan_1
Contraseña: Juanpe62& -->

<!-- Usuario: maria_juana
Contraseña: CafeMari92* -->