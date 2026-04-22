// ══════════════════════════════════════════════════════════════════════════
// SIDEBAR WRAPPER — Adds collapsible left sidebar to existing BlogGenerator
// Drop this in: src/components/SidebarWrapper.jsx
// ══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';

export default function SidebarWrapper({ children, currentTab, onTabChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('toolshed_sidebar_open');
    return saved !== 'false'; // Default open
  });

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem('toolshed_sidebar_open', String(newState));
  };

  // Colors matching your existing theme
  const colors = {
    teal: '#00CCCC',
    bg: '#07070f',
    bg2: '#0f0f1a',
    bg3: '#14141f',
    border: 'rgba(255,255,255,0.08)',
    muted: 'rgba(255,255,255,0.45)',
    white: '#fff'
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      background: colors.bg,
      color: colors.white,
    },
    sidebar: {
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: sidebarOpen ? '240px' : '60px',
      background: colors.bg2,
      borderRight: `1px solid ${colors.border}`,
      transition: 'width 0.3s ease',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
    },
    sidebarHeader: {
      padding: '20px',
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      minHeight: '80px',
    },
    logo: {
      display: sidebarOpen ? 'flex' : 'none',
      alignItems: 'center',
      gap: '12px',
      opacity: sidebarOpen ? 1 : 0,
      transition: 'opacity 0.2s',
    },
    logoIcon: {
      fontSize: '32px',
    },
    logoText: {
      display: 'flex',
      flexDirection: 'column',
    },
    logoTitle: {
      fontSize: '16px',
      fontWeight: '800',
      color: colors.teal,
      letterSpacing: '-0.02em',
    },
    logoSubtitle: {
      fontSize: '11px',
      color: colors.muted,
      fontWeight: '600',
      letterSpacing: '0.05em',
    },
    collapseBtn: {
      background: 'transparent',
      border: 'none',
      color: colors.muted,
      cursor: 'pointer',
      fontSize: '18px',
      padding: '6px',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
      width: '32px',
      height: '32px',
    },
    nav: {
      flex: 1,
      padding: '16px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      overflowY: 'auto',
    },
    navItem: (active) => ({
      background: active ? colors.teal : 'transparent',
      border: 'none',
      color: active ? '#000' : colors.white,
      padding: '12px 14px',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '13px',
      fontWeight: active ? '700' : '500',
      transition: 'all 0.2s',
      textAlign: 'left',
      width: '100%',
      justifyContent: sidebarOpen ? 'flex-start' : 'center',
    }),
    navIcon: {
      fontSize: '18px',
      minWidth: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    navLabel: {
      display: sidebarOpen ? 'block' : 'none',
      opacity: sidebarOpen ? 1 : 0,
      transition: 'opacity 0.2s',
      whiteSpace: 'nowrap',
    },
    main: {
      flex: 1,
      marginLeft: sidebarOpen ? '240px' : '60px',
      transition: 'margin-left 0.3s ease',
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
      width: '100%',
    },
    badge: {
      background: 'rgba(0,204,204,0.15)',
      color: colors.teal,
      fontSize: '10px',
      fontWeight: '700',
      padding: '3px 8px',
      borderRadius: '12px',
      marginLeft: '8px',
    }
  };

  const navItems = [
    { id: 'ideas', icon: '💡', label: 'Ideas', badge: null },
    { id: 'generator', icon: '✨', label: 'Generator', badge: null },
    { id: 'importer', icon: '📥', label: 'Import Docs', badge: null },
    { id: 'queue', icon: '📋', label: 'Queue', badge: null },
    { id: 'settings', icon: '⚙️', label: 'Settings', badge: null },
  ];

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          {sidebarOpen && (
            <div style={styles.logo}>
              <div style={styles.logoIcon}>⚾</div>
              <div style={styles.logoText}>
                <div style={styles.logoTitle}>Glove SOS</div>
                <div style={styles.logoSubtitle}>TOOL SHED</div>
              </div>
            </div>
          )}
          <button 
            onClick={toggleSidebar}
            style={styles.collapseBtn}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '◄' : '►'}
          </button>
        </div>
        
        <nav style={styles.nav}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={styles.navItem(currentTab === item.id)}
              title={!sidebarOpen ? item.label : ''}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
              {item.badge && sidebarOpen && <span style={styles.badge}>{item.badge}</span>}
            </button>
          ))}
        </nav>
      </aside>
      
      {/* MAIN CONTENT */}
      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
}
