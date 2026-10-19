const fs = require('fs');
const path = require('path');

const summaryFile = path.resolve(__dirname, '..', 'artifacts', 'certification', 'ai_certification_summary.json');
const data = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));

console.log(`Total tests: ${data.tests.length}`);

// Group by app_id
const apps = {};
data.tests.forEach(t => {
  if (!apps[t.app_id]) apps[t.app_id] = [];
  apps[t.app_id].push(t);
});

Object.keys(apps).forEach(appId => {
  console.log(`\n========================================`);
  console.log(`APP: ${appId} (${apps[appId].length} tests)`);
  console.log(`========================================`);
  apps[appId].forEach(t => {
    console.log(`\n--- Test: ${t.test_id} [${t.type || 'TEST'}] ---`);
    console.log(`Prompt / Command: ${t.prompt || t.factual_prompt || JSON.stringify(t.tested_conditions || t.injected_fault)}`);
    console.log(`Verdict: ${t.verdict || (t.status_code === 200 ? 'PASSED' : t.status)}`);
    if (t.response) {
      const respStr = typeof t.response === 'object' ? JSON.stringify(t.response) : String(t.response);
      console.log(`Response Snippet: ${respStr.substring(0, 300)}...`);
    }
  });
});
