#include "Engine/Staging.hpp"
#include "Engine/Locking.hpp"
#include "Engine/Branches.hpp"
#include "Core/Utils.hpp"
#include <sha1.hpp>
#include <iostream>
#include <fstream>
#include <sstream>
#include <unordered_set>
#include <algorithm>
#include <cctype>

namespace Synapse::Engine {
    std::vector<std::string> load_ignore_rules() {
        std::vector<std::string> rules;
        rules.push_back(".synapse");
        rules.push_back(".synapseignore");

        std::ifstream ignore_file(".synapseignore");
        if (!ignore_file.is_open()) return rules;

        std::string line;
        while (std::getline(ignore_file, line)) {
            if (!line.empty() && line.back() == '\r') {
                line.pop_back();
            }
            if (line.empty() || line[0] == '#') continue;

            for (char& c : line) {
                if (c == '\\') c = '/';
            }

            rules.push_back(line);
        }
        ignore_file.close();
        return rules;
    }

    // Glob pattern matcher: supports *.ext, dir/, and plain substring rules
    static bool match_glob_pattern(const std::string& path_str, const std::string& rule) {
        if (rule.empty()) return false;

        // Rule ends with '/' -> directory segment match
        // e.g. "Binaries/" matches any path segment named "Binaries"
        if (rule.back() == '/') {
            std::string dir_name = rule.substr(0, rule.size() - 1);
            // Check if any path segment equals dir_name
            // Split by '/'
            std::string seg;
            std::istringstream ss(path_str);
            while (std::getline(ss, seg, '/')) {
                if (seg == dir_name) return true;
            }
            return false;
        }

        // Rule starts with '*.' -> extension match (e.g. *.sln)
        if (rule.size() > 1 && rule[0] == '*' && rule[1] == '.') {
            std::string ext = rule.substr(1); // ".sln"
            if (path_str.size() >= ext.size()) {
                std::string path_end = path_str.substr(path_str.size() - ext.size());
                // Case-insensitive compare
                std::string lower_path_end = path_end;
                std::string lower_ext = ext;
                for (char& c : lower_path_end) c = std::tolower(c);
                for (char& c : lower_ext) c = std::tolower(c);
                return lower_path_end == lower_ext;
            }
            return false;
        }

        // Rule contains '*' in the middle (e.g. Build/*.pdb) -> simple wildcard
        size_t star_pos = rule.find('*');
        if (star_pos != std::string::npos) {
            std::string prefix = rule.substr(0, star_pos);
            std::string suffix = rule.substr(star_pos + 1);
            bool prefix_ok = prefix.empty() || path_str.find(prefix) != std::string::npos;
            bool suffix_ok = suffix.empty();
            if (!suffix_ok && path_str.size() >= suffix.size()) {
                std::string lower_path_end = path_str.substr(path_str.size() - suffix.size());
                std::string lower_suffix = suffix;
                for (char& c : lower_path_end) c = std::tolower(c);
                for (char& c : lower_suffix) c = std::tolower(c);
                suffix_ok = (lower_path_end == lower_suffix);
            }
            return prefix_ok && suffix_ok;
        }

        // Plain substring match (backward compat for .synapse, .synapseignore, etc.)
        return path_str.find(rule) != std::string::npos;
    }

    bool should_ignore(const fs::path& file_path, const std::vector<std::string>& ignore_rules) {
        std::string path_str = file_path.string();

        for (char& c : path_str) {
            if (c == '\\') {
                c = '/';
            }
        }

        for (const std::string& rule : ignore_rules) {
            if (match_glob_pattern(path_str, rule)) return true;
        }
        return false;
    }

