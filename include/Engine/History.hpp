#pragma once
#include <string>

namespace Synapse::Engine {
    bool create_commit(const std::string& commit_message);
    std::string extract_tree_from_commit(const std::string& commit_hash);
    void show_history();
    bool checkout_commit(const std::string& target_commit_hash, bool update_head = true);
}