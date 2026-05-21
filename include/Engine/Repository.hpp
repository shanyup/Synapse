#pragma once
#include <string>
#include <unordered_map>

namespace Synapse::Engine {
    extern std::unordered_map<std::string, std::string> ignore_templates;
    bool init_repository();
    void create_ignore_file(const std::string& content);
    bool is_repository_initialized();
    void set_config_username(const std::string& username);
    std::string get_config_username();
}