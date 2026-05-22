#include "Engine/Branches.hpp"
#include "Engine/History.hpp"
#include <fstream>
#include <iostream>

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

        std::cout << "Switched to branch '" << branch_name << "'\n";
        return true;
    }
}
