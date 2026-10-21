# ============================================================
#  Aplicar bundle del Portal SCADA  (ejecutar EN EL SERVER)
#  Detiene el servicio, descomprime el bundle y lo reinicia.
#  IMPORTANTE: ejecutar como Administrador (click derecho > Ejecutar como admin).
#  Uso:  .\aplicar-bundle.ps1
# ============================================================

$dest    = "C:\Web SQL"                         # carpeta de la app en el server
$zip     = Join-Path $dest "portal-bundle.zip"   # bundle copiado desde el share
$service = "PortalSCADA"                          # nombre del servicio

if (-not (Test-Path $zip)) {
  Write-Host "ERROR: no se encontro el bundle en $zip" -ForegroundColor Red
  Write-Host "Copialo primero desde \\172.5.0.9\Web SQL\portal-bundle.zip" -ForegroundColor Yellow
  exit 1
}

$info = Get-Item $zip
Write-Host ("Bundle: {0} MB - {1}" -f [math]::Round($info.Length/1MB,1), $info.LastWriteTime) -ForegroundColor Gray

# 1) Detener el servicio (cmdlet nativo de Windows: no necesita nssm en el PATH).
Write-Host "1/4 Deteniendo servicio $service..." -ForegroundColor Cyan
Stop-Service -Name $service -Force -ErrorAction SilentlyContinue
try {
  (Get-Service -Name $service).WaitForStatus('Stopped', '00:00:30')
} catch {
  Write-Host "ADVERTENCIA: el servicio no llego a 'Stopped' en 30s. Revisar permisos (admin)." -ForegroundColor Yellow
}

# 2) Descomprimir sobre la carpeta de la app (el .env NO esta en el ZIP, se conserva).
Write-Host "2/4 Descomprimiendo bundle..." -ForegroundColor Cyan
Expand-Archive -Path $zip -DestinationPath $dest -Force

# 3) Iniciar el servicio.
Write-Host "3/4 Iniciando servicio $service..." -ForegroundColor Cyan
Start-Service -Name $service

# 4) Estado final.
Start-Sleep -Seconds 2
Write-Host "4/4 Estado del servicio:" -ForegroundColor Cyan
Get-Service -Name $service | Format-Table Name, Status, StartType -AutoSize

$st = (Get-Service -Name $service).Status
if ($st -eq 'Running') {
  Write-Host "OK: el portal esta arriba (Running)." -ForegroundColor Green
} else {
  Write-Host "ATENCION: el servicio quedo en estado '$st'. Revisar logs." -ForegroundColor Red
}
