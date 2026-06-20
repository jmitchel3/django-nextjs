import { NextResponse } from "next/server"

import { setRefreshToken, setToken } from "@/lib/auth"
import { urlJoin } from "@/lib/urlJoin"

const DJANGO_API_URL = process.env.DJANGO_API_URL

const INVALID_RESPONSE = "Invalid response from server. Please try again."

// 502 Bad Gateway: the upstream Django response was missing or unparseable.
const invalidResponse = () =>
    NextResponse.json({ loggedIn: false, detail: INVALID_RESPONSE }, { status: 502 })

/**
 * Forward an auth request (login or signup) to the Django backend, and on
 * success store the returned JWT pair in httpOnly cookies. Shared by the
 * /api/login and /api/signup route handlers, which differ only in backendPath.
 *
 * @param {Request} request - the incoming Next.js request
 * @param {string} backendPath - Django path, e.g. "token/pair" or "signup"
 */
export async function proxyAuthRequest(request, backendPath) {
    let requestData
    try {
        requestData = await request.json()
    } catch {
        // 400: the client sent a malformed or empty body.
        return NextResponse.json(
            { loggedIn: false, detail: "Invalid request. Please try again." },
            { status: 400 }
        )
    }
    const url = urlJoin(DJANGO_API_URL, backendPath)

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
    })

    let responseData = {}
    try {
        responseData = await response.json()
    } catch {
        return invalidResponse()
    }

    if (response.ok) {
        const accessToken = responseData.access_token || responseData.access
        const refreshToken = responseData.refresh_token || responseData.refresh
        if (!accessToken || !refreshToken) {
            return invalidResponse()
        }
        await setToken(accessToken)
        await setRefreshToken(refreshToken)
        return NextResponse.json(
            { loggedIn: true, username: responseData.username },
            { status: 200 }
        )
    }

    // Forward the backend's status and error body (e.g. 422 field errors or a
    // 400 "not available" detail) so the client can surface a useful message.
    return NextResponse.json(
        { loggedIn: false, ...responseData },
        { status: response.status }
    )
}
