#pragma once
#include <string>
#include <vector>
#include <filesystem>

namespace fs = std::filesystem;

namespace Synapse::Core {
    std::string get_current_timestamp();
    std::string read_file_content(const fs::path& file_path);
    std::string read_text_file(const fs::path& file_path);
    std::vector<unsigned char> compress_data(const std::string& data);
    std::string decompress_data(const std::vector<unsigned char>& compressed_data);
    bool save_object_to_disk(const std::string& hash, const std::string& data);
    std::string get_system_username();
}