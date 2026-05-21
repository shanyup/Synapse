#include "Core/Utils.hpp"
#include <chrono>
#include <ctime>
#include <fstream>
#include <sstream>
#include <iostream>
#include <miniz.h>
#include <cstdlib>

namespace Synapse::Core {
    std::string get_current_timestamp() {
        auto now = std::chrono::system_clock::now();
        std::time_t now_time_t = std::chrono::system_clock::to_time_t(now);
        std::string time_str = std::ctime(&now_time_t);
        if (!time_str.empty() && time_str.back() == '\n') time_str.pop_back();
        return time_str;
    }

    std::string read_file_content(const fs::path& file_path) {
        std::ifstream file(file_path, std::ios::binary | std::ios::ate);
        if (!file.is_open()) throw std::runtime_error("Failed to open file: " + file_path.string());
        std::streamsize size = file.tellg();
        file.seekg(0, std::ios::beg);
        std::string content(size, '\0');
        file.read(content.data(), size);
        return content;
    }

    std::string read_text_file(const fs::path& file_path) {
        std::ifstream file(file_path);
        if (!file.is_open()) return "";
        std::stringstream buffer;
        buffer << file.rdbuf();
        return buffer.str();
    }

    std::vector<unsigned char> compress_data(const std::string& data) {
        uLongf compressed_size = compressBound(data.size());
        std::vector<unsigned char> compressed(compressed_size);
        if (compress(compressed.data(), &compressed_size, reinterpret_cast<const unsigned char*>(data.data()), data.size()) != Z_OK) {
            throw std::runtime_error("Compression failed.");
        }
        compressed.resize(compressed_size);
        return compressed;
    }

    std::string decompress_data(const std::vector<unsigned char>& compressed_data) {
        unsigned long uncompressed_size = compressed_data.size() * 5;
        std::string uncompressed(uncompressed_size, '\0');
        while (true) {
            int result = uncompress(reinterpret_cast<unsigned char*>(uncompressed.data()), &uncompressed_size,
                compressed_data.data(), compressed_data.size());
            if (result == Z_OK) {
                uncompressed.resize(uncompressed_size);
                return uncompressed;
            }
            else if (result == Z_BUF_ERROR) {
                uncompressed_size *= 2;
                uncompressed.resize(uncompressed_size);
            }
            else {
                throw std::runtime_error("Decompression failed.");
            }
        }
    }

    bool save_object_to_disk(const std::string& hash, const std::string& data) {
        try {
            auto compressed = compress_data(data);
            fs::path obj_dir = fs::path(".synapse") / "objects" / hash.substr(0, 2);
            if (!fs::exists(obj_dir)) fs::create_directories(obj_dir);
            std::ofstream file(obj_dir / hash.substr(2), std::ios::binary);
            if (!file.is_open()) return false;
            file.write(reinterpret_cast<const char*>(compressed.data()), compressed.size());
            return true;
        }
        catch (...) { return false; }
    }

    std::string get_system_username() {
        const char* user = std::getenv("USERNAME"); // Windows
        if (!user) user = std::getenv("USER");       // Linux / macOS
        return user ? std::string(user) : "Anonymous";
    }
}