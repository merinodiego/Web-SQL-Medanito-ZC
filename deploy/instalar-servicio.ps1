#Requires -RunAsAdministrator
# Instala/reinstala el portal como servicio de Windows con NSSM.
# Ejecutar EN EL SERVIDOR, en PowerShell COMO ADMINISTRADOR, desde la carpeta
# del proyecto (ej. C:\Web SQL):   .\deploy\instalar-servicio.ps1
#
# El servicio arranca solo al encender el server y sobrevive el cierre de RDP.

$ErrorActionPreference = 'Stop'
$svc  = 'PortalSCADA'
$root = Split-Path $PSScriptRoot -Parent        # carpeta del proyecto
$nssm = Join-Path $root 'deploy\nssm.exe'
$app  = Join-Path $root 'backend\index.js'
$dir  = Join-Path $root 'backend'
$logs = Join-Path $root 'logs'
$node = (Get-Command node -ErrorAction Stop).Source

if (-not (Test-Path $nssm)) { throw "No encuentro nssm.exe en $nssm" }
if (-not (Test-Path $app))  { throw "No encuentro el backend en $app" }

# El puerto 4000 no debe estar ocupado por una instancia a mano.
if (Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue) {
  throw 'El puerto 4000 esta en uso. Cerra la ventana del portal (Iniciar-Portal.bat) antes de instalar el servicio.'
}

New-Item -ItemType Directory -Force -Path $logs | Out-Null

# Si el servicio ya existe, lo detengo y reinstalo limpio.
& $nssm status $svc 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Host "El servicio $svc ya existe: lo reinstalo..." -ForegroundColor Yellow
  & $nssm stop $svc | Out-Null
  Start-Sleep -Seconds 2
  & $nssm remove $svc confirm | Out-Null
  Start-Sleep -Seconds 1
}

# Se pasa index.js RELATIVO + AppDirectory=backend: así el path del script no
# lleva espacios en la línea de comando del servicio (el espacio de "Web SQL"
# rompía el arranque si se pasaba la ruta absoluta como parámetro).
& $nssm install $svc $node 'index.js'
& $nssm set $svc AppDirectory $dir
& $nssm set $svc DisplayName 'Portal de Datos SCADA'
& $nssm set $svc Description 'Portal web interno de datos SCADA (solo lectura)'
& $nssm set $svc Start SERVICE_AUTO_START
& $nssm set $svc AppStdout (Join-Path $logs 'portal.log')
& $nssm set $svc AppStderr (Join-Path $logs 'portal.err.log')
& $nssm set $svc AppRotateFiles 1
& $nssm set $svc AppRotateBytes 5242880
& $nssm start $svc
Start-Sleep -Seconds 3

Write-Host "--- estado ---" -ForegroundColor Cyan
& $nssm status $svc
Write-Host "Listo. Probar http://localhost:4000 y http://172.5.0.9:4000" -ForegroundColor Green
Write-Host "Gestion:  nssm restart|stop|start|status PortalSCADA" -ForegroundColor DarkGray
