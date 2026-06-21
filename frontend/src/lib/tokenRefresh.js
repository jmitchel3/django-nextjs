import { deleteTokens, getRefreshToken, setRefreshToken, setToken } from "@/lib/auth"
import { urlJoin } from "@/lib/urlJoin"

const DJANGO_API_URL = process.env.DJANGO_API_URL

/**
 * Mint a fresh access token from the refresh-token cookie when the current
 * access token has expired. On success the new access token (and a rotated
 * refresh token, if the backend returns one) is written back to the httpOnly
 * cookies and the access token is returned. Returns null on any failure; if the
 * refresh token itself is rejected, the dead cookies are cleared so a doomed
 * refresh isn't re-attempted on every subsequent request. The browser never
 * sees either token — both stay in httpOnly cookies.
 *
 * @returns {Promise<string|null>} the new access token, or null
 */
export async function refreshAccessToken() {
    const refresh = await getRefreshToken()
    if (!refresh) return null

    let response
    try {
        response = await fetch(urlJoin(DJANGO_API_URL, "token/refresh"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh }),
        })
    } catch {
        // Backend unreachable — likely transient, so keep the cookies.
        return null
    }

    if (!response.ok) {
        // The refresh token is expired or blacklisted: clear the stale cookies
        // so every following request doesn't re-pay a 401 + failed refresh.
        await deleteTokens()
        return null
    }

    let data
    try {
        data = await response.json()
    } catch {
        return null
    }

    const access = data.access
    if (typeof access !== "string" || !access) return null

    await setToken(access)
    // With ROTATE_REFRESH_TOKENS enabled Django returns a new refresh token and
    // blacklists the old one — persist it so the dead token isn't reused.
    if (typeof data.refresh === "string" && data.refresh) {
        await setRefreshToken(data.refresh)
    }
    return access
}
