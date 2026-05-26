#include "Engine/Branches.hpp"
#include "Engine/History.hpp"
#include "Engine/Staging.hpp"
#include "Core/Utils.hpp"
#include <sha1.hpp>
#include <fstream>
#include <iostream>
#include <unordered_set>
#include <unordered_map>
#include <sstream>

namespace Synapse::Engine {

    std::string get_active_branch_path() {
        fs::path head_path = fs::path(".synapse") / "HEAD";
        if (fs::exists(head_path)) {
            std::ifstream head_file(head_path);
            std::string content;
            if (std::getline(head_file, content)) {
                while (!content.empty() && (content.back() == '\r' || content.back() == '\n' || content.back() == ' ')) {
                    content.pop_back();
                }
                if (content.rfind("ref: ", 0) == 0) {
                    return content.substr(5);
                }
            }
        }
        return "refs/heads/main";
    }

    std::string get_active_branch_name() {
        fs::path head_path = fs::path(".synapse") / "HEAD";
        if (fs::exists(head_path)) {
            std::ifstream head_file(head_path);
            std::string content;
            if (std::getline(head_file, content)) {
                while (!content.empty() && (content.back() == '\r' || content.back() == '\n' || content.back() == ' ')) {
                    content.pop_back();
                }
                if (content.rfind("ref: ", 0) == 0) {
                    std::string ref = content.substr(5);
                    size_t last_slash = ref.find_last_of('/');
                    if (last_slash != std::string::npos) {
                        return ref.substr(last_slash + 1);
                    }
                    return ref;
                } else {
                    return "detached HEAD (" + content.substr(0, 7) + ")";
                }
            }
        }
        return "main";
    }

    std::string get_active_branch_hash() {
        fs::path head_path = fs::path(".synapse") / "HEAD";
        if (!fs::exists(head_path)) return "";

        std::ifstream head_file(head_path);
        std::string content;
        if (std::getline(head_file, content)) {
            while (!content.empty() && (content.back() == '\r' || content.back() == '\n' || content.back() == ' ')) {
                content.pop_back();
            }
            if (content.rfind("ref: ", 0) == 0) {
                fs::path branch_file = fs::path(".synapse") / content.substr(5);
                if (fs::exists(branch_file)) {
                    std::ifstream b_file(branch_file);
                    std::string hash;
                    if (b_file >> hash) {
                        return hash;
                    }
                }
            } else {
                return content;
            }
        }
        return "";
    }

    bool create_branch(const std::string& branch_name) {
        if (branch_name.empty()) return false;
        fs::path branch_path = fs::path(".synapse") / "refs" / "heads" / branch_name;
        if (fs::exists(branch_path)) {
            std::cerr << "fatal: A branch named '" << branch_name << "' already exists.\n";
            return false;
        }

        std::string current_hash = get_active_branch_hash();
        if (current_hash.empty()) {
            std::cerr << "fatal: Cannot create branch; no commits exist yet.\n";
            return false;
        }

        if (!fs::exists(branch_path.parent_path())) {
            fs::create_directories(branch_path.parent_path());
        }

        std::ofstream b_out(branch_path);
        if (b_out.is_open()) {
            b_out << current_hash;
            b_out.close();
            std::cout << "Branch '" << branch_name << "' created at " << current_hash.substr(0, 7) << "\n";
            return true;
        }
        return false;
    }

    void list_branches() {
        fs::path heads_dir = fs::path(".synapse") / "refs" / "heads";
        if (!fs::exists(heads_dir)) {
            std::cout << "* \033[32mmain\033[0m (no commits yet)\n";
            return;
        }

        std::string active_branch = "";
        fs::path head_path = fs::path(".synapse") / "HEAD";
        if (fs::exists(head_path)) {
            std::ifstream head_file(head_path);
            std::string content;
            if (std::getline(head_file, content)) {
                while (!content.empty() && (content.back() == '\r' || content.back() == '\n' || content.back() == ' ')) {
                    content.pop_back();
                }
                if (content.rfind("ref: refs/heads/", 0) == 0) {
                    active_branch = content.substr(16);
                }
            }
        }

        bool found_any = false;
        for (const auto& entry : fs::directory_iterator(heads_dir)) {
            if (!fs::is_regular_file(entry.path())) continue;
            std::string branch = entry.path().filename().string();
            found_any = true;
            if (branch == active_branch) {
                std::cout << "* \033[32m" << branch << "\033[0m\n";
            } else {
                std::cout << "  " << branch << "\n";
            }
        }

        if (!found_any) {
            std::cout << "* \033[32mmain\033[0m\n";
        } else if (active_branch.empty()) {
            std::cout << "* \033[31m(HEAD detached)\033[0m\n";
        }
    }

