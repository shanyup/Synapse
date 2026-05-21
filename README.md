# 🧬 Synapse

Synapse is a lightweight version control system (VCS) written in C++17, based on Git architecture and working principles. It is specifically designed to meet the large data and workflow needs of game developers and Unreal Engine / Unity projects.

The open-source core (Stable Core v1.0.0) contains all the fundamental features required to function as an independent version control system.

---

## ✨ Features (v1.0.0 Stable Core)

*   📁 **Smart Repository Initialization (`init`)**: Sets up the `.synapse` database directory and creates specialized `.synapseignore` templates tailored for game engines (Unreal Engine, Unity, C++).
*   👤 **Custom Identity Configuration (`config`)**: Configures the author identity displayed in commit history. If not configured, it dynamically resolves the operating system's local username.
*   🔍 **Advanced Status Analysis (`status`)**: Compares staging and disk changes to display added, modified, and deleted files in a color-coded terminal format.
*   💾 **Zlib-Compressed Object Store**: Hashes file contents using SHA-1 and compresses them using Zlib, safely storing them inside `.synapse/objects`.
*   🚀 **Relational History Management (`commit` & `log`)**: Creates commit and tree objects to maintain the repository timeline. The log command prints commit details with short and long hashes.
*   ⏳ **Stable Version Checkout (`checkout`)**: Time travels to any version by clearing untracked files, restoring versioned files, and updating the staging index and branch references.

---

## 🛠️ Build Instructions

To build Synapse, you need a C++17 compatible compiler and CMake (min. 3.10).

```bash
# 1. Clone the repository
git clone https://github.com/your_username/Synapse.git
cd Synapse

# 2. Create build directory
mkdir build
cd build

# 3. Configure and build the project
cmake ..
cmake --build . --config Release
```

Once the build is complete, the executable `synapse` binary will be ready.

---

## 🚀 Quick Start & Usage Guide

### 1. Initialize a New Repository
Go to your project directory and initialize the repository with an Unreal Engine ignore template:
```bash
synapse init ue
```

### 2. Configure Your Username
Set your name for commit records (if left unconfigured, your OS username will be used automatically):
```bash
synapse config "Your Name"
```

### 3. Stage Files
Add your changes to the staging area:
```bash
synapse add .
```

### 4. Check Status
See which files are modified, deleted, or untracked:
```bash
synapse status
```

### 5. Commit Changes
Save your staged files as a version:
```bash
synapse commit -m "Initial commit: Set up Unreal project"
```

### 6. View History
List all commits in the repository:
```bash
synapse log
```

### 7. Checkout a Commit
Restore the project state using a short or long commit hash:
```bash
synapse checkout 84347c5
```

---

## 📅 Roadmap & Future Plans

Our roadmap to transition Synapse from a lightweight Git clone into a next-generation version control ecosystem tailored for game studios:

### 🚀 PHASE 1: Core Engine & Stability Updates
*   📦 **Large File Storage (Synapse LFS)**: Avoid compressing large binaries (FBX, WAV, TGA, UASSET, etc.) and save them directly in `.synapse/large_media/`, storing only SHA-1 pointer files in the object store.
*   🔒 **In-Editor File Locking**: Create a central `.synapse/locks.json` database and add `synapse lock <path>` and `synapse unlock <path>` commands to prevent multi-user edit conflicts (exclusive checkouts).
*   🌿 **Branch Management**: Introduce branch creation (`synapse branch <name>`) and logic to switch branches safely under `.synapse/refs/heads/`.
*   🏢 **Multi-Project Workspace Support**: Enable a single Synapse client or UI to track and manage multiple independent repositories simultaneously.

### 🎨 PHASE 2: User Experience & Desktop GUI
*   ⚙️ **Dynamic Link Library (DLL)**: Build the `Synapse::Engine` core as a shared library (`.dll` / `.so`) for third-party integrations.
*   💻 **Desktop Application (GUI)**: Create a lightweight, high-performance desktop interface (e.g., Qt, wxWidgets, or Dear ImGui) for artists and designers to visualize changes, stage, and commit with one click.
*   🏷️ **Semantic Commits**: Introduce templates like `bug-fix`, `feature`, `refactor`, and `asset-add` in both CLI and GUI with smart filtering in logs.

### 🎮 PHASE 3: Deep Unreal Engine Integration
*   🔌 **In-Editor Source Control Plugin**: Develop a C++ source control provider plugin for Unreal Engine, triggering DLL actions directly from the Editor UI.
*   📊 **Visual Blueprint Diff**: A tool to analyze binary `.uasset` (Blueprint) files and visually/textually summarize node and variable changes between versions.
*   🛡️ **Automatic Redirector Fixer**: Run the Unreal `FixUpRedirectors` commandlet automatically before staging to prevent broken asset references.
*   🧹 **Workspace Optimization (`synapse clean`)**: A cleanup tool to wipe transient folders (`Intermediate`, `Saved`, `DerivedDataCache`).

### 💎 PHASE 4: Studio Pipeline & Collaboration (Vision)
*   🗺️ **Actor-Level Locking**: Leverage World Partitioning to lock specific actors in a level rather than locking the entire `.umap` file.
*   📐 **Asset Pre-Commit Validator**: Check mesh polycounts and texture sizes against studio guidelines before allowing a commit.
*   🛠️ **C++ Project Wizard**: Re-generate Visual Studio solutions (`.sln`) automatically using `UnrealVersionSelector` after checking out C++ changes.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
