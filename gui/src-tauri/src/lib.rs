use tauri_plugin_shell::ShellExt;
use std::path::PathBuf;
use std::fs::File;
use std::io::Read;
use flate2::read::ZlibDecoder;

#[derive(serde::Serialize)]
struct FileChange {
    path: String,
    status: String,
}

fn decompress_zlib(bytes: &[u8]) -> Result<Vec<u8>, String> {
    let mut decoder = ZlibDecoder::new(bytes);
    let mut decompressed = Vec::new();
    decoder.read_to_end(&mut decompressed).map_err(|e| e.to_string())?;
    Ok(decompressed)
}

fn decode_turkish_bytes_file(bytes: &[u8]) -> String {
    if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE {
        let mut u16_chars = Vec::new();
        let chunks = bytes[2..].chunks_exact(2);
        for chunk in chunks {
            u16_chars.push(u16::from_le_bytes([chunk[0], chunk[1]]));
        }
        return String::from_utf16_lossy(&u16_chars);
    }
    if bytes.len() >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF {
        let mut u16_chars = Vec::new();
        let chunks = bytes[2..].chunks_exact(2);
        for chunk in chunks {
            u16_chars.push(u16::from_be_bytes([chunk[0], chunk[1]]));
        }
        return String::from_utf16_lossy(&u16_chars);
    }
    if bytes.len() >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF {
        return String::from_utf8_lossy(&bytes[3..]).into_owned();
    }
    if let Ok(utf8_str) = std::str::from_utf8(bytes) {
        return utf8_str.to_string();
    }
    // Fallback to CP1254 decoding
    bytes.iter().map(|&b| {
        if b < 128 {
            b as char
        } else {
            match b {
                0x80 => '\u{20AC}',
                0x82 => '\u{201A}',
                0x83 => '\u{0192}',
                0x84 => '\u{201E}',
                0x85 => '\u{2026}',
                0x86 => '\u{2020}',
                0x87 => '\u{2021}',
                0x88 => '\u{02C6}',
                0x89 => '\u{2030}',
                0x8A => '\u{0160}',
                0x8B => '\u{2039}',
                0x8C => '\u{0152}',
                0x91 => '\u{2018}',
                0x92 => '\u{2019}',
                0x93 => '\u{201C}',
                0x94 => '\u{201D}',
                0x95 => '\u{2022}',
                0x96 => '\u{2013}',
                0x97 => '\u{2014}',
                0x98 => '\u{02DC}',
                0x99 => '\u{2122}',
                0x9A => '\u{0161}',
                0x9B => '\u{203A}',
                0x9C => '\u{0153}',
                0x9F => '\u{0178}',
                0xA0 => '\u{00A0}',
                0xA1 => '\u{00A1}',
                0xA2 => '\u{00A2}',
                0xA3 => '\u{00A3}',
                0xA4 => '\u{00A4}',
                0xA5 => '\u{00A5}',
                0xA6 => '\u{00A6}',
                0xA7 => '\u{00A7}',
                0xA8 => '\u{00A8}',
                0xA9 => '\u{00A9}',
                0xAA => '\u{00AA}',
                0xAB => '\u{00AB}',
                0xAC => '\u{00AC}',
                0xAD => '\u{00AD}',
                0xAE => '\u{00AE}',
                0xAF => '\u{00AF}',
                0xB0 => '\u{00B0}',
                0xB1 => '\u{00B1}',
                0xB2 => '\u{00B2}',
                0xB3 => '\u{00B3}',
                0xB4 => '\u{00B4}',
                0xB5 => '\u{00B5}',
                0xB6 => '\u{00B6}',
                0xB7 => '\u{00B7}',
                0xB8 => '\u{00B8}',
                0xB9 => '\u{00B9}',
                0xBA => '\u{00BA}',
                0xBB => '\u{00BB}',
                0xBC => '\u{00BC}',
                0xBD => '\u{00BD}',
                0xBE => '\u{00BE}',
                0xBF => '\u{00BF}',
                0xC0 => '\u{00C0}',
                0xC1 => '\u{00C1}',
                0xC2 => '\u{00C2}',
                0xC3 => '\u{00C3}',
                0xC4 => '\u{00C4}',
                0xC5 => '\u{00C5}',
                0xC6 => '\u{00C6}',
                0xC7 => '\u{00C7}',
                0xC8 => '\u{00C8}',
                0xC9 => '\u{00C9}',
                0xCA => '\u{00CA}',
                0xCB => '\u{00CB}',
                0xCC => '\u{00CC}',
                0xCD => '\u{00CD}',
                0xCE => '\u{00CE}',
                0xCF => '\u{00CF}',
                0xD0 => '\u{011E}',
                0xD1 => '\u{00D1}',
                0xD2 => '\u{00D2}',
                0xD3 => '\u{00D3}',
                0xD4 => '\u{00D4}',
                0xD5 => '\u{00D5}',
                0xD6 => '\u{00D6}',
                0xD7 => '\u{00D7}',
                0xD8 => '\u{00D8}',
                0xD9 => '\u{00D9}',
                0xDA => '\u{00DA}',
                0xDB => '\u{00DB}',
                0xDC => '\u{00DC}',
                0xDD => '\u{0130}',
                0xDE => '\u{015E}',
                0xDF => '\u{00DF}',
                0xE0 => '\u{00E0}',
                0xE1 => '\u{00E1}',
                0xE2 => '\u{00E2}',
                0xE3 => '\u{00E3}',
                0xE4 => '\u{00E4}',
                0xE5 => '\u{00E5}',
                0xE6 => '\u{00E6}',
                0xE7 => '\u{00E7}',
                0xE8 => '\u{00E8}',
                0xE9 => '\u{00E9}',
                0xEA => '\u{00EA}',
                0xEB => '\u{00EB}',
                0xEC => '\u{00EC}',
                0xED => '\u{00ED}',
                0xEE => '\u{00EE}',
                0xEF => '\u{00EF}',
                0xF0 => '\u{011F}',
                0xF1 => '\u{00F1}',
                0xF2 => '\u{00F2}',
                0xF3 => '\u{00F3}',
                0xF4 => '\u{00F4}',
                0xF5 => '\u{00F5}',
                0xF6 => '\u{00F6}',
                0xF7 => '\u{00F7}',
                0xF8 => '\u{00F8}',
                0xF9 => '\u{00F9}',
                0xFA => '\u{00FA}',
                0xFB => '\u{00FB}',
                0xFC => '\u{00FC}',
                0xFD => '\u{0131}',
                0xFE => '\u{015F}',
                0xFF => '\u{00FF}',
                _ => '\u{FFFD}',
            }
        }
    }).collect()
}

