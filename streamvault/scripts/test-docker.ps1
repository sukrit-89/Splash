$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$cmd = @(
  "run", "--rm",
  "-v", "${PWD}:/work",
  "-v", "streamvault-cargo-registry:/usr/local/cargo/registry",
  "-v", "streamvault-cargo-git:/usr/local/cargo/git",
  "-v", "streamvault-target:/work/target",
  "-w", "/work",
  "rust:1-bullseye",
  "/usr/local/cargo/bin/cargo", "test",
  "--workspace",
  "--target", "x86_64-unknown-linux-gnu"
)

Write-Host "Running cached Docker tests for Splash contracts..." -ForegroundColor Cyan
docker @cmd
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker tests failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}