    bool is_lfs_file(const fs::path& file_path) {
        if (!fs::exists(file_path)) return false;

        // 1. Size check (> 5MB)
        try {
            auto size = fs::file_size(file_path);
            if (size > 5 * 1024 * 1024) return true;
        }
        catch (...) {}

        // 2. Extension check
        std::string ext = file_path.extension().string();
        for (char& c : ext) c = std::tolower(c);

        static const std::unordered_set<std::string> lfs_extensions = {
            // Unreal Engine
            ".uasset", ".umap", ".ubulk", ".uexp", ".upk", ".ushaderbytecode",
            // 3D Models
            ".fbx", ".obj", ".blend", ".gltf", ".glb", ".abc", ".3ds", ".max",
            ".usd", ".usda", ".usdc", ".mb", ".ma",
            // Textures & Images
            ".png", ".tga", ".jpg", ".jpeg", ".bmp", ".psd", ".exr", ".hdr",
            ".dds", ".tif", ".tiff", ".svg", ".ico", ".webp", ".gif",
            ".ase", ".aseprite", ".kra", ".xcf", ".ai",
            // Audio
            ".wav", ".mp3", ".ogg", ".flac", ".aiff", ".aif",
            // Video
            ".mp4", ".mov", ".avi", ".mkv",
            // Archives
            ".zip", ".rar", ".7z", ".tar", ".gz",
            // Binaries
            ".exe", ".dll", ".so", ".dylib", ".lib", ".pdb",
            // Fonts
            ".ttf", ".otf", ".woff", ".woff2",
            // Godot
            ".res", ".scn", ".sample", ".ogv",
            // S&Box (Source 2 compiled)
            ".vmdl_c", ".vmat_c", ".vtex_c", ".vsnd_c", ".vmesh_c",
            // Unity
            ".asset", ".cubemap", ".flare", ".mixer", ".shadervariants", ".terrainlayer"
        };

        return lfs_extensions.find(ext) != lfs_extensions.end();
    }

    std::string hash_object(const std::string& target_file_path) {
        try {
            fs::path file_path(target_file_path);
            if (!fs::exists(file_path)) {
                std::cerr << "Error: File not found: " << target_file_path << "\n";
                return "";
            }
            std::string file_content = Core::read_file_content(file_path);
            
            bool lfs = is_lfs_file(file_path);
            
            SHA1 content_checksum;
            content_checksum.update(file_content);
            std::string raw_hash = content_checksum.final();

            std::string sha1_hash;
            std::string store_data;

            if (lfs) {
                // 1. Ensure .synapse/large_media directory exists
                fs::path lfs_dir = fs::path(".synapse") / "large_media";
                if (!fs::exists(lfs_dir)) {
                    fs::create_directories(lfs_dir);
                }

                // 2. Copy/Write raw file to large_media with raw_hash as name
                fs::path lfs_file_path = lfs_dir / raw_hash;
                if (!fs::exists(lfs_file_path)) {
                    std::ofstream lfs_out(lfs_file_path, std::ios::binary);
                    if (lfs_out.is_open()) {
                        lfs_out.write(file_content.data(), file_content.size());
                        lfs_out.close();
                    }
                }

                // 3. Create pointer content
                std::string pointer_content = "synapse-lfs-v1\noid sha1:" + raw_hash + "\nsize " + std::to_string(file_content.size()) + "\n";
                
                // 4. Create standard blob from pointer
                std::string header = "blob " + std::to_string(pointer_content.size()) + '\0';
                store_data = header + pointer_content;

                SHA1 pointer_checksum;
                pointer_checksum.update(store_data);
                sha1_hash = pointer_checksum.final();
            }
            else {
                // Standard Zlib compressed blob
                std::string header = "blob " + std::to_string(file_content.size()) + '\0';
                store_data = header + file_content;

                SHA1 std_checksum;
                std_checksum.update(store_data);
                sha1_hash = std_checksum.final();
            }

            if (Core::save_object_to_disk(sha1_hash, store_data)) {
                std::cout << sha1_hash << "\n";
                return sha1_hash;
            }
            return "";
        }
        catch (...) { return ""; }
    }

