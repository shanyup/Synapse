#include "Engine/History.hpp"
#include "Engine/Repository.hpp"
#include "Engine/Locking.hpp"
#include "Engine/Branches.hpp"
#include "Core/Utils.hpp"
#include <sha1.hpp>
#include <fstream>
#include <sstream>
#include <iostream>
#include <unordered_set>

namespace Synapse::Engine {
    std::string extract_tree_from_commit(const std::string& commit_hash) {
        if (commit_hash.empty()) return "";
        try {
            fs::path commit_path = fs::path(".synapse") / "objects" / commit_hash.substr(0, 2) / commit_hash.substr(2);
            if (!fs::exists(commit_path)) return "";

            std::string raw_compressed = Core::read_file_content(commit_path);
            std::vector<unsigned char> compressed_vec(raw_compressed.begin(), raw_compressed.end());
            std::string decompressed = Core::decompress_data(compressed_vec);

            size_t null_pos = decompressed.find('\0');
            if (null_pos == std::string::npos) return "";

            std::string content = decompressed.substr(null_pos + 1);
            std::stringstream ss(content);
            std::string prefix, tree_hash;
            ss >> prefix >> tree_hash;
            if (prefix == "tree") return tree_hash;
        }
        catch (...) {}
        return "";
    }

    bool create_commit(const std::string& commit_message) {
        fs::path index_path = fs::path(".synapse") / "index";
        if (!fs::exists(index_path) || fs::file_size(index_path) == 0) {
            std::cerr << "Nothing to commit. You must run 'synapse add .' first.\n";
            return false;
        }

        std::string index_content = Core::read_text_file(index_path);

        std::string tree_header = "tree " + std::to_string(index_content.size()) + '\0';
        std::string tree_data = tree_header + index_content;
        SHA1 tree_checksum; tree_checksum.update(tree_data);
        std::string tree_hash = tree_checksum.final();

        std::string parent_hash = get_active_branch_hash();

        if (!parent_hash.empty()) {
            std::string last_tree_hash = extract_tree_from_commit(parent_hash);
            if (tree_hash == last_tree_hash) {
                std::cout << "nothing to commit, working tree clean (No changes)\n";
                return false;
            }
        }

        Core::save_object_to_disk(tree_hash, tree_data);

        std::string author = get_config_username();
        if (author.empty()) {
            author = Core::get_system_username();
        }

        std::stringstream commit_stream;
        commit_stream << "tree " << tree_hash << "\n";
        if (!parent_hash.empty()) commit_stream << "parent " << parent_hash << "\n";
        commit_stream << "author " << author << " " << Core::get_current_timestamp() << "\n";
        commit_stream << "\n" << commit_message << "\n";
        std::string commit_content = commit_stream.str();

        std::string commit_header = "commit " + std::to_string(commit_content.size()) + '\0';
        std::string commit_data = commit_header + commit_content;
        SHA1 commit_checksum; commit_checksum.update(commit_data);
        std::string commit_hash = commit_checksum.final();

        Core::save_object_to_disk(commit_hash, commit_data);

        // Update active branch reference, or HEAD directly if detached
        fs::path head_path = fs::path(".synapse") / "HEAD";
        bool detached = true;
        std::string branch_ref_path = "";
        if (fs::exists(head_path)) {
            std::ifstream head_file(head_path);
            std::string content;
            if (std::getline(head_file, content)) {
                while (!content.empty() && (content.back() == '\r' || content.back() == '\n' || content.back() == ' ')) {
                    content.pop_back();
                }
                if (content.rfind("ref: ", 0) == 0) {
                    detached = false;
                    branch_ref_path = content.substr(5);
                }
            }
        }

        if (!detached) {
            fs::path branch_file_path = fs::path(".synapse") / branch_ref_path;
            if (!fs::exists(branch_file_path.parent_path())) {
                fs::create_directories(branch_file_path.parent_path());
            }
            std::ofstream branch_out(branch_file_path);
            if (branch_out.is_open()) {
                branch_out << commit_hash;
                branch_out.close();
            }
        } else {
            std::ofstream head_out(head_path);
            if (head_out.is_open()) {
                head_out << commit_hash;
                head_out.close();
            }
        }

        std::cout << "[" << commit_hash.substr(0, 7) << "] Commit successfully created: " << commit_message << "\n";
        return true;
    }

