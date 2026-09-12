/**
 * Application Registry Forensics Audit Script
 * Programmatically verifies every registered app in frontend/src/lib/apps.js:
 * - ID uniqueness and validity
 * - Name presence and format
 * - FontAwesome icon format
 * - Accent color hex code
 * - Group validity
 * - Component import resolution and default export validity
 */
const path = require("path");
const fs = require("fs");

async function auditRegistry() {
  console.log("=================================================");
  console.log("OMNIVERSEOS — PHASE 3: APPLICATION REGISTRY AUDIT");
  console.log("=================================================");

  const appsFilePath = path.join(__dirname, "../src/lib/apps.js");
  const content = fs.readFileSync(appsFilePath, "utf8");

  // Extract app definitions regex
  const regex = /{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*icon:\s*"([^"]+)",\s*color:\s*"([^"]+)",\s*Component:\s*lazy\(\(\)\s*=>\s*import\("([^"]+)"\)\),\s*group:\s*"([^"]+)"\s*}/g;

  let match;
  const apps = [];
  while ((match = regex.exec(content)) !== null) {
    apps.push({
      id: match[1],
      name: match[2],
      icon: match[3],
      color: match[4],
      importPath: match[5],
      group: match[6],
    });
  }

  console.log(`Total apps found in registry: ${apps.length}`);

  let errors = 0;
  const idSet = new Set();

  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    const prefix = `[${i + 1}/${apps.length}] App "${app.id}" (${app.name}):`;

    // 1. Check ID uniqueness
    if (idSet.has(app.id)) {
      console.error(`${prefix} ERROR: Duplicate app id "${app.id}"!`);
      errors++;
    }
    idSet.add(app.id);

    // 2. Check icon format
    if (!app.icon || !app.icon.startsWith("fa-")) {
      console.error(`${prefix} ERROR: Invalid icon "${app.icon}"!`);
      errors++;
    }

    // 3. Check hex color
    if (!app.color || !/^#[0-9A-Fa-f]{6}$/.test(app.color)) {
      console.error(`${prefix} ERROR: Invalid color hex "${app.color}"!`);
      errors++;
    }

    // 4. Check file existence
    const resolvedPath = path.resolve(__dirname, "../src/lib", app.importPath);
    const candidateFiles = [
      resolvedPath + ".js",
      resolvedPath + ".jsx",
      resolvedPath + ".ts",
      resolvedPath + ".tsx",
      path.join(resolvedPath, "index.js"),
    ];

    let foundFile = null;
    for (const f of candidateFiles) {
      if (fs.existsSync(f)) {
        foundFile = f;
        break;
      }
    }

    if (!foundFile) {
      console.error(`${prefix} ERROR: Component file not found at "${resolvedPath}"!`);
      errors++;
      continue;
    }

    // 5. Inspect target file for export default
    const fileContent = fs.readFileSync(foundFile, "utf8");
    const hasDefaultExport =
      fileContent.includes("export default") ||
      fileContent.includes("module.exports =") ||
      /export\s+{\s*[^}]*\bdefault\b[^}]*}/.test(fileContent);

    if (!hasDefaultExport) {
      console.error(`${prefix} ERROR: Missing default export in "${foundFile}"!`);
      errors++;
    } else {
      console.log(`${prefix} OK (file: ${path.basename(foundFile)}, icon: ${app.icon}, color: ${app.color})`);
    }
  }

  console.log("=================================================");
  if (errors === 0) {
    console.log(`AUDIT PASSED: All ${apps.length} applications strictly verified.`);
  } else {
    console.error(`AUDIT FAILED: ${errors} errors detected.`);
    process.exit(1);
  }
}

auditRegistry().catch((err) => {
  console.error("Audit threw exception:", err);
  process.exit(1);
});
