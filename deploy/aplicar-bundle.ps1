# ============================================================
#  Aplicar bundle del Portal SCADA  (ejecutar EN EL SERVER)
#  Detiene el servicio, descomprime el bundle y lo reinicia.
#  Uso:  click derecho > Ejecutar con PowerShell   (o)   .\aplicar-bundle.ps1
# ============================================================

$dest    = "C:\Web SQL"                       # carpeta de la app en el server
$zip     = Join-Path $dest "portal-bundle.zip" # bundle copiado desde el share
$service = "PortalSCADA"                        # nombre del servicio NSSM

if (-not (Test-Path $zip)) {
  Write-Host "ERROR: no se encontro el bundle en $zip" -ForegroundColor Red
  Write-Host "Copialo primero desde \\172.5.0.9\Web SQL\portal-bundle.zip" -ForegroundColor Yellow
  exit 1
}

$info = Get-Item $zip
Write-Host ("Bundle: {0} MB - {1}" -f [math]::Round($info.Length/1MB,1), $info.LastWriteTime) -ForegroundColor Gray

Write-Host "1/4 Deteniendo servicio $service..." -ForegroundColor Cyan
nssm stop $service

Write-Host "2/4 Descomprimiendo bundle..." -ForegroundColor Cyan
Expand-Archive -Path $zip -DestinationPath $dest -Force

Write-Host "3/4 Iniciando servicio $service..." -ForegroundColor Cyan
nssm start $service

Start-Sleep -Seconds 2
Write-Host "4/4 Estado del servicio:" -ForegroundColor Cyan
nssm status $service

Write-Host "Listo. Si dice SERVICE_RUNNING, el portal esta arriba." -ForegroundColor Green
