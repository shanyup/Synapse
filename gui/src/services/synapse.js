import { invoke } from '@tauri-apps/api/core';

// Helper to run raw synapse command
export async function runCommand(repoPath, args) {
  try {
    return await invoke('run_synapse_command', { repoPath, args });
  } catch (error) {
    throw new Error(error.toString());
  }
}

// Read username config
export async function getConfigUsername(repoPath) {
  try {
    return await invoke('get_synapse_config', { repoPath });
  } catch (error) {
    console.error('Failed to get config:', error);
    return '';
  }
}

// Set username config
export async function setConfigUsername(repoPath, username) {
  return await runCommand(repoPath, ['config', username]);
}

// Initialize repository
export async function initRepository(repoPath) {
  return await runCommand(repoPath, ['init']);
}

// Stage all changes
export async function stageAll(repoPath) {
  return await runCommand(repoPath, ['add', '.']);
}

// Commit changes
export async function commit(repoPath, message) {
  return await runCommand(repoPath, ['commit', '-m', message]);
}

// Checkout branch or commit
export async function checkout(repoPath, target) {
  return await runCommand(repoPath, ['checkout', target]);
}

// Lock a file
export async function lockFile(repoPath, filePath) {
  return await runCommand(repoPath, ['lock', filePath]);
}

// Unlock a file
export async function unlockFile(repoPath, filePath) {
  return await runCommand(repoPath, ['unlock', filePath]);
}

// Get branches list
export async function getBranches(repoPath) {
  const output = await runCommand(repoPath, ['branch']);
  return parseBranches(output);
}

// Create new branch
export async function createBranch(repoPath, branchName) {
  return await runCommand(repoPath, ['branch', branchName]);
}

// Get commits history
export async function getHistory(repoPath) {
  try {
    const output = await runCommand(repoPath, ['log']);
    return parseLog(output);
  } catch (error) {
    if (error.message.includes('No commits')) {
      return [];
    }
    throw error;
  }
}

// Get repository status
export async function getStatus(repoPath) {
  try {
    const output = await runCommand(repoPath, ['status']);
    return parseStatus(output);
  } catch (error) {
    throw error;
  }
}

// Parser: status output
export function parseStatus(output) {
  const lines = output.split('\n');
  const files = [];
  
  let section = 'none';
  for (let line of lines) {
    line = line.trim();
    if (line.includes('Changes not staged for commit:')) {
      section = 'not_staged';
      continue;
    } else if (line.includes('Untracked files:')) {
      section = 'untracked';
      continue;
    }
    
    // Remove ANSI color codes
    const cleanLine = line.replace(/\u001b\[\d+m/g, '').trim();
    if (!cleanLine) continue;
    
    if (section === 'not_staged') {
      if (cleanLine.startsWith('modified:')) {
        const path = cleanLine.substring('modified:'.length).trim();
        files.push({ path, status: 'modified' });
      } else if (cleanLine.startsWith('deleted:')) {
        const path = cleanLine.substring('deleted:'.length).trim();
        files.push({ path, status: 'deleted' });
      }
    } else if (section === 'untracked') {
      if (cleanLine && !cleanLine.startsWith('(') && !cleanLine.startsWith('use "')) {
        files.push({ path: cleanLine, status: 'untracked' });
      }
    }
  }
  return files;
}

// Parser: log output
export function parseLog(output) {
  const commits = [];
  const cleanOutput = output.replace(/\u001b\[\d+m/g, ''); // strip colors
  const parts = cleanOutput.split('--------------------------------------------------');
  
  const monthMap = {
    jan: 0, january: 0, oca: 0, ocak: 0,
    feb: 1, february: 1, sub: 1, subat: 1, şub: 1, şubat: 1,
    mar: 2, march: 2, mart: 2,
    apr: 3, april: 3, nis: 3, nisan: 3,
    may: 4, mayis: 4, mayıs: 4,
    jun: 5, june: 5, haz: 5, haziran: 5,
    jul: 6, july: 6, tem: 6, temmuz: 6,
    aug: 7, august: 7, agu: 7, agustos: 7, ağu: 7, ağustos: 7,
    sep: 8, september: 8, eyl: 8, eylul: 8, eylül: 8,
    oct: 9, october: 9, eki: 9, ekim: 9,
    nov: 10, november: 10, kas: 10, kasim: 10, kasım: 10,
    dec: 11, december: 11, ara: 11, aralik: 11, aralık: 11
  };

  for (const part of parts) {
    const lines = part.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    
    let hash = '';
    let author = '';
    let date = '';
    let message = '';
    
    for (const line of lines) {
      if (line.startsWith('commit ')) {
        const hashMatch = line.match(/commit [a-f0-9]+ \(([a-f0-9]+)\)/);
        if (hashMatch) {
          hash = hashMatch[1];
        } else {
          hash = line.split(' ')[1];
        }
      } else if (line.startsWith('Author: ')) {
        const content = line.substring(8).trim();
        
        // Regex to match ctime format at the end of the string
        // ctime format: Wek Mon DD HH:MM:SS YYYY (e.g. Fri May 22 22:29:56 2026)
        // Re-anchored to the end of the string for maximum robustness
        const ctimeRegex = /\s+(\S+)\s+(\S+)\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})\s+(\d{4})$/;
        const ctimeMatch = content.match(ctimeRegex);
        
        if (ctimeMatch) {
          author = content.substring(0, ctimeMatch.index).trim();
          const timeParts = ctimeMatch[4].split(':');
          const monthName = ctimeMatch[2].toLowerCase();
          let monthIndex = 0;
          if (monthMap[monthName] !== undefined) {
            monthIndex = monthMap[monthName];
          } else {
            const parsedMonth = parseInt(monthName, 10);
            if (!isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
              monthIndex = parsedMonth - 1;
            }
          }
          
          const dateObj = new Date(
            parseInt(ctimeMatch[5], 10),
            monthIndex,
            parseInt(ctimeMatch[3], 10),
            parseInt(timeParts[0], 10),
            parseInt(timeParts[1], 10),
            parseInt(timeParts[2], 10)
          );
          if (!isNaN(dateObj.getTime())) {
            date = dateObj.toLocaleString();
          } else {
            date = ctimeMatch[0];
          }
        } else {
          // Fallback to timestamp parsing
          const lastSpace = content.lastIndexOf(' ');
          if (lastSpace !== -1) {
            author = content.substring(0, lastSpace);
            const timestamp = parseInt(content.substring(lastSpace + 1), 10);
            if (!isNaN(timestamp)) {
              date = new Date(timestamp * 1000).toLocaleString();
            } else {
              date = content.substring(lastSpace + 1);
            }
          } else {
            author = content;
          }
        }
      } else {
        message += (message ? '\n' : '') + line;
      }
    }
    
    if (hash) {
      commits.push({ hash, author, date, message });
    }
  }
  return commits;
}