fn decode_turkish_bytes_cmd_cp857(bytes: &[u8]) -> String {
    if let Ok(utf8_str) = std::str::from_utf8(bytes) {
        return utf8_str.to_string();
    }
    // Fallback to CP857 decoding (Standard Turkish OEM Code Page)
    bytes.iter().map(|&b| {
        if b < 128 {
            b as char
        } else {
            match b {
                0x80 => '\u{00C7}', // Ç
                0x81 => '\u{00FC}', // ü
                0x82 => '\u{00E9}', // é
                0x83 => '\u{00E2}', // â
                0x84 => '\u{00E4}', // ä
                0x85 => '\u{00E0}', // à
                0x86 => '\u{00E5}', // å
                0x87 => '\u{00E7}', // ç
                0x88 => '\u{00EA}', // ê
                0x89 => '\u{00EB}', // ë
                0x8A => '\u{00E8}', // è
                0x8B => '\u{00EF}', // ï
                0x8C => '\u{00EE}', // î
                0x8D => '\u{0131}', // ı
                0x8E => '\u{00C4}', // Ä
                0x8F => '\u{00C5}', // Å
                0x90 => '\u{00C9}', // É
                0x91 => '\u{00E6}', // æ
                0x92 => '\u{00C6}', // Æ
                0x93 => '\u{00F4}', // ô
                0x94 => '\u{00F6}', // ö
                0x95 => '\u{00F2}', // ò
                0x96 => '\u{00FB}', // û
                0x97 => '\u{00F9}', // ù
                0x98 => '\u{0130}', // İ
                0x99 => '\u{00D6}', // Ö
                0x9A => '\u{00DC}', // Ü
                0x9B => '\u{00F8}', // ø
                0x9C => '\u{00A3}', // £
                0x9D => '\u{00D8}', // Ø
                0x9E => '\u{015E}', // Ş
                0x9F => '\u{015F}', // ş
                0xA0 => '\u{00E1}', // á
                0xA1 => '\u{00ED}', // í
                0xA2 => '\u{00F3}', // ó
                0xA3 => '\u{00FA}', // ú
                0xA4 => '\u{00F1}', // ñ
                0xA5 => '\u{00D1}', // Ñ
                0xA6 => '\u{011E}', // Ğ
                0xA7 => '\u{011F}', // ğ
                0xA8 => '\u{00BF}', // ¿
                0xA9 => '\u{00AE}', // ®
                0xAA => '\u{00AC}', // ¬
                0xAB => '\u{00BD}', // ½
                0xAC => '\u{00BC}', // ¼
                0xAD => '\u{00A1}', // ¡
                0xAE => '\u{00AB}', // «
                0xAF => '\u{00BB}', // »
                0xB0 => '\u{2591}',
                0xB1 => '\u{2592}',
                0xB2 => '\u{2593}',
                0xB3 => '\u{2502}',
                0xB4 => '\u{2524}',
                0xB5 => '\u{00C1}',
                0xB6 => '\u{00C2}',
                0xB7 => '\u{00C0}',
                0xB8 => '\u{00A9}',
                0xB9 => '\u{2563}',
                0xBA => '\u{2551}',
                0xBB => '\u{2557}',
                0xBC => '\u{255D}',
                0xBD => '\u{00A2}',
                0xBE => '\u{00A5}',
                0xBF => '\u{2510}',
                0xC0 => '\u{2514}',
                0xC1 => '\u{2534}',
                0xC2 => '\u{252C}',
                0xC3 => '\u{251C}',
                0xC4 => '\u{2500}',
                0xC5 => '\u{253C}',
                0xC6 => '\u{00E3}',
                0xC7 => '\u{00C3}',
                0xC8 => '\u{255A}',
                0xC9 => '\u{2554}',
                0xCA => '\u{2569}',
                0xCB => '\u{2566}',
                0xCC => '\u{2560}',
                0xCD => '\u{2550}',
                0xCE => '\u{256C}',
                0xCF => '\u{00A4}',
                0xD0 => '\u{00BA}',
                0xD1 => '\u{00AA}',
                0xD2 => '\u{00CA}',
                0xD3 => '\u{00CB}',
                0xD4 => '\u{00C8}',
                0xD5 => '\u{0131}',
                0xD6 => '\u{00CD}',
                0xD7 => '\u{00CE}',
                0xD8 => '\u{00CF}',
                0xD9 => '\u{2518}',
                0xDA => '\u{250C}',
                0xDB => '\u{2588}',
                0xDC => '\u{2584}',
                0xDD => '\u{00A6}',
                0xDE => '\u{00CC}',
                0xDF => '\u{2580}',
                0xE0 => '\u{00D3}',
                0xE1 => '\u{00DF}',
                0xE2 => '\u{00D4}',
                0xE3 => '\u{00D2}',
                0xE4 => '\u{00F5}',
                0xE5 => '\u{00D5}',
                0xE6 => '\u{00B5}',
                0xE7 => '\u{00AD}',
                0xE8 => '\u{00DE}',
                0xE9 => '\u{00FE}',
                0xEA => '\u{00DB}',
                0xEB => '\u{00D9}',
                0xEC => '\u{00FD}',
                0xED => '\u{00DD}',
                0xEE => '\u{00AF}',
                0xEF => '\u{00B4}',
                0xF0 => '\u{00AD}',
                0xF1 => '\u{00B1}',
                0xF2 => '\u{2017}',
                0xF3 => '\u{00BE}',
                0xF4 => '\u{00B6}',
                0xF5 => '\u{00A7}',
                0xF6 => '\u{00F7}',
                0xF7 => '\u{00B8}',
                0xF8 => '\u{00B0}',
                0xF9 => '\u{00A8}',
                0xFA => '\u{00B7}',
                0xFB => '\u{00B9}',
                0xFC => '\u{00B3}',
                0xFD => '\u{00B2}',
                0xFE => '\u{25A0}',
                0xFF => '\u{00A0}',
                _ => '\u{FFFD}',
            }
        }
    }).collect()
}

