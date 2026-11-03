import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot } from './build.mjs';

const [kind,slug,date = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())] = process.argv.slice(2);
if (!['daily','paper','basics'].includes(kind) || !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) {
  console.error('사용법: npm run new -- daily|paper|basics english-slug [YYYY-MM-DD]'); process.exitCode = 1;
} else {
  const template = await readFile(path.join(projectRoot,'templates',kind === 'paper' ? 'paper.md' : 'daily.md'),'utf8');
  const output = template.replace('YYYY-MM-DD',date).replace('category: "journal"',`category: "${kind === 'basics' ? 'basics' : 'journal'}"`);
  const filename = path.join(projectRoot,'content/posts',`${date}-${slug}.md`);
  try { await writeFile(filename,output,{flag:'wx'}); console.log(`초안을 만들었습니다: ${filename}\n작성 후 draft: false로 바꾸면 빌드에 포함됩니다.`); }
  catch (error) { console.error(error.code === 'EEXIST' ? '같은 이름의 글이 있습니다. 덮어쓰지 않았습니다.' : error.message); process.exitCode = 1; }
}
