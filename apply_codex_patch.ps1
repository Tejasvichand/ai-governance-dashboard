# apply_codex_patch.ps1
param(
    [string]$RepoPath,
    [string]$PatchFile
)

if (-Not (Test-Path $RepoPath -PathType Container)) {
    Write-Error "Repository path '$RepoPath' does not exist."
    exit 1
}

if (-Not (Test-Path $PatchFile -PathType Leaf)) {
    Write-Error "Patch file '$PatchFile' does not exist."
    exit 1
}

Set-Location -Path $RepoPath

Write-Host "Checking git status..."
git status

Write-Host "Applying patch: $PatchFile"
git apply --stat $PatchFile

$checkResult = git apply --check $PatchFile 2>&1

if ($LASTEXITCODE -eq 0) {
    git apply $PatchFile
    Write-Host "Patch applied successfully."

    Write-Host "You may want to review changes:"
    git diff

    Write-Host "If all good, commit changes:"
    Write-Host "  git add ."
    Write-Host "  git commit -m 'Apply Codex-generated patch'"
} else {
    Write-Error "Patch failed to apply cleanly. Please review conflicts manually."
    Write-Error $checkResult
    exit 1
}
