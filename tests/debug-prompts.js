const assistant = require("../backend/src/controllers/assistantController");

async function check() {
  const req1 = { body: { query: "Why is Crew A's heart rate elevated?", astronaut_id: "ast-1" } };
  let r1;
  await assistant.query(req1, { json: d => r1 = d, status: () => ({ json: d => r1 = d }) });
  console.log("=== PROMPT 1 FULL ===");
  console.log(r1.answer);

  const req3 = { body: { query: "What does the latest DONKI event mean?", astronaut_id: "ast-1" } };
  let r3;
  await assistant.query(req3, { json: d => r3 = d, status: () => ({ json: d => r3 = d }) });
  console.log("\n=== PROMPT 3 FULL ===");
  console.log(r3.answer);
}
check();

