export function ok(data) {
  return { success: true, data }
}

export function fail(code, message, detail) {
  return { success: false, error: { code, message, detail } }
}
