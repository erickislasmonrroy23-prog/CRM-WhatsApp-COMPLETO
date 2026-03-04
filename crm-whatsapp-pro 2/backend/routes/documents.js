// backend/routes/documents.js
import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { procesarPDF } from '../engines/documentProcessor.js';

const router = express.Router();

// POST /api/documents/upload - Subir y procesar PDF con IA
router.post('/upload', authenticate, upload.single('documento'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo PDF requerido' });

    if (!req.file.mimetype.includes('pdf')) {
      return res.status(400).json({ error: 'Solo se aceptan archivos PDF' });
    }

    const curso = await procesarPDF(req.file.path, req.file.originalname);
    res.status(201).json({ mensaje: 'PDF procesado y curso guardado', curso });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/cursos
router.get('/cursos', authenticate, async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM cursos ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/cursos/:id
router.delete('/cursos/:id', authenticate, async (req, res, next) => {
  try {
    await query(`DELETE FROM cursos WHERE id = $1`, [req.params.id]);
    res.json({ mensaje: 'Curso eliminado' });
  } catch (err) {
    next(err);
  }
});

export default router;
