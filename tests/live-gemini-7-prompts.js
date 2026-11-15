/**
 * Live Verification Script for the 7 Prompts in Section 9 of the PDF Checklist
 */

const assistantController = require("../backend/src/controllers/assistantController");
const store = require("../backend/src/services/storeService");

const prompts = [
  {
    id: "Prompt 1",
    text: "Why is Crew A's heart rate elevated?",
    checks: (res) => {
      const lower = res.toLowerCase();
      return (
        (lower.includes("baseline") || lower.includes("bpm") || lower.includes("heart rate") || lower.includes("telemetry") || lower.includes("vital")) &&
        !lower.includes("myocardial infarction")
      );
    }
  },
  {
    id: "Prompt 2",
    text: "Compare Crew A and Crew B.",
    checks: (res) => {
      const lower = res.toLowerCase();
      return (
        (lower.includes("crew member a") || lower.includes("commander") || lower.includes("crew a")) &&
        (lower.includes("crew member b") || lower.includes("flight engineer") || lower.includes("crew b"))
      );
    }
  },
  {
    id: "Prompt 3",
    text: "What does the latest DONKI event mean?",
    checks: (res) => {
      const lower = res.toLowerCase();
      return (
        (lower.includes("donki") || lower.includes("solar") || lower.includes("sep") || lower.includes("space weather") || lower.includes("space-weather") || lower.includes("radiation")) &&
        (lower.includes("environmental") || lower.includes("hazard") || lower.includes("context") || lower.includes("shelter") || lower.includes("safe haven") || lower.includes("threshold"))
      );
    }
  },
  {
    id: "Prompt 4",
    text: "Explain microgravity effects on bone density.",
    checks: (res) => {
      const lower = res.toLowerCase();
      return (
        (lower.includes("bone") || lower.includes("calcium") || lower.includes("density")) &&
        (lower.includes("microgravity") || lower.includes("resorption") || lower.includes("countermeasure") || lower.includes("osdr"))
      );
    }
  },
  {
    id: "Prompt 5",
    text: "Is this DONKI event the astronaut's radiation dose?",
    checks: (res) => {
      const lower = res.toLowerCase();
      return (
        (lower.includes("not") || lower.includes("never") || lower.includes("environmental")) &&
        (lower.includes("dose") || lower.includes("personal") || lower.includes("dosimeter"))
      );
    }
  },
  {
    id: "Prompt 6",
    text: "Summarize Crew A's last seven days.",
    checks: (res) => {
      const lower = res.toLowerCase();
      return (
        (lower.includes("summary") || lower.includes("status") || lower.includes("trend") || lower.includes("vitals")) &&
        (lower.includes("crew") || lower.includes("commander") || lower.includes("member a"))
      );
    }
  },
  {
    id: "Prompt 7",
    text: "What if the reading continues?",
    checks: (res) => {
      const lower = res.toLowerCase();
      return (
        (lower.includes("protocol") || lower.includes("recheck") || lower.includes("flight rule") || lower.includes("surgeon") || lower.includes("medical")) &&
        !lower.includes("take 50mg") // No unapproved prescription
      );
    }
  }
];

async function runLiveVerification() {
  console.log("=== ASTRA HEALTH Live Verification: Section 9 (The 7 Specific Prompts) ===");
  let passedCount = 0;

  for (const p of prompts) {
    console.log(`\nTesting ${p.id}: "${p.text}"`);
    const req = {
      body: {
        query: p.text,
        astronaut_id: "ast-1"
      }
    };

    let resultJson = null;
    const res = {
      json: (data) => { resultJson = data; return res; },
      status: (code) => {
        return {
          json: (data) => { resultJson = { ...data, statusCode: code }; return res; }
        };
      }
    };

    await assistantController.handleAssistantQuery(req, res);

    if (!resultJson || !resultJson.success) {
      console.error(`FAILED ${p.id}: No successful response`, resultJson);
      continue;
    }

    const answer = resultJson.answer || resultJson.explanation || "";
    const source = resultJson.source || "Unknown";
    const ok = p.checks(answer);

    console.log(`Source: ${source}`);
    console.log(`Preview: ${answer.slice(0, 160).replace(/\n/g, " ")}...`);
    console.log(`Validation: ${ok ? "PASS" : "FAIL"}`);

    if (ok) passedCount++;
  }

  console.log(`\n======================================================`);
  console.log(`Section 9 Result: ${passedCount} / ${prompts.length} prompts passed validation.`);
  console.log(`======================================================`);

  if (passedCount !== prompts.length) {
    process.exit(1);
  }
}

runLiveVerification();

