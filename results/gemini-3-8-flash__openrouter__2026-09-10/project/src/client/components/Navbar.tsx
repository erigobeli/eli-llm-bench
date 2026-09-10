import React from 'react';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const navItems = [
    { path: '/', label: 'Visão Geral' },
    { path: '/clientes', label: 'Clientes' },
    { path: '/negocios', label: 'Negócios' },
    { path: '/pipeline', label: 'Pipeline' },
  ];

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a
          href="/"
          className="navbar-brand"
          onClick={(e) => handleClick(e, '/')}
        >
          <span>CRMBench Modelo</span>
        </a>
        <nav>
          <ul className="navbar-nav">
            {navItems.map((item) => {
              const isActive =
                item.path === '/'
                  ? currentPath === '/'
                  : currentPath.startsWith(item.path);
              return (
                <li key={item.path}>
                  <a
                    href={item.path}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={(e) => handleClick(e, item.path)}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
};
