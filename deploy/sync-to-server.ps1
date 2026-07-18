# Sincroniza la versión lista-para-correr hacia el servidor OFFLINE (sin internet).
# Se ejecuta EN TU MÁQUINA (la que tiene internet). Copia por la red LAN a la
# carpeta compartida del servidor lo que hace falta para EJECUTAR el portal:
# código del backend + node_modules + frontend ya compilado (dist).
#
# NO copia: .env (las credenciales del server se quedan en el server), .git, node
# temporales. Uso:  .\deploy\sync-to-server.ps1
#
# Requisito previo (en tu máquina): haber corrido `npm install` en backend y
# `npm run build` en frontend (el script lo verifica y avisa).

$ErrorActionPreference = 'Stop'
$dest = '\\172.5.0.9\Web SQL'
$root = Split-Path $PSScriptRoot -Parent

if (-not (Test-Path "$root\backend\node_modules")) {
  throw "Falta backend\node_modules. Corré:  cd backend ; npm install"
}
if (-not (Test-Path "$root\frontend\dist")) {
  throw "Falta frontend\dist. Corré:  cd frontend ; npm run build"
}
if (-not (Test-Path $dest)) {
  throw "No se llega al servidor $dest (¿estás en la red interna?)"
}

# Backend: todo el código + node_modules, EXCLUYENDO el .env del servidor.
# /E = subcarpetas, /XF .env = nunca pisar credenciales, /XD .git = sin repo git.
Write-Host "==> Copiando backend (código + node_modules)..." -ForegroundColor Cyan
robocopy "$root\backend" "$dest\backend" /E /XF ".env" /XD ".git" /NFL /NDL /NJH /NJS /NP

# Frontend compilado: solo dist (el server no necesita el código fuente ni build).
# /MIR = espejo, para limpiar archivos viejos de builds anteriores.
Write-Host "==> Copiando frontend\dist (portal compilado)..." -ForegroundColor Cyan
robocopy "$root\frontend\dist" "$dest\frontend\dist" /MIR /NFL /NDL /NJH /NJS /NP

# Documentación y scripts de despliegue.
Write-Host "==> Copiando docs y scripts de deploy..." -ForegroundColor Cyan
robocopy "$root\deploy" "$dest\deploy" /E /NFL /NDL /NJH /NJS /NP
Copy-Item "$root\DEPLOY.md","$root\README.md" $dest -Force

# robocopy usa códigos de salida 0-7 para éxito (8+ = error real).
if ($LASTEXITCODE -ge 8) { throw "robocopy reportó errores (código $LASTEXITCODE)" }
Write-Host "==> Sincronización OK. El servidor tiene la última versión." -ForegroundColor Green
Write-Host "    Reiniciá el servicio en el server (nssm restart PortalSCADA) para aplicar." -ForegroundColor Yellow
