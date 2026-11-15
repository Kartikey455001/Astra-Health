import React, { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar, HonestyBanner } from "./components/TopBar";
import { MissionCommandPage } from "./pages/MissionCommandPage";
import { PhysiologicalPage } from "./pages/PhysiologicalPage";
import { RadiationCenterPage } from "./pages/RadiationCenterPage";
import { BehavioralHealthPage } from "./pages/BehavioralHealthPage";
import { AiAssistantPage } from "./pages/AiAssistantPage";
import { ReportsResearchPage } from "./pages/ReportsResearchPage";
import { NasaDataHubPage } from "./pages/NasaDataHubPage";
import { useAstra } from "./store/astraStore";

export function App() {
  const [currentScreen, setCurrentScreen] = useState("dashboard");
  const { loading } = useAstra();

  return (
    <div className="shell">
      <Sidebar currentScreen={currentScreen} onSelectScreen={setCurrentScreen} />

      <div className="main">
        <TopBar />
        <HonestyBanner />

        <main>
          {currentScreen === "dashboard" && <MissionCommandPage onNavigate={setCurrentScreen} />}
          {currentScreen === "physio" && <PhysiologicalPage />}
          {currentScreen === "radiation" && <RadiationCenterPage />}
          {currentScreen === "behavioral" && <BehavioralHealthPage />}
          {currentScreen === "assistant" && <AiAssistantPage />}
          {currentScreen === "reports" && <ReportsResearchPage />}
          {currentScreen === "datahub" && <NasaDataHubPage />}
        </main>

        <footer className="footer">
          ASTRA HEALTH prototype · Data sources strictly per blueprint: NASA OSDR · NASA DONKI · Curiosity RAD (PDS) · NASA LSDA · NASA NTRS · Simulated crew telemetry is labelled SIMULATED · Not a medical device · Demo data is synthetic.
        </footer>
      </div>
    </div>
  );
}

