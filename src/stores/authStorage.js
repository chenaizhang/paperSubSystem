let authToken = null;
let authRole = null;
let authUserId = null;

export function setAuthSession({ token, role, userId }) {
  authToken = token || null;
  authRole = role || null;
  authUserId = userId ?? null;
}

export function getAuthToken() {
  return authToken;
}

export function getAuthRole() {
  return authRole;
}

export function getAuthUserId() {
  return authUserId;
}

export function clearAuthSession() {
  authToken = null;
  authRole = null;
  authUserId = null;
}
