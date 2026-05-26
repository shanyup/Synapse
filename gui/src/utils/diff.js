/**
 * Calculates differences between two texts line by line.
 * Uses a Longest Common Subsequence (LCS) algorithm with a safeguard for large files.
 * 
 * @param {string} baseText Original content
 * @param {string} headText New content
 * @returns {Array<{type: 'normal'|'added'|'removed', value: string, baseLine?: number, headLine?: number}>}
 */
export function computeDiff(baseText, headText) {
  // Normalize line endings
  const baseLines = baseText ? baseText.split(/\r?\n/) : [];
  const headLines = headText ? headText.split(/\r?\n/) : [];

  const n = baseLines.length;
  const m = headLines.length;

  // Safeguard: if either file is empty, it's all additions/deletions
  if (n === 0) {
    return headLines.map((line, idx) => ({ type: 'added', value: line, headLine: idx + 1 }));
  }
  if (m === 0) {
    return baseLines.map((line, idx) => ({ type: 'removed', value: line, baseLine: idx + 1 }));
  }

  // Safeguard: for extremely large files, use a simpler fast diff to prevent UI freezing
  if (n * m > 2500000) { // e.g. 1580 lines x 1580 lines is 2.5M
    const diff = [];
    const max = Math.max(n, m);
    for (let i = 0; i < max; i++) {
      if (i < n && i < m) {
        if (baseLines[i] === headLines[i]) {
          diff.push({ type: 'normal', value: baseLines[i], baseLine: i + 1, headLine: i + 1 });
        } else {
          diff.push({ type: 'removed', value: baseLines[i], baseLine: i + 1 });
          diff.push({ type: 'added', value: headLines[i], headLine: i + 1 });
        }
      } else if (i < n) {
        diff.push({ type: 'removed', value: baseLines[i], baseLine: i + 1 });
      } else {
        diff.push({ type: 'added', value: headLines[i], headLine: i + 1 });
      }
    }
    return diff;
  }

  // Dynamic Programming table for LCS
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (baseLines[i - 1] === headLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtracking to construct the diff
  const diff = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && baseLines[i - 1] === headLines[j - 1]) {
      diff.unshift({ type: 'normal', value: baseLines[i - 1], baseLine: i, headLine: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: 'added', value: headLines[j - 1], headLine: j });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.unshift({ type: 'removed', value: baseLines[i - 1], baseLine: i });
      i--;
    }
  }

  return diff;
}
