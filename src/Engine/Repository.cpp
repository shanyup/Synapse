#include "Engine/Repository.hpp"
#include <iostream>
#include <fstream>
#include <filesystem>

namespace fs = std::filesystem;

namespace Synapse::Engine {
    std::unordered_map<std::string, std::string> ignore_templates = {
        {"", ""},
        {"ue", "Binaries/\nIntermediate/\nSaved/\nDerivedDataCache/\n.vs/\n*.sln"},
        {"unity", "Library/\nTemp/\nObj/\nLogs/\n*.csproj"},
        {"cpp", "build/\n*.o\n*.exe\n.vs/"}
    };

    bool init_repository() {
        try {
            fs::path repo_path = ".synapse";
            if (fs::exists(repo_path)) {
                std::cerr << "Repository already exists.\n";
                return false;
            }
            fs::create_directory(repo_path);
            fs::create_directory(repo_path / "objects");
            fs::create_directory(repo_path / "refs");

            std::ofstream head_file(repo_path / "HEAD");
            if (head_file.is_open()) {
                head_file << "ref: refs/heads/main";
                head_file.close();
            }
            else {
                std::cerr << "HEAD file could not be created.\n";
                return false;
            }
            std::cout << "Repository successfully initialized.\n";
            return true;
        }
        catch (const fs::filesystem_error& e) {
            std::cerr << "Filesystem error: " << e.what() << "\n";
            return false;
        }
    }

    void create_ignore_file(const std::string& content) {
        std::ofstream ignore_file(".synapseignore");
        if (ignore_file.is_open()) {
            ignore_file << content;
            ignore_file.close();
            std::cout << ".synapseignore file created.\n";
        }
        else {
            std::cerr << ".synapseignore file could not be created.\n";
        }
    }

    bool is_repository_initialized() {
        return fs::exists(".synapse");
    }

    void set_config_username(const std::string& username) {
        std::ofstream config_file(fs::path(".synapse") / "config");
        if (config_file.is_open()) {
            config_file << username;
            config_file.close();
            std::cout << "Username successfully updated: " << username << "\n";
        }
        else {
            std::cerr << "Error: Config file could not be written.\n";
        }
    }

    std::string get_config_username() {
        fs::path config_path = fs::path(".synapse") / "config";
        if (fs::exists(config_path)) {
            std::ifstream config_file(config_path);
            std::string username;
            if (std::getline(config_file, username)) {
                return username;
            }
        }
        return "";
    }
}