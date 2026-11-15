import React, { useEffect, useRef } from "react";

export function Sparkline({ readings = [], color = "#2fe6a8", height = 30 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = (canvas.width = Math.max(canvas.offsetWidth * 2, 200));
    const H = (canvas.height = height * 2);

    ctx.clearRect(0, 0, W, H);
    if (readings.length < 2) return;

    const vals = readings.map((r) => r.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    readings.forEach((r, i) => {
      const x = 6 + ((W - 12) * i) / (readings.length - 1);
      const y = H - 8 - ((H - 16) * (r.value - min)) / (max - min || 1);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }, [readings, color, height]);

  return <canvas ref={canvasRef} className="spark" style={{ height: `${height}px` }} />;
}

export function HeartRateChart({ readings = [], baseline = 68, height = 180 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = (canvas.width = canvas.offsetWidth * 2 || 600);
    const H = (canvas.height = height * 2);

    ctx.clearRect(0, 0, W, H);
    if (readings.length < 2) {
      ctx.fillStyle = "#9db1d8";
      ctx.font = "24px system-ui";
      ctx.fillText("Not enough readings to chart", 20, 60);
      return;
    }

    const vals = readings.map((r) => r.value);
    const min = Math.min(...vals, baseline || Infinity) * 0.95;
    const max = Math.max(...vals, baseline || -Infinity) * 1.05;

    const getX = (i) => 24 + ((W - 48) * i) / (readings.length - 1);
    const getY = (v) => H - 30 - ((H - 60) * (v - min)) / (max - min || 1);

    // Baseline dashed line
    if (baseline !== null && baseline !== undefined) {
      ctx.strokeStyle = "#ffb648";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(20, getY(baseline));
      ctx.lineTo(W - 20, getY(baseline));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffb648";
      ctx.font = "20px system-ui";
      ctx.fillText(`personal baseline ${baseline}`, 28, getY(baseline) - 10);
    }

    // Telemetry trend line
    ctx.strokeStyle = "#4da3ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    readings.forEach((r, i) => {
      const x = getX(i);
      const y = getY(r.value);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Data points
    ctx.fillStyle = "#4da3ff";
    readings.forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(getX(i), getY(r.value), 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [readings, baseline, height]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: `${height}px` }} />;
}

