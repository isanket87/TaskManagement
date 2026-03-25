$path = "$env:USERPROFILE\.ssh\id_brioright_deploy"
if (Test-Path $path) { Remove-Item $path -Force }
if (Test-Path "$path.pub") { Remove-Item "$path.pub" -Force }
Start-Process ssh-keygen -ArgumentList "-t", "ed25519", "-f", $path, "-N", '""' -Wait
