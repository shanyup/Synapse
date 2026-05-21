#pragma once
#include <string>
#include <vector>
#include <filesystem>
#include <unordered_map>
#include <string>

namespace fs = std::filesystem;

namespace Synapse::Engine {
    std::vector<std::string> load_ignore_rules();
    bool should_ignore(const fs::path& file_path, const std::vector<std::string>& ignore_rules);
    std::string hash_object(const std::string& target_file_path);
    void add_to_staging();
    void show_status();
}