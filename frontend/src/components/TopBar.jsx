import React, { useState, useEffect } from "react";
import { useAstra } from "../store/astraStore";

export function TopBar() {
  const { isOnline, astronauts } = useAstra();
  const [clock, setClock] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Day-142 calculation per blueprint demo scenario
  const missionDay = 142;

  return (
    <header className="topbar">
      <div>
        <div className="mission-title">Mission: Orion-1</div>
        <div className="mission-sub">
          Long Duration Mission — Cislunar Space · Astronaut Health Monitoring &amp; AI-Assisted Decision Support
        </div>
      </div>

      <div className="topbar-right">
        <div className={`pill ${isOnline ? "pill-ok" : "pill-bad"}`}>
          {isOnline ? "Online — NASA sources reachable on demand" : "Offline — cached + local data only"}
        </div>
        <div className="pill pill-ghost">Offline Mode Ready</div>
        <div className="stat-chip">
          <span className="stat-label">Mission Day</span>
          <span className="stat-value">{missionDay}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">Crew</span>
          <span className="stat-value">{astronauts.length}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">{clock}</span>
          <span className="stat-value">Local</span>
        </div>
      </div>
    </header>
  );
}

export function HonestyBanner() {
  return (
    <div className="honesty-banner">
      Prototype for the NASA Space Apps Challenge. NASA public research data is <strong>not</strong> live astronaut telemetry.
      Every record is labelled <span className="tag tag-nasa">NASA_PUBLIC</span>{" "}
      <span className="tag tag-sim">SIMULATED</span> <span className="tag tag-manual">MANUAL</span> or{" "}
      <span className="tag tag-device">DEVICE</span>. ASTRA does not diagnose; alerts are workflow categories from a
      deterministic rules engine compared with personal baselines.
    </div>
  );
}

