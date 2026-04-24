import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

const UF_NOME: Record<string, string> = {
  AC:"Acre",AM:"Amazonas",AP:"Amapá",PA:"Pará",RO:"Rondônia",RR:"Roraima",TO:"Tocantins",
  AL:"Alagoas",BA:"Bahia",CE:"Ceará",MA:"Maranhão",PB:"Paraíba",PE:"Pernambuco",
  PI:"Piauí",RN:"Rio Grande do Norte",SE:"Sergipe",
  DF:"Distrito Federal",GO:"Goiás",MS:"Mato Grosso do Sul",MT:"Mato Grosso",
  ES:"Espírito Santo",MG:"Minas Gerais",RJ:"Rio de Janeiro",SP:"São Paulo",
  PR:"Paraná",RS:"Rio Grande do Sul",SC:"Santa Catarina",
}

const UF_REGIAO: Record<string, string> = {
  AC:"Norte",AM:"Norte",AP:"Norte",PA:"Norte",RO:"Norte",RR:"Norte",TO:"Norte",
  AL:"Nordeste",BA:"Nordeste",CE:"Nordeste",MA:"Nordeste",PB:"Nordeste",PE:"Nordeste",
  PI:"Nordeste",RN:"Nordeste",SE:"Nordeste",
  DF:"Centro-Oeste",GO:"Centro-Oeste",MS:"Centro-Oeste",MT:"Centro-Oeste",
  ES:"Sudeste",MG:"Sudeste",RJ:"Sudeste",SP:"Sudeste",
  PR:"Sul",RS:"Sul",SC:"Sul",
}

function catFromMedia(m: number) {
  return m >= 3.7 ? "grave" : m >= 2.3 ? "critico" : "satisfatorio"
}

