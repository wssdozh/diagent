# diagent synchronization script for Windows / PowerShell
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Force,
    [string]$DshHome = "$env:USERPROFILE\.dsh"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Write-Host "=== diagent Sync ===" -ForegroundColor Cyan
Write-Host "Repository root: $RepoRoot"
Write-Host "Target DSH Home: $DshHome"

# 1. Проверка DSH Home
if (-not (Test-Path $DshHome)) {
    Write-Warning "DSH home not found at $DshHome. Skipping DSH-specific linking."
} else {
    $TargetSkills = Join-Path $DshHome "skills"
    if (-not (Test-Path $TargetSkills)) {
        New-Item -ItemType Directory -Path $TargetSkills -Force | Out-Null
    }

    # 2. Симлинки авторских навыков в ~/.dsh/skills
    $SourceSkills = Join-Path $RepoRoot "skills"
    $SkillDirs = Get-ChildItem -Path $SourceSkills -Directory

    Write-Host "`n[1/3] Linking skills to ~/.dsh/skills (using Junctions)..." -ForegroundColor Yellow
    foreach ($skill in $SkillDirs) {
        $dest = Join-Path $TargetSkills $skill.Name
        if (Test-Path $dest) {
            $item = Get-Item $dest
            if ($item.LinkType -in @("SymbolicLink", "Junction")) {
                Write-Host "  [OK] $($skill.Name) (already linked)" -ForegroundColor DarkGray
                continue
            }
            if ($Force) {
                Write-Host "  [OVERWRITE] $($skill.Name) with junction" -ForegroundColor Yellow
                if (-not $DryRun) {
                    Remove-Item -Path $dest -Recurse -Force
                    New-Item -ItemType Junction -Path $dest -Target $skill.FullName | Out-Null
                }
            } else {
                Write-Host "  [SKIP] $($skill.Name) exists (use -Force to replace with junction)" -ForegroundColor DarkYellow
            }
        } else {
            Write-Host "  [LINK] $($skill.Name) -> $dest" -ForegroundColor Green
            if (-not $DryRun) {
                New-Item -ItemType Junction -Path $dest -Target $skill.FullName | Out-Null
            }
        }
    }

    # 3. Линковка preset-for-you в профиль web
    Write-Host "`n[2/3] Checking DSH preset registration..." -ForegroundColor Yellow
    $WebPkg = Join-Path $DshHome "profiles\web\package.json"
    $PresetForYouPath = (Join-Path $RepoRoot "agents\dsh\presets\for-you").Replace("\", "/")
    
    if (Test-Path $WebPkg) {
        $pkgJson = Get-Content -Path $WebPkg -Raw | ConvertFrom-Json
        $wantedLink = "link:$PresetForYouPath"
        $currentDep = $pkgJson.dependencies.'@local/dsh-preset-for-you'

        if ($currentDep -ne $wantedLink) {
            Write-Host "  [UPDATE] Updating @local/dsh-preset-for-you path in $WebPkg" -ForegroundColor Green
            if (-not $DryRun) {
                $pkgJson.dependencies.'@local/dsh-preset-for-you' = $wantedLink
                $pkgJson | ConvertTo-Json -Depth 10 | Set-Content -Path $WebPkg -Encoding utf8
                Write-Host "  [OK] package.json updated." -ForegroundColor Green
            }
        } else {
            Write-Host "  [OK] preset-for-you already linked correctly." -ForegroundColor DarkGray
        }
    } else {
        Write-Host "  [SKIP] web profile package.json not found." -ForegroundColor DarkGray
    }
}

# 4. Проверка секретов
Write-Host "`n[3/3] Checking .env configuration..." -ForegroundColor Yellow
$EnvFile = Join-Path $RepoRoot ".env"
$EnvExample = Join-Path $RepoRoot ".env.example"

if (-not (Test-Path $EnvFile)) {
    Write-Warning "File .env does not exist. Copying from .env.example..."
    if (-not $DryRun) {
        Copy-Item -Path $EnvExample -Destination $EnvFile
        Write-Host "Created .env. Remember to fill in your private API keys." -ForegroundColor Cyan
    }
} else {
    Write-Host "  [OK] .env exists." -ForegroundColor DarkGray
}

Write-Host "`nSync completed successfully." -ForegroundColor Cyan
