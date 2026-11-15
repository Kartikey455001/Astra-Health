/**
 * NASA DONKI Client (Space Weather Database OF Notifications, Knowledge, Information)
 * Provides Solar Energetic Particles (SEP), Solar Flares (FLR), Coronal Mass Ejections (CME),
 * and Geomagnetic Storms (GST).
 *
 * SAFETY RULE: A DONKI event is space-weather context, NOT an astronaut's personal dose.
 * Never convert an event to personal dose without a validated shielding model.
 */

const https = require("node:https");
const http = require("node:http");

function fetchJson(url, options = {}, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === "https:" ? https : http;
    const req = client.request(urlObj, {
      method: options.method || "GET",
      headers: {
        "User-Agent": "ASTRA-Health/2.0 (NASA Space Apps Challenge; Astronaut Health Decision Support)",
        "Accept": "application/json",
        ...(options.headers || {})
      },
      timeout: timeoutMs
    }, (res) => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data || "[]"));
          } catch (e) {
            reject(new Error(`Failed to parse NASA DONKI JSON: ${e.message}`));
          }
        } else {
          reject(new Error(`NASA DONKI HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("NASA DONKI request timed out after " + timeoutMs + "ms"));
    });
    req.on("error", reject);
    if (options.body) req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function fetchDonkiEvents(eventType = "SEP", startDate = null, endDate = null) {
  const type = eventType.toUpperCase();
  if (!["SEP", "FLR", "CME", "GST"].includes(type)) {
    throw new Error(`Unsupported DONKI event type: ${type}. Allowed: SEP, FLR, CME, GST.`);
  }

  const start = startDate || isoDate(daysAgo(30));
  const end = endDate || isoDate(new Date());

  const url = `https://ccmc.gsfc.nasa.gov/DONKI-API/get/${type}?startDate=${start}&endDate=${end}`;

  try {
    const events = await fetchJson(url);
    if (!Array.isArray(events)) return [];

    return events.map(e => {
      const id = e.sepID || e.flrID || e.cmeID || e.gstID || e.activityID || `DONKI-${type}-${Date.now()}`;
      const observed = e.eventTime || e.beginTime || e.startTime || e.peakTime || new Date().toISOString();
      return {
        source_name: "NASA DONKI",
        source_record_id: String(id),
        data_origin: "NASA_PUBLIC",
        event_type: type,
        observed_at: observed,
        retrieved_at: new Date().toISOString(),
        title: `${type} Event ${id}`,
        details: e,
        source_url: "https://ccmc.gsfc.nasa.gov/DONKI/",
        quality_status: "validated",
        safety_notice: "A DONKI event is environmental space-weather context, not a crew member's measured dose."
      };
    });
  } catch (err) {
    throw new Error(`DONKI fetch failed for ${type}: ${err.message}`);
  }
}

module.exports = {
  fetchDonkiEvents
};

