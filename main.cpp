#include <iostream>
#include <string>
#include "Engine/Repository.hpp"
#include "Engine/Staging.hpp"
#include "Engine/History.hpp"
#include "Engine/Locking.hpp"
#include "Engine/Branches.hpp"
#include "Engine/Diff.hpp"

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: synapse <command> [options]\n";
        return 1;
    }

    std::string command = argv[1];

    if (command != "init" && !Synapse::Engine::is_repository_initialized()) {
        std::cerr << "fatal: not a synapse repository (or any of the parent directories): .synapse\n";
        return 1;
    }

    if (command == "init") {
        std::string target_ignore_content = "";
        if (argc >= 3) {
            std::string command2 = argv[2];
            auto it = Synapse::Engine::ignore_templates.find(command2);
            if (it != Synapse::Engine::ignore_templates.end()) {
                target_ignore_content = it->second;
            }
            else {
                std::cerr << "Unknown option: " << command2 << "\n";
                return 1;
            }
        }
        if (Synapse::Engine::init_repository()) {
            Synapse::Engine::create_ignore_file(target_ignore_content);
        }
    }
    else if (command == "hash-object") {
        if (argc < 3) {
            std::cerr << "Usage: synapse hash-object <file_path>\n";
            return 1;
        }
        Synapse::Engine::hash_object(argv[2]);
    }
    else if (command == "add") {
        if (argc < 3) {
            std::cerr << "Usage: synapse add <path|.>\n";
            return 1;
        }
        Synapse::Engine::add_path_to_staging(argv[2]);
    }
    else if (command == "commit") {
        if (argc < 4 || std::string(argv[2]) != "-m") {
            std::cerr << "Usage: synapse commit -m \"Commit message\"\n";
            return 1;
        }
        Synapse::Engine::create_commit(argv[3]);
    }
    else if (command == "log")
    {
        Synapse::Engine::show_history();
    }
    else if (command == "checkout")
    {
        if (argc < 3) {
            std::cerr << "Usage: synapse checkout <branch_name_or_commit_hash>\n";
            return 1;
        }
        std::string target = argv[2];
        if (!Synapse::Engine::checkout_branch(target)) {
            Synapse::Engine::checkout_commit(target);
        }
    }
    else if (command == "branch")
    {
        if (argc < 3) {
            Synapse::Engine::list_branches();
        }
        else {
            Synapse::Engine::create_branch(argv[2]);
        }
    }
    else if (command == "merge")
    {
        if (argc < 3) {
            std::cerr << "Usage: synapse merge <branch_name>\n";
            return 1;
        }
        if (!Synapse::Engine::merge_branch(argv[2])) {
            return 1;
        }
    }
    else if (command == "config")
    {
        if (argc < 3) {
            std::cerr << "Usage: synapse config <username>\n";
            return 1;
        }
        Synapse::Engine::set_config_username(argv[2]);
    }
    else if (command == "status")
    {
        Synapse::Engine::show_status();
    }
    else if (command == "diff")
    {
        std::string target_path = "";
        if (argc >= 3) {
            target_path = argv[2];
        }
        Synapse::Engine::show_diff(target_path);
    }
    else if (command == "lock")
    {
        if (argc < 3) {
            std::cerr << "Usage: synapse lock <file_path>\n";
            return 1;
        }
        Synapse::Engine::lock_file(argv[2]);
    }
    else if (command == "unlock")
    {
        if (argc < 3) {
            std::cerr << "Usage: synapse unlock <file_path>\n";
            return 1;
        }
        Synapse::Engine::unlock_file(argv[2]);
    }
    else {
        std::cerr << "Unknown command: " << command << "\n";
        return 1;
    }

    return 0;
}