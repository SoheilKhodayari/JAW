// #define JSON_DIAGNOSTICS 1
#include <iostream>
#include <vector>
#include <string>
#include "./json.hpp"
#include <thread>
#include <shared_mutex>
#include <mutex>

std::shared_mutex rw_mutex;

size_t isValidSubstringPosition(const std::string& str, const std::string& substring) {
    size_t pos = str.find(substring);
    if (pos == std::string::npos) {
        return std::string::npos;
    }

    bool validStart = pos == 0 || str[pos - 1] == '.' || substring.front() == '.';
    bool validEnd = pos + substring.length() == str.length() || str[pos + substring.length()] == '.' || substring.back() == '.';

    if (validStart && validEnd) {
        return pos;
    }
    return std::string::npos;
}

void processChunk(const std::vector<std::pair<std::string, std::string>>& chunk,
                  const std::vector<std::pair<std::string, std::string>>& shared_function_map_pairs, std::vector<std::pair<std::string, std::string>>& shared_new_alias_pairs) {

    for (const auto& alias_pair : chunk) {
        std::vector<std::pair<std::string, std::string>> local_pairs;
        std::vector<std::pair<std::string, std::string>> new_pairs;

        {
            std::shared_lock<std::shared_mutex> readLock(rw_mutex);
            local_pairs = shared_new_alias_pairs;
        }

        for (const auto& function_map_pair : shared_function_map_pairs) {
            size_t pos = isValidSubstringPosition(function_map_pair.first, alias_pair.first);
            if (pos != std::string::npos) {
                std::string newKey = function_map_pair.first;
                newKey.replace(pos, alias_pair.first.length(), alias_pair.second);
                new_pairs.push_back({newKey, function_map_pair.second});
            }
        }

        for (const auto& function_map_pair : local_pairs) {
            size_t pos = isValidSubstringPosition(function_map_pair.first, alias_pair.first);
            if (pos != std::string::npos) {
                std::string newKey = function_map_pair.first;
                newKey.replace(pos, alias_pair.first.length(), alias_pair.second);
                new_pairs.push_back({newKey, function_map_pair.second});
            }
        }

        // Update the shared container with the new pairs
        if (!new_pairs.empty()) {
            std::unique_lock<std::shared_mutex> writeLock(rw_mutex);
            shared_new_alias_pairs.insert(shared_new_alias_pairs.end(), new_pairs.begin(), new_pairs.end());
        }
    }
}

int main() {
    try {
        nlohmann::json aliasPairsJson;
        nlohmann::json functionMapJson;

        // Read JSON strings from stdin
        std::cin >> aliasPairsJson;
        std::cin >> functionMapJson;

        std::vector<std::pair<std::string, std::string>> alias_pairs;
        for (const auto& pair : aliasPairsJson) {
            if (pair[0].is_null() || pair[1].is_null()) {
                continue;
            }
            alias_pairs.emplace_back(pair[0].get<std::string>(), pair[1].get<std::string>());
        }

        std::vector<std::pair<std::string, std::string>> function_map_pairs;
        for (auto it = functionMapJson.begin(); it != functionMapJson.end(); ++it) {
            function_map_pairs.emplace_back(it.key(), it.key());
        }

        std::vector<std::pair<std::string, std::string>> new_alias_pairs;

        const int num_threads = std::thread::hardware_concurrency();
        std::vector<std::thread> threads;
        int chunk_size = alias_pairs.size() / num_threads;

        for (int i = 0; i < num_threads; ++i) {
            int start_idx = i * chunk_size;
            int end_idx = (i == num_threads - 1) ? alias_pairs.size() : start_idx + chunk_size;

            std::vector<std::pair<std::string, std::string>> chunk(alias_pairs.begin() + start_idx, alias_pairs.begin() + end_idx);
            threads.push_back(std::thread(processChunk, chunk, std::ref(function_map_pairs), std::ref(new_alias_pairs)));
        }

        // Join threads
        for (auto& th : threads) {
            th.join();
        }

        // Serialize and write to stdout
        nlohmann::json outputJson = new_alias_pairs;
        std::cout << outputJson.dump(0) << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}
