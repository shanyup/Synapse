#include "Engine/Staging.hpp"
#include "Engine/Locking.hpp"
#include "Engine/Branches.hpp"
#include "Core/Utils.hpp"
#include <sha1.hpp>
#include <iostream>
#include <fstream>
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

    bool should_ignore(const fs::path& file_path, const std::vector<std::string>& ignore_rules) {
        std::string path_str = file_path.string();

        for (char& c : path_str) {
            if (c == '\\') {
                c = '/';
            }
        }

        for (const std::string& rule : ignore_rules) {
            if (path_str.find(rule) != std::string::npos) return true;
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
            ".uasset", ".umap", ".fbx", ".wav", ".png", ".tga", ".jpg", 
            ".jpeg", ".mp3", ".mp4", ".zip", ".rar", ".exe", ".dll", ".blend", ".obj"
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
            std::string hash, path;
            while (file >> hash >> path) {
                current_index[path] = hash;
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

    void show_status() {
        fs::path index_path = fs::path(".synapse") / "index";
        std::unordered_map<std::string, std::string> index_files;

        // 1. Read the current index file and load it into a map
        if (fs::exists(index_path)) {
            std::ifstream index_file(index_path);
            std::string hash, path;
            while (index_file >> hash >> path) {
                index_files[path] = hash;
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