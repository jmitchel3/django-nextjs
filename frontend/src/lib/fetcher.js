// Resolves with the parsed JSON body regardless of HTTP status. The health
// check (the sole consumer) signals state via the body's `status` field, and a
// non-2xx that still carries JSON should resolve, not throw, so SWR doesn't
// enter an error-retry backoff loop. A network-level failure still rejects.
const fetcher = async (url) => {
    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return res.json();
};

export default fetcher;