fn decode_turkish_bytes_cmd(bytes: &[u8]) -> String {
    if let Ok(utf8_str) = std::str::from_utf8(bytes) {
        return utf8_str.to_string();
    }
    
    // Heuristic scoring to determine whether it is CP1254 or CP857
    let mut cp1254_score = 0;
    let mut cp857_score = 0;
    for &b in bytes {
        match b {
            0xFD | 0xFE | 0xF0 | 0xDD | 0xDE | 0xD0 => cp1254_score += 1,
            0x8D | 0xD5 | 0xA7 | 0xA6 | 0x9F | 0x9E | 0x98 => cp857_score += 1,
            _ => {}
        }
    }
    
    if cp1254_score > cp857_score {
        decode_turkish_bytes_file(bytes)
    } else {
        decode_turkish_bytes_cmd_cp857(bytes)
    }
}



fn resolve_full_hash(repo_path_buf: &PathBuf, short_hash: &str) -> Result<String, String> {
    if short_hash.len() == 40 {
        return Ok(short_hash.to_string());
    }
    if short_hash.len() < 6 {
        return Err(String::from("Commit hash too short."));
    }

    let obj_dir = repo_path_buf.join(".synapse").join("objects").join(&short_hash[0..2]);
    if !obj_dir.exists() {
        return Err(format!("Commit object directory for '{}' not found.", short_hash));
    }

    for entry in std::fs::read_dir(obj_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let filename = entry.file_name().to_string_lossy().to_string();
        let potential_hash = format!("{}{}", &short_hash[0..2], filename);
        if potential_hash.starts_with(short_hash) {
            return Ok(potential_hash);
        }
    }

    Err(format!("Commit starting with '{}' not found.", short_hash))
}

