Proyecto organizado por capas y features.

- app/: wiring de app (punto de entrada, router, providers)
- features/: módulos de negocio (admin, revendedor, trabajador, etc.)
- components/: componentes reutilizables (se pueden ir moviendo a shared cuando aplique)
- shared/: piezas transversales (contextos, UI común, hooks/utilidades genéricas)
- services/: acceso a API y lógica de datos
- utils/: helpers puros
- router/: rutas (expuesto vía alias @router)

Aliases disponibles (Vite + jsconfig):
- @ -> src
- @app -> src/app
- @features -> src/features
- @shared -> src/shared
- @components -> src/components
- @context -> src/context
- @services -> src/services
- @utils -> src/utils
- @router -> src/router
- @assets -> src/assets

Guía de migración incremental:
1) Nuevos imports: usa aliases (por ejemplo, `import { authService } from '@services/authService'`).
2) Al mover archivos, respeta las rutas de alias y evita paths relativos profundos.
3) Crea un `index.js` (barrel) por carpeta para exponer su API si hay muchos módulos.
4) Mantén las páginas/flows por feature dentro de `features/<feature>` y comparte UI en `shared/`.
