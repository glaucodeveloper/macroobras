import dialogs/types
export types

when defined(windows):
  import dialogs/win_impl
  export win_impl
elif defined(macosx):
  import dialogs/mac_impl
  export mac_impl
elif defined(linux):
  import dialogs/linux_impl
  export linux_impl
else:
  {.error: "Unsupported OS for Jazzy Dialogs".}
