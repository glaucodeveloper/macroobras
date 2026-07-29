import std/[os, net]

var lockSocket: Socket = nil

proc enforceSingleInstance*(appId: string) =
  let socketPath = getTempDir() / (appId & ".sock")
  
  let checkSocket = newSocket(AF_UNIX, SOCK_STREAM, IPPROTO_IP)
  try:
    checkSocket.connectUnix(socketPath)
    echo "Another instance of " & appId & " is already running. Exiting..."
    checkSocket.close()
    quit(0)
  except CatchableError:
    discard
  
  checkSocket.close()
  
  if fileExists(socketPath): 
    try: removeFile(socketPath) except OSError: discard
    
  try:
    lockSocket = newSocket(AF_UNIX, SOCK_STREAM, IPPROTO_IP)
    lockSocket.bindUnix(socketPath)
    lockSocket.listen()
  except CatchableError:
    echo "Warning: Could not bind single instance lock."
