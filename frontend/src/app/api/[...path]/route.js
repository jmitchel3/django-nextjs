import { NextResponse } from 'next/server';

import { getToken } from '@/lib/auth';
import { refreshAccessToken } from '@/lib/tokenRefresh';
import { urlJoin } from '@/lib/urlJoin';

const DJANGO_API_URL = process.env.DJANGO_API_URL;
// Pathname of the API base (e.g. "/api/"). Every proxied request must resolve to
// a URL under this prefix — otherwise a '..' segment could escape the API
// namespace and reach e.g. /admin with the user's Bearer token attached.
const API_BASE_PATH = new URL(DJANGO_API_URL).pathname;

/**
 * Generic authenticated proxy to the Django API. Attaches the access token from
 * the httpOnly cookie as a Bearer header (so the browser never handles the JWT),
 * forwards the method/query/body/content-type, and faithfully relays the
 * backend's status and body — including non-JSON error pages — instead of
 * collapsing everything to a single 500. When the access token has expired it
 * transparently refreshes it from the refresh-token cookie and retries once.
 */
async function proxy(request, params) {
    const segments = (await params).path;

    // Reject path traversal before it can escape the /api/ namespace.
    if (segments.some((s) => s === '..' || s === '.')) {
        return NextResponse.json({ detail: 'Invalid path' }, { status: 400 });
    }
    const url = urlJoin(DJANGO_API_URL, segments) + request.nextUrl.search;
    if (!new URL(url).pathname.startsWith(API_BASE_PATH)) {
        return NextResponse.json({ detail: 'Invalid path' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || 'application/json';
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    // Read the body once so it can be replayed on the post-refresh retry.
    const body = hasBody ? await request.text() : undefined;

    const send = (token) => {
        const headers = { 'Content-Type': contentType };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return fetch(url, { method: request.method, headers, ...(hasBody ? { body } : {}) });
    };

    let response;
    try {
        const token = await getToken();
        response = await send(token);
        // We sent a token but got 401 -> it likely expired. Mint a new one from
        // the refresh cookie and retry once, so a logged-in user isn't bounced
        // until the refresh token itself dies. (No token sent => nothing to
        // refresh; a 401 there just means login is required.)
        if (response.status === 401 && token) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                response = await send(refreshed);
            }
        }
    } catch (error) {
        console.error(`Proxy failed to reach backend at ${url}:`, error);
        return NextResponse.json(
            { detail: 'Failed to reach backend' },
            { status: 502 }
        );
    }

    const responseBody = await response.text();
    const responseContentType = response.headers.get('content-type') || 'text/plain';
    return new NextResponse(responseBody, {
        status: response.status,
        headers: { 'Content-Type': responseContentType },
    });
}

function handler(request, { params }) {
    return proxy(request, params);
}

export {
    handler as GET,
    handler as POST,
    handler as PUT,
    handler as PATCH,
    handler as DELETE,
};
