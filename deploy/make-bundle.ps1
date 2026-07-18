# Arma un ZIP listo-para-desplegar y lo deja en el servidor OFFLINE.
# Corre EN TU MÁQUINA. Empaqueta backend (código + node_modules) + frontend/dist
# + deploy (nssm, scripts) + docs en UN SOLO archivo, que cruza la red rápido.
# En el server se descomprime (ver DEPLOY.md).  Uso:  .\deploy\make-bundle.ps1
#
# Requisito: `npm install` en backend y `npm run build` en frontend hechos.

$ErrorActionPreference = 'Stop'
$root  = Split-Path $PSScriptRoot -Parent
$stage = Join-Path $env:TEMP 'portal_stage'
$zip   = Join-Path $env:TEMP 'portal-bundle.zip'
$dest  = '\\172.5.0.9\Web SQL\portal-bundle.zip'

if (-not (Test-Path "$root\backend\node_modules")) { throw "Falta backend\node_modules (npm install)" }
if (-not (Test-Path "$root\frontend\dist"))        { throw "Falta frontend\dist (npm run build)" }

# 1) Staging local (rápido) con solo lo necesario, sin .env ni .git.
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
$flags = '/E','/NFL','/NDL','/NJH','/NJS','/NP','/R:1','/W:1'
robocopy "$root\backend"        "$stage\backend"        @flags /XF ".env" /XD ".git" | Out-Null
robocopy "$root\frontend\dist"  "$stage\frontend\dist"  @flags | Out-Null
robocopy "$root\deploy"         "$stage\deploy"         @flags /XF "portal-bundle.zip" | Out-Null
Copy-Item "$root\DEPLOY.md","$root\README.md","$root\CLAUDE.md" $stage -Force

# 2) Comprimir (un solo archivo).
if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip)
$mb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "ZIP armado: $zip ($mb MB)" -ForegroundColor Cyan

# 3) Copiar el ZIP al servidor (una sola transferencia por la red).
if (-not (Test-Path (Split-Path $dest))) { throw "No se llega a \\172.5.0.9\Web SQL (¿en la red interna?)" }
Copy-Item $zip $dest -Force
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "==> Copiado a $dest" -ForegroundColor Green
Write-Host "    En el server: descomprimir ese ZIP (ver DEPLOY.md, seccion C)." -ForegroundColor Yellow
