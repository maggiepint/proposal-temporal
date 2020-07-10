const fs = require('fs').promises;
const marked = require('marked');
const path = require('path');
const Prism = require('prismjs');
const loadLanguages = require('prismjs/components/');

const encoding = 'utf-8';

loadLanguages(['bash']);

// From marked/helpers.js
const escapeReplacements = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};
function escape(html) {
  if (/[&<>"']/.test(html)) {
    return html.replace(/[&<>"']/g, (ch) => escapeReplacements[ch]);
  }
  return html;
}

class CustomRenderer extends marked.Renderer {
  constructor(options) {
    super(options);
    this.toc = [];
  }

  // Override default renderer to add language-* class to <pre> as well as
  // <code> (which is what Prism would do at runtime)
  code(code, infoString, escaped) {
    const lang = (infoString || '').match(/\S*/)[0];
    if (!lang) return `<pre><code>${escaped ? code : escape(code)}</code></pre>`;

    code = Prism.highlight(code, Prism.languages[lang], lang);
    const langId = this.options.langPrefix + escape(lang);
    return `<pre class="${langId}"><code class="${langId}">${code}</code></pre>`;
  }

  // Store headings in a table of contents to be rendered afterwards, and add
  // permalinks to all <h3> elements (function documentation headings)
  heading(text, level, raw, slugger) {
    let id = this.options.headerPrefix + slugger.slug(raw); // marked.js default

    // slugger increments it's internal 'seen' accumulator every time we call slug()
    // we don't want that, we just want the slug output, this reverses the change
    if (slugger.seen[id] === 0) delete slugger.seen[id];

    if (level !== 3) {
      this.toc.push({ id, level, raw });
      return super.heading(text, level, raw, slugger);
    }

    // Use the **function name** as the link ID, otherwise fall back to the ID
    // generated by marked.js
    const match = text.match(/<strong>(.*)<\/strong>/);
    if (match) id = match[1].replace(/[^a-zA-Z]/g, '-');

    this.toc.push({ id, level, raw: match ? match[1] : raw });
    return `<h3 id="${id}"><a class="heading-link" href="#${id}"></a>${text}</h3>`;
  }

  // Rewrite .md to .html in links
  link(href, title, text) {
    href = href.replace(/\.md/, '.html');
    return super.link(href, title, text);
  }

  // Adapted from https://github.com/markedjs/marked/issues/545#issuecomment-495093214
  renderTOC() {
    function build(coll, ix, currentLevel, lines) {
      if (ix >= coll.length || coll[ix].level <= currentLevel) return ix;
      const { id, level, raw } = coll[ix];
      lines.push(`<li><a href="#${id}">${raw}</a>`);
      ix++;
      const innerLines = [];
      ix = build(coll, ix, level, innerLines);
      if (innerLines.length > 0) lines.push('<ul>', ...innerLines, '</ul>');
      lines.push('</li>');
      ix = build(coll, ix, currentLevel, lines);
      return ix;
    }
    const lines = [];
    lines.push('<ul>');
    build(this.toc, 1, 1, lines);
    lines.push('</ul>');
    return lines.join('\n');
  }
}

async function render(markdownFile, head, tail) {
  let markdownText = await fs.readFile(markdownFile, { encoding });

  // Resolve transcludes
  const lines = await Promise.all(
    markdownText.split('\n').map(async (line) => {
      const match = line.match(/^{{(.*)}}$/);
      if (match) return await fs.readFile(match[1], { encoding });
      return line;
    })
  );
  markdownText = lines.join('\n');

  const renderer = new CustomRenderer();
  let htmlText = head + marked(markdownText, { renderer }) + tail;
  htmlText = htmlText.replace(/^<!-- toc -->$/m, () => renderer.renderTOC());

  const htmlFile = path.resolve('../out/docs', markdownFile.replace(/\.md$/, '') + '.html');
  console.log(`${markdownFile} => ${htmlFile}`);
  await fs.writeFile(htmlFile, htmlText, { encoding });
}

async function go() {
  try {
    const head = await fs.readFile('head.html.part', { encoding });
    const tail = await fs.readFile('tail.html.part', { encoding });
    // copy or render /docs/* to /out/docs/
    await Promise.all(
      (await fs.readdir('.')).map((file) => {
        switch (path.extname(file)) {
          // copy files *.css, *.html, *.svg to /out/docs
          case '.css':
          case '.html':
          case '.svg':
            return fs.copyFile(file, path.resolve('../out/docs/' + file));
          // convert files *.md to /out/docs/*.html
          case '.md':
            return render(file, head, tail);
          // skip remaining files
          default:
            return new Promise((resolve) => resolve());
        }
      })
    );
    // copy /docs/assets/* to /out/docs/assets/
    await Promise.all(
      (await fs.readdir('assets')).map((file) => {
        return fs.copyFile(path.resolve('assets', file), path.resolve('../out/docs/assets', file));
      })
    );
    // copy misc files to /out/docs/
    await Promise.all(
      [
        ['../out/docs/README.html', '../out/docs/index.html'],
        ['node_modules/prismjs/themes/prism.css', '../out/docs/prism.css']
      ].map(([file1, file2]) => {
        return fs.copyFile(path.resolve(file1), path.resolve(file2));
      })
    );
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  process.exit();
}

go();
