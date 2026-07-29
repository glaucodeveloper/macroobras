import tray/types
export types

when defined(windows):
  import tray/win_impl
  export win_impl
elif defined(macosx):
  import tray/mac_impl
  export mac_impl
elif defined(linux):
  import tray/linux_impl
  export linux_impl
else:
  {.error: "Unsupported OS for Jazzy Tray".}
