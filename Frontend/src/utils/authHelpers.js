export const getStoredAuth = () => {
  try {
    const authRaw = localStorage.getItem("auth");
    return authRaw ? JSON.parse(authRaw) : null;
  } catch {
    return null;
  }
};

export const getCurrentUser = () => getStoredAuth()?.user || null;
export const isPatientLoggedIn = () => getCurrentUser()?.role === "patient";