fn read_object_bytes_by_hash(repo_path_buf: &PathBuf, hash: &str) -> Result<Vec<u8>, String> {
    if hash.len() < 4 {
        return Err(String::from("Invalid object hash."));
    }
    
    let object_path = repo_path_buf
        .join(".synapse")
        .join("objects")
        .join(&hash[0..2])
        .join(&hash[2..]);

    if !object_path.exists() {
        return Err(format!("Object '{}' not found in database.", hash));
    }

    let mut file = File::open(&object_path).map_err(|e| e.to_string())?;
    let mut compressed_bytes = Vec::new();
    file.read_to_end(&mut compressed_bytes).map_err(|e| e.to_string())?;

    let decompressed_bytes = decompress_zlib(&compressed_bytes)?;

    let null_index = match decompressed_bytes.iter().position(|&x| x == 0) {
        Some(pos) => pos,
        None => return Err(String::from("Invalid object format (no header separator).")),
    };

    Ok(decompressed_bytes[null_index + 1..].to_vec())
}

fn read_tree_entries(
    repo_path_buf: &PathBuf,
    tree_hash: &str,
) -> Result<std::collections::HashMap<String, String>, String> {
    let content_bytes = read_object_bytes_by_hash(repo_path_buf, tree_hash)?;
    let content_str = decode_turkish_bytes_file(&content_bytes);
    let mut entries = std::collections::HashMap::new();

    for line in content_str.lines() {
        if line.is_empty() {
            continue;
        }
        if line.len() > 41 {
            let hash = line[0..40].to_string();
            let path = line[41..].to_string();
            entries.insert(path, hash);
        }
    }

    Ok(entries)
}

#[tauri::command]
async fn run_synapse_command(
    app: tauri::AppHandle,
    repo_path: String,
    args: Vec<String>,
) -> Result<String, String> {
    let shell = app.shell();
    let mut sidecar = shell.sidecar("synapse").map_err(|e| e.to_string())?;

    if !repo_path.is_empty() {
        sidecar = sidecar.current_dir(PathBuf::from(repo_path));
    }

    let output = sidecar.args(args).output().await.map_err(|e| e.to_string())?;

    let stdout = decode_turkish_bytes_cmd(&output.stdout);
    let stderr = decode_turkish_bytes_cmd(&output.stderr);

    if output.status.success() {
        Ok(stdout)
    } else {
        Err(format!("Error (exit code {}):\n{}{}", output.status.code().unwrap_or(-1), stdout, stderr))
    }
}