    void show_history() {
        std::string current_commit_hash = get_active_branch_hash();

        if (current_commit_hash.empty()) {
            std::cout << "No commits have been made yet.\n";
            return;
        }

        // Loop until the first commit (until parent is empty)
        while (!current_commit_hash.empty()) {
            fs::path commit_path = fs::path(".synapse") / "objects" / current_commit_hash.substr(0, 2) / current_commit_hash.substr(2);

            if (!fs::exists(commit_path)) {
                std::cerr << "Error: Commit object not found: " << current_commit_hash << "\n";
                break;
            }

            // Read commit file in binary and decompress with zlib
            std::string raw_compressed = Core::read_file_content(commit_path);
            std::vector<unsigned char> compressed_vec(raw_compressed.begin(), raw_compressed.end());
            std::string decompressed = Core::decompress_data(compressed_vec);

            // Skip the "commit <size>\0" header and focus on the content
            size_t null_pos = decompressed.find('\0');
            if (null_pos == std::string::npos) break;
            std::string content = decompressed.substr(null_pos + 1);

            // Parse commit content line by line
            std::stringstream ss(content);
            std::string line;
            std::string next_parent_hash = ""; // For the next iteration of the loop
            std::string author_info = "";
            std::string message = "";
            bool reading_message = false;

            while (std::getline(ss, line)) {
                if (line.empty()) {
                    reading_message = true; // Content after empty line is the commit message
                    continue;
                }

                if (!reading_message) {
                    std::stringstream line_ss(line);
                    std::string key;
                    line_ss >> key;
                    if (key == "parent") {
                        line_ss >> next_parent_hash;
                    }
                    else if (key == "author") {
                        author_info = line.substr(7); // Trim "author " key
                    }
                }
                else {
                    message += line + "\n";
                }
            }

            // Print Git-style yellow colored output (\033[33m is the yellow color code)
            std::cout << "\033[33mcommit " << current_commit_hash.substr(0, 7) << "\033[0m (" << current_commit_hash << ")\n";
            std::cout << "Author: " << author_info << "\n";
            std::cout << "\n    " << message << "\n";
            std::cout << "--------------------------------------------------\n";

            // Move to the next link in the chain
            current_commit_hash = next_parent_hash;
        }
    }

