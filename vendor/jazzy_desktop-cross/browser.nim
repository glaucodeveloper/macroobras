when defined(windows):
  import browser/win_impl
  export win_impl
elif defined(macosx):
  import browser/mac_impl
  export mac_impl
elif defined(linux):
  import browser/linux_impl
  export linux_impl
else:
  {.error: "Unsupported OS for Jazzy Browser".}
