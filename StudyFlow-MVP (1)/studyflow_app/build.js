import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';

const output = 'dist';
if (existsSync(output)) rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const file of ['index.html', 'styles.css', 'script.js']) {
  cpSync(file, `${output}/${file}`);
}

if (existsSync('public')) cpSync('public', `${output}/public`, { recursive: true });

console.log('StudyFlow build complete: dist/');
