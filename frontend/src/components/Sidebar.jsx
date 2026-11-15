import React from "react";

export function Sidebar({ currentScreen, onSelectScreen }) {
  const navItems = [
    { id: "dashboard", label: "Mission Command", icon: "⌂" },
    { id: "physio", label: "Physiological", icon: "♥" },
    { id: "radiation", label: "Radiation Center", icon: "☢" },
    { id: "behavioral", label: "Behavioral Health", icon: "◉" },
    { id: "assistant", label: "AI Assistant", icon: "✦" },
    { id: "reports", label: "Reports & Research", icon: "▤" },
    { id: "datahub", label: "NASA Data Hub", icon: "⛁" }
  ];

  return (
    <aside className="sidebar">
      <div className="side-brand">
        <div className="side-logo">✚</div>
        <div>
          <div className="side-name">ASTRA HEALTH</div>
          <div className="side-sub">NASA SPACE APPS 2026</div>
        </div>
      </div>

      <nav className="side-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectScreen(item.id)}
            className={currentScreen === item.id ? "active" : ""}
          >
            <span className="ic">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="side-foot">
        <div className="side-astro">🧑‍🚀</div>
        <p>
          Demo crew data is <strong>SIMULATED</strong>. NASA records are labelled with their source. Not a medical device.
        </p>
      </div>
    </aside>
  );
}

