import { NextResponse } from 'next/server';

import { getToken } from '@/lib/auth';
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
 * collapsing everything to a single 500.
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

    const headers = {
        'Content-Type': request.headers.get('content-type') || 'application/json',
    };
    const token = await getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const init = { method: request.method, headers };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = await request.text();
    }

    let response;
    try {
        response = await fetch(url, init);
    } catch (error) {
        console.error(`Proxy failed to reach backend at ${url}:`, error);
        return NextResponse.json(
            { detail: 'Failed to reach backend' },
            { status: 502 }
        );
    }

    const body = await response.text();
    const contentType = response.headers.get('content-type') || 'text/plain';
    return new NextResponse(body, {
        status: response.status,
        headers: { 'Content-Type': contentType },
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
