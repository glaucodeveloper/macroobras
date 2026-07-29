when defined(windows):
  import clipboard/win_impl
  export win_impl
elif defined(macosx):
  import clipboard/mac_impl
  export mac_impl
elif defined(linux):
  import clipboard/linux_impl
  export linux_impl
else:
  {.error: "Unsupported OS for Jazzy Clipboard".}
