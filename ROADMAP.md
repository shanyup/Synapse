# Synapse Engine - Development Roadmap & TODO

This document outlines the development phases and TODO list for transitioning Synapse from a simple Git clone into a **"Next-Generation Version Control Ecosystem for Game Developers and Unreal Engine"**.

---

## 📅 PHASE 1: Core Engine & Stability Updates (v1.1.0)
*This phase focuses on core features required to manage large assets in game projects and make the system suitable for teamwork.*

- [ ] **Large File Storage (Synapse LFS)**
  - File size and extension check during `hash_object` (FBX, WAV, TGA, UASSET, etc.).
  - Move large binary files directly to the `.synapse/large_media/` directory without compression.
  - Save 3-line metadata pointer files (SHA-1 hash, size, etc.) in the object store (`.synapse/objects`) instead.
- [ ] **In-Editor File Locking**
  - Establish a central lock database: `.synapse/locks.json`.
  - Add `synapse lock <path>` and `synapse unlock <path>` commands to the core engine.
  - Prevent editing, staging, or committing assets locked by another developer (Exclusive Checkout).
- [ ] **Branch Management**
  - Implement branch files under `.synapse/refs/heads/` (`synapse branch <name>`).
  - Implement switching between branches (`synapse checkout <branch_name>`).
- [ ] **Multi-Project Workspace Support**
  - Support workspaces to enable a single Synapse client/UI to monitor and manage multiple independent repositories at once.

---

## 🎨 PHASE 2: User Experience & Desktop GUI (v1.2.0)
*Building the visual application layer so that non-programming artists, designers, and producers can use the system without the command line.*

- [ ] **Shared Engine Library (DLL)**
  - Package the `Synapse::Engine` layer as a dynamic link library (`.dll` / `.so`).
- [ ] **Desktop Application (GUI)**
  - Build a lightweight and high-performance desktop interface (e.g., using Qt, wxWidgets, or Dear ImGui).
  - Show modified/staged/untracked files dynamically with single-click commit buttons.
- [ ] **Semantic Commits**
  - Introduce commit templates (`bug-fix`, `feature`, `refactor`, `asset-add`) in CLI/GUI.
  - Implement smart filtering and grouping in the log viewer based on semantic types.
- [ ] **Single-Click Installer (.exe Wizard)**
  - Provide a standard Windows installer (`.exe`) compiled using Inno Setup or NSIS.

---

## 🎮 PHASE 3: Unreal Engine Deep Integration (v2.0.0)
*Integrating Synapse directly into the Unreal Engine Editor to streamline source control without leaving the engine workspace.*

- [ ] **Unreal Engine Editor Source Control Plugin**
  - Write a native source control provider plugin using Unreal Engine's C++ Source Control API.
  - Bind lock/unlock, check-in, and status sync directly to Unreal's Editor context menus.
- [ ] **Visual Blueprint Diff**
  - Extract and summarize node and variable differences between binary Blueprint `.uasset` files.
- [ ] **Automatic "Fix Up Redirectors" Shield**
  - Trigger Unreal's `FixUpRedirectors` commandlet automatically before staging to prevent broken asset references.
- [ ] **Transient Directory Clean (`synapse clean`)**
  - A utility tool to automatically purge intermediate and cache directories (`Intermediate`, `Saved`, `DerivedDataCache`).
- [ ] **UProject Version Matcher**
  - Prevent users from opening projects with conflicting engine versions by tracking the `.uproject` file's `EngineAssociation`.

---

## 🚀 PHASE 4: Studio Pipeline & Collaboration (Vision)
*Advanced tools to optimize production throughput and asset quality for larger teams.*

- [ ] **Actor-Level Locking**
  - Integrate with Unreal's World Partitioning to lock specific actors in a map rather than locking the entire `.umap` file.
- [ ] **Asset Polycount & Size Validator (Pre-Commit Hook)**
  - Check mesh vertex counts and texture dimensions before commits to enforce art budget constraints.
- [ ] **C++ IDE Solution Generator**
  - Automatically invoke `UnrealVersionSelector` after checks to refresh the Visual Studio solution (`.sln`) file.
- [ ] **LAN-Based Build Artifact Caching**
  - Distribute package builds locally instead of uploading binaries to the primary repository.
- [ ] **Blueprint Git-Gutter Overlay**
  - Glow altered but uncommitted Blueprint nodes in the graph editor to provide visual feedback.
- [ ] **Live Collaboration Notifications**
  - Display non-intrusive notifications in the editor overlay when team members push commits or lock files.

---

## 🛠️ CURRENT CORE STATUS (v1.0.0 - STABLE CORE)
- [x] `init`: Repository database structure and `.synapseignore` engine templates.
- [x] `hash-object`: SHA-1 content hashing and object storage.
- [x] `add`: Recursive file scanning, rule matching, and Windows/Linux path normalization.
- [x] `commit`: Chronological commit creation, Zlib compression, and duplicate checkout checks.
- [x] `log`: Chronological parent-chain commit listing.
- [x] `checkout`: Restores database blobs to workspace and aligns staging index and branch references.
- [x] `status`: Live workspace-to-index diff with colorized CLI output.
