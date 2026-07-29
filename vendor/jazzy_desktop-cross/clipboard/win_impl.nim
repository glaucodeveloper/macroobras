type
  HWND = int
  UINT = int32
  HANDLE = int
  SIZE_T = uint

const
  CF_UNICODETEXT = 13'i32
  GMEM_MOVEABLE = 0x0002'i32

proc OpenClipboard(hWndNewOwner: HWND): bool {.stdcall, dynlib: "user32.dll", importc: "OpenClipboard".}
proc CloseClipboard(): bool {.stdcall, dynlib: "user32.dll", importc: "CloseClipboard".}
proc EmptyClipboard(): bool {.stdcall, dynlib: "user32.dll", importc: "EmptyClipboard".}
proc SetClipboardData(uFormat: UINT, hMem: HANDLE): HANDLE {.stdcall, dynlib: "user32.dll", importc: "SetClipboardData".}
proc GetClipboardData(uFormat: UINT): HANDLE {.stdcall, dynlib: "user32.dll", importc: "GetClipboardData".}

proc GlobalAlloc(uFlags: UINT, dwBytes: SIZE_T): HANDLE {.stdcall, dynlib: "kernel32.dll", importc: "GlobalAlloc".}
proc GlobalLock(hMem: HANDLE): pointer {.stdcall, dynlib: "kernel32.dll", importc: "GlobalLock".}
proc GlobalUnlock(hMem: HANDLE): bool {.stdcall, dynlib: "kernel32.dll", importc: "GlobalUnlock".}

proc writeClipboard*(text: string): bool =
  if text.len == 0: return false
  
  if not OpenClipboard(0): return false
  defer: discard CloseClipboard()
  
  discard EmptyClipboard()
  
  let wText = newWideCString(text)
  
  var count = 0
  var p = cast[ptr UncheckedArray[int16]](wText[0].addr)
  while p[count] != 0:
    inc(count)
    
  let bytes = cast[SIZE_T]((count + 1) * 2)
  let hMem = GlobalAlloc(GMEM_MOVEABLE, bytes)
  if hMem == 0: return false
  
  let pMem = GlobalLock(hMem)
  if pMem != nil:
    copyMem(pMem, wText[0].addr, cast[int](bytes))
    discard GlobalUnlock(hMem)
    if SetClipboardData(CF_UNICODETEXT, hMem) != 0:
      return true
      
  return false

proc readClipboard*(): string =
  if not OpenClipboard(0): return ""
  defer: discard CloseClipboard()
  
  let hMem = GetClipboardData(CF_UNICODETEXT)
  if hMem != 0:
    let pMem = GlobalLock(hMem)
    if pMem != nil:
      let wStr = cast[WideCString](pMem)
      result = $wStr
      discard GlobalUnlock(hMem)
