cmake_minimum_required(VERSION 3.10)
project(Synapse)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

if(MSVC)
    set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
endif()

add_executable(synapse 
    main.cpp 
    src/Core/Utils.cpp
    src/Engine/Repository.cpp
    src/Engine/Staging.cpp
    src/Engine/History.cpp
    src/Engine/Locking.cpp
    src/Engine/Branches.cpp
    src/Engine/Diff.cpp
    libs/miniz/miniz.c
)

target_include_directories(synapse PRIVATE 
    include
    libs/miniz
    libs/sha1
)