    bool checkout_commit(const std::string& target_commit_hash, bool update_head) {
        if (target_commit_hash.size() < 6) {
            std::cerr << "Error: Invalid or too short commit hash.\n";
            return false;
        }

        // The user might have entered a short hash (e.g., 84347c5). Search for the full hash in objects.
        std::string full_hash = "";
        fs::path obj_base_dir = fs::path(".synapse") / "objects" / target_commit_hash.substr(0, 2);

        if (!fs::exists(obj_base_dir)) {
            std::cerr << "Error: No commit starting with this hash was found.\n";
            return false;
        }

        for (const auto& entry : fs::directory_iterator(obj_base_dir)) {
            std::string filename = entry.path().filename().string();
            std::string potential_hash = target_commit_hash.substr(0, 2) + filename;
            if (potential_hash.substr(0, target_commit_hash.size()) == target_commit_hash) {
                full_hash = potential_hash;
                break;
            }
        }

        if (full_hash.empty()) {
            std::cerr << "Error: Specified commit object not found.\n";
            return false;
        }

        // 1. IDENTIFY FILES IN THE CURRENT INDEX FILE
        std::unordered_set<std::string> current_files;
        fs::path index_path = fs::path(".synapse") / "index";
        if (fs::exists(index_path)) {
            std::ifstream index_file(index_path);
            std::string line;
            while (std::getline(index_file, line)) {
                if (line.length() > 41) {
                    std::string path = line.substr(41);
                    current_files.insert(path);
                }
            }
            index_file.close();
        }

        // 2. READ COMMIT OBJECT AND GET TREE HASH
        std::string tree_hash = extract_tree_from_commit(full_hash);
        if (tree_hash.empty()) {
            std::cerr << "Error: Failed to extract tree data from commit object.\n";
            return false;
        }

        // 3. READ TREE OBJECT AND DECOMPRESS CONTENT (OUR OLD INDEX FILE)
        fs::path tree_path = fs::path(".synapse") / "objects" / tree_hash.substr(0, 2) / tree_hash.substr(2);
        if (!fs::exists(tree_path)) {
            std::cerr << "Error: Tree object is missing from the database.\n";
            return false;
        }

        std::string raw_tree_compressed = Core::read_file_content(tree_path);
        std::vector<unsigned char> tree_comp_vec_fixed(raw_tree_compressed.begin(), raw_tree_compressed.end());
        std::string decompressed_tree = Core::decompress_data(tree_comp_vec_fixed);

        size_t tree_null_pos = decompressed_tree.find('\0');
        if (tree_null_pos == std::string::npos) return false;
        std::string tree_content = decompressed_tree.substr(tree_null_pos + 1);

        // 4. IDENTIFY TARGET FILES
        std::unordered_set<std::string> target_files;
        std::stringstream ss_find(tree_content);
        std::string line_find;
        while (std::getline(ss_find, line_find)) {
            if (line_find.empty()) continue;
            if (line_find.length() > 41) {
                std::string file_path_str = line_find.substr(41);
                target_files.insert(file_path_str);
            }
        }

        // 5. DESTRUCTIVELY DELETE FILES THAT ARE NOT IN THE TARGET FROM WORKSPACE
        for (const auto& current_file : current_files) {
            if (target_files.find(current_file) == target_files.end()) {
                fs::path file_to_delete(current_file);
                if (fs::exists(file_to_delete)) {
                    fs::remove(file_to_delete);
                    // Clean up empty parent directories
                    fs::path parent = file_to_delete.parent_path();
                    while (parent != "." && !parent.empty() && fs::exists(parent) && fs::is_empty(parent)) {
                        fs::remove(parent);
                        parent = parent.parent_path();
                    }
                }
            }
        }

        // 6. FILE RESTORATION (RESTORE) LOOP
        std::stringstream ss(tree_content);
        std::string line;

        while (std::getline(ss, line)) {
            if (line.empty()) continue;
            if (line.length() <= 41) continue;

            std::string blob_hash = line.substr(0, 40);
            std::string file_path_str = line.substr(41);

            fs::path target_file_path(file_path_str);

            // Read blob from database
            fs::path blob_path = fs::path(".synapse") / "objects" / blob_hash.substr(0, 2) / blob_hash.substr(2);
            if (!fs::exists(blob_path)) {
                std::cerr << "Warning: Some files in the folder are missing -> " << file_path_str << "\n";
                continue;
            }

            std::string raw_blob_compressed = Core::read_file_content(blob_path);
            std::vector<unsigned char> blob_comp_vec(raw_blob_compressed.begin(), raw_blob_compressed.end());
            std::string decompressed_blob = Core::decompress_data(blob_comp_vec);

            // Trim the "blob <size>\0" header
            size_t blob_null_pos = decompressed_blob.find('\0');
            if (blob_null_pos == std::string::npos) continue;
            std::string real_file_content = decompressed_blob.substr(blob_null_pos + 1);

            // Create parent directories if they don't exist
            if (target_file_path.has_parent_path() && !fs::exists(target_file_path.parent_path())) {
                fs::create_directories(target_file_path.parent_path());
            }

            bool restored_via_lfs = false;
            // Check if the blob is an LFS pointer
            if (real_file_content.rfind("synapse-lfs-v1", 0) == 0) {
                std::stringstream ptr_ss(real_file_content);
                std::string line_ptr;
                std::string raw_hash = "";
                while (std::getline(ptr_ss, line_ptr)) {
                    if (line_ptr.rfind("oid sha1:", 0) == 0) {
                        raw_hash = line_ptr.substr(9);
                        while (!raw_hash.empty() && (raw_hash.back() == '\r' || raw_hash.back() == '\n' || raw_hash.back() == ' ')) {
                            raw_hash.pop_back();
                        }
                    }
                }
                if (!raw_hash.empty()) {
                    fs::path lfs_file_path = fs::path(".synapse") / "large_media" / raw_hash;
                    if (fs::exists(lfs_file_path)) {
                        try {
                            if (fs::exists(target_file_path)) {
                                fs::remove(target_file_path);
                            }
                            fs::copy_file(lfs_file_path, target_file_path, fs::copy_options::overwrite_existing);
                            restored_via_lfs = true;
                        }
                        catch (const std::exception& e) {
                            std::cerr << "Error: Failed to restore LFS file " << file_path_str << " - " << e.what() << "\n";
                        }
                    } else {
                        std::cerr << "Warning: LFS file not found in large_media database: " << raw_hash << "\n";
                    }
                }
            }

            if (!restored_via_lfs) {
                // Write file to disk
                std::ofstream restore_file(target_file_path, std::ios::binary);
                if (restore_file.is_open()) {
                    restore_file.write(real_file_content.data(), real_file_content.size());
                    restore_file.close();
                }
            }

            enforce_file_permissions(file_path_str);
        }

        // 7. UPDATE INDEX FILE
        std::ofstream index_out(index_path);
        if (index_out.is_open()) {
            index_out << tree_content;
            index_out.close();
        }

        // 8. UPDATE HEAD REFERENCE IF NEEDED (DETACHED HEAD STATE)
        if (update_head) {
            fs::path head_path = fs::path(".synapse") / "HEAD";
            std::ofstream head_out(head_path);
            if (head_out.is_open()) {
                head_out << full_hash;
                head_out.close();
            }
        }

        std::cout << "Checkout successful! Project restored to commit: [" << full_hash.substr(0, 7) << "]\n";
        return true;
    }
}