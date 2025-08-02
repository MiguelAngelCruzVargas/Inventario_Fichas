// Archivo de reportes eliminado - funcionalidad deshabilitada
import express from 'express';

const router = express.Router();

// Middleware para indicar que los reportes están deshabilitados
router.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'La funcionalidad de reportes ha sido deshabilitada',
    error: 'REPORTS_DISABLED'
  });
});

export default router;