function toTitleCase(s: string) {
  return s.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase())
}

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  // NOTA: No branch sso-integration, cidade/estado não ficam mais no banco NR-1.
  // Esses dados estão no Conexão. A view geográfica requer integração adicional
  // com a API do Conexão para enriquecer os dados. Por ora retorna vazio.
  const empresas = await prisma.empresa.findMany({
    select: {
      id: true,
      relatorios: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { mediaGeral: true, mediaDimensao1: true, mediaDimensao2: true, mediaDimensao3: true, categoria: true },
      },
    },
  })

  // cidade/estado vêm do Conexão — por ora todos ficam sem geo
  const items = empresas.map(e => ({
    ...e,
    nome: `Empresa ${e.id.slice(0, 8)}`,
    uf: null as string | null,
    cidadeNorm: null as string | null,
    rel: e.relatorios[0] ?? null,
  }))

  let semGeo = 0

  // Acumuladores por estado e cidade
  type Acc = {
    totalEmpresas: number; comRelatorio: number
    somaMedia: number; contMedia: number
    somaD1: number; somaD2: number; somaD3: number
    grave: number; critico: number; satisfatorio: number
    empresasLista: Array<{ nome: string; media: number | null; cat: string | null }>
  }
  const estadoMap = new Map<string, Acc>()
  const cidadeMap = new Map<string, Acc & { uf: string; cidade: string }>()
  const regiaoMap = new Map<string, Acc>()

  function newAcc(): Acc {
    return { totalEmpresas: 0, comRelatorio: 0, somaMedia: 0, contMedia: 0,
             somaD1: 0, somaD2: 0, somaD3: 0, grave: 0, critico: 0, satisfatorio: 0, empresasLista: [] }
  }

  for (const e of items) {
    if (!e.uf || !e.cidadeNorm) { semGeo++; continue }
    const regiao = UF_REGIAO[e.uf] ?? "Outros"

    // Estado
    if (!estadoMap.has(e.uf)) estadoMap.set(e.uf, newAcc())
    const est = estadoMap.get(e.uf)!

    // Cidade
    const cidadeKey = `${e.cidadeNorm}|${e.uf}`
    if (!cidadeMap.has(cidadeKey)) cidadeMap.set(cidadeKey, { ...newAcc(), uf: e.uf, cidade: e.cidadeNorm })
    const cid = cidadeMap.get(cidadeKey)!

    // Região
    if (!regiaoMap.has(regiao)) regiaoMap.set(regiao, newAcc())
    const reg = regiaoMap.get(regiao)!

    for (const acc of [est, cid, reg]) {
      acc.totalEmpresas++
      acc.empresasLista.push({ nome: e.nome, media: e.rel?.mediaGeral ?? null, cat: e.rel?.categoria ?? null })
      if (e.rel) {
        acc.comRelatorio++
        acc.somaMedia += e.rel.mediaGeral
        acc.somaD1 += e.rel.mediaDimensao1
        acc.somaD2 += e.rel.mediaDimensao2
        acc.somaD3 += e.rel.mediaDimensao3
        acc.contMedia++
        const cat = e.rel.categoria
        if (cat === "grave") acc.grave++
        else if (cat === "critico") acc.critico++
        else acc.satisfatorio++
      }
    }
  }

  function buildEstado(uf: string, acc: Acc) {
    const mediaGeral = acc.contMedia > 0 ? acc.somaMedia / acc.contMedia : null
    const total = acc.grave + acc.critico + acc.satisfatorio || 1
    return {
      uf, nome: UF_NOME[uf] ?? uf, regiao: UF_REGIAO[uf] ?? "Outros",
      totalEmpresas: acc.totalEmpresas,
      empresasComRelatorio: acc.comRelatorio,
      empresasSemRelatorio: acc.totalEmpresas - acc.comRelatorio,
      mediaGeral, categoria: mediaGeral !== null ? catFromMedia(mediaGeral) : null,
      mediaDimensao1: acc.contMedia > 0 ? acc.somaD1 / acc.contMedia : null,
      mediaDimensao2: acc.contMedia > 0 ? acc.somaD2 / acc.contMedia : null,
      mediaDimensao3: acc.contMedia > 0 ? acc.somaD3 / acc.contMedia : null,
      distribuicao: { grave: acc.grave, critico: acc.critico, satisfatorio: acc.satisfatorio },
      pctGrave: Math.round((acc.grave / total) * 100),
      pctCritico: Math.round((acc.critico / total) * 100),
      pctSatisfatorio: Math.round((acc.satisfatorio / total) * 100),
      empresasLista: acc.empresasLista.slice(0, 20),
    }
  }

  const porEstado = Array.from(estadoMap.entries())
    .map(([uf, acc]) => buildEstado(uf, acc))
    .sort((a, b) => (b.mediaGeral ?? 0) - (a.mediaGeral ?? 0))

  const porCidade = Array.from(cidadeMap.entries())
    .map(([, acc]) => {
      const mediaGeral = acc.contMedia > 0 ? acc.somaMedia / acc.contMedia : null
      const total = acc.grave + acc.critico + acc.satisfatorio || 1
      return {
        cidade: acc.cidade, uf: acc.uf, regiao: UF_REGIAO[acc.uf as string] ?? "Outros",
        totalEmpresas: acc.totalEmpresas, empresasComRelatorio: acc.comRelatorio,
        mediaGeral, categoria: mediaGeral !== null ? catFromMedia(mediaGeral) : null,
        distribuicao: { grave: acc.grave, critico: acc.critico, satisfatorio: acc.satisfatorio },
        pctGrave: Math.round((acc.grave / total) * 100),
        pctCritico: Math.round((acc.critico / total) * 100),
        pctSatisfatorio: Math.round((acc.satisfatorio / total) * 100),
        empresasLista: acc.empresasLista.slice(0, 30),
      }
    })
    .sort((a, b) => (b.mediaGeral ?? 0) - (a.mediaGeral ?? 0))

  const REGIAO_ORDER = ["Sudeste","Sul","Nordeste","Centro-Oeste","Norte","Outros"]
  const porRegiao = Array.from(regiaoMap.entries())
    .map(([regiao, acc]) => {
      const mediaGeral = acc.contMedia > 0 ? acc.somaMedia / acc.contMedia : null
      const total = acc.grave + acc.critico + acc.satisfatorio || 1
      const ufs = Array.from(estadoMap.keys()).filter(uf => (UF_REGIAO[uf] ?? "Outros") === regiao)
      return {
        regiao, totalEmpresas: acc.totalEmpresas,
        empresasComRelatorio: acc.comRelatorio,
        empresasSemRelatorio: acc.totalEmpresas - acc.comRelatorio,
        mediaGeral, categoria: mediaGeral !== null ? catFromMedia(mediaGeral) : null,
        distribuicao: { grave: acc.grave, critico: acc.critico, satisfatorio: acc.satisfatorio },
        pctGrave: Math.round((acc.grave / total) * 100),
        pctCritico: Math.round((acc.critico / total) * 100),
        pctSatisfatorio: Math.round((acc.satisfatorio / total) * 100),
        estados: ufs.sort(),
      }
    })
    .sort((a, b) => REGIAO_ORDER.indexOf(a.regiao) - REGIAO_ORDER.indexOf(b.regiao))

  const totalEmpresas = items.length
  const maiorEstado = porEstado.reduce((m, e) => e.totalEmpresas > (m?.totalEmpresas ?? 0) ? e : m, porEstado[0] ?? null)
  const estadosComMedia = porEstado.filter(e => e.mediaGeral !== null)
  const kpis = {
    estadoPiorMedia: estadosComMedia[0] ? { uf: estadosComMedia[0].uf, nome: estadosComMedia[0].nome, media: estadosComMedia[0].mediaGeral!, categoria: estadosComMedia[0].categoria! } : null,
    estadoMelhorMedia: estadosComMedia[estadosComMedia.length - 1] ? { uf: estadosComMedia[estadosComMedia.length - 1].uf, nome: estadosComMedia[estadosComMedia.length - 1].nome, media: estadosComMedia[estadosComMedia.length - 1].mediaGeral!, categoria: estadosComMedia[estadosComMedia.length - 1].categoria! } : null,
    cidadeMaisCritica: porCidade[0] ?? null,
    totalEstados: estadoMap.size,
    totalCidades: cidadeMap.size,
    empresasSemGeo: semGeo,
    concentracao: maiorEstado ? { uf: maiorEstado.uf, nome: maiorEstado.nome, percentual: Math.round((maiorEstado.totalEmpresas / Math.max(totalEmpresas - semGeo, 1)) * 100) } : null,
  }

  return NextResponse.json({ kpis, porEstado, porCidade, porRegiao })
}
