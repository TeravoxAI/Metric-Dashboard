const ADMIN_USER = import.meta.env.VITE_ADMIN_USER
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS
const SESSION_KEY = 'aps_admin_auth'

function generateToken(username, password) {
  // Token = base64(user:pass:timestamp) — not guessable without knowing credentials
  return btoa(`${username}:${password}:${Date.now()}`)
}

function validateToken(token) {
  try {
    const decoded = atob(token)
    const [user, pass] = decoded.split(':')
    return user === ADMIN_USER && pass === ADMIN_PASS
  } catch {
    return false
  }
}

export function signIn(username, password) {
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    sessionStorage.setItem(SESSION_KEY, generateToken(username, password))
    return true
  }
  throw new Error('Invalid username or password')
}

export function signOut() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function isAuthenticated() {
  const token = sessionStorage.getItem(SESSION_KEY)
  if (!token) return false
  return validateToken(token)
}