    void add_to_staging() {
        std::vector<std::string> ignore_rules = load_ignore_rules();
        fs::path index_path = fs::path(".synapse") / "index";

        // Load current index
        std::unordered_map<std::string, std::string> current_index;
        if (fs::exists(index_path)) {
            std::ifstream file(index_path);
            std::string line;
            while (std::getline(file, line)) {
                if (line.length() > 41) {
                    std::string hash = line.substr(0, 40);
                    std::string path = line.substr(41);
                    current_index[path] = hash;
                }
            }
            file.close();
        }

        std::ofstream index_file(index_path);
        if (!index_file.is_open()) {
            std::cerr << "Error: Could not open staging index file.\n";
            return;
        }

        for (const auto& entry : fs::recursive_directory_iterator(".")) {
            if (!fs::is_regular_file(entry.path())) continue;
            fs::path current_path = entry.path();
            if (should_ignore(current_path, ignore_rules)) continue;

            fs::path relative_path = fs::relative(current_path, ".");
            std::string rel_path_str = relative_path.string();
            for (char& c : rel_path_str) {
                if (c == '\\') c = '/';
            }

            std::string file_hash = "";
            std::string lock_owner;
            if (is_file_locked_by_other(rel_path_str, lock_owner)) {
                // If locked by someone else, check if local file was modified compared to index
                std::string local_hash = "";
                std::string file_content = Core::read_file_content(current_path);

                if (is_lfs_file(current_path)) {
                    SHA1 content_checksum;
                    content_checksum.update(file_content);
                    std::string raw_hash = content_checksum.final();
                    std::string pointer_content = "synapse-lfs-v1\noid sha1:" + raw_hash + "\nsize " + std::to_string(file_content.size()) + "\n";
                    std::string header = "blob " + std::to_string(pointer_content.size()) + '\0';
                    std::string store_data = header + pointer_content;
                    SHA1 pointer_checksum;
                    pointer_checksum.update(store_data);
                    local_hash = pointer_checksum.final();
                } else {
                    std::string header = "blob " + std::to_string(file_content.size()) + '\0';
                    std::string store_data = header + file_content;
                    SHA1 checksum;
                    checksum.update(store_data);
                    local_hash = checksum.final();
                }

                auto it = current_index.find(rel_path_str);
                if (it != current_index.end()) {
                    if (it->second != local_hash) {
                        std::cerr << "Error: File is locked by another developer (" << lock_owner << ") and has unstaged changes: " << rel_path_str << "\n";
                        // Re-stage the old hash to prevent deleting it
                        file_hash = it->second;
                    } else {
                        file_hash = it->second;
                    }
                } else {
                    std::cerr << "Error: File path is locked by another developer (" << lock_owner << ") and cannot be staged: " << rel_path_str << "\n";
                    continue; // Skip staging entirely if new and locked
                }
            } else {
                file_hash = hash_object(rel_path_str);
            }

            if (!file_hash.empty()) {
                index_file << file_hash << " " << rel_path_str << "\n";
            }
        }
        index_file.close();
        std::cout << "Changes added to staging area.\n";
    }

    void add_path_to_staging(const std::string& target_path) {
        // If "." is passed, fall back to full staging
        if (target_path == ".") {
            add_to_staging();
            return;
        }

        fs::path target(target_path);
        if (!fs::exists(target)) {
            std::cerr << "Error: Path does not exist: " << target_path << "\n";
            return;
        }

        std::vector<std::string> ignore_rules = load_ignore_rules();
        fs::path index_path = fs::path(".synapse") / "index";

        // Load current index into a map
        std::unordered_map<std::string, std::string> current_index;
        if (fs::exists(index_path)) {
            std::ifstream f(index_path);
            std::string line;
            while (std::getline(f, line)) {
                if (line.length() > 41) {
                    current_index[line.substr(41)] = line.substr(0, 40);
                }
            }
        }

        // Collect files to stage
        std::vector<fs::path> files_to_stage;
        if (fs::is_regular_file(target)) {
            files_to_stage.push_back(target);
        } else if (fs::is_directory(target)) {
            for (const auto& entry : fs::recursive_directory_iterator(target)) {
                if (fs::is_regular_file(entry.path())) {
                    files_to_stage.push_back(entry.path());
                }
            }
        }

        // Stage each file (update index entry)
        for (const auto& file_path : files_to_stage) {
            if (should_ignore(file_path, ignore_rules)) continue;

            fs::path relative_path = fs::relative(file_path, ".");
            std::string rel_path_str = relative_path.string();
            for (char& c : rel_path_str) { if (c == '\\') c = '/'; }

            std::string lock_owner;
            if (is_file_locked_by_other(rel_path_str, lock_owner)) {
                std::cerr << "Error: File is locked by " << lock_owner << ": " << rel_path_str << "\n";
                continue;
            }

            std::string new_hash = hash_object(rel_path_str);
            if (!new_hash.empty()) {
                current_index[rel_path_str] = new_hash;
                std::cout << "Staged: " << rel_path_str << "\n";
            }
        }

        // Write updated index back
        std::ofstream out(index_path);
        if (!out.is_open()) {
            std::cerr << "Error: Could not write staging index.\n";
            return;
        }
        for (const auto& pair : current_index) {
            out << pair.second << " " << pair.first << "\n";
        }
        out.close();
        std::cout << "Selective staging complete.\n";
    }

