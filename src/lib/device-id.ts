const DEVICE_ID_KEY = "zed-rush-device-id";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join("-");
}

/**
 * A random ID kept on this device so the backend can keep each player's teams
 * and games separate without an account. It identifies the install, not the person.
 */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}
