#pragma once
#include <string>
#include <vector>
#include <filesystem>

namespace fs = std::filesystem;

namespace Synapse::Engine {
    std::string get_active_branch_path();
    std::string get_active_branch_name();
    std::string get_active_branch_hash();
    bool create_branch(const std::string& branch_name);
    void list_branches();
    bool checkout_branch(const std::string& branch_name);
}