// Parser: branches output
export function parseBranches(output) {
  const lines = output.split('\n');
  const branches = [];
  let activeBranch = '';
  
  for (let line of lines) {
    const cleanLine = line.replace(/\u001b\[\d+m/g, '').trim();
    if (!cleanLine) continue;
    
    if (cleanLine.startsWith('*')) {
      let name = cleanLine.substring(1).trim();
      if (name.includes('(no commits yet)')) {
        name = 'main';
      }
      branches.push(name);
      activeBranch = name;
    } else {
      const name = cleanLine.trim();
      branches.push(name);
    }
  }
  return { branches, activeBranch };
}

// Get locks directly from locks.json
export async function getLocks(repoPath) {
  try {
    const locksStr = await invoke('get_synapse_locks', { repoPath });
    if (!locksStr) return {};
    return JSON.parse(locksStr);
  } catch (error) {
    console.error('Failed to get locks:', error);
    return {};
  }
}

// Get staged/base version of a file
export async function getStagedFileContent(repoPath, filePath) {
  try {
    return await invoke('get_staged_file_content', { repoPath, filePath });
  } catch (error) {
    throw new Error(error.toString());
  }
}

// Read current local file content
export async function readLocalFileContent(repoPath, filePath) {
  try {
    return await invoke('read_local_file_content', { repoPath, filePath });
  } catch (error) {
    throw new Error(error.toString());
  }
}

// Read local file as base64 (for binary asset preview - images etc.)
export async function readLocalFileAsBase64(repoPath, filePath) {
  try {
    return await invoke('read_local_file_as_base64', { repoPath, filePath });
  } catch (error) {
    throw new Error(error.toString());
  }
}

// Get file list for a commit
export async function getCommitFileList(repoPath, commitHash) {
  try {
    return await invoke('get_commit_file_list', { repoPath, commitHash });
  } catch (error) {
    console.error('Failed to get commit files:', error);
    return [];
  }
}

// Get file content for a commit
export async function getCommitFileContent(repoPath, commitHash, filePath) {
  try {
    return await invoke('get_commit_file_content', { repoPath, commitHash, filePath });
  } catch (error) {
    throw new Error(error.toString());
  }
}

// Get historical file content (base and head) for a commit
export async function getHistoricalFileContent(repoPath, commitHash, filePath, status) {
  try {
    return await invoke('get_historical_file_content', { repoPath, commitHash, filePath, status });
  } catch (error) {
    throw new Error(error.toString());
  }
}

// Write current local file content
export async function writeLocalFileContent(repoPath, filePath, content) {
  try {
    return await invoke('write_local_file_content', { repoPath, filePath, content });
  } catch (error) {
    throw new Error(error.toString());
  }
}

// Select folder using native Windows dialog
export async function selectDirectory() {
  try {
    return await invoke('select_directory');
  } catch (error) {
    console.error('Failed to select directory:', error);
    return null;
  }
}

// Discard local file change
export async function discardFileChange(repoPath, filePath, status) {
  try {
    return await invoke('discard_file_change', { repoPath, filePath, status });
  } catch (error) {
    throw new Error(error.toString());
  }
}

// Get active username resolved by backend
export async function getActiveUsername(repoPath) {
  try {
    return await invoke('get_active_username', { repoPath });
  } catch (error) {
    console.error('Failed to get active username:', error);
    return 'Anonymous';
  }
}


