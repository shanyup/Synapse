#pragma once
#include <string>
#include <unordered_map>
#include <filesystem>

namespace fs = std::filesystem;

namespace Synapse::Engine {
    struct LockInfo {
        std::string owner;
        std::string timestamp;
    };

    std::unordered_map<std::string, LockInfo> read_locks();
    bool write_locks(const std::unordered_map<std::string, LockInfo>& locks);

    bool lock_file(const std::string& file_path);
    bool unlock_file(const std::string& file_path);
    bool is_file_locked_by_other(const std::string& file_path, std::string& owner);
    void enforce_file_permissions(const std::string& file_path);
}