#[tauri::command]
fn get_synapse_config(repo_path: String) -> Result<String, String> {
    let config_path = PathBuf::from(repo_path).join(".synapse").join("config");
    if config_path.exists() {
        match std::fs::read(config_path) {
            Ok(bytes) => Ok(decode_turkish_bytes_file(&bytes).trim().to_string()),
            Err(e) => Err(e.to_string()),
        }
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
fn get_synapse_locks(repo_path: String) -> Result<String, String> {
    let locks_path = PathBuf::from(repo_path).join(".synapse").join("locks.json");
    if locks_path.exists() {
        match std::fs::read(locks_path) {
            Ok(bytes) => Ok(decode_turkish_bytes_file(&bytes).trim().to_string()),
            Err(e) => Err(e.to_string()),
        }
    } else {
        Ok(String::from("{}"))
    }
}

#[tauri::command]
fn get_staged_file_content(repo_path: String, file_path: String) -> Result<String, String> {
    let repo_path_buf = PathBuf::from(repo_path);
    let index_path = repo_path_buf.join(".synapse").join("index");
    if !index_path.exists() {
        return Err(String::from("No Synapse repository index found."));
    }

    let normalized_file_path = file_path.replace("\\", "/");

    let mut file = File::open(&index_path).map_err(|e| e.to_string())?;
    let mut index_bytes = Vec::new();
    file.read_to_end(&mut index_bytes).map_err(|e| e.to_string())?;
    let index_str = decode_turkish_bytes_file(&index_bytes);

    let mut target_hash = None;
    for line in index_str.lines() {
        if line.len() > 41 {
            let hash = &line[0..40];
            let path = &line[41..];
            if path == normalized_file_path {
                target_hash = Some(hash.to_string());
                break;
            }
        }
    }

    let hash = match target_hash {
        Some(h) => h,
        None => return Err(format!("File '{}' not found in index.", normalized_file_path)),
    };

    // Read blob from database
    let content_bytes = read_object_bytes_by_hash(&repo_path_buf, &hash)?;
    let content_str = decode_turkish_bytes_file(&content_bytes);

    // Check if it's an LFS pointer
    if content_str.starts_with("synapse-lfs-v1") {
        let mut lfs_hash = String::new();
        for line in content_str.lines() {
            if line.starts_with("oid sha1:") {
                lfs_hash = line.replace("oid sha1:", "").trim().to_string();
            }
        }
        if !lfs_hash.is_empty() {
            let lfs_file_path = repo_path_buf.join(".synapse").join("large_media").join(&lfs_hash);
            if lfs_file_path.exists() {
                let mut lfs_file = File::open(&lfs_file_path).map_err(|e| e.to_string())?;
                let mut lfs_bytes = Vec::new();
                lfs_file.read_to_end(&mut lfs_bytes).map_err(|e| e.to_string())?;
                let lfs_content = decode_turkish_bytes_file(&lfs_bytes);
                return Ok(lfs_content);
            } else {
                return Err(format!("LFS media file '{}' is missing.", lfs_hash));
            }
        }
    }

    Ok(content_str)
}

#[tauri::command]
fn read_local_file_content(repo_path: String, file_path: String) -> Result<String, String> {
    let target_path = PathBuf::from(repo_path).join(file_path);
    if !target_path.exists() {
        return Ok(String::new());
    }
    
    let mut file = File::open(&target_path).map_err(|e| e.to_string())?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes).map_err(|e| e.to_string())?;
    let content = decode_turkish_bytes_file(&bytes);
    Ok(content)
}

#[tauri::command]
fn read_local_file_as_base64(repo_path: String, file_path: String) -> Result<String, String> {
    const MAX_PREVIEW_BYTES: u64 = 50 * 1024 * 1024; // 50 MB hard limit

    let target_path = PathBuf::from(&repo_path).join(&file_path);
    if !target_path.exists() {
        return Err(format!("File not found: {}", target_path.display()));
    }

    // Check file size BEFORE reading — prevents freeze on large files
    let file_size = std::fs::metadata(&target_path)
        .map(|m| m.len())
        .unwrap_or(0);

    if file_size > MAX_PREVIEW_BYTES {
        // Return a special sentinel so frontend can show a friendly message
        return Err(format!("FILE_TOO_LARGE:{}", file_size));
    }

    let mut file = File::open(&target_path).map_err(|e| e.to_string())?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes).map_err(|e| e.to_string())?;

    // Check if the file is a TGA image
    let extension = target_path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase());

    if extension.as_deref() == Some("tga") {
        let img = image::load_from_memory_with_format(&bytes, image::ImageFormat::Tga)
            .map_err(|e| format!("Failed to load TGA: {}", e))?;
        
        let mut png_bytes = Vec::new();
        let mut cursor = std::io::Cursor::new(&mut png_bytes);
        img.write_to(&mut cursor, image::ImageFormat::Png)
            .map_err(|e| format!("Failed to encode TGA to PNG: {}", e))?;
        bytes = png_bytes;
    }

    Ok(base64_encode(&bytes))
}

