// A deliberately small, escaped Markdown renderer. No raw HTML or runtime packages.
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function parseDocument(source) {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) throw new Error('글 맨 위에 ---로 감싼 메타데이터가 필요합니다.');
  const data = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const item = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/);
    if (!item) throw new Error(`지원하지 않는 메타데이터: ${line}`);
    const [, key, raw] = item;
    if (Object.hasOwn(data, key)) throw new Error(`중복 메타데이터: ${key}`);
    if (raw.startsWith('"') || raw.startsWith('[') || /^(true|false)$/.test(raw)) {
      try { data[key] = JSON.parse(raw); } catch { throw new Error(`${key} 값을 확인해 주세요.`); }
    } else if (raw.startsWith("'")) {
      if (!raw.endsWith("'")) throw new Error(`${key}의 따옴표를 확인해 주세요.`);
      data[key] = raw.slice(1, -1).replace(/''/g, "'");
    } else data[key] = raw;
  }
  return { data, body: normalized.slice(match[0].length).trim() };
}

export function safeUrl(value) {
  const url = value.trim();
  if (/[\u0000-\u0020\\]/.test(url) || url.startsWith('//')) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(url) && !/^(https?:|mailto:)/i.test(url)) return null;
  return url;
}

export function inline(source, resolveUrl = value => value) {
  const tokens = [];
  const hold = (value) => `\u0000${tokens.push(value) - 1}\u0000`;
  let text = String(source).replace(/\u0000/g, '');
  text = text.replace(/`([^`]+)`/g, (_, code) => hold(`<code>${escapeHtml(code)}</code>`));
  text = text.replace(/(!?)\[([^\]]+)\]\(([^\s)]+)\)/g, (_, image, label, raw) => {
    const checked = safeUrl(raw);
    const url = checked && resolveUrl(checked);
    if (!url) return label;
    return hold(image ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(label)}" loading="lazy" decoding="async">` : `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`);
  });
  text = escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[Number(i)]);
}

export function markdown(source, resolveUrl) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const output = [], headings = [], slugs = new Map();
  let i = 0;
  const renderInline = text => inline(text, resolveUrl);
  const startsBlock = (text) => /^(#{1,6} |```|> ?|[-*] |\d+\. |---\s*$)/.test(text);
  const cells = row => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('```')) {
      const language = line.slice(3).trim().replace(/[^a-zA-Z\d-]/g, '');
      const code = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      if (i >= lines.length) throw new Error('코드 블록을 닫는 ```가 없습니다.');
      i++;
      output.push(`<pre><code${language ? ` class="language-${language}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`); continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.max(2, heading[1].length);
      const base = heading[2].replace(/[*`]/g, '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
      const count = slugs.get(base) || 0; slugs.set(base, count + 1);
      const id = count ? `${base}-${count + 1}` : base;
      if (level === 2) headings.push({ id, title: heading[2].replace(/[*`]/g, '') });
      output.push(`<h${level} id="${escapeHtml(id)}">${renderInline(heading[2])}</h${level}>`); i++; continue;
    }
    if (/^---\s*$/.test(line)) { output.push('<hr>'); i++; continue; }
    if (/^> ?/.test(line)) {
      const block = []; while (i < lines.length && /^> ?/.test(lines[i])) block.push(lines[i++].replace(/^> ?/, ''));
      output.push(`<blockquote>${markdown(block.join('\n'), resolveUrl).html}</blockquote>`); continue;
    }
    if (/^([-*] |\d+\. )/.test(line)) {
      const ordered = /^\d+\./.test(line), matcher = ordered ? /^\d+\. / : /^[-*] /, items = [];
      while (i < lines.length && matcher.test(lines[i])) items.push(`<li>${renderInline(lines[i++].replace(matcher, ''))}</li>`);
      const tag = ordered ? 'ol' : 'ul'; output.push(`<${tag}>${items.join('')}</${tag}>`); continue;
    }
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1]) && cells(lines[i + 1]).every(c => /^:?-{3,}:?$/.test(c))) {
      const head = cells(line); i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
      output.push(`<div class="table-scroll" tabindex="0" role="region" aria-label="가로로 스크롤할 수 있는 표"><table><thead><tr>${head.map(c => `<th scope="col">${renderInline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${head.map((_, n) => `<td>${renderInline(row[n] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
    }
    const paragraph = [line]; i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i]) && !(lines[i].includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] || ''))) paragraph.push(lines[i++]);
    output.push(`<p>${renderInline(paragraph.join('\n'))}</p>`);
  }
  return { html: output.join('\n'), headings };
}
