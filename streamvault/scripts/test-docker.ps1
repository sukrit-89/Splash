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
  "-p", "streamvault",
  "--target", "x86_64-unknown-linux-gnu"
)

Write-Host "Running cached Docker tests for StreamVault..." -ForegroundColor Cyan
docker @cmd