/// Return the byte size of a file without reading its contents
#[tauri::command]
fn get_file_size_bytes(repo_path: String, file_path: String) -> Result<u64, String> {
    let target_path = PathBuf::from(repo_path).join(file_path);
    std::fs::metadata(&target_path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}

/// Minimal Base64 encoder (no external crates needed)
fn base64_encode(input: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut output = Vec::with_capacity((input.len() + 2) / 3 * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let combined = (b0 << 16) | (b1 << 8) | b2;
        output.push(CHARS[((combined >> 18) & 0x3F) as usize]);
        output.push(CHARS[((combined >> 12) & 0x3F) as usize]);
        output.push(if chunk.len() > 1 { CHARS[((combined >> 6) & 0x3F) as usize] } else { b'=' });
        output.push(if chunk.len() > 2 { CHARS[(combined & 0x3F) as usize] } else { b'=' });
    }
    String::from_utf8(output).unwrap_or_default()
}

#[tauri::command]
fn write_local_file_content(repo_path: String, file_path: String, content: String) -> Result<(), String> {
    let target_path = PathBuf::from(repo_path).join(file_path);
    if let Some(parent) = target_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&target_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_commit_file_list(repo_path: String, commit_hash: String) -> Result<Vec<FileChange>, String> {
    let repo_path_buf = PathBuf::from(repo_path);
    
    let full_commit_hash = resolve_full_hash(&repo_path_buf, &commit_hash)?;
    
    let commit_content = read_object_bytes_by_hash(&repo_path_buf, &full_commit_hash)?;
    let commit_str = decode_turkish_bytes_file(&commit_content);

    let mut tree_hash = String::new();
    let mut parent_hash = String::new();

    for line in commit_str.lines() {
        if line.starts_with("tree ") {
            tree_hash = line.replace("tree ", "").trim().to_string();
        } else if line.starts_with("parent ") {
            parent_hash = line.replace("parent ", "").trim().to_string();
        }
    }

    if tree_hash.is_empty() {
        return Err(String::from("Failed to parse tree hash from commit."));
    }

    let current_tree = read_tree_entries(&repo_path_buf, &tree_hash)?;

    let parent_tree = if !parent_hash.is_empty() {
        let parent_full_hash = resolve_full_hash(&repo_path_buf, &parent_hash)?;
        let parent_commit_content = read_object_bytes_by_hash(&repo_path_buf, &parent_full_hash)?;
        let parent_commit_str = decode_turkish_bytes_file(&parent_commit_content);
        
        let mut parent_tree_hash = String::new();
        for line in parent_commit_str.lines() {
            if line.starts_with("tree ") {
                parent_tree_hash = line.replace("tree ", "").trim().to_string();
                break;
            }
        }
        
        if parent_tree_hash.is_empty() {
            return Err(String::from("Failed to parse tree hash from parent commit."));
        }
        
        read_tree_entries(&repo_path_buf, &parent_tree_hash)?
    } else {
        std::collections::HashMap::new()
    };

    let mut changes = Vec::new();

    for (path, hash) in &current_tree {
        match parent_tree.get(path) {
            Some(parent_hash) => {
                if parent_hash != hash {
                    changes.push(FileChange {
                        path: path.clone(),
                        status: String::from("modified"),
                    });
                }
            }
            None => {
                changes.push(FileChange {
                    path: path.clone(),
                    status: String::from("untracked"),
                });
            }
        }
    }

    for path in parent_tree.keys() {
        if !current_tree.contains_key(path) {
            changes.push(FileChange {
                path: path.clone(),
                status: String::from("deleted"),
            });
        }
    }

    Ok(changes)
}

#[tauri::command]
fn get_commit_file_content(
    repo_path: String,
    commit_hash: String,
    file_path: String,
) -> Result<String, String> {
    let repo_path_buf = PathBuf::from(repo_path);
    let full_commit_hash = resolve_full_hash(&repo_path_buf, &commit_hash)?;
    let commit_content = read_object_bytes_by_hash(&repo_path_buf, &full_commit_hash)?;
    let commit_str = decode_turkish_bytes_file(&commit_content);

    let mut tree_hash = String::new();
    for line in commit_str.lines() {
        if line.starts_with("tree ") {
            tree_hash = line.replace("tree ", "").trim().to_string();
            break;
        }
    }

    if tree_hash.is_empty() {
        return Err(String::from("Failed to parse tree hash from commit."));
    }

    let tree_entries = read_tree_entries(&repo_path_buf, &tree_hash)?;
    let normalized_file_path = file_path.replace("\\", "/");
    let blob_hash = match tree_entries.get(&normalized_file_path) {
        Some(h) => h,
        None => return Err(format!("File '{}' not found in commit '{}'.", normalized_file_path, commit_hash)),
    };

    let content_bytes = read_object_bytes_by_hash(&repo_path_buf, blob_hash)?;
    let content_str = decode_turkish_bytes_file(&content_bytes);

    // Check if it's an LFS pointer
    if content_str.starts_with("synapse-lfs-v1") {
        let mut lfs_hash = String::new();
        for line in content_str.lines() {
            if line.starts_with("oid sha1:") {
                lfs_hash = line.replace("oid sha1:", "").trim().to_string();
            }
        }
        if !lfs_hash.is_empty() {
            let lfs_file_path = repo_path_buf.join(".synapse").join("large_media").join(&lfs_hash);
            if lfs_file_path.exists() {
                let mut lfs_file = File::open(&lfs_file_path).map_err(|e| e.to_string())?;
                let mut lfs_bytes = Vec::new();
                lfs_file.read_to_end(&mut lfs_bytes).map_err(|e| e.to_string())?;
                let lfs_content = decode_turkish_bytes_file(&lfs_bytes);
                return Ok(lfs_content);
            } else {
                return Err(format!("LFS media file '{}' is missing.", lfs_hash));
            }
        }
    }

    Ok(content_str)
}

#[derive(serde::Serialize)]
struct HistoricalFileContent {
    base_content: String,
    head_content: String,
}

#[tauri::command]
fn get_historical_file_content(
    repo_path: String,
    commit_hash: String,
    file_path: String,
    status: String,
) -> Result<HistoricalFileContent, String> {
    let repo_path_buf = PathBuf::from(repo_path);
    let normalized_file_path = file_path.replace("\\", "/");

    // 1. Get head content (from current commit_hash)
    let head_content = if status == "deleted" {
        String::new()
    } else {
        let full_commit_hash = resolve_full_hash(&repo_path_buf, &commit_hash)?;
        let commit_content = read_object_bytes_by_hash(&repo_path_buf, &full_commit_hash)?;
        let commit_str = decode_turkish_bytes_file(&commit_content);

        let mut tree_hash = String::new();
        for line in commit_str.lines() {
            if line.starts_with("tree ") {
                tree_hash = line.replace("tree ", "").trim().to_string();
                break;
            }
        }

        if tree_hash.is_empty() {
            return Err(String::from("Failed to parse tree hash from commit."));
        }

        let tree_entries = read_tree_entries(&repo_path_buf, &tree_hash)?;
        let blob_hash = match tree_entries.get(&normalized_file_path) {
            Some(h) => h,
            None => return Err(format!("File '{}' not found in commit '{}'.", normalized_file_path, commit_hash)),
        };

        let content_bytes = read_object_bytes_by_hash(&repo_path_buf, blob_hash)?;
        let mut content_str = decode_turkish_bytes_file(&content_bytes);

        // Check if it's LFS
        if content_str.starts_with("synapse-lfs-v1") {
            let mut lfs_hash = String::new();
            for line in content_str.lines() {
                if line.starts_with("oid sha1:") {
                    lfs_hash = line.replace("oid sha1:", "").trim().to_string();
                }
            }
            if !lfs_hash.is_empty() {
                let lfs_file_path = repo_path_buf.join(".synapse").join("large_media").join(&lfs_hash);
                if lfs_file_path.exists() {
                    let mut lfs_file = File::open(&lfs_file_path).map_err(|e| e.to_string())?;
                    let mut lfs_bytes = Vec::new();
                    lfs_file.read_to_end(&mut lfs_bytes).map_err(|e| e.to_string())?;
                    content_str = decode_turkish_bytes_file(&lfs_bytes);
                }
            }
        }
        content_str
    };

    // 2. Get base content (from parent commit_hash)
    let base_content = if status == "untracked" || status == "added" {
        String::new()
    } else {
        let full_commit_hash = resolve_full_hash(&repo_path_buf, &commit_hash)?;
        let commit_content = read_object_bytes_by_hash(&repo_path_buf, &full_commit_hash)?;
        let commit_str = decode_turkish_bytes_file(&commit_content);

        let mut parent_hash = String::new();
        for line in commit_str.lines() {
            if line.starts_with("parent ") {
                parent_hash = line.replace("parent ", "").trim().to_string();
                break;
            }
        }

        if parent_hash.is_empty() {
            String::new()
        } else {
            let parent_full_hash = resolve_full_hash(&repo_path_buf, &parent_hash)?;
            let parent_commit_content = read_object_bytes_by_hash(&repo_path_buf, &parent_full_hash)?;
            let parent_commit_str = decode_turkish_bytes_file(&parent_commit_content);

            let mut parent_tree_hash = String::new();
            for line in parent_commit_str.lines() {
                if line.starts_with("tree ") {
                    parent_tree_hash = line.replace("tree ", "").trim().to_string();
                    break;
                }
            }

            if parent_tree_hash.is_empty() {
                return Err(String::from("Failed to parse tree hash from parent commit."));
            }

            let parent_tree_entries = read_tree_entries(&repo_path_buf, &parent_tree_hash)?;
            match parent_tree_entries.get(&normalized_file_path) {
                Some(blob_hash) => {
                    let content_bytes = read_object_bytes_by_hash(&repo_path_buf, blob_hash)?;
                    let mut content_str = decode_turkish_bytes_file(&content_bytes);

                    // Check if it's LFS
                    if content_str.starts_with("synapse-lfs-v1") {
                        let mut lfs_hash = String::new();
                        for line in content_str.lines() {
                            if line.starts_with("oid sha1:") {
                                lfs_hash = line.replace("oid sha1:", "").trim().to_string();
                            }
                        }
                        if !lfs_hash.is_empty() {
                            let lfs_file_path = repo_path_buf.join(".synapse").join("large_media").join(&lfs_hash);
                            if lfs_file_path.exists() {
                                let mut lfs_file = File::open(&lfs_file_path).map_err(|e| e.to_string())?;
                                let mut lfs_bytes = Vec::new();
                                lfs_file.read_to_end(&mut lfs_bytes).map_err(|e| e.to_string())?;
                                content_str = decode_turkish_bytes_file(&lfs_bytes);
                            }
                        }
                    }
                    content_str
                }
                None => String::new(),
            }
        }
    };

    Ok(HistoricalFileContent {
        base_content,
        head_content,
    })
}

#[tauri::command]
fn select_directory() -> Result<Option<String>, String> {
    let result = rfd::FileDialog::new().pick_folder();
    match result {
        Some(path) => Ok(Some(path.to_string_lossy().to_string())),
        None => Ok(None),
    }
}

fn get_staged_file_bytes(repo_path_buf: &PathBuf, file_path: &str) -> Result<Vec<u8>, String> {
    let index_path = repo_path_buf.join(".synapse").join("index");
    if !index_path.exists() {
        return Err(String::from("No Synapse repository index found."));
    }

    let normalized_file_path = file_path.replace("\\", "/");

    let mut file = File::open(&index_path).map_err(|e| e.to_string())?;
    let mut index_bytes = Vec::new();
    file.read_to_end(&mut index_bytes).map_err(|e| e.to_string())?;
    let index_str = decode_turkish_bytes_file(&index_bytes);

    let mut target_hash = None;
    for line in index_str.lines() {
        if line.len() > 41 {
            let hash = &line[0..40];
            let path = &line[41..];
            if path == normalized_file_path {
                target_hash = Some(hash.to_string());
                break;
            }
        }
    }

    let hash = match target_hash {
        Some(h) => h,
        None => return Err(format!("File '{}' not found in index.", normalized_file_path)),
    };

    // Read blob from database
    let content_bytes = read_object_bytes_by_hash(repo_path_buf, &hash)?;

    // Check if it's an LFS pointer
    if content_bytes.starts_with(b"synapse-lfs-v1") {
        let content_str = String::from_utf8_lossy(&content_bytes);
        let mut lfs_hash = String::new();
        for line in content_str.lines() {
            if line.starts_with("oid sha1:") {
                lfs_hash = line.replace("oid sha1:", "").trim().to_string();
            }
        }
        if !lfs_hash.is_empty() {
            let lfs_file_path = repo_path_buf.join(".synapse").join("large_media").join(&lfs_hash);
            if lfs_file_path.exists() {
                let mut lfs_file = File::open(&lfs_file_path).map_err(|e| e.to_string())?;
                let mut lfs_bytes = Vec::new();
                lfs_file.read_to_end(&mut lfs_bytes).map_err(|e| e.to_string())?;
                return Ok(lfs_bytes);
            } else {
                return Err(format!("LFS media file '{}' is missing.", lfs_hash));
            }
        }
    }

    Ok(content_bytes)
}

#[tauri::command]
fn get_active_username(repo_path: String) -> Result<String, String> {
    let config_path = PathBuf::from(repo_path).join(".synapse").join("config");
    let mut config_user = String::new();
    if config_path.exists() {
        if let Ok(bytes) = std::fs::read(config_path) {
            config_user = decode_turkish_bytes_file(&bytes).trim().to_string();
        }
    }
    
    if !config_user.is_empty() {
        Ok(config_user)
    } else {
        let system_user = std::env::var("USERNAME")
            .or_else(|_| std::env::var("USER"))
            .unwrap_or_else(|_| String::from("Anonymous"));
        Ok(system_user)
    }
}

#[tauri::command]
fn discard_file_change(repo_path: String, file_path: String, status: String) -> Result<(), String> {
    let repo_path_buf = PathBuf::from(&repo_path);
    let target_path = repo_path_buf.join(&file_path);

    if status == "untracked" {
        if target_path.exists() {
            std::fs::remove_file(&target_path).map_err(|e| e.to_string())?;
            // Clean up empty parent directories up to repo_path
            let mut parent = target_path.parent();
            while let Some(p) = parent {
                if p == repo_path_buf || !p.starts_with(&repo_path_buf) {
                    break;
                }
                if p.exists() && std::fs::read_dir(p).map(|mut d| d.next().is_none()).unwrap_or(false) {
                    std::fs::remove_dir(p).ok();
                } else {
                    break;
                }
                parent = p.parent();
            }
        }
    } else if status == "modified" || status == "deleted" {
        let staged_bytes = get_staged_file_bytes(&repo_path_buf, &file_path)?;
        if let Some(parent) = target_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&target_path, staged_bytes).map_err(|e| e.to_string())?;
    } else {
        return Err(format!("Unknown file status '{}' for discard.", status));
    }

    Ok(())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            run_synapse_command,
            get_synapse_config,
            get_synapse_locks,
            get_staged_file_content,
            read_local_file_content,
            read_local_file_as_base64,
            get_file_size_bytes,
            write_local_file_content,
            get_commit_file_list,
            get_commit_file_content,
            get_historical_file_content,
            select_directory,
            discard_file_change,
            get_active_username
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_historical_content() {
        let repo_path = "C:\\Users\\shanyup\\Desktop\\PROJECTS\\SynapseTest".to_string();
        let commit_hash = "074770d771b60f2ee4a41730c64aa47db59e3950".to_string();
        let file_path = "test_file.txt".to_string();
        let status = "untracked".to_string();
        let res = get_historical_file_content(repo_path, commit_hash, file_path, status).unwrap();
        println!("Head Content length: {}", res.head_content.len());
        println!("Head Content debug: {:?}", res.head_content);
    }
}

