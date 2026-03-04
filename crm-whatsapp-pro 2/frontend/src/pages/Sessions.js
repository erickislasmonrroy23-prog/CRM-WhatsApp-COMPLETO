// frontend/src/pages/Sessions.js
import React, { useState, useEffect } from 'react';
import { getSessions, createSession, getQR, deleteSession, reconnectSession } from '../services/api';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [nombre, setNombre] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrSession, setQrSession] = useState(null);

  const fetch = async () => {
    try {
      const { data } = await getSessions();
      setSessions(data);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async () => {
    if (!nombre.trim()) return;
    setCreating(true);
    try {
      const { data } = await createSession(nombre.trim());
      setNombre('');
      setShowCreate(false);
      fetch();
      // Esperar 3s y mostrar QR
      setTimeout(async () => {
        try {
          const qr = await getQR(data.sessionId);
          if (qr.data.qr) { setQrData(qr.data.qr); setQrSession(data.sessionId); }
        } catch (e) {}
      }, 4000);
    } catch (e) {
      alert(e.response?.data?.error || 'Error creando sesión');
    }
    setCreating(false);
  };

  const handleShowQR = async (sessionId) => {
    try {
      const { data } = await getQR(sessionId);
      setQrData(data.qr);
      setQrSession(sessionId);
    } catch (e) {
      alert('QR no disponible. La sesión puede estar ya conectada.');
    }
  };

  const handleDelete = async (sessionId, nombre) => {
    if (!window.confirm(`¿Eliminar sesión "${nombre}"?`)) return;
    await deleteSession(sessionId);
    fetch();
  };

  const handleReconnect = async (sessionId) => {
    await reconnectSession(sessionId);
    fetch();
  };

  const estadoBadge = {
    conectado: 'badge-green',
    desconectado: 'badge-gray',
    qr_pendiente: 'badge-yellow',
    inicializando: 'badge-blue',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📱 Sesiones WhatsApp</div>
          <div className="page-subtitle">Gestión de números de WhatsApp conectados</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Nueva Sesión</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {sessions.length === 0 && (
            <div className="empty-state card">
              <div className="icon">📱</div>
              <p>No hay sesiones configuradas. Crea una para comenzar.</p>
            </div>
          )}
          {sessions.map((s) => (
            <div className="card" key={s.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div style={{ fontSize: 36 }}>📱</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{s.nombre}</div>
                    <div className="text-muted text-sm">{s.numero || 'Sin número vinculado'}</div>
                    <div className="text-muted text-sm">{s.session_id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`badge ${estadoBadge[s.estado] || 'badge-gray'}`}>{s.estado}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-sm">Hoy: <strong>{s.mensajes_hoy || 0}</strong></div>
                    <div className="text-sm text-muted">Hora: {s.mensajes_hora || 0}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {s.estado === 'qr_pendiente' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleShowQR(s.session_id)}>
                      📷 Ver QR
                    </button>
                  )}
                  {s.estado === 'desconectado' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleReconnect(s.session_id)}>
                      🔄 Reconectar
                    </button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.session_id, s.nombre)}>
                    🗑
                  </button>
                </div>
              </div>

              {/* Anti-block stats */}
              {s.antiBlock && (
                <div style={{
                  marginTop: 16, padding: 12,
                  background: 'var(--bg-input)', borderRadius: 8,
                  display: 'flex', gap: 24
                }}>
                  <div>
                    <div className="text-muted text-sm">Enviados hoy</div>
                    <div style={{ fontWeight: 700 }}>{s.antiBlock.enviadosDia} / {s.antiBlock.limiteDiario}</div>
                  </div>
                  <div>
                    <div className="text-muted text-sm">Esta hora</div>
                    <div style={{ fontWeight: 700 }}>{s.antiBlock.enviadosHora} / {s.antiBlock.limiteHora}</div>
                  </div>
                  <div>
                    <div className="text-muted text-sm">Próxima pausa en</div>
                    <div style={{ fontWeight: 700 }}>{s.antiBlock.proximaPausa} mensajes</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="text-muted text-sm">Uso diario</div>
                    <div style={{ background: 'var(--border)', borderRadius: 4, height: 8, marginTop: 6 }}>
                      <div style={{
                        width: `${s.antiBlock.porcentajeDia}%`,
                        height: '100%', borderRadius: 4,
                        background: s.antiBlock.porcentajeDia > 80 ? 'var(--danger)' : 'var(--primary)'
                      }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear sesión */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nueva Sesión WhatsApp</span>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre de la sesión</label>
              <input
                className="form-input"
                placeholder="Ej: Ventas Principal"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <p className="text-muted text-sm">
              Se iniciará la sesión y deberás escanear un código QR con WhatsApp en tu teléfono.
            </p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !nombre.trim()}>
                {creating ? <span className="spinner" /> : '+'} Crear Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR */}
      {qrData && (
        <div className="modal-overlay" onClick={() => setQrData(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">📷 Escanea el QR</span>
              <button className="modal-close" onClick={() => setQrData(null)}>×</button>
            </div>
            <div className="qr-container">
              <img src={qrData} alt="QR WhatsApp" style={{ width: '100%', borderRadius: 8 }} />
            </div>
            <p className="text-muted text-sm mt-4" style={{ textAlign: 'center' }}>
              Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
