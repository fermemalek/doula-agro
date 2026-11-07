Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

' Verification de l'etat du serveur sur le port 8080
Set oExec = WshShell.Exec("cmd /c netstat -ano | findstr :8080 | findstr LISTENING")
output = oExec.StdOut.ReadAll()

If InStr(output, "LISTENING") = 0 Then
    ' Demarrage silencieux en arriere-plan (0 = masque)
    WshShell.Run "cmd /c npm run dev", 0, False
    WScript.Sleep 2500
End If

' Ouverture immediate dans le navigateur par defaut
WshShell.Run "http://localhost:8080/#/"
