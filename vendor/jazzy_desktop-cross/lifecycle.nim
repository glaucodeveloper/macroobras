when defined(windows):
  import lifecycle/win_impl
  export win_impl
elif defined(macosx):
  import lifecycle/mac_impl
  export mac_impl
elif defined(linux):
  import lifecycle/linux_impl
  export linux_impl
else:
  {.error: "Unsupported OS for Jazzy Lifecycle".}
