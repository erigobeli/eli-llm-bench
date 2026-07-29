import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <aside className="sidebar">
      <div className="sidebar-title">CRMBench Modelo</div>
      <nav>
        <ul className="nav-list">
          <li className="nav-item">
            <Link to="/" className={`nav-link ${isActive('/')}`}>
              Dashboard
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/clientes" className={`nav-link ${isActive('/clientes')}`}>
              Clientes
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/negocios" className={`nav-link ${isActive('/negocios')}`}>
              Negócios
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/pipeline" className={`nav-link ${isActive('/pipeline')}`}>
              Pipeline
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
