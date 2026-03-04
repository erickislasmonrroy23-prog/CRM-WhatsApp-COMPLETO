// frontend/src/pages/Automations.js
import React, { useState, useEffect } from 'react';
import { getAutomations, createAutomation, toggleAutomation, deleteAutomation } from '../services/api';

const CONDICIONES = [
  { value: 'intencion', label: 'Intención detectada por IA' },
  { value: 'sin_respuesta_24h', label: 'Sin respuesta en 24 horas' },
];

const INTENCIONES = ['informacion', 'precio', 'inscripcion', 'no_interesado'];

const ACCIONES = [
  { value: 'enviar_mensaje', label: 'Enviar mensaje' },
  { value: 'enviar_recordatorio', label: 'Enviar recordatorio' },
];

export default function Automations() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ nombre: '', condicion_tipo: 'intencion', condicion_valor: 'precio', accion_tipo: 'enviar_mensaje', accion_valor: '' });
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    try {
      const { data } = await getAutomations();
      setRules(data);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!form.nombre || !form.accion_valor) return alert('Completa todos los campos');
    setSaving(true);
    try {
      await createAutomation(form);
      setShowCreate(false);
      fetch();
    } catch (e) {
      alert(e.response?.data?.error || 'Error al crear regla');
    }
    setSaving(false);
  };

  const handleToggle = async (id) => {
    await toggleAutomation(id);
    fetch();
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar regla "${nombre}"?`)) return;
    await deleteAutomation(id);
    fetch();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ Automatización</div>
          <div className="page-subtitle">Reglas automáticas basadas en IA y comportamiento</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Nueva Regla</button>
      </div>

      {/* Info box */}
      <div className="card mb-4" style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.3)' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>🤖 Cómo funciona el motor de automatización</div>
        <p className="text-muted text-sm">
          Cuando un contacto responde un mensaje, Gemini AI analiza la intención y dispara las reglas correspondientes.
          El motor de cron también revisa contactos sin respuesta cada hora.
        </p>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
        ) : rules.length === 0 ? (
          <div className="empty-state"><div className="icon">⚙️</div><p>Sin reglas. Crea tu primera automatización.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {rules.map((r) => (
              <div key={r.id} style={{
                padding: 16, background: 'var(--bg-input)', borderRadius: 8,
                border: `1px solid ${r.activa ? 'rgba(37,211,102,0.3)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{r.nombre}</div>
                  <div className="text-sm text-muted mt-4">
                    <span style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 4 }}>
                      SI {r.condicion_tipo} {r.condicion_valor ? `= "${r.condicion_valor}"` : ''}
                    </span>
                    {' → '}
                    <span style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 4 }}>
                      {r.accion_tipo}: "{r.accion_valor?.substring(0, 60)}..."
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`badge ${r.activa ? 'badge-green' : 'badge-gray'}`}>
                    {r.activa ? 'Activa' : 'Pausada'}
                  </span>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleToggle(r.id)}>
                    {r.activa ? '⏸' : '▶'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id, r.nombre)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nueva Regla de Automatización</span>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre de la regla *</label>
              <input className="form-input" placeholder="Ej: Respuesta a interesados en precio" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Condición (SI...)</label>
                <select className="form-select" value={form.condicion_tipo} onChange={(e) => setForm({ ...form, condicion_tipo: e.target.value })}>
                  {CONDICIONES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              {form.condicion_tipo === 'intencion' && (
                <div className="form-group">
                  <label className="form-label">Valor de intención</label>
                  <select className="form-select" value={form.condicion_valor} onChange={(e) => setForm({ ...form, condicion_valor: e.target.value })}>
                    {INTENCIONES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Acción (ENTONCES...)</label>
              <select className="form-select" value={form.accion_tipo} onChange={(e) => setForm({ ...form, accion_tipo: e.target.value })}>
                {ACCIONES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Mensaje a enviar *</label>
              <textarea
                className="form-textarea"
                placeholder="Escribe el mensaje que se enviará automáticamente..."
                value={form.accion_valor}
                onChange={(e) => setForm({ ...form, accion_valor: e.target.value })}
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? <span className="spinner" /> : '💾'} Guardar Regla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