    void show_status() {
        fs::path index_path = fs::path(".synapse") / "index";
        std::unordered_map<std::string, std::string> index_files;

        // 1. Read the current index file and load it into a map
        if (fs::exists(index_path)) {
            std::ifstream index_file(index_path);
            std::string line;
            while (std::getline(index_file, line)) {
                if (line.length() > 41) {
                    std::string hash = line.substr(0, 40);
                    std::string path = line.substr(41);
                    index_files[path] = hash;
                }
            }
            index_file.close();
        }

        std::vector<std::string> ignore_rules = load_ignore_rules();
        std::vector<std::string> modified_files;
        std::vector<std::string> new_files;

        // 2. Scan workspace directory and compare with index
        if (fs::exists(".")) {
            for (const auto& entry : fs::recursive_directory_iterator(".")) {
                if (!fs::is_regular_file(entry.path())) continue;

                fs::path current_path = entry.path();
                if (should_ignore(current_path, ignore_rules)) continue;

                fs::path relative_path = fs::relative(current_path, ".");
                std::string rel_path_str = relative_path.string();

                // Normalize separator for Windows
                for (char& c : rel_path_str) {
                    if (c == '\\') c = '/';
                }

                // Read file content and compute SHA-1 hash
                std::string file_content = Core::read_file_content(current_path);
                std::string current_hash;

                if (is_lfs_file(current_path)) {
                    // Compute hash of the raw content
                    SHA1 content_checksum;
                    content_checksum.update(file_content);
                    std::string raw_hash = content_checksum.final();

                    // Reconstruct pointer content
                    std::string pointer_content = "synapse-lfs-v1\noid sha1:" + raw_hash + "\nsize " + std::to_string(file_content.size()) + "\n";
                    std::string header = "blob " + std::to_string(pointer_content.size()) + '\0';
                    std::string store_data = header + pointer_content;

                    SHA1 pointer_checksum;
                    pointer_checksum.update(store_data);
                    current_hash = pointer_checksum.final();
                }
                else {
                    std::string header = "blob " + std::to_string(file_content.size()) + '\0';
                    std::string store_data = header + file_content;

                    SHA1 checksum;
                    checksum.update(store_data);
                    current_hash = checksum.final();
                }

                // Comparison logic
                auto it = index_files.find(rel_path_str);
                if (it != index_files.end()) {
                    if (it->second != current_hash) {
                        // File exists in index but hash has changed (modified)
                        modified_files.push_back(rel_path_str);
                    }
                }
                else {
                    // File not in index (untracked)
                    new_files.push_back(rel_path_str);
                }
            }
        }

        // 3. Find files present in index but missing from disk (deleted)
        std::vector<std::string> deleted_files;
        for (const auto& pair : index_files) {
            const std::string& path_str = pair.first;
            if (!fs::exists(path_str)) {
                deleted_files.push_back(path_str);
            }
        }

        // 4. Print color-coded status output (ANSI escape codes)
        std::cout << "On branch " << get_active_branch_name() << "\n\n";

        if (modified_files.empty() && new_files.empty() && deleted_files.empty()) {
            std::cout << "nothing to commit, working tree clean\n";
            return;
        }

        if (!modified_files.empty() || !deleted_files.empty()) {
            std::cout << "Changes not staged for commit:\n";
            std::cout << "  (use \"synapse add ...\" to update what will be committed)\n";
            for (const auto& file : modified_files) {
                // Print modified files in green
                std::cout << "        \033[32mmodified:   " << file << "\033[0m\n";
            }
            for (const auto& file : deleted_files) {
                // Print deleted files in red
                std::cout << "        \033[31mdeleted:    " << file << "\033[0m\n";
            }
            std::cout << "\n";
        }

        if (!new_files.empty()) {
            std::cout << "Untracked files:\n";
            std::cout << "  (use \"synapse add <file>...\" to include in what will be committed)\n";
            for (const auto& file : new_files) {
                // Print untracked files in red
                std::cout << "        \033[31m" << file << "\033[0m\n";
            }
            std::cout << "\n";
        }
    }
}