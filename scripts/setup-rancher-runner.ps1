#requires -RunAsAdministrator
<#
.SYNOPSIS
    Installe et enregistre un GitHub Actions self-hosted runner pour redeployer
    sur Rancher Desktop.

.DESCRIPTION
    Telecharge la derniere release du runner, le configure avec les labels
    [self-hosted, rancher-desktop] sur le repo cible, et l'installe comme
    service Windows pour qu'il demarre automatiquement.

    Prerequis :
      1. Rancher Desktop installe et demarre, container engine = dockerd (moby).
      2. PowerShell lance en Administrateur.
      3. Token de registration obtenu depuis :
         https://github.com/guillaumemaxime-boop/Application-Web/settings/actions/runners/new
         (le token expire au bout d'1h, le recuperer juste avant d'executer).

.PARAMETER Token
    Token de registration GitHub (commence par "A...", ~30 caracteres).
    Si non fourni, sera demande en interactif (saisie masquee).

.PARAMETER InstallPath
    Dossier d'installation. Defaut : C:\actions-runner

.PARAMETER RepoUrl
    URL HTTPS du repo. Defaut : https://github.com/guillaumemaxime-boop/Application-Web

.EXAMPLE
    .\setup-rancher-runner.ps1
    # Demande le token en interactif

.EXAMPLE
    .\setup-rancher-runner.ps1 -Token "AABBCC..."
#>

[CmdletBinding()]
param(
    [string]$Token,
    [string]$InstallPath = "C:\actions-runner",
    [string]$RepoUrl     = "https://github.com/guillaumemaxime-boop/Application-Web",
    [string]$RunnerName  = "$env:COMPUTERNAME-rancher",
    [string]$Labels      = "self-hosted,rancher-desktop,Windows,X64"
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok  ($msg) { Write-Host "[OK] $msg"  -ForegroundColor Green }

if (-not $Token) {
    $secure = Read-Host "Colle le token de registration GitHub" -AsSecureString
    $Token  = [System.Net.NetworkCredential]::new('', $secure).Password
}
if ([string]::IsNullOrWhiteSpace($Token)) { throw "Token vide." }

Write-Step "Verification de Rancher Desktop / Docker"
try {
    docker version --format '{{.Server.Version}}' | Out-Null
    Write-Ok "Moteur Docker accessible"
} catch {
    Write-Warning "docker introuvable ou Rancher Desktop non demarre. Le runner s'installera quand meme, mais le job redeploy-rancher echouera tant que Rancher n'est pas up."
}

Write-Step "Recuperation de la derniere version du runner"
$release = Invoke-RestMethod -Uri 'https://api.github.com/repos/actions/runner/releases/latest' `
                              -Headers @{ 'User-Agent' = 'rancher-runner-setup' }
$version = $release.tag_name.TrimStart('v')
$asset   = $release.assets | Where-Object { $_.name -like "actions-runner-win-x64-$version.zip" } | Select-Object -First 1
if (-not $asset) { throw "Asset Windows x64 introuvable dans la release $($release.tag_name)" }
Write-Ok "Version cible : $version"

if (Test-Path $InstallPath) {
    Write-Warning "$InstallPath existe deja. Si un runner y est deja configure, supprime le service avant de relancer."
} else {
    New-Item -ItemType Directory -Path $InstallPath | Out-Null
}

$zipPath = Join-Path $env:TEMP $asset.name
Write-Step "Telechargement -> $zipPath"
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath -UseBasicParsing
Write-Ok "Telecharge ($([math]::Round((Get-Item $zipPath).Length/1MB,1)) MB)"

Write-Step "Extraction -> $InstallPath"
Expand-Archive -Path $zipPath -DestinationPath $InstallPath -Force
Remove-Item $zipPath -Force
Write-Ok "Extrait"

Push-Location $InstallPath
try {
    Write-Step "Configuration du runner ($RunnerName, labels: $Labels)"
    & .\config.cmd `
        --url $RepoUrl `
        --token $Token `
        --name $RunnerName `
        --labels $Labels `
        --work '_work' `
        --unattended `
        --replace
    if ($LASTEXITCODE -ne 0) { throw "config.cmd a echoue (code $LASTEXITCODE)" }
    Write-Ok "Runner enregistre"

    Write-Step "Installation du service Windows"
    & .\svc.cmd install
    if ($LASTEXITCODE -ne 0) { throw "svc.cmd install a echoue (code $LASTEXITCODE)" }

    Write-Step "Demarrage du service"
    & .\svc.cmd start
    if ($LASTEXITCODE -ne 0) { throw "svc.cmd start a echoue (code $LASTEXITCODE)" }
    Write-Ok "Service demarre"
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Runner '$RunnerName' actif. Verifie ici :" -ForegroundColor Green
Write-Host "  $RepoUrl/settings/actions/runners" -ForegroundColor Yellow
Write-Host ""
Write-Host "Pour le desinstaller plus tard :" -ForegroundColor DarkGray
Write-Host "  cd $InstallPath; .\svc.cmd stop; .\svc.cmd uninstall; .\config.cmd remove --token <REMOVAL_TOKEN>" -ForegroundColor DarkGray
