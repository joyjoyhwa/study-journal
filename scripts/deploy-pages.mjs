// Publish only the generated site. Uses existing gh authentication, never prints a token.
import { execFileSync } from 'node:child_process';
import { readFile, readdir, mkdtemp, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { build, projectRoot } from './build.mjs';

const run = (command,args,cwd = projectRoot) => execFileSync(command,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const git = (args,cwd = projectRoot) => run('git',['-c','credential.helper=','-c','credential.helper=!gh auth git-credential',...args],cwd);
let temporary;
try {
  const config = JSON.parse(await readFile(path.join(projectRoot,'site.config.json'),'utf8'));
  const { repository, url, basePath } = config.deployment;
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Invalid deployment repository.');
  const [owner] = repository.split('/');
  const profile = JSON.parse(run('gh',['api','user','--jq','{login: .login, id: .id}']));
  if (profile.login !== owner || !Number.isInteger(profile.id)) throw new Error(`Sign in to the approved GitHub owner ${owner} before deploying.`);
  const remote = `https://github.com/${repository}.git`;
  if (git(['remote','get-url','origin']) !== remote) throw new Error('The source origin does not match the deployment repository.');
  if (git(['branch','--show-current']) !== 'main' || git(['status','--porcelain'])) throw new Error('Commit the source changes on main before deploying.');
  const sourceCommit = git(['rev-parse','HEAD']);
  const remoteMain = git(['ls-remote',remote,'refs/heads/main']).split(/\s/)[0];
  if (sourceCommit !== remoteMain) throw new Error('Push the source commit to main before deploying.');
  const tests = (await readdir(path.join(projectRoot,'tests'))).filter(name => name.endsWith('.test.mjs')).map(name => path.join('tests',name));
  console.log(run(process.execPath,['--test',...tests]));
  const built = await build({basePath,url});
  temporary = await mkdtemp(path.join(os.tmpdir(),'study-journal-pages-'));
  const existing = git(['ls-remote',remote,'refs/heads/gh-pages']);
  if (existing) git(['clone','--single-branch','--branch','gh-pages',remote,temporary]);
  else { git(['init','-b','gh-pages'],temporary); git(['remote','add','origin',remote],temporary); }
  git(['config','user.name',profile.login],temporary);
  git(['config','user.email',`${profile.id}+${profile.login}@users.noreply.github.com`],temporary);
  git(['config','core.autocrlf','false'],temporary);
  for (const name of await readdir(temporary)) {
    if (name === '.git') continue;
    const target = path.resolve(temporary,name);
    const relative = path.relative(temporary,target);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Unsafe temporary output path.');
    await rm(target,{recursive:true,force:true});
  }
  await cp(built.outDir,temporary,{recursive:true});
  git(['add','--all'],temporary);
  if (git(['status','--porcelain'])) {
    git(['commit','-m',`Publish study journal from ${sourceCommit.slice(0,12)}`],temporary);
    git(['push','-u','origin','gh-pages'],temporary);
  }
  console.log(JSON.stringify({repository,sourceCommit,publishedCommit:git(['rev-parse','HEAD'],temporary),url:`${url}${basePath}/`},null,2));
} catch (error) {
  // Command stderr may contain actionable Git errors; credentials are supplied by gh's helper.
  console.error(error.stderr?.toString().trim() || error.message);
  process.exitCode = 1;
} finally {
  if (temporary) {
    const relative = path.relative(path.resolve(os.tmpdir()),path.resolve(temporary));
    if (relative.startsWith('study-journal-pages-') && !relative.includes(path.sep)) await rm(temporary,{recursive:true,force:true});
  }
}
