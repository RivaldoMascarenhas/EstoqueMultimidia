const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Attach the real request to the existing session guard on mutating handlers.
let count = 0;
function visitDirectory(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { visitDirectory(file); continue; }
    if (entry.name !== 'route.ts') continue;
    let source = fs.readFileSync(file, 'utf8');
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const edits = [];
    for (const fn of tree.statements) {
      if (!ts.isFunctionDeclaration(fn) || !['POST','PUT','PATCH','DELETE'].includes(fn.name?.text)) continue;
      const reqName = fn.parameters[0]?.name.getText(tree);
      function walk(node) {
        if (ts.isCallExpression(node) && node.expression.getText(tree) === 'requireSession') {
          if (!reqName) throw new Error('Missing request: ' + file);
          const args = node.arguments;
          if (args.length < 2) {
            edits.push({ pos: node.end - 1, text: (args.length ? ', ' : 'undefined, ') + '{ req: ' + reqName + ' }' });
          } else if (ts.isObjectLiteralExpression(args[1]) && !args[1].properties.some(p => p.name?.getText(tree) === 'req')) {
            edits.push({ pos: args[1].getStart(tree) + 1, text: ' req: ' + reqName + ',' });
          }
        }
        ts.forEachChild(node, walk);
      }
      walk(fn);
    }
    for (const edit of edits.sort((a,b) => b.pos - a.pos)) source = source.slice(0,edit.pos) + edit.text + source.slice(edit.pos);
    if (edits.length) { fs.writeFileSync(file, source); count += edits.length; }
  }
}
visitDirectory('src/app/api/v1');
console.log('Session guards with request added:', count);

for (const page of ['estoque','emprestimos','manutencao','movimentacoes']) {
  const file = `src/app/(dashboard)/${page}/page.tsx`;
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(/text-\[(?:10|11)px\]/g, 'text-xs');
  // Enlarge operational buttons only; preserve icon and decorative dimensions.
  source = source.replace(/<Button\b[\s\S]*?>/g, tag => tag.replace(/\bh-8\b/g, 'h-11').replace(/\btext-xs\b/g, 'text-sm'));
  if (page === 'estoque') {
    source = source.replace(/\btext-xs\b/g, 'text-sm').replace(/\bh-10\b/g, 'h-11').replace('sm:h-9', 'sm:h-11');
    source = source.replace('📦 Todas as Caixas', 'Todas as Caixas').replace('🔴 Crítico', 'Crítico').replace('🟡 Baixo', 'Baixo').replace('🟢 Normal', 'Normal');
    source = source.replace('Itens no Catálogo', 'Itens nesta página').replace('Total de Unidades', 'Unidades nesta página');
  }
  fs.writeFileSync(file, source);
}