    bool checkout_branch(const std::string& branch_name) {
        fs::path branch_path = fs::path(".synapse") / "refs" / "heads" / branch_name;
        if (!fs::exists(branch_path)) {
            return false;
        }

        std::ifstream b_file(branch_path);
        std::string commit_hash;
        if (!(b_file >> commit_hash)) {
            std::cerr << "Error: Branch file is empty or corrupted: " << branch_name << "\n";
            return false;
        }
        b_file.close();

        if (!checkout_commit(commit_hash, false)) {
            return false;
        }

        fs::path head_path = fs::path(".synapse") / "HEAD";
        std::ofstream head_out(head_path);
        if (head_out.is_open()) {
            head_out << "ref: refs/heads/" << branch_name;
            head_out.close();
        }

        std::cout << "Switched to branch switch '" << branch_name << "'\n";
        return true;
    }

    static bool restore_file_from_blob(const std::string& file_path_str, const std::string& blob_hash) {
        fs::path target_file_path(file_path_str);
        fs::path blob_path = fs::path(".synapse") / "objects" / blob_hash.substr(0, 2) / blob_hash.substr(2);
        if (!fs::exists(blob_path)) {
            std::cerr << "Warning: Blob object not found for file: " << file_path_str << "\n";
            return false;
        }

        try {
            std::string raw_blob_compressed = Core::read_file_content(blob_path);
            std::vector<unsigned char> blob_comp_vec(raw_blob_compressed.begin(), raw_blob_compressed.end());
            std::string decompressed_blob = Core::decompress_data(blob_comp_vec);

            size_t blob_null_pos = decompressed_blob.find('\0');
            if (blob_null_pos == std::string::npos) return false;
            std::string real_file_content = decompressed_blob.substr(blob_null_pos + 1);

            if (target_file_path.has_parent_path() && !fs::exists(target_file_path.parent_path())) {
                fs::create_directories(target_file_path.parent_path());
            }

            bool restored_via_lfs = false;
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
                        if (fs::exists(target_file_path)) {
                            fs::remove(target_file_path);
                        }
                        fs::copy_file(lfs_file_path, target_file_path, fs::copy_options::overwrite_existing);
                        restored_via_lfs = true;
                    }
                }
            }

            if (!restored_via_lfs) {
                std::ofstream restore_file(target_file_path, std::ios::binary);
                if (restore_file.is_open()) {
                    restore_file.write(real_file_content.data(), real_file_content.size());
                    restore_file.close();
                }
            }
            return true;
        }
        catch (...) {
            return false;
        }
    }

    static bool write_conflict_markers(const std::string& file_path_str, const std::string& ours_hash, const std::string& theirs_hash, const std::string& branch_name) {
        fs::path target_file_path(file_path_str);
        
        bool is_binary = is_lfs_file(target_file_path);
        if (is_binary) {
            // Keep our version on disk, but report conflict (do not write conflict markers inside binary files)
            std::cout << "Conflict in binary file: " << file_path_str << " (leaving active branch version)\n";
            return true; 
        }

        std::string ours_content = "";
        if (!ours_hash.empty()) {
            fs::path blob_path = fs::path(".synapse") / "objects" / ours_hash.substr(0, 2) / ours_hash.substr(2);
            if (fs::exists(blob_path)) {
                std::string raw = Core::read_file_content(blob_path);
                std::vector<unsigned char> comp(raw.begin(), raw.end());
                std::string decomp = Core::decompress_data(comp);
                size_t null_p = decomp.find('\0');
                if (null_p != std::string::npos) ours_content = decomp.substr(null_p + 1);
            }
        }

        std::string theirs_content = "";
        if (!theirs_hash.empty()) {
            fs::path blob_path = fs::path(".synapse") / "objects" / theirs_hash.substr(0, 2) / theirs_hash.substr(2);
            if (fs::exists(blob_path)) {
                std::string raw = Core::read_file_content(blob_path);
                std::vector<unsigned char> comp(raw.begin(), raw.end());
                std::string decomp = Core::decompress_data(comp);
                size_t null_p = decomp.find('\0');
                if (null_p != std::string::npos) theirs_content = decomp.substr(null_p + 1);
            }
        }

        // Write conflict file
        std::ofstream out(target_file_path, std::ios::binary);
        if (!out.is_open()) return false;

        out << "<<<<<<< HEAD\n";
        out << ours_content;
        if (!ours_content.empty() && ours_content.back() != '\n') out << "\n";
        out << "=======\n";
        out << theirs_content;
        if (!theirs_content.empty() && theirs_content.back() != '\n') out << "\n";
        out << ">>>>>>> " << branch_name << "\n";
        out.close();
        return true;
    }

    static std::vector<std::string> get_commit_parents(const std::string& commit_hash) {
        std::vector<std::string> parents;
        if (commit_hash.empty()) return parents;
        fs::path commit_path = fs::path(".synapse") / "objects" / commit_hash.substr(0, 2) / commit_hash.substr(2);
        if (!fs::exists(commit_path)) return parents;

        try {
            std::string raw_compressed = Core::read_file_content(commit_path);
            std::vector<unsigned char> compressed_vec(raw_compressed.begin(), raw_compressed.end());
            std::string decompressed = Core::decompress_data(compressed_vec);

            size_t null_pos = decompressed.find('\0');
            if (null_pos == std::string::npos) return parents;

            std::string content = decompressed.substr(null_pos + 1);
            std::stringstream ss(content);
            std::string line;
            while (std::getline(ss, line)) {
                if (line.empty()) break;
                std::stringstream line_ss(line);
                std::string key;
                line_ss >> key;
                if (key == "parent") {
                    std::string p_hash;
                    line_ss >> p_hash;
                    parents.push_back(p_hash);
                }
            }
        }
        catch (...) {}
        return parents;
    }

    static std::unordered_set<std::string> get_all_ancestors(const std::string& commit_hash) {
        std::unordered_set<std::string> ancestors;
        std::vector<std::string> queue = { commit_hash };
        size_t index = 0;
        while (index < queue.size()) {
            std::string curr = queue[index++];
            if (curr.empty() || ancestors.count(curr)) continue;
            ancestors.insert(curr);
            std::vector<std::string> parents = get_commit_parents(curr);
            for (const auto& p : parents) {
                queue.push_back(p);
            }
        }
        return ancestors;
    }

    static std::string find_merge_base(const std::string& commit_a, const std::string& commit_b) {
        if (commit_a == commit_b) return commit_a;
        
        std::unordered_set<std::string> ancestors_a = get_all_ancestors(commit_a);
        
        std::vector<std::string> queue = { commit_b };
        std::unordered_set<std::string> visited_b;
        size_t index = 0;
        while (index < queue.size()) {
            std::string curr = queue[index++];
            if (curr.empty() || visited_b.count(curr)) continue;
            visited_b.insert(curr);
            
            if (ancestors_a.count(curr)) {
                return curr; // Found LCA!
            }
            
            std::vector<std::string> parents = get_commit_parents(curr);
            for (const auto& p : parents) {
                queue.push_back(p);
            }
        }
        return "";
    }

    static std::unordered_map<std::string, std::string> get_tree_files(const std::string& commit_hash) {
        std::unordered_map<std::string, std::string> files;
        if (commit_hash.empty()) return files;
        std::string tree_hash = extract_tree_from_commit(commit_hash);
        if (tree_hash.empty()) return files;

        fs::path tree_path = fs::path(".synapse") / "objects" / tree_hash.substr(0, 2) / tree_hash.substr(2);
        if (!fs::exists(tree_path)) return files;

        try {
            std::string raw_compressed = Core::read_file_content(tree_path);
            std::vector<unsigned char> compressed_vec(raw_compressed.begin(), raw_compressed.end());
            std::string decompressed = Core::decompress_data(compressed_vec);

            size_t null_pos = decompressed.find('\0');
            if (null_pos == std::string::npos) return files;
            std::string content = decompressed.substr(null_pos + 1);

            std::stringstream ss(content);
            std::string line;
            while (std::getline(ss, line)) {
                if (line.empty()) continue;
                if (line.length() > 41) {
                    std::string hash = line.substr(0, 40);
                    std::string path = line.substr(41);
                    files[path] = hash;
                }
            }
        }
        catch (...) {}
        return files;
    }

    bool merge_branch(const std::string& target_branch_name) {
        if (target_branch_name.empty()) {
            std::cerr << "fatal: Target branch name cannot be empty.\n";
            return false;
        }

        fs::path target_branch_path = fs::path(".synapse") / "refs" / "heads" / target_branch_name;
        if (!fs::exists(target_branch_path)) {
            std::cerr << "fatal: Branch '" << target_branch_name << "' does not exist.\n";
            return false;
        }

        std::ifstream t_file(target_branch_path);
        std::string theirs_commit;
        t_file >> theirs_commit;
        t_file.close();

        std::string ours_commit = get_active_branch_hash();
        if (ours_commit.empty()) {
            std::cerr << "fatal: Active branch has no commits.\n";
            return false;
        }

        if (ours_commit == theirs_commit) {
            std::cout << "Already up-to-date.\n";
            return true;
        }

        std::string base_commit = find_merge_base(ours_commit, theirs_commit);
        if (base_commit.empty()) {
            std::cerr << "fatal: No common ancestor found between branches.\n";
            return false;
        }

        if (base_commit == theirs_commit) {
            std::cout << "Already up-to-date.\n";
            return true;
        }

        if (base_commit == ours_commit) {
            std::cout << "Fast-forward merge...\n";
            if (!checkout_commit(theirs_commit, false)) {
                return false;
            }
            
            std::string active_ref = get_active_branch_path();
            fs::path active_ref_path = fs::path(".synapse") / active_ref;
            std::ofstream ref_out(active_ref_path);
            if (ref_out.is_open()) {
                ref_out << theirs_commit;
                ref_out.close();
            }
            std::cout << "Successfully fast-forwarded to branch '" << target_branch_name << "'.\n";
            return true;
        }

        std::unordered_map<std::string, std::string> base_tree = get_tree_files(base_commit);
        std::unordered_map<std::string, std::string> ours_tree = get_tree_files(ours_commit);
        std::unordered_map<std::string, std::string> theirs_tree = get_tree_files(theirs_commit);

        std::unordered_set<std::string> all_files;
        for (const auto& [path, _] : base_tree) all_files.insert(path);
        for (const auto& [path, _] : ours_tree) all_files.insert(path);
        for (const auto& [path, _] : theirs_tree) all_files.insert(path);

        std::vector<std::string> conflicted_files;
        std::unordered_map<std::string, std::string> new_index;

        for (const auto& path : all_files) {
            std::string base_hash = base_tree.count(path) ? base_tree[path] : "";
            std::string ours_hash = ours_tree.count(path) ? ours_tree[path] : "";
            std::string theirs_hash = theirs_tree.count(path) ? theirs_tree[path] : "";

            if (ours_hash == theirs_hash) {
                if (!ours_hash.empty()) {
                    new_index[path] = ours_hash;
                }
                continue;
            }

            if (ours_hash == base_hash) {
                if (theirs_hash.empty()) {
                    if (fs::exists(path)) {
                        fs::remove(path);
                    }
                } else {
                    restore_file_from_blob(path, theirs_hash);
                    new_index[path] = theirs_hash;
                }
                continue;
            }

            if (theirs_hash == base_hash) {
                if (!ours_hash.empty()) {
                    new_index[path] = ours_hash;
                }
                continue;
            }

            conflicted_files.push_back(path);
            write_conflict_markers(path, ours_hash, theirs_hash, target_branch_name);
            if (!ours_hash.empty()) {
                new_index[path] = ours_hash;
            }
        }

        fs::path index_path = fs::path(".synapse") / "index";
        std::ofstream index_out(index_path);
        if (index_out.is_open()) {
            for (const auto& [path, hash] : new_index) {
                index_out << hash << " " << path << "\n";
            }
            index_out.close();
        }

        if (!conflicted_files.empty()) {
            fs::path merge_head_path = fs::path(".synapse") / "MERGE_HEAD";
            std::ofstream merge_out(merge_head_path);
            if (merge_out.is_open()) {
                merge_out << theirs_commit;
                merge_out.close();
            }

            std::cout << "Automatic merge failed; fix conflicts and then commit the result.\n";
            std::cout << "Conflicting files:\n";
            for (const auto& c_file : conflicted_files) {
                std::cout << "  [CONFLICT] " << c_file << "\n";
            }
            return false;
        }

        std::cout << "Automatic merge succeeded. Creating merge commit...\n";
        fs::path merge_head_path = fs::path(".synapse") / "MERGE_HEAD";
        std::ofstream merge_out(merge_head_path);
        if (merge_out.is_open()) {
            merge_out << theirs_commit;
            merge_out.close();
        }

        std::string merge_msg = "Merge branch '" + target_branch_name + "'";
        if (create_commit(merge_msg)) {
            std::cout << "Merge complete!\n";
            return true;
        }

        return false;
    }
}
