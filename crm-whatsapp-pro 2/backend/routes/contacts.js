// backend/routes/contacts.js
import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { previewImport, importarContactos } from '../engines/importEngine.js';
import xlsx from 'xlsx';

const router = express.Router();

// GET /api/contacts - Listar con filtros y paginación
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      etapa,
      busqueda,
      origen,
      sort = 'created_at',
      dir = 'DESC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let conditions = [];
    let params = [];
    let idx = 1;

    if (etapa) { conditions.push(`etapa_embudo = $${idx++}`); params.push(etapa); }
    if (origen) { conditions.push(`origen = $${idx++}`); params.push(origen); }
    if (busqueda) {
      conditions.push(`(nombre ILIKE $${idx} OR telefono ILIKE $${idx})`);
      params.push(`%${busqueda}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const validSorts = ['nombre', 'telefono', 'created_at', 'lead_score', 'etapa_embudo'];
    const orderBy = validSorts.includes(sort) ? sort : 'created_at';

    const countResult = await query(`SELECT COUNT(*) FROM contacts ${where}`, params);
    const dataResult = await query(
      `SELECT id, nombre, telefono, email, etapa_embudo, lead_score, origen, ultimo_contacto, created_at
       FROM contacts ${where}
       ORDER BY ${orderBy} ${dir === 'ASC' ? 'ASC' : 'DESC'}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/contacts/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM contacts WHERE id = $1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Contacto no encontrado' });

    const logs = await query(
      `SELECT * FROM message_logs WHERE contact_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.params.id]
    );

    res.json({ ...result.rows[0], historial: logs.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/contacts
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { nombre, telefono, email, etapa_embudo, origen, notas } = req.body;
    if (!nombre || !telefono) return res.status(400).json({ error: 'Nombre y teléfono son requeridos' });

    const result = await query(
      `INSERT INTO contacts (nombre, telefono, email, etapa_embudo, origen, notas, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nombre, telefono, email, etapa_embudo || 'nuevo', origen || 'manual', notas, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/contacts/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { nombre, telefono, email, etapa_embudo, lead_score, origen, notas } = req.body;

    const result = await query(
      `UPDATE contacts SET nombre=$1, telefono=$2, email=$3, etapa_embudo=$4, lead_score=$5, origen=$6, notas=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [nombre, telefono, email, etapa_embudo, lead_score, origen, notas, req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Contacto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await query(`DELETE FROM contacts WHERE id = $1`, [req.params.id]);
    res.json({ mensaje: 'Contacto eliminado' });
  } catch (err) {
    next(err);
  }
});

// POST /api/contacts/import/preview - Vista previa de importación
router.post('/import/preview', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
    const preview = await previewImport(req.file.path, req.file.originalname);
    res.json(preview);
  } catch (err) {
    next(err);
  }
});

// POST /api/contacts/import - Importar contactos
router.post('/import', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
    const columnaOverrides = req.body.columnas ? JSON.parse(req.body.columnas) : {};
    const resultado = await importarContactos(req.file.path, req.file.originalname, req.user.id, columnaOverrides);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

// GET /api/contacts/export/csv - Exportar contactos a CSV
router.get('/export/csv', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT nombre, telefono, email, etapa_embudo, lead_score, origen, ultimo_contacto, created_at FROM contacts ORDER BY created_at DESC`
    );

    const ws = xlsx.utils.json_to_sheet(result.rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Contactos');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'csv' });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="contactos-${Date.now()}.csv"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

export default router;
