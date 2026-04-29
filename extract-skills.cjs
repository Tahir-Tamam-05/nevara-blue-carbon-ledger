const fs = require("fs");
const path = require("path");

const skillsDir = "./antigravity-awesome-skills/skills";
const output = [];

if (!fs.existsSync(skillsDir)) {
  console.error(`❌ Directory not found: ${skillsDir}`);
  process.exit(1);
}

const skillFolders = fs.readdirSync(skillsDir);

skillFolders.forEach(folder => {
  const folderPath = path.join(skillsDir, folder);
  if (!fs.statSync(folderPath).isDirectory()) return;

  // Try SKILL.md first, then README.md
  let filePath = path.join(folderPath, "SKILL.md");
  if (!fs.existsSync(filePath)) {
    filePath = path.join(folderPath, "README.md");
  }

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");

    output.push({
      name: folder,
      prompt: content.slice(0, 1500) // trim (important)
    });
  }
});

fs.writeFileSync("skills.json", JSON.stringify(output, null, 2));

console.log(`✅ skills.json created with ${output.length} skills`);
