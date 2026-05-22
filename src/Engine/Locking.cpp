#include "Engine/Locking.hpp"
#include "Engine/Repository.hpp"
#include "Core/Utils.hpp"
#include <fstream>
#include <sstream>
#include <iostream>

namespace Synapse::Engine {

    std::string normalize_path(const std::string& path) {
        std::string res = path;
        for (char& c : res) {
            if (c == '\\') c = '/';
        }
        if (res.rfind("./", 0) == 0) {
            res = res.substr(2);
        }
        return res;
    }

    std::string get_active_username() {
        std::string username = get_config_username();
        if (username.empty()) {
            username = Core::get_system_username();
        }
        return username;
    }

    std::unordered_map<std::string, LockInfo> read_locks() {
        std::unordered_map<std::string, LockInfo> locks;
        fs::path lock_path = fs::path(".synapse") / "locks.json";
        if (!fs::exists(lock_path)) return locks;

        std::ifstream file(lock_path);
        if (!file.is_open()) return locks;

        std::string line;
        std::string current_path = "";
        LockInfo current_info;

        while (std::getline(file, line)) {
            while (!line.empty() && (line.front() == ' ' || line.front() == '\t')) {
                line.erase(line.begin());
            }
            while (!line.empty() && (line.back() == '\r' || line.back() == '\n' || line.back() == ' ' || line.back() == ',')) {
                line.pop_back();
            }

            if (line.empty()) continue;

            if (line.back() == '{') {
                size_t first_quote = line.find('"');
                size_t second_quote = line.find('"', first_quote + 1);
                if (first_quote != std::string::npos && second_quote != std::string::npos) {
                    current_path = line.substr(first_quote + 1, second_quote - first_quote - 1);
                    current_info = LockInfo();
                }
            }
            else if (line.find("\"owner\"") != std::string::npos) {
                size_t colon_pos = line.find(':');
                if (colon_pos != std::string::npos) {
                    size_t first_quote = line.find('"', colon_pos);
                    size_t second_quote = line.find('"', first_quote + 1);
                    if (first_quote != std::string::npos && second_quote != std::string::npos) {
                        current_info.owner = line.substr(first_quote + 1, second_quote - first_quote - 1);
                    }
                }
            }
            else if (line.find("\"timestamp\"") != std::string::npos) {
                size_t colon_pos = line.find(':');
                if (colon_pos != std::string::npos) {
                    size_t first_quote = line.find('"', colon_pos);
                    size_t second_quote = line.find('"', first_quote + 1);
                    if (first_quote != std::string::npos && second_quote != std::string::npos) {
                        current_info.timestamp = line.substr(first_quote + 1, second_quote - first_quote - 1);
                    }
                }
            }
            else if (line.front() == '}') {
                if (!current_path.empty()) {
                    locks[normalize_path(current_path)] = current_info;
                    current_path = "";
                }
            }
        }
        return locks;
    }

    bool write_locks(const std::unordered_map<std::string, LockInfo>& locks) {
        fs::path lock_dir = fs::path(".synapse");
        if (!fs::exists(lock_dir)) {
            fs::create_directories(lock_dir);
        }
        fs::path lock_path = lock_dir / "locks.json";

        std::ofstream out(lock_path);
        if (!out.is_open()) return false;

        out << "{\n";
        bool first = true;
        for (const auto& [path, lock] : locks) {
            if (!first) out << ",\n";
            out << "  \"" << normalize_path(path) << "\": {\n";
            out << "    \"owner\": \"" << lock.owner << "\",\n";
            out << "    \"timestamp\": \"" << lock.timestamp << "\"\n";
            out << "  }";
            first = false;
        }
        out << "\n}\n";
        return true;
    }

    bool lock_file(const std::string& file_path) {
        std::string norm_path = normalize_path(file_path);
        if (!fs::exists(norm_path)) {
            std::cerr << "Error: File does not exist: " << norm_path << "\n";
            return false;
        }

        std::unordered_map<std::string, LockInfo> locks = read_locks();
        auto it = locks.find(norm_path);
        std::string current_user = get_active_username();

        if (it != locks.end()) {
            if (it->second.owner == current_user) {
                std::cout << "File is already locked by you: " << norm_path << "\n";
                return true;
            } else {
                std::cerr << "Error: File is locked by another developer (" << it->second.owner << "): " << norm_path << "\n";
                return false;
            }
        }

        LockInfo info;
        info.owner = current_user;
        info.timestamp = Core::get_current_timestamp();

        locks[norm_path] = info;
        if (!write_locks(locks)) {
            std::cerr << "Error: Failed to write lock database.\n";
            return false;
        }

        try {
            fs::permissions(norm_path, fs::perms::owner_write | fs::perms::group_write | fs::perms::others_write, fs::perm_options::add);
        } catch (...) {}

        std::cout << "Successfully locked file: " << norm_path << " (Owner: " << current_user << ")\n";
        return true;
    }

    bool unlock_file(const std::string& file_path) {
        std::string norm_path = normalize_path(file_path);
        std::unordered_map<std::string, LockInfo> locks = read_locks();
        auto it = locks.find(norm_path);

        if (it == locks.end()) {
            std::cout << "File is not locked: " << norm_path << "\n";
            return true;
        }

        std::string current_user = get_active_username();
        if (it->second.owner != current_user) {
            std::cerr << "Error: Cannot unlock file owned by " << it->second.owner << ": " << norm_path << "\n";
            return false;
        }

        locks.erase(it);
        if (!write_locks(locks)) {
            std::cerr << "Error: Failed to write lock database.\n";
            return false;
        }

        try {
            fs::permissions(norm_path, fs::perms::owner_write | fs::perms::group_write | fs::perms::others_write, fs::perm_options::add);
        } catch (...) {}

        std::cout << "Successfully unlocked file: " << norm_path << "\n";
        return true;
    }

    bool is_file_locked_by_other(const std::string& file_path, std::string& owner) {
        std::string norm_path = normalize_path(file_path);
        std::unordered_map<std::string, LockInfo> locks = read_locks();
        auto it = locks.find(norm_path);

        if (it != locks.end()) {
            std::string current_user = get_active_username();
            if (it->second.owner != current_user) {
                owner = it->second.owner;
                return true;
            }
        }
        return false;
    }

    void enforce_file_permissions(const std::string& file_path) {
        std::string norm_path = normalize_path(file_path);
        if (!fs::exists(norm_path)) return;

        std::string owner;
        try {
            if (is_file_locked_by_other(norm_path, owner)) {
                fs::permissions(norm_path, fs::perms::owner_write | fs::perms::group_write | fs::perms::others_write, fs::perm_options::remove);
            } else {
                fs::permissions(norm_path, fs::perms::owner_write | fs::perms::group_write | fs::perms::others_write, fs::perm_options::add);
            }
        } catch (...) {}
    }
}
