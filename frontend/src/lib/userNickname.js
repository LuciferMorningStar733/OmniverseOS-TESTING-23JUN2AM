/**
 * Resolves the dynamic nickname/display name for the active user across OmniverseOS.
 * Checks:
 * 1. user?.nickname
 * 2. user?.name / user?.username
 * 3. localStorage("omniverse_user_name") (entered in Onboarding "What should Cortex call you?")
 * 4. localStorage("cortex_user") -> name
 * 5. localStorage("omniverse_last_name") or localStorage("omniverse_user")
 * 6. Default fallback: "there" or "User"
 */
export function getUserNickname(user, fallback = "there") {
  if (user?.nickname && typeof user.nickname === "string" && user.nickname.trim()) {
    return user.nickname.trim().split(" ")[0];
  }
  if (user?.name && typeof user.name === "string" && user.name.trim()) {
    return user.name.trim().split(" ")[0];
  }
  if (user?.username && typeof user.username === "string" && user.username.trim()) {
    return user.username.trim().split(" ")[0];
  }
  try {
    const onboardingName = localStorage.getItem("omniverse_user_name");
    if (onboardingName && onboardingName.trim()) {
      return onboardingName.trim().split(" ")[0];
    }
  } catch {}
  try {
    const cortexUserRaw = localStorage.getItem("cortex_user");
    if (cortexUserRaw) {
      const parsed = JSON.parse(cortexUserRaw);
      if (parsed?.name && typeof parsed.name === "string" && parsed.name.trim()) {
        return parsed.name.trim().split(" ")[0];
      }
    }
  } catch {}
  try {
    const lastName = localStorage.getItem("omniverse_last_name") || localStorage.getItem("omniverse_user");
    if (lastName && typeof lastName === "string" && lastName.trim() && !lastName.includes("@")) {
      return lastName.replace(/["']/g, "").trim().split(" ")[0];
    }
  } catch {}
  return fallback;
}

/**
 * Saves the user nickname to local storage and dispatches a window event so all components react instantly.
 */
export function setUserNickname(name) {
  if (!name || typeof name !== "string") return;
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    localStorage.setItem("omniverse_user_name", trimmed);
    window.dispatchEvent(new CustomEvent("omniverse:user-name-changed", { detail: trimmed }));
  } catch {}
}
