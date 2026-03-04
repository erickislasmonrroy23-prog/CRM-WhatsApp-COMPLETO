// frontend/src/pages/Contacts.js
import React, { useState, useEffect, useRef } from 'react';
import {
  getContacts, createContact, updateContact, deleteContact,
  importPreview, importContacts, exportContactsCSV
} from '../services/api';

const ETAPAS = ['nuevo', 'interesado', 'info_enviada', 'pago_pendiente', 'pagado'];
const ETAPA_BADGE = {
  nuevo: 'badge-gray', interesado: 'badge-blue',
  info_enviada: 'badge-yellow', pago_pendiente: 'badge-red', pagado: 'badge-green',
};

const emptyForm = { nombre: '', telefono: '', email: '', etapa_embudo: 'nuevo', origen: 'manual', notas: '' };

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [etapaFilter, setEtapaFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const { data } = await getContacts({ page, limit: 50, busqueda, etapa: etapaFilter });
      setContacts(data.data);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchContacts(); }, [page, busqueda, etapaFilter]);

  const openCreate = () => {
    setEditContact(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditContact(c);
    setForm({ nombre: c.nombre, telefono: c.telefono, email: c.email || '', etapa_embudo: c.etapa_embudo, origen: c.origen, notas: c.notas || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.telefono) return alert('Nombre y teléfono requeridos');
    setSaving(true);
    try {
      if (editContact) await updateContact(editContact.id, form);
      else await createContact(form);
      setShowModal(false);
      fetchContacts();
    } catch (e) {
      alert(e.response?.data?.error || 'Error al guardar');
    }
    setSaving(false);
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar a ${nombre}?`)) return;
    await deleteContact(id);
    fetchContacts();
  };

  const handleExport = async () => {
    const { data } = await exportContactsCSV();
    const url = URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url; a.download = `contactos-${Date.now()}.csv`; a.click();
  };

  const handleFilePreview = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { data } = await importPreview(file);
      setPreview({ file, ...data });
    } catch (err) {
      alert(err.response?.data?.error || 'Error leyendo archivo');
    }
  };

  const handleImport = async () => {
    if (!preview?.file) return;
    setImporting(true);
    try {
      const { data } = await importContacts(preview.file);
      alert(`✅ Importados: ${data.importados} | Duplicados: ${data.duplicados} | Inválidos: ${data.invalidos}`);
      setShowImport(false);
      setPreview(null);
      fetchContacts();
    } catch (e) {
      alert('Error al importar');
    }
    setImporting(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Contactos</div>
          <div className="page-subtitle">{total.toLocaleString()} contactos en total</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>⬇ Exportar CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowImport(true)}>📂 Importar</button>
          <button className="btn btn-primary" onClick={openCreate}>+ Nuevo Contacto</button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        <input
          className="form-input" style={{ maxWidth: 280 }}
          placeholder="Buscar nombre o teléfono..."
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
        />
        <select
          className="form-select" style={{ maxWidth: 180 }}
          value={etapaFilter}
          onChange={(e) => { setEtapaFilter(e.target.value); setPage(1); }}
        >
          <option value="">Todas las etapas</option>
          {ETAPAS.map((e) => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Etapa</th>
                <th>Score</th>
                <th>Origen</th>
                <th>Último Contacto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><div className="icon">👥</div><p>Sin contactos</p></div></td></tr>
              ) : contacts.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                  <td className="text-muted">{c.telefono}</td>
                  <td><span className={`badge ${ETAPA_BADGE[c.etapa_embudo]}`}>{c.etapa_embudo?.replace('_', ' ')}</span></td>
                  <td>
                    <span style={{ fontWeight: 700, color: c.lead_score >= 25 ? 'var(--success)' : c.lead_score >= 10 ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {c.lead_score}
                    </span>
                  </td>
                  <td className="text-muted text-sm">{c.origen}</td>
                  <td className="text-muted text-sm">
                    {c.ultimo_contacto ? new Date(c.ultimo_contacto).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.nombre)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pages > 1 && (
          <div className="flex gap-2 items-center mt-4" style={{ justifyContent: 'center' }}>
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Ant</button>
            <span className="text-muted text-sm">Página {page} de {pages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Sig →</button>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editContact ? 'Editar Contacto' : 'Nuevo Contacto'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono *</label>
                <input className="form-input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Etapa del Embudo</label>
                <select className="form-select" value={form.etapa_embudo} onChange={(e) => setForm({ ...form, etapa_embudo: e.target.value })}>
                  {ETAPAS.map((e) => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notas</label>
              <textarea className="form-textarea" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" /> : '💾'} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal importar */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">📂 Importar Contactos</span>
              <button className="modal-close" onClick={() => setShowImport(false)}>×</button>
            </div>
            <p className="text-muted text-sm mb-4">Sube un archivo CSV o XLSX. El sistema detectará automáticamente las columnas de nombre y teléfono.</p>
            <div className="form-group">
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="form-input" onChange={handleFilePreview} />
            </div>
            {preview && (
              <div>
                <p style={{ marginBottom: 8 }}>
                  <strong>{preview.totalFilas}</strong> filas detectadas.
                  Columnas: nombre=<code>{preview.columnasDetectadas.nombre || '—'}</code>,
                  teléfono=<code>{preview.columnasDetectadas.telefono || '—'}</code>
                </p>
                <div className="table-wrap" style={{ maxHeight: 200, overflow: 'auto' }}>
                  <table>
                    <thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th></tr></thead>
                    <tbody>
                      {preview.preview.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          <td>{row.nombre}</td>
                          <td>{row.telefono}</td>
                          <td>{row.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowImport(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={!preview || importing}>
                {importing ? <span className="spinner" /> : '⬆'} Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
