$binariesDir = "gui\src-tauri\binaries"
if (!(Test-Path $binariesDir)) {
    Write-Host "Creating binaries directory: $binariesDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $binariesDir | Out-Null
}

$sourceExe = "out\build\x64-Debug\Debug\synapse.exe"
$targetExe = "$binariesDir\synapse-x86_64-pc-windows-msvc.exe"

Write-Host "1. Building C++ Synapse Engine..." -ForegroundColor Cyan
try {
    & "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe" --build out/build/x64-Debug --target synapse
} catch {
    Write-Host "Warning: CMake build failed. Checking if existing binary is available..." -ForegroundColor Yellow
}

if (Test-Path $sourceExe) {
    Write-Host "2. Copying C++ binary to Tauri sidecar: $targetExe" -ForegroundColor Cyan
    Copy-Item -Path $sourceExe -Destination $targetExe -Force
    Write-Host "Success! Sidecar binary updated and ready." -ForegroundColor Green
} else {
    Write-Error "Error: synapse.exe not found at $sourceExe."
    exit 1
}
