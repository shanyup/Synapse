#include "Engine/Diff.hpp"
#include "Engine/Staging.hpp"
#include "Core/Utils.hpp"
#include <sha1.hpp>
#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <unordered_map>
#include <algorithm>

namespace Synapse::Engine {

    struct DiffLine {
        char type; // ' ', '-', '+'
        std::string text;
    };

    // Simple LCS-based line diff
    static std::vector<DiffLine> compute_diff(const std::vector<std::string>& old_lines, const std::vector<std::string>& new_lines) {
        size_t n = old_lines.size();
        size_t m = new_lines.size();
        std::vector<std::vector<int>> dp(n + 1, std::vector<int>(m + 1, 0));

        for (size_t i = 1; i <= n; ++i) {
            for (size_t j = 1; j <= m; ++j) {
                if (old_lines[i - 1] == new_lines[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = std::max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        std::vector<DiffLine> diff;
        size_t i = n, j = m;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && old_lines[i - 1] == new_lines[j - 1]) {
                diff.push_back({ ' ', old_lines[i - 1] });
                i--;
                j--;
            } else if (j > 0 && (i == 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                diff.push_back({ '+', new_lines[j - 1] });
                j--;
            } else {
                diff.push_back({ '-', old_lines[i - 1] });
                i--;
            }
        }
        std::reverse(diff.begin(), diff.end());
        return diff;
    }

    static std::vector<std::string> split_lines(const std::string& str) {
        std::vector<std::string> lines;
        std::string line;
        std::stringstream ss(str);
        while (std::getline(ss, line)) {
            if (!line.empty() && line.back() == '\r') {
                line.pop_back();
            }
            lines.push_back(line);
        }
        return lines;
    }

    static std::string get_staged_content(const std::string& hash) {
        fs::path blob_path = fs::path(".synapse") / "objects" / hash.substr(0, 2) / hash.substr(2);
        if (!fs::exists(blob_path)) return "";
        try {
            std::string raw_compressed = Core::read_file_content(blob_path);
            std::vector<unsigned char> compressed_vec(raw_compressed.begin(), raw_compressed.end());
            std::string decompressed = Core::decompress_data(compressed_vec);
            size_t null_pos = decompressed.find('\0');
            if (null_pos == std::string::npos) return "";
            return decompressed.substr(null_pos + 1);
        }
        catch (...) {
            return "";
        }
    }

    static std::string get_local_hash(const fs::path& file_path, bool is_lfs) {
        try {
            if (!fs::exists(file_path)) return "";
            std::string file_content = Core::read_file_content(file_path);
            std::string store_data;
            if (is_lfs) {
                SHA1 content_checksum;
                content_checksum.update(file_content);
                std::string raw_hash = content_checksum.final();
                std::string pointer_content = "synapse-lfs-v1\noid sha1:" + raw_hash + "\nsize " + std::to_string(file_content.size()) + "\n";
                std::string header = "blob " + std::to_string(pointer_content.size()) + '\0';
                store_data = header + pointer_content;
            } else {
                std::string header = "blob " + std::to_string(file_content.size()) + '\0';
                store_data = header + file_content;
            }
            SHA1 checksum;
            checksum.update(store_data);
            return checksum.final();
        }
        catch (...) {
            return "";
        }
    }

    void show_diff(const std::string& target_path) {
        fs::path index_path = fs::path(".synapse") / "index";
        if (!fs::exists(index_path)) {
            std::cout << "No staged files in index. Staging is empty.\n";
            return;
        }

        // Normalize target path if provided
        std::string norm_target = target_path;
        for (char& c : norm_target) {
            if (c == '\\') c = '/';
        }

        // Read index
        std::unordered_map<std::string, std::string> index_files;
        std::ifstream file(index_path);
        std::string line;
        while (std::getline(file, line)) {
            if (line.length() > 41) {
                std::string hash = line.substr(0, 40);
                std::string path = line.substr(41);
                index_files[path] = hash;
            }
        }
        file.close();

        // If specific path requested, filter index
        std::vector<std::pair<std::string, std::string>> files_to_diff;
        if (!norm_target.empty()) {
            auto it = index_files.find(norm_target);
            if (it != index_files.end()) {
                files_to_diff.push_back(*it);
            } else {
                // Check if target is untracked (exists on disk but not in index)
                if (fs::exists(norm_target) && fs::is_regular_file(norm_target)) {
                    std::cout << "\033[1mdiff --git a/" << norm_target << " b/" << norm_target << "\033[0m\n";
                    std::cout << "new file mode 100644\n";
                    std::cout << "--- /dev/null\n";
                    std::cout << "+++ b/" << norm_target << "\n";
                    if (is_lfs_file(norm_target)) {
                        std::cout << "Binary file (LFS) differs\n";
                    } else {
                        std::string content = Core::read_file_content(norm_target);
                        auto lines = split_lines(content);
                        for (const auto& l : lines) {
                            std::cout << "\033[32m+" << l << "\033[0m\n";
                        }
                    }
                    return;
                }
                std::cerr << "Path " << target_path << " is not tracked by Synapse.\n";
                return;
            }
        } else {
            // Sort by file name to make diff predictable and clean
            for (const auto& pair : index_files) {
                files_to_diff.push_back(pair);
            }
            std::sort(files_to_diff.begin(), files_to_diff.end());
        }

        bool has_changes = false;

        for (const auto& [path, staged_hash] : files_to_diff) {
            fs::path local_path(path);
            bool lfs = is_lfs_file(local_path);

            if (!fs::exists(local_path)) {
                // File deleted locally
                has_changes = true;
                std::cout << "\033[1mdiff --git a/" << path << " b/" << path << "\033[0m\n";
                std::cout << "deleted file mode 100644\n";
                std::cout << "--- a/" << path << "\n";
                std::cout << "+++ /dev/null\n";
                if (lfs) {
                    std::cout << "Binary file (LFS) differs (deleted)\n";
                } else {
                    std::string staged_content = get_staged_content(staged_hash);
                    auto lines = split_lines(staged_content);
                    for (const auto& l : lines) {
                        std::cout << "\033[31m-" << l << "\033[0m\n";
                    }
                }
                continue;
            }

            // Compare local hash to staged hash
            std::string local_hash = get_local_hash(local_path, lfs);
            if (local_hash != staged_hash) {
                has_changes = true;
                std::cout << "\033[1mdiff --git a/" << path << " b/" << path << "\033[0m\n";
                std::cout << "--- a/" << path << "\n";
                std::cout << "+++ b/" << path << "\n";
                if (lfs) {
                    std::cout << "Binary files differ\n";
                } else {
                    std::string staged_content = get_staged_content(staged_hash);
                    std::string local_content = Core::read_file_content(local_path);

                    auto old_lines = split_lines(staged_content);
                    auto new_lines = split_lines(local_content);

                    auto diff = compute_diff(old_lines, new_lines);
                    for (const auto& line : diff) {
                        if (line.type == '+') {
                            std::cout << "\033[32m+" << line.text << "\033[0m\n";
                        } else if (line.type == '-') {
                            std::cout << "\033[31m-" << line.text << "\033[0m\n";
                        } else {
                            std::cout << " " << line.text << "\n";
                        }
                    }
                }
            }
        }

        if (!has_changes && norm_target.empty()) {
            std::cout << "No unstaged changes compared to staging index.\n";
        }
    }
}
