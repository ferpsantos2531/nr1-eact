export type CNPJData = {
  razaoSocial: string
  nomeFantasia: string
  cidade: string
  estado: string
  situacao: string
  ativo: boolean
}

export async function consultarCNPJ(cnpj: string): Promise<CNPJData | null> {
  const digits = cnpj.replace(/\D/g, "")
  if (digits.length !== 14) return null
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return null
    const d = await res.json()
    return {
      razaoSocial: d.razao_social ?? "",
      nomeFantasia: d.nome_fantasia ?? "",
      cidade: d.municipio ?? "",
      estado: d.uf ?? "",
      situacao: d.descricao_situacao_cadastral ?? "",
      ativo: (d.descricao_situacao_cadastral ?? "").toUpperCase() === "ATIVA",
    }
  } catch {
    return null
  }
}
