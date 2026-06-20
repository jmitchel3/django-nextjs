import { cookies } from "next/headers"

// In Next.js 15 `cookies()` is async and must be awaited, so every helper here
// is async. Access tokens are short-lived; refresh tokens outlive them.
const ACCESS_TOKEN_AGE = 60 * 60 // 1 hour
const REFRESH_TOKEN_AGE = 60 * 60 * 24 // 1 day
const TOKEN_NAME = "auth-token"
const TOKEN_REFRESH_NAME = "auth-refresh-token"

const baseCookieOptions = {
    httpOnly: true, // limit client-side js
    sameSite: "strict",
    secure: process.env.NODE_ENV !== "development",
}

export async function getToken() {
    // api requests
    const store = await cookies()
    return store.get(TOKEN_NAME)?.value
}

export async function getRefreshToken() {
    // api requests
    const store = await cookies()
    return store.get(TOKEN_REFRESH_NAME)?.value
}

export async function setToken(authToken) {
    // login
    const store = await cookies()
    return store.set({
        name: TOKEN_NAME,
        value: authToken,
        ...baseCookieOptions,
        maxAge: ACCESS_TOKEN_AGE,
    })
}

export async function setRefreshToken(authRefreshToken) {
    // login
    const store = await cookies()
    return store.set({
        name: TOKEN_REFRESH_NAME,
        value: authRefreshToken,
        ...baseCookieOptions,
        maxAge: REFRESH_TOKEN_AGE,
    })
}

export async function deleteTokens() {
    // logout
    const store = await cookies()
    store.delete(TOKEN_NAME)
    store.delete(TOKEN_REFRESH_NAME)
}
