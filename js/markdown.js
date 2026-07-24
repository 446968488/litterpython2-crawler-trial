// 轻量 Markdown 渲染器（离线可用，无外部依赖）
window.MD = (function () {
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inline(s) {
    s = escapeHtml(s);
    s = s.replace(/`([^`]+)`/g, '<code class="md-inline">$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return s;
  }

  function render(md) {
    if (!md) return '';
    const lines = md.replace(/\r\n/g, '\n').split('\n');
    let html = '';
    let i = 0;
    let inCode = false;
    let codeBuf = [];
    let listType = null;
    let listBuf = [];
    let inTable = false;
    let tableRows = [];

    function flushList() {
      if (listBuf.length) {
        html += '<' + listType + ' class="md-list">' + listBuf.join('') + '</' + listType + '>';
        listBuf = [];
        listType = null;
      }
    }

    function flushTable() {
      if (tableRows.length < 2) { inTable = false; tableRows = []; return; }
      // 解析表头（第一行）和跳过分隔行（第二行，如 |---|---|）
      const headerCells = parseTableRow(tableRows[0]);
      // 检查第二行是否为分隔行
      const isSeparator = (r) => /^\|?\s*[:\-]+\s*(:?\|[:\-]+\s*)*\|?$/.test(r.trim());
      let dataStart = 1;
      if (tableRows.length > 1 && isSeparator(tableRows[1])) dataStart = 2;
      html += '<table class="md-table"><thead><tr>';
      headerCells.forEach((c) => { html += '<th>' + inline(c) + '</th>'; });
      html += '</tr></thead><tbody>';
      for (let r = dataStart; r < tableRows.length; r++) {
        const cells = parseTableRow(tableRows[r]);
        html += '<tr>';
        cells.forEach((c) => { html += '<td>' + inline(c) + '</td>'; });
        html += '</tr>';
      }
      html += '</tbody></table>';
      inTable = false;
      tableRows = [];
    }

    function parseTableRow(line) {
      // 去掉首尾 |，按 | 分割
      const trimmed = line.replace(/^\|?/, '').replace(/\|?$/, '');
      return trimmed.split('|').map((s) => s.trim());
    }

    while (i < lines.length) {
      const line = lines[i];

      // 代码块
      if (/^```/.test(line.trim())) {
        if (!inCode) { flushList(); inCode = true; codeBuf = []; i++; continue; }
        html += '<pre class="md-code"><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>';
        inCode = false; i++; continue;
      }
      if (inCode) { codeBuf.push(line); i++; continue; }

      // GFM 表格：以 | 开头和结尾的行（或仅以 | 开头）
      const isTableRow = /^\|/.test(line.trim()) || (line.trim().startsWith('|') && line.trim().endsWith('|'));
      if (isTableRow) {
        if (!inTable) { flushList(); inTable = true; tableRows = []; }
        tableRows.push(line);
        i++; continue;
      }
      if (inTable) { flushTable(); }  // 非表格行，结束表格

      // 标题
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) { flushList(); const lv = h[1].length; html += '<h' + lv + ' class="md-h md-h' + lv + '">' + inline(h[2]) + '</h' + lv + '>'; i++; continue; }

      // 引用
      const bq = line.match(/^>\s?(.*)$/);
      if (bq) { flushList(); html += '<blockquote class="md-quote">' + inline(bq[1]) + '</blockquote>'; i++; continue; }

      // 无序列表
      const ul = line.match(/^[-*]\s+(.*)$/);
      if (ul) { if (listType !== 'ul') { flushList(); listType = 'ul'; } listBuf.push('<li>' + inline(ul[1]) + '</li>'); i++; continue; }

      // 有序列表
      const ol = line.match(/^\d+\.\s+(.*)$/);
      if (ol) { if (listType !== 'ol') { flushList(); listType = 'ol'; } listBuf.push('<li>' + inline(ol[1]) + '</li>'); i++; continue; }

      // 空行
      if (line.trim() === '') { flushList(); i++; continue; }

      // 段落
      flushList();
      html += '<p class="md-p">' + inline(line) + '</p>';
      i++;
    }
    flushList();
    if (inTable) flushTable();
    if (inCode) html += '<pre class="md-code"><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>';
    return html;
  }

  return { render: render };
})();
