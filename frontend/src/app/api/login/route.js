import { proxyAuthRequest } from "@/lib/proxyAuth"

export async function POST(request) {
    return proxyAuthRequest(request, "token/pair")
}
