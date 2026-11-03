import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { build, projectRoot } from './build.mjs';

let result = await build();
const portIndex = process.argv.indexOf('--port');
const port = Number(process.env.PORT || (portIndex !== -1 ? process.argv[portIndex + 1] : 4173));
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.md':'text/markdown; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server = http.createServer(async (req,res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if (result.basePath && pathname === result.basePath) { res.writeHead(301,{Location:result.basePath+'/'}); res.end(); return; }
    if (result.basePath && !pathname.startsWith(result.basePath+'/')) { res.writeHead(404); res.end('Not found'); return; }
    const local = pathname.slice(result.basePath.length);
    const filename = path.resolve(result.outDir,'.' + local);
    const relative = path.relative(result.outDir,filename);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(403); res.end('Forbidden'); return; }
    let target = filename;
    try { if ((await stat(target)).isDirectory()) {
      if (!pathname.endsWith('/')) { res.writeHead(301,{Location:pathname+'/'+new URL(req.url,'http://localhost').search}); res.end(); return; }
      target = path.join(target,'index.html');
    }} catch {}
    let body, status = 200;
    try { body = await readFile(target); } catch { body = await readFile(path.join(result.outDir,'404.html')); status = 404; target = '404.html'; }
    res.writeHead(status,{'Content-Type':mime[path.extname(target)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(400); res.end('Bad request'); }
});
server.listen(port,'127.0.0.1',() => console.log(`Local: http://127.0.0.1:${port}${result.basePath}/`));

const watchers = [];
if (process.argv.includes('--watch')) {
  let queued = false, running = false, timer;
  const rebuild = async () => {
    if (running) { queued = true; return; }
    running = true;
    try { result = await build(); console.log(`Rebuilt ${result.pageCount} pages. Refresh your browser.`); } catch (error) { console.error(error.message); }
    running = false;
    if (queued) { queued = false; await rebuild(); }
  };
  for (const directory of ['content','public','templates']) watchers.push(watch(path.join(projectRoot,directory),{recursive:true},() => { clearTimeout(timer); timer = setTimeout(rebuild,150); }));
  watchers.push(watch(path.join(projectRoot,'site.config.json'),() => { clearTimeout(timer); timer = setTimeout(rebuild,150); }));
}
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,() => { watchers.forEach(w => w.close()); server.close(() => process.exit(0)); });
