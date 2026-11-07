$desktop = [Environment]::GetFolderPath('Desktop')
$wsh = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path $desktop "Doula Agro.lnk"
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"C:\Users\ALLAL\doula-agro\Doula-Agro.vbs`""
$shortcut.WorkingDirectory = "C:\Users\ALLAL\doula-agro"
$shortcut.Description = "Lancer Doula Agro en 1 clic"
$ico = "C:\Users\ALLAL\doula-agro\public\favicon.ico"
if (Test-Path $ico) {
    $shortcut.IconLocation = "$ico,0"
}
$shortcut.Save()
Write-Host "SUCCES: Raccourci cree sur le Bureau: $shortcutPath"

# Optionnellement dans le dossier de démarrage Windows pour lancement automatique au boot
$startup = [Environment]::GetFolderPath('Startup')
$startupShortcutPath = Join-Path $startup "Doula Agro Background.lnk"
$startupShortcut = $wsh.CreateShortcut($startupShortcutPath)
$startupShortcut.TargetPath = "wscript.exe"
$startupShortcut.Arguments = "`"C:\Users\ALLAL\doula-agro\Doula-Agro.vbs`""
$startupShortcut.WorkingDirectory = "C:\Users\ALLAL\doula-agro"
$startupShortcut.Description = "Lancement automatique de Doula Agro"
if (Test-Path $ico) {
    $startupShortcut.IconLocation = "$ico,0"
}
$startupShortcut.Save()
Write-Host "SUCCES: Lancement automatique ajoute au Demarrage Windows: $startupShortcutPath"

