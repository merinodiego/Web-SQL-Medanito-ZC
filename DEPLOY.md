# Despliegue en servidor de Intranet OFFLINE (Windows)

El servidor `172.5.0.9` **no tiene internet ni acceso a GitHub**. Por eso todo lo
que requiere internet (`npm install`, build del frontend, backup a GitHub) se hace
en **tu máquina de desarrollo**, y al servidor se le **copian los archivos ya
listos** por la red interna (LAN).

## Modelo de trabajo

```
TU MÁQUINA (con internet)                 SERVIDOR 172.5.0.9 (sin internet)
  ├─ desarrollo + pruebas                   └─ SOLO ejecuta el portal
  ├─ npm install / npm run build               (Node + node_modules + dist,
  ├─ backup → GitHub                            todo copiado desde tu máquina)
  └─ copiar ─────────LAN─────────►  \\172.5.0.9\Web SQL
```

Un **único proceso Node** sirve la API **y** el frontend compilado, corriendo como
**servicio de Windows** (arranca solo con el server, sin usuario logueado).

```
Navegador del cliente ──HTTP──► http://172.5.0.9
                                     │
                          Node/Express (servicio Windows)
                           ├─ /       → frontend compilado (frontend/dist)
                           └─ /api/*  → API de solo lectura
                                     │
                          SQL Server localhost\SCADA01  (misma máquina)
```

---

## A. Preparar en TU MÁQUINA (una vez, y cada vez que actualices)

```powershell
cd backend  ; npm install        ; cd ..
cd frontend ; npm install ; npm run build ; cd ..
```

Esto deja `backend\node_modules` y `frontend\dist` listos para copiar.

---

## B. Copiar al servidor (por la red)

```powershell
.\deploy\sync-to-server.ps1
```

Copia a `\\172.5.0.9\Web SQL` el backend (código + `node_modules`) y el frontend
compilado (`dist`). **No** copia el `.env` (las credenciales viven solo en el
server) ni el `.git`.

---

## C. Configurar el SERVIDOR (una sola vez)

Estos pasos se hacen **en el servidor** (por consola/RDP en `172.5.0.9`).

### C.1 Instalar Node.js offline
En tu máquina, descargá el instalador **`node-vXX-x64.msi`** de nodejs.org y
copialo a `\\172.5.0.9\Web SQL\deploy\`. En el server, ejecutá el `.msi` (no
necesita internet). Verificá: `node -v`.

### C.2 NSSM (ya incluido)
`nssm.exe` (win64) ya viene en `deploy\nssm.exe` (lo lleva el sync). Sirve para
correr Node como servicio de Windows. Copialo a `C:\nssm\` o usalo desde `deploy\`.

### C.3 Crear el `.env` de producción
En el server, crear `<carpeta>\backend\.env` a partir de `.env.example`:

```
DB_SERVER=localhost          # la BD está en esta misma máquina
DB_INSTANCE=SCADA01
DB_NAME=Telemetria
DB_USER=datossql             # usuario SOLO LECTURA (db_datareader)
DB_PASSWORD=la_clave_real

PROD_TABLE=Horarios_Oil
PROD_SCHEMA=dbo

PORT=80                      # URL limpia http://172.5.0.9 (ver nota)
AUTH_ENABLED=true            # ¡ON en producción!
JWT_SECRET=una_clave_larga_y_unica
PORTAL_USER=consulta
PORTAL_PASSWORD=clave_para_empleados
```

> **Puerto 80**: si ya está ocupado (`netstat -ano | findstr :80`), usá otro
> (ej. `PORT=8080` → `http://172.5.0.9:8080`).

### C.4 Probar a mano
Desde la carpeta del proyecto en el server:
```powershell
node backend\index.js
# abrir http://localhost   → debe verse el portal. Ctrl+C para frenar.
```

### C.5 Crear el servicio de Windows (PowerShell como Administrador)
```powershell
$node = (Get-Command node).Source
$app  = "\\172.5.0.9\Web SQL\backend\index.js"   # o la ruta local en el server
C:\nssm\nssm.exe install PortalSCADA $node $app
C:\nssm\nssm.exe set PortalSCADA AppDirectory "\\172.5.0.9\Web SQL\backend"
C:\nssm\nssm.exe set PortalSCADA Start SERVICE_AUTO_START
C:\nssm\nssm.exe start PortalSCADA
```
Gestión: `nssm restart|stop|status PortalSCADA`.

> Recomendado: correr el proyecto desde una carpeta **local** del server (ej.
> `C:\portal-scada`) en vez de la compartida, y usar el share solo para recibir
> las actualizaciones. Es más estable para un servicio.

### C.6 Firewall (permitir acceso desde la red)
```powershell
New-NetFirewallRule -DisplayName "Portal SCADA" -Direction Inbound `
  -Protocol TCP -LocalPort 80 -Action Allow -Profile Domain,Private
```

---

## D. Acceso de los clientes

Desde cualquier PC de la red interna:
```
http://172.5.0.9            (o http://172.5.0.9:8080 según el puerto)
```
Opcional: pedir a IT un DNS interno (ej. `portal.miempresa.local` → `172.5.0.9`).

---

## E. Actualizar el portal (tu flujo habitual)

**En tu máquina:**
```powershell
# 1) desarrollás y probás con los servidores de desarrollo
# 2) backup a GitHub
git add -A ; git commit -m "Mejora X" ; git push
# 3) recompilar y sincronizar al server
cd frontend ; npm run build ; cd ..
.\deploy\sync-to-server.ps1
```

**En el server:** reiniciar el servicio para tomar los archivos nuevos:
```powershell
C:\nssm\nssm.exe restart PortalSCADA
```

---

## Checklist de seguridad

- [ ] `AUTH_ENABLED=true` y `JWT_SECRET` propio en el `.env` del server.
- [ ] `datossql` tiene **solo** `db_datareader`.
- [ ] El `.env` no se copia ni se versiona (protegido por el sync y `.gitignore`).
- [ ] El puerto 1433 de SQL no se expone fuera de la red interna.
