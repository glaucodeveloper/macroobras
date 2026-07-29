type
  HANDLE = int
  LPCWSTR = WideCString

const
  ERROR_ALREADY_EXISTS = 183'i32

proc CreateMutexW(lpMutexAttributes: pointer, bInitialOwner: bool, lpName: LPCWSTR): HANDLE {.stdcall, dynlib: "kernel32.dll", importc: "CreateMutexW".}
proc GetLastError(): int32 {.stdcall, dynlib: "kernel32.dll", importc: "GetLastError".}

proc enforceSingleInstance*(appId: string) =
  let wName = newWideCString("Global\\" & appId)
  let hMutex = CreateMutexW(nil, false, wName)
  
  if GetLastError() == ERROR_ALREADY_EXISTS:
    # App is already running! We exit immediately.
    quit(0)
