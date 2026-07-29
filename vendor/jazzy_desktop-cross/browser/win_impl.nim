type
  HWND = pointer
  LPCWSTR = WideCString
  HINSTANCE = int

proc ShellExecuteW(hwnd: HWND, lpOperation: LPCWSTR, lpFile: LPCWSTR, lpParameters: LPCWSTR, lpDirectory: LPCWSTR, nShowCmd: int32): HINSTANCE {.stdcall, dynlib: "shell32.dll", importc: "ShellExecuteW".}

proc openBrowser*(url: string): bool =
  let wUrl = newWideCString(url)
  let wOp = newWideCString("open")
  let res = ShellExecuteW(nil, wOp, wUrl, nil, nil, 5) # SW_SHOW = 5
  return res > 32 # If > 32, ShellExecute was successful
