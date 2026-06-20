/**
 * Normalize a Django-ninja error body (forwarded through the Next proxy) into a
 * single human-readable message. Handles both the 422 array form
 * (`detail: [{msg}]`) and the 400 string form (`detail: "..."`).
 *
 * @param {object} data - parsed JSON error body
 * @returns {string} a message, or "" if none could be derived
 */
export function extractErrorMessage(data) {
    if (!data) return ""
    if (Array.isArray(data.detail)) {
        return data.detail.map((e) => e?.msg).filter(Boolean).join(" ")
    }
    if (typeof data.detail === "string") return data.detail
    if (typeof data.message === "string") return data.message
    return ""
}

/**
 * Map a 422 detail-array body into a { fieldName: message } object for per-field
 * display. Entries without a usable `loc` are skipped (so a general validation
 * error never throws). `confirm_password` is mapped to the form's
 * `confirmPassword` field name.
 *
 * @param {object} data - parsed JSON error body
 * @returns {Record<string, string>} field name -> message
 */
export function extractFieldErrors(data) {
    if (!data || !Array.isArray(data.detail)) return {}
    const fieldErrors = {}
    for (const entry of data.detail) {
        const loc = entry?.loc
        if (!Array.isArray(loc) || loc.length === 0) continue
        const rawField = loc[loc.length - 1]
        const field = rawField === "confirm_password" ? "confirmPassword" : rawField
        fieldErrors[field] = entry?.msg
    }
    return fieldErrors
}
