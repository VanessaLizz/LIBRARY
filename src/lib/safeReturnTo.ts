// Compartilhado pelas páginas de autenticação (Login, Registro e qualquer página que retome um fluxo
// após o login, ex: página de consentimento OAuth). Mantém a validação de redirecionamento
// em um único lugar por ser sensível à segurança.

/**
 * Resolve o parâmetro ?returnTo= para um caminho seguro da mesma origem, caso contrário retorna "/".
 */
export function safeReturnTo(): string {
  if (typeof window === "undefined") return "/"

  const raw = new URLSearchParams(window.location.search).get("returnTo")
  if (!raw) return "/"

  try {
    const url = new URL(raw, window.location.origin)

    if (url.origin !== window.location.origin) return "/"

    // Remove parâmetros de bootstrap da aplicação para evitar contaminação de sessão
    const bootstrapParams = [
      "access_token",
      "clear_access_token",
      "app_id",
      "app_base_url",
      "functions_version",
      "from_url",
    ] as const

    for (const p of bootstrapParams) {
      url.searchParams.delete(p)
    }

    const path = url.pathname + url.search

    // Previne URLs protocolo-relativas (ex: //evil.com ou /\evil.com)
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
      return "/"
    }

    return path
  } catch {
    return "/"
  }
}