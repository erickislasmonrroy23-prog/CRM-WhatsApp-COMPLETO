// backend/middleware/upload.js
import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';

// Crear directorios si no existen
['uploads/contacts', 'uploads/adjuntos', 'uploads/docs'].forEach((dir) => {
  mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fieldRoutes = {
      file: 'uploads/contacts',
      adjunto: 'uploads/adjuntos',
      documento: 'uploads/docs',
    };
    cb(null, fieldRoutes[file.fieldname] || 'uploads/');
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /csv|xlsx|xls|pdf|jpg|jpeg|png|docx/;
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${ext}`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB máximo
});
