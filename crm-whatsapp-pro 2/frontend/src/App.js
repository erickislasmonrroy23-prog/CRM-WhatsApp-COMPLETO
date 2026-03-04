// frontend/src/App.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import Sessions from './pages/Sessions';
import Automations from './pages/Automations';
import Documents from './pages/Documents';
import Login from './pages/Login';
import './App.css';

// ---- Auth Context ----
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ---- Sidebar ----
const navItems = [
  { to: '/', icon: '📊', label: 'Dashboard' },
  { to: '/contacts', icon: '👥', label: 'Contactos' },
  { to: '/campaigns', icon: '📢', label: 'Campañas' },
  { to: '/sessions', icon: '📱', label: 'WhatsApp' },
  { to: '/automations', icon: '⚙️', label: 'Automatización' },
  { to: '/documents', icon: '📄', label: 'Documentos IA' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">💬</span>
        <span className="logo-text">CRM Pro</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.nombre?.[0]?.toUpperCase()}</div>
          <div>
            <div className="user-name">{user?.nombre}</div>
            <div className="user-role">{user?.rol}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>Salir</button>
      </div>
    </aside>
  );
};

// ---- Layout protegido ----
const Layout = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
};

// ---- App Principal ----
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/contacts" element={<Layout><Contacts /></Layout>} />
          <Route path="/campaigns" element={<Layout><Campaigns /></Layout>} />
          <Route path="/sessions" element={<Layout><Sessions /></Layout>} />
          <Route path="/automations" element={<Layout><Automations /></Layout>} />
          <Route path="/documents" element={<Layout><Documents /></Layout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
