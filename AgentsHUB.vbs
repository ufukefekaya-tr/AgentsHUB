' AgentsHUB - Gizli Baslatici
Set WShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
strPath = FSO.GetParentFolderName(WScript.ScriptFullName)
strNodeExe = strPath & "\node\node.exe"
strLauncher = strPath & "\launcher.mjs"
WShell.Run """" & strNodeExe & """ """ & strLauncher & """", 0, False