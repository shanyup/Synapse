#include "Engine/Staging.hpp"
#include "Core/Utils.hpp"
#include <sha1.hpp>
#include <iostream>
#include <fstream>

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

    std::string hash_object(const std::string& target_file_path) {
        try {
            fs::path file_path(target_file_path);
            if (!fs::exists(file_path)) {
                std::cerr << "Error: File not found: " << target_file_path << "\n";
                return "";
            }
            std::string file_content = Core::read_file_content(file_path);
            std::string header = "blob " + std::to_string(file_content.size()) + '\0';
            std::string store_data = header + file_content;

            SHA1 checksum;
            checksum.update(store_data);
            std::string sha1_hash = checksum.final();

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

            std::string file_hash = hash_object(rel_path_str);
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
                std::string header = "blob " + std::to_string(file_content.size()) + '\0';
                std::string store_data = header + file_content;

                SHA1 checksum;
                checksum.update(store_data);
                std::string current_hash = checksum.final();

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
        std::cout << "On branch main\n\n";

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