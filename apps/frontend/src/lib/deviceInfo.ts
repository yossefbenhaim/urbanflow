export function getDeviceInfo() {
  return {
    user_agent: navigator.userAgent,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    platform: navigator.platform,
    registered_at: new Date().toISOString(),
  }
}
