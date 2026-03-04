// frontend/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { getDashboardStats } from '../services/api';

const StatCard = ({ icon, label, value, color = '#25D366' }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: `${color}20` }}>
      {icon}
    </div>
    <div>
      <div className="stat-value">{value?.toLocaleString() ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

const ETAPAS = [
  { key: 'nuevo', label: 'Nuevo', color: '#8892a4' },
  { key: 'interesado', label: 'Interesado', color: '#3b82f6' },
  { key: 'info_enviada', label: 'Info Enviada', color: '#f59e0b' },
  { key: 'pago_pendiente', label: 'Pago Pendiente', color: '#ef4444' },
  { key: 'pagado', label: 'Pagado', color: '#25D366' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getDashboardStats();
        setStats(data);
      } catch (e) {}
      setLoading(false);
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <span className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  const maxEmbudo = stats ? Math.max(...Object.values(stats.embudo)) : 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Resumen del CRM en tiempo real</div>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          Actualiza cada 30s
        </span>
      </div>

      {/* Stats principales */}
      <div className="stat-grid">
        <StatCard icon="👥" label="Total Contactos" value={stats?.totalContactos} />
        <StatCard icon="✨" label="Nuevos Hoy" value={stats?.nuevosHoy} color="#3b82f6" />
        <StatCard icon="🔥" label="Leads Calientes" value={stats?.leadsCalientes} color="#f59e0b" />
        <StatCard icon="✅" label="Conversiones" value={stats?.conversiones} color="#22c55e" />
        <StatCard icon="📤" label="Mensajes Hoy" value={stats?.mensajesHoy} color="#a855f7" />
        <StatCard icon="📥" label="Respuestas Hoy" value={stats?.respuestasHoy} color="#06b6d4" />
      </div>

      <div className="grid-2">
        {/* Embudo de conversión */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 15, fontWeight: 700 }}>📊 Embudo de Conversión</h3>
          {stats && ETAPAS.map((etapa) => {
            const val = stats.embudo[etapa.key] || 0;
            const pct = maxEmbudo > 0 ? Math.max(8, (val / maxEmbudo) * 100) : 8;
            return (
              <div className="funnel-bar" key={etapa.key}>
                <span className="funnel-label">{etapa.label}</span>
                <div className="funnel-track">
                  <div
                    className="funnel-fill"
                    style={{ width: `${pct}%`, background: etapa.color }}
                  >
                    {val > 0 && val}
                  </div>
                </div>
                <span className="funnel-count">{val}</span>
              </div>
            );
          })}
        </div>

        {/* Actividad semanal */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 15, fontWeight: 700 }}>📈 Mensajes Últimos 7 Días</h3>
          {stats?.actividadSemanal?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.actividadSemanal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3048" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#8892a4' }} tickFormatter={(v) => v?.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#8892a4' }} />
                <Tooltip
                  contentStyle={{ background: '#1a1d27', border: '1px solid #2d3048', borderRadius: 8 }}
                  labelFormatter={(v) => `Fecha: ${v}`}
                />
                <Line type="monotone" dataKey="mensajes" stroke="#25D366" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="icon">📊</div>
              <p>Sin actividad registrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Sesiones WhatsApp */}
      <div className="card mt-4">
        <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>📱 Sesiones WhatsApp Activas</h3>
        {stats?.sessions?.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Número</th>
                  <th>Estado</th>
                  <th>Mensajes Hoy</th>
                  <th>Mensajes/Hora</th>
                </tr>
              </thead>
              <tbody>
                {stats.sessions.map((s) => (
                  <tr key={s.session_id}>
                    <td style={{ fontWeight: 600 }}>{s.nombre}</td>
                    <td className="text-muted">{s.numero || '—'}</td>
                    <td>
                      <span className={`badge ${s.estado === 'conectado' ? 'badge-green' : s.estado === 'qr_pendiente' ? 'badge-yellow' : 'badge-gray'}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td>{s.mensajes_hoy || 0}</td>
                    <td>{s.mensajes_hora || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="icon">📱</div>
            <p>No hay sesiones configuradas</p>
          </div>
        )}
      </div>

      {/* Últimas campañas */}
      <div className="card mt-4">
        <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>📢 Últimas Campañas</h3>
        {stats?.ultimasCampanias?.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaña</th>
                  <th>Estado</th>
                  <th>Enviados</th>
                  <th>Fallidos</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.ultimasCampanias.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                    <td>
                      <span className={`badge ${
                        c.estado === 'completada' ? 'badge-green' :
                        c.estado === 'enviando' ? 'badge-blue' :
                        c.estado === 'cancelada' ? 'badge-red' : 'badge-gray'
                      }`}>{c.estado}</span>
                    </td>
                    <td style={{ color: 'var(--success)' }}>{c.enviados}</td>
                    <td style={{ color: 'var(--danger)' }}>{c.fallidos}</td>
                    <td>{c.total_contactos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="icon">📢</div>
            <p>Sin campañas recientes</p>
          </div>
        )}
      </div>
    </div>
  );
}
