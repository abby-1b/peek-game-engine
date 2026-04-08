import { walk } from 'https://deno.land/std@0.224.0/fs/walk.ts';
import {
  relative,
  join,
  basename,
} from 'https://deno.land/std@0.224.0/path/mod.ts';

const SRC_DIR = 'src';

// Pattern -> short description mapping
const PATTERNS: { regex: RegExp; description: string }[] = [
  { regex: /fetch/g, description: 'fetch() network call' },
  { regex: /XMLHttpRequest/g, description: 'XMLHttpRequest' },
  { regex: /localStorage/g, description: 'localStorage access' },
  { regex: /sessionStorage/g, description: 'sessionStorage access' },
  { regex: /document\./g, description: 'document object access' },
  { regex: /window\./g, description: 'window object access' },
  { regex: /CanvasRenderingContext2D/g, description: 'Canvas API' },
  {
    regex: /HTML[a-zA-Z0-9]*Element/g,
    description: 'DOM element manipulation',
  },
  { regex: /WebSocket/g, description: 'WebSocket connection' },
  { regex: /requestAnimationFrame/g, description: 'animation frame' },
  { regex: /setTimeout/g, description: 'setTimeout timer' },
  { regex: /setInterval/g, description: 'setInterval timer' },
  { regex: /Date\.now/g, description: 'current timestamp' },
  { regex: /new Date\(\)/g, description: 'current date/time' },
  { regex: /process\.env/g, description: 'environment variables' },
  { regex: /require\(.*fs\)/g, description: 'fs module require' },
  { regex: /import.*from.*fs/g, description: 'fs module import' },
  { regex: /crypto\./g, description: 'crypto operations' },
  { regex: /Blob/g, description: 'Blob creation' },
  { regex: /FileReader/g, description: 'FileReader API' },
  { regex: /FormData/g, description: 'FormData usage' },
  { regex: /addEventListener/g, description: 'DOM event listener' },
  { regex: /navigator\./g, description: 'navigator API access' },
];

// Store per-file: total count and map of description -> count
interface ImpureInfo {
  total: number;
  reasonCounts: Map<string, number>;
}

const impureInfoMap = new Map<string, ImpureInfo>();

try {
  for await (const entry of walk(SRC_DIR, {
    exts: ['.ts', '.tsx'],
    includeDirs: false,
  })) {
    const content = await Deno.readTextFile(entry.path);
    let total = 0;
    const reasonCounts = new Map<string, number>();

    for (const { regex, description } of PATTERNS) {
      const matches = content.match(regex);
      if (matches) {
        const count = matches.length;
        total += count;
        reasonCounts.set(
          description,
          (reasonCounts.get(description) || 0) + count,
        );
      }
    }

    impureInfoMap.set(entry.path, { total, reasonCounts });
  }
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  Deno.exit(1);
}

// Find most common reason (description with highest count)
function getMostCommonReason(reasonCounts: Map<string, number>): string {
  let maxCount = 0;
  let mostCommon = '';
  for (const [reason, count] of reasonCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = reason;
    }
  }
  return mostCommon || 'unknown low-level API';
}

// Build tree structure for output
interface TreeNode {
  files: Map<string, string>; // filename -> full path
  dirs: Map<string, TreeNode>;
}

function buildTree(): TreeNode {
  const root: TreeNode = { files: new Map(), dirs: new Map() };
  for (const filePath of impureInfoMap.keys()) {
    const rel = relative('.', filePath);
    const parts = rel.split('/');
    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      if (!current.dirs.has(dirName)) {
        current.dirs.set(dirName, { files: new Map(), dirs: new Map() });
      }
      current = current.dirs.get(dirName)!;
    }
    const fileName = parts[parts.length - 1];
    current.files.set(fileName, filePath);
  }
  return root;
}

function printTree(
  node: TreeNode,
  prefix: string,
  isLast: boolean = false,
): void {
  const entries: { name: string; isDir: boolean; node?: TreeNode }[] = [];
  for (const [name, subNode] of node.dirs) {
    entries.push({ name, isDir: true, node: subNode });
  }
  for (const [name] of node.files) {
    entries.push({ name, isDir: false });
  }
  entries.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLastEntry = i === entries.length - 1;
    const connector = isLastEntry ? '└─' : '├─';
    const childPrefix = prefix + (isLastEntry ? '   ' : '│  ');

    if (entry.isDir) {
      console.log(`${prefix}${connector} ${entry.name}/`);
      printTree(entry.node!, childPrefix, isLastEntry);
    } else {
      const fullPath = node.files.get(entry.name)!;
      const info = impureInfoMap.get(fullPath);
      if (info && info.total > 0) {
        const reason = getMostCommonReason(info.reasonCounts);
        console.log(
          `${prefix}${connector} ${entry.name} [IMPURE (${info.total}): ${reason}]`,
        );
      } else {
        console.log(`${prefix}${connector} ${entry.name} [PURE]`);
      }
    }
  }
}

// Print the tree starting from src/
console.log('src/');
const tree = buildTree();
printTree(tree, '');

// --- Impurity Statistics ---
let totalImpurities = 0;
let pureFileCount = 0;
const globalReasonCounts = new Map<string, number>();

for (const info of impureInfoMap.values()) {
  totalImpurities += info.total;
  if (info.total === 0) pureFileCount++;
  for (const [reason, count] of info.reasonCounts) {
    globalReasonCounts.set(
      reason,
      (globalReasonCounts.get(reason) || 0) + count,
    );
  }
}

const fileCount = impureInfoMap.size;
const avgImpurities = fileCount > 0 ? totalImpurities / fileCount : 0;
const purePercentage = fileCount > 0 ? (pureFileCount / fileCount) * 100 : 0;

const sortedReasons = Array.from(globalReasonCounts.entries()).sort(
  (a, b) => b[1] - a[1],
);
const top3 = sortedReasons.slice(0, 3);

console.log('\n--- Impurity Statistics ---');
console.log(`Total files analyzed: ${fileCount}`);
console.log(`Total impurities: ${totalImpurities}`);
console.log(`Average impurities per file: ${avgImpurities.toFixed(2)}`);
console.log(`Pure files: ${pureFileCount} (${purePercentage.toFixed(1)}%)`);
console.log('Top 3 most common impurities:');
if (top3.length === 0) {
  console.log('  No impurities found.');
} else {
  top3.forEach(([reason, count], idx) => {
    console.log(`  ${idx + 1}. ${reason}: ${count} occurrences`);
  });
}
