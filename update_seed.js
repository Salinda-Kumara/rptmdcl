const fs = require('fs');
const subjects = JSON.parse(fs.readFileSync('subjects.json', 'utf8'));
const subjectObjects = subjects.map(s => {
  return `    { code: '${s.code}', name: '${s.name.replace(/'/g, "\\'")}', category: '${s.category}', programmeId: accountingProgramme.id },`;
}).join('\n');

const seedData = fs.readFileSync('apps/api/prisma/seed.ts', 'utf8');

const regex = /\/\/ Subjects[\s\S]*?for \(const s of subjectData\) \{/;
const replacement = `// Subjects\n  await prisma.subject.deleteMany({});\n\n  const subjectData = [\n${subjectObjects}\n  ];\n\n  for (const s of subjectData) {`;

const newSeed = seedData.replace(regex, replacement);
fs.writeFileSync('apps/api/prisma/seed.ts', newSeed, 'utf8');
console.log('Seed updated!');
