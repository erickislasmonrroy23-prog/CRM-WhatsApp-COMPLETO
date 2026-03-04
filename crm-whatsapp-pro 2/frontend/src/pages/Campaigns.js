// frontend/src/pages/Campaigns.js
import React, { useState, useEffect } from 'react';
import { getCampaigns, getContacts, getSessions, createCampaign, sendCampaign, cancelCampaign, deleteCampaign } from '../services/api';

const ESTADO_BADGE = {
  borrador: 'badge-gray', programada: 'badge-blue', enviando: 'badge-yellow',
  completada: 'badge-green', cancelada: 'badge-red', pausada: 'badge-purple',
};

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [form, setForm] = useState({ nombre: '', mensaje: '', session_id: '', programada_para: '' });
  const [adjunto, setAdjunto] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    try {
      const { data } = await getCampaigns();
      setCampaigns(data);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, []);

  const openCreate = async () => {
    const [s, c] = await Promise.all([getSessions(), getContacts({ limit: 500 })]);
    setSessions(s.data.filter((s) => s.estado === 'conectado'));
    setContacts(c.data.data);
    setSelectedContacts([]);
    setForm({ nombre: '', mensaje: '', session_id: '', programada_para: '' });
    setAdjunto(null);
    setShowCreate(true);
  };

  const toggleContact = (id) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedContacts(contacts.map((c) => c.id));
  };

  const handleCreate = async () => {
    if (!form.nombre || !form.mensaje || !form.session_id) return alert('Completa los campos obligatorios');
    if (!selectedContacts.length) return alert('Selecciona al menos un contacto');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('nombre', form.nombre);
      fd.append('mensaje', form.mensaje);
      fd.append('session_id', form.session_id);
      if (form.programada_para) fd.append('programada_para', form.programada_para);
      fd.append('contact_ids', JSON.stringify(selectedContacts));
      if (adjunto) fd.append('adjunto', adjunto);

      await createCampaign(fd);
      setShowCreate(false);
      fetch();
    } catch (e) {
      alert(e.response?.data?.error || 'Error al crear campaña');
    }
    setSaving(false);
  };

  const handleSend = async (id) => {
    if (!window.confirm('¿Iniciar el envío de esta campaña ahora?')) return;
    await sendCampaign(id);
    fetch();
  };

  const handleCancel = async (id) => {
    await cancelCampaign(id);
    fetch();
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar campaña "${nombre}"?`)) return;
    await deleteCampaign(id);
    fetch();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📢 Campañas</div>
          <div className="page-subtitle">Envíos masivos por WhatsApp</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nueva Campaña</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
          ) : campaigns.length === 0 ? (
            <div className="empty-state"><div className="icon">📢</div><p>Sin campañas. Crea tu primera campaña.</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Campaña</th>
                  <th>Sesión</th>
                  <th>Estado</th>
                  <th>Progreso</th>
                  <th>Creada</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                      <div className="text-muted text-sm" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.mensaje}
                      </div>
                    </td>
                    <td className="text-muted">{c.session_nombre || c.session_id}</td>
                    <td><span className={`badge ${ESTADO_BADGE[c.estado]}`}>{c.estado}</span></td>
                    <td>
                      <div className="text-sm">
                        <span style={{ color: 'var(--success)' }}>{c.enviados}</span>
                        {' / '}
                        <span>{c.total_contactos}</span>
                        {c.fallidos > 0 && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>({c.fallidos} fallidos)</span>}
                      </div>
                      {c.total_contactos > 0 && (
                        <div style={{ background: 'var(--bg-input)', borderRadius: 4, height: 4, marginTop: 4 }}>
                          <div style={{
                            width: `${Math.round((c.enviados / c.total_contactos) * 100)}%`,
                            height: '100%', borderRadius: 4, background: 'var(--primary)'
                          }} />
                        </div>
                      )}
                    </td>
                    <td className="text-muted text-sm">{new Date(c.created_at).toLocaleDateString('es-MX')}</td>
                    <td>
                      <div className="flex gap-2">
                        {(c.estado === 'borrador' || c.estado === 'pausada') && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleSend(c.id)}>▶ Enviar</button>
                        )}
                        {c.estado === 'enviando' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleCancel(c.id)}>⏹ Cancelar</button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.nombre)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal crear campaña */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <span className="modal-title">Nueva Campaña de WhatsApp</span>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nombre de la campaña *</label>
                <input className="form-input" placeholder="Promo enero 2025" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Sesión WhatsApp *</label>
                <select className="form-select" value={form.session_id} onChange={(e) => setForm({ ...form, session_id: e.target.value })}>
                  <option value="">Seleccionar sesión...</option>
                  {sessions.map((s) => <option key={s.session_id} value={s.session_id}>{s.nombre} ({s.numero})</option>)}
                </select>
                {sessions.length === 0 && <p style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4 }}>No hay sesiones conectadas</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mensaje * (usa {'{{nombre}}'} y {'{{telefono}}'})</label>
              <textarea className="form-textarea" placeholder="Hola {{nombre}}, te contactamos para..." value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Adjunto (PDF, imagen, opcional)</label>
                <input type="file" className="form-input" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={(e) => setAdjunto(e.target.files[0])} />
              </div>
              <div className="form-group">
                <label className="form-label">Programar envío (opcional)</label>
                <input type="datetime-local" className="form-input" value={form.programada_para} onChange={(e) => setForm({ ...form, programada_para: e.target.value })} />
              </div>
            </div>

            {/* Selección de contactos */}
            <div className="form-group">
              <div className="flex items-center justify-between mb-4">
                <label className="form-label" style={{ margin: 0 }}>
                  Contactos ({selectedContacts.length} / {contacts.length} seleccionados)
                </label>
                <button className="btn btn-secondary btn-sm" onClick={selectAll}>Seleccionar todos</button>
              </div>
              <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                <table>
                  <thead><tr><th style={{ width: 40 }}>✓</th><th>Nombre</th><th>Teléfono</th><th>Etapa</th></tr></thead>
                  <tbody>
                    {contacts.map((c) => (
                      <tr key={c.id} onClick={() => toggleContact(c.id)} style={{ cursor: 'pointer' }}>
                        <td>
                          <input type="checkbox" checked={selectedContacts.includes(c.id)} onChange={() => toggleContact(c.id)} />
                        </td>
                        <td>{c.nombre}</td>
                        <td className="text-muted">{c.telefono}</td>
                        <td><span className="badge badge-gray text-sm">{c.etapa_embudo}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? <span className="spinner" /> : '💾'} Crear Campaña
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
