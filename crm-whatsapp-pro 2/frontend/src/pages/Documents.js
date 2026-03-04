// frontend/src/pages/Documents.js
import React, { useState, useEffect } from 'react';
import { uploadDocument, getCursos, deleteCurso } from '../services/api';

export default function Documents() {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const fetch = async () => {
    try {
      const { data } = await getCursos();
      setCursos(data);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const { data } = await uploadDocument(file);
      setResult(data.curso);
      setFile(null);
      fetch();
    } catch (e) {
      alert(e.response?.data?.error || 'Error procesando PDF');
    }
    setUploading(false);
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) return;
    await deleteCurso(id);
    fetch();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📄 Procesador de Documentos IA</div>
          <div className="page-subtitle">Sube un PDF y Gemini AI extraerá la información automáticamente</div>
        </div>
      </div>

      {/* Upload zone */}
      <div className="card mb-4">
        <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>🤖 Subir PDF para análisis con IA</h3>
        <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
          El sistema extrae automáticamente: nombre del curso, descripción, beneficios, duración y precio sugerido.
        </p>
        <div className="flex gap-4 items-center">
          <input
            type="file"
            accept=".pdf"
            className="form-input"
            style={{ flex: 1 }}
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? <span className="spinner" /> : '🚀'} Analizar PDF
          </button>
        </div>
        {uploading && (
          <div style={{ marginTop: 16, color: 'var(--primary)', fontSize: 13 }}>
            ⏳ Gemini AI está analizando el documento...
          </div>
        )}
      </div>

      {/* Resultado del último análisis */}
      {result && (
        <div className="card mb-4" style={{ borderColor: 'rgba(37,211,102,0.4)', background: 'rgba(37,211,102,0.05)' }}>
          <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>
            ✅ Análisis completado: {result.nombre}
          </h3>
          <div className="grid-2">
            <div>
              <div className="form-label">Descripción</div>
              <p className="text-sm">{result.descripcion}</p>
            </div>
            <div>
              <div className="form-label">Duración</div>
              <p className="text-sm">{result.duracion}</p>
            </div>
            <div>
              <div className="form-label">Precio Sugerido</div>
              <p style={{ fontWeight: 700, color: 'var(--success)' }}>
                {result.precio_sugerido ? `$${Number(result.precio_sugerido).toLocaleString()}` : 'No detectado'}
              </p>
            </div>
            <div>
              <div className="form-label">Beneficios</div>
              <p className="text-sm">{result.beneficios}</p>
            </div>
          </div>
        </div>
      )}

      {/* Cursos guardados */}
      <div className="card">
        <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>📚 Cursos / Productos Registrados</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
        ) : cursos.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📄</div>
            <p>Aún no hay documentos procesados. Sube tu primer PDF.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cursos.map((c) => (
              <div key={c.id} style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 8 }}>
                <div className="flex items-center justify-between">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{c.nombre}</div>
                    <div className="text-sm text-muted">{c.descripcion?.substring(0, 120)}...</div>
                    <div className="flex gap-4 mt-4">
                      {c.duracion && (
                        <span className="text-sm text-muted">⏱ {c.duracion}</span>
                      )}
                      {c.precio_sugerido && (
                        <span className="text-sm" style={{ color: 'var(--success)', fontWeight: 600 }}>
                          💰 ${Number(c.precio_sugerido).toLocaleString()}
                        </span>
                      )}
                      <span className="text-sm text-muted">📁 {c.archivo_origen}</span>
                    </div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.nombre)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
