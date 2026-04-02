"use client"

import { useEffect, useState } from "react"

/* ─── Types ──────────────────────────────────────────────── */
type Distribuicao = { grave: number; critico: number; satisfatorio: number }

type EstadoData = {
  uf: string; nome: string; regiao: string
  totalEmpresas: number; empresasComRelatorio: number; empresasSemRelatorio: number
  mediaGeral: number | null; categoria: string | null
  mediaDimensao1: number | null; mediaDimensao2: number | null; mediaDimensao3: number | null
  distribuicao: Distribuicao
  pctGrave: number; pctCritico: number; pctSatisfatorio: number
  empresasLista: Array<{ nome: string; media: number | null; cat: string | null }>
}

type CidadeData = {
  cidade: string; uf: string; regiao: string
  totalEmpresas: number; empresasComRelatorio: number
  mediaGeral: number | null; categoria: string | null
  distribuicao: Distribuicao
  pctGrave: number; pctCritico: number; pctSatisfatorio: number
  empresasLista: Array<{ nome: string; media: number | null; cat: string | null }>
}

type RegiaoData = {
  regiao: string; totalEmpresas: number; empresasComRelatorio: number; empresasSemRelatorio: number
  mediaGeral: number | null; categoria: string | null
  distribuicao: Distribuicao
  pctGrave: number; pctCritico: number; pctSatisfatorio: number
  estados: string[]
}

export type GeoData = {
  kpis: {
    estadoPiorMedia: { uf: string; nome: string; media: number; categoria: string } | null
    estadoMelhorMedia: { uf: string; nome: string; media: number; categoria: string } | null
    cidadeMaisCritica: CidadeData | null
    totalEstados: number; totalCidades: number; empresasSemGeo: number
    concentracao: { uf: string; nome: string; percentual: number } | null
  }
  porEstado: EstadoData[]
  porCidade: CidadeData[]
  porRegiao: RegiaoData[]
}

/* ─── Helpers visuais ────────────────────────────────────── */
const COR: Record<string, string> = { grave: "#dc2626", critico: "#d97706", satisfatorio: "#059669" }
const BG: Record<string, string>  = { grave: "#fef2f2", critico: "#fffbeb", satisfatorio: "#f0fdf4" }
const LABEL: Record<string, string> = { grave: "Grave", critico: "Crítico", satisfatorio: "Satisfatório" }

function Badge({ cat }: { cat: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: BG[cat] ?? "#f1f1f1", color: COR[cat] ?? "#505050" }}>
      {LABEL[cat] ?? cat}
    </span>
  )
}

function ScoreNum({ v, size = "sm" }: { v: number | null; size?: "sm" | "lg" }) {
  if (v === null) return <span style={{ color: "#c8c8c8" }}>—</span>
  const cor = v >= 3.7 ? "#dc2626" : v >= 2.3 ? "#d97706" : "#059669"
  return <span className={`font-black ${size === "lg" ? "text-3xl" : "text-sm"}`} style={{ color: cor }}>{v.toFixed(2)}</span>
}

function DistBar({ pctG, pctC, pctS, total }: { pctG: number; pctC: number; pctS: number; total: number }) {
  if (total === 0) return <div className="text-xs" style={{ color: "#c8c8c8" }}>sem dados</div>
  return (
    <div className="flex rounded-full overflow-hidden h-2.5 w-full" style={{ background: "#f1f1f1" }}
      title={`Grave: ${pctG}% · Crítico: ${pctC}% · Satisfatório: ${pctS}%`}>
      {pctG > 0 && <div style={{ width: `${pctG}%`, background: "#dc2626" }} />}
      {pctC > 0 && <div style={{ width: `${pctC}%`, background: "#d97706" }} />}
      {pctS > 0 && <div style={{ width: `${pctS}%`, background: "#059669" }} />}
    </div>
  )
}

function DimBar({ label, val }: { label: string; val: number | null }) {
  if (val === null) return null
  const cor = val >= 3.7 ? "#dc2626" : val >= 2.3 ? "#d97706" : "#059669"
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs shrink-0 w-20" style={{ color: "#9f9f9f" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "#f1f1f1" }}>
        <div className="h-1.5 rounded-full" style={{ width: `${(val / 5) * 100}%`, background: cor }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color: cor }}>{val.toFixed(1)}</span>
    </div>
  )
}

const REGIAO_CONFIG: Record<string, { cor: string; bg: string; emoji: string }> = {
  "Sudeste":      { cor: "#1d4ed8", bg: "#eff6ff", emoji: "🏙" },
  "Sul":          { cor: "#0369a1", bg: "#f0f9ff", emoji: "🌲" },
  "Nordeste":     { cor: "#b45309", bg: "#fffbeb", emoji: "☀" },
  "Centro-Oeste": { cor: "#7c3aed", bg: "#f5f3ff", emoji: "🌾" },
  "Norte":        { cor: "#15803d", bg: "#f0fdf4", emoji: "🌿" },
  "Outros":       { cor: "#6b7280", bg: "#f9fafb", emoji: "📍" },
}

/* ─── Mapa de Calor Brasil ───────────────────────────────── */
// Posições aproximadas dos centróides dos estados em viewport 480x470
const STATE_POS: Record<string, { x: number; y: number; w: number; h: number }> = {
  RR: { x: 130, y: 18,  w: 26, h: 16 },
  AP: { x: 237, y: 28,  w: 26, h: 16 },
  AM: { x:  90, y: 98,  w: 26, h: 16 },
  PA: { x: 218, y: 90,  w: 26, h: 16 },
  MA: { x: 318, y: 78,  w: 26, h: 16 },
  CE: { x: 396, y: 52,  w: 26, h: 16 },
  RN: { x: 436, y: 74,  w: 24, h: 15 },
  PB: { x: 430, y: 94,  w: 24, h: 15 },
  PE: { x: 412, y: 114, w: 26, h: 16 },
  AL: { x: 430, y: 134, w: 24, h: 15 },
  SE: { x: 420, y: 154, w: 24, h: 15 },
  PI: { x: 352, y: 100, w: 26, h: 16 },
  TO: { x: 280, y: 148, w: 26, h: 16 },
  AC: { x:  36, y: 172, w: 26, h: 16 },
  RO: { x: 120, y: 190, w: 26, h: 16 },
  MT: { x: 192, y: 210, w: 26, h: 16 },
  GO: { x: 268, y: 235, w: 26, h: 16 },
  DF: { x: 302, y: 258, w: 22, h: 14 },
  BA: { x: 358, y: 185, w: 26, h: 16 },
  MG: { x: 318, y: 272, w: 26, h: 16 },
  ES: { x: 378, y: 292, w: 24, h: 15 },
  RJ: { x: 356, y: 318, w: 22, h: 14 },
  SP: { x: 276, y: 308, w: 26, h: 16 },
  MS: { x: 214, y: 298, w: 26, h: 16 },
  PR: { x: 248, y: 352, w: 26, h: 16 },
  SC: { x: 252, y: 378, w: 26, h: 16 },
  RS: { x: 226, y: 412, w: 26, h: 16 },
}

function catColor(cat: string | null | undefined, alpha = 1): string {
  if (!cat) return `rgba(200,200,200,${alpha})`
  if (cat === "grave")       return `rgba(220,38,38,${alpha})`
  if (cat === "critico")     return `rgba(217,119,6,${alpha})`
  if (cat === "satisfatorio") return `rgba(5,150,105,${alpha})`
  return `rgba(200,200,200,${alpha})`
}

function BrazilHeatMap({
  porEstado,
  selectedUF,
  onSelect,
}: {
  porEstado: EstadoData[]
  selectedUF: string | null
  onSelect: (uf: string | null) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  const byUF = Object.fromEntries(porEstado.map(e => [e.uf, e]))

  const tooltip = hovered ? byUF[hovered] : null

  return (
    <div className="relative select-none">
      <svg viewBox="0 0 480 460" className="w-full" style={{ maxHeight: 380 }}>
        {/* Fundo sutil */}
        <rect x="0" y="0" width="480" height="460" fill="#f9fafb" rx="12" />

        {/* Título do mapa */}
        <text x="14" y="455" fontSize="9" fill="#c8c8c8" fontWeight="500">Mapa de Calor · Risco Psicossocial por Estado</text>

        {/* Estados */}
        {Object.entries(STATE_POS).map(([uf, pos]) => {
          const estado = byUF[uf]
          const cat = estado?.categoria ?? null
          const isSelected = selectedUF === uf
          const isHovered = hovered === uf
          const fillColor = catColor(cat, 0.85)
          const strokeColor = isSelected ? "#1a1a1a" : isHovered ? "#555" : "rgba(255,255,255,0.7)"
          const strokeW = isSelected ? 2.5 : isHovered ? 1.5 : 1

          return (
            <g key={uf}
              style={{ cursor: "pointer" }}
              onClick={() => onSelect(isSelected ? null : uf)}
              onMouseEnter={() => setHovered(uf)}
              onMouseLeave={() => setHovered(null)}>
              {/* Sombra/glow para selecionado */}
              {isSelected && (
                <rect x={pos.x - 3} y={pos.y - 3} width={pos.w + 6} height={pos.h + 6}
                  rx={6} fill={catColor(cat, 0.2)} />
              )}
              <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h}
                rx={4}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeW} />
              <text
                x={pos.x + pos.w / 2}
                y={pos.y + pos.h / 2 + 4}
                textAnchor="middle"
                fontSize={9}
                fontWeight="700"
                fill="#fff"
                style={{ pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
                {uf}
              </text>
              {/* Score abaixo da caixa quando hover */}
              {isHovered && estado?.mediaGeral !== null && estado?.mediaGeral !== undefined && (
                <text
                  x={pos.x + pos.w / 2}
                  y={pos.y + pos.h + 10}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight="bold"
                  fill={catColor(cat, 1)}>
                  {estado.mediaGeral.toFixed(1)}
                </text>
              )}
            </g>
          )
        })}

        {/* Legenda */}
        {[
          { label: "Grave", color: "#dc2626", bg: "rgba(220,38,38,0.85)" },
          { label: "Crítico", color: "#d97706", bg: "rgba(217,119,6,0.85)" },
          { label: "Satisfatório", color: "#059669", bg: "rgba(5,150,105,0.85)" },
          { label: "Sem dados", color: "#9f9f9f", bg: "rgba(200,200,200,0.85)" },
        ].map((item, i) => (
          <g key={item.label} transform={`translate(${14 + i * 108}, 438)`}>
            <rect width={14} height={10} rx={2} fill={item.bg} />
            <text x={18} y={9} fontSize={9} fill="#6b7280">{item.label}</text>
          </g>
        ))}
      </svg>

      {/* Tooltip flutuante */}
      {tooltip && (
        <div className="absolute pointer-events-none z-10 rounded-xl border shadow-xl px-4 py-3 text-xs"
          style={{
            background: "#fff",
            borderColor: tooltip.categoria ? COR[tooltip.categoria] : "#e8e8e8",
            borderTop: `3px solid ${tooltip.categoria ? COR[tooltip.categoria] : "#e8e8e8"}`,
            top: 8, right: 8, minWidth: 180,
          }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base font-black" style={{ color: "#1a1a1a" }}>{tooltip.uf}</span>
            <span style={{ color: "#9f9f9f" }}>{tooltip.nome}</span>
          </div>
          {tooltip.mediaGeral !== null ? (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <ScoreNum v={tooltip.mediaGeral} />
                <Badge cat={tooltip.categoria!} />
              </div>
              <DistBar pctG={tooltip.pctGrave} pctC={tooltip.pctCritico} pctS={tooltip.pctSatisfatorio} total={tooltip.empresasComRelatorio} />
              <div className="mt-1" style={{ color: "#9f9f9f" }}>
                {tooltip.totalEmpresas} empresa{tooltip.totalEmpresas !== 1 ? "s" : ""} · {tooltip.empresasComRelatorio} avaliada{tooltip.empresasComRelatorio !== 1 ? "s" : ""}
              </div>
            </>
          ) : (
            <div style={{ color: "#9f9f9f" }}>Sem relatórios · {tooltip.totalEmpresas} empresa{tooltip.totalEmpresas !== 1 ? "s" : ""}</div>
          )}
          <div className="mt-1.5 text-xs font-medium" style={{ color: "#9f9f9f" }}>
            Clique para {selectedUF === tooltip.uf ? "deselecionar" : "ver detalhes"}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── GeoTab principal ──────────────────────────────────── */
export default function GeoTab() {
  const [data, setData] = useState<GeoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [tab, setTab] = useState<"estados" | "regioes" | "cidades">("estados")
  const [selectedUF, setSelectedUF] = useState<string | null>(null)
  const [buscaEstado, setBuscaEstado] = useState("")
  const [buscaCidade, setBuscaCidade] = useState("")
  const [cidadeFiltroUF, setCidadeFiltroUF] = useState<string>("todos")
  const [ordenacao, setOrdenacao] = useState<"risco" | "empresas" | "nome">("risco")

  useEffect(() => {
    fetch("/api/admin/geografico")
      .then(r => {
        if (!r.ok) { setErro("Erro ao carregar dados geográficos"); return null }
        return r.json()
      })
      .then(d => { if (d) setData(d) })
      .catch(() => setErro("Erro de conexão"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin w-8 h-8 border-4 rounded-full"
        style={{ borderColor: "#006635", borderTopColor: "transparent" }} />
    </div>
  )

  if (erro || !data) return (
    <div className="py-16 text-center">
      <p className="text-sm" style={{ color: "#dc2626" }}>{erro || "Sem dados"}</p>
    </div>
  )

  const { kpis, porEstado, porCidade, porRegiao } = data

  const estadosFiltrados = porEstado
    .filter(e => !buscaEstado || e.nome.toLowerCase().includes(buscaEstado.toLowerCase()) || e.uf.toLowerCase().includes(buscaEstado.toLowerCase()))
    .sort((a, b) => {
      if (ordenacao === "risco")    return (b.mediaGeral ?? 0) - (a.mediaGeral ?? 0)
      if (ordenacao === "empresas") return b.totalEmpresas - a.totalEmpresas
      return a.nome.localeCompare(b.nome)
    })

  const cidadesFiltradas = porCidade
    .filter(c =>
      (!buscaCidade || c.cidade.toLowerCase().includes(buscaCidade.toLowerCase())) &&
      (cidadeFiltroUF === "todos" || c.uf === cidadeFiltroUF)
    )
    .slice(0, 50)

  const cidadesDrillDown = selectedUF
    ? porCidade.filter(c => c.uf === selectedUF).sort((a, b) => (b.mediaGeral ?? 0) - (a.mediaGeral ?? 0))
    : []

  const estadoSelected = selectedUF ? porEstado.find(e => e.uf === selectedUF) : null

  return (
    <div className="space-y-6">

      {/* Mapa de calor + KPIs lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Mapa */}
        <div className="lg:col-span-2 rounded-xl border bg-white p-4" style={{ borderColor: "#e8e8e8" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-black text-sm" style={{ color: "#1a1a1a" }}>Mapa de Calor por Estado</h3>
              <p className="text-xs mt-0.5" style={{ color: "#9f9f9f" }}>
                Passe o mouse sobre o estado para detalhes · clique para filtrar
              </p>
            </div>
            {selectedUF && (
              <button onClick={() => setSelectedUF(null)}
                className="text-xs px-2.5 py-1 rounded-lg"
                style={{ background: "#f1f1f1", color: "#505050" }}>
                ✕ Limpar seleção
              </button>
            )}
          </div>
          <BrazilHeatMap
            porEstado={porEstado}
            selectedUF={selectedUF}
            onSelect={uf => {
              setSelectedUF(uf)
              if (uf) setTab("estados")
            }}
          />
        </div>

        {/* KPIs */}
        <div className="space-y-3">
          <div className="rounded-xl border bg-white px-4 py-3"
            style={{ borderColor: "#e8e8e8", borderTop: `3px solid ${kpis.estadoPiorMedia ? COR[kpis.estadoPiorMedia.categoria] : "#e8e8e8"}` }}>
            <p className="text-xs font-semibold mb-1.5" style={{ color: "#9f9f9f" }}>MAIOR RISCO</p>
            {kpis.estadoPiorMedia ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black" style={{ color: COR[kpis.estadoPiorMedia.categoria] }}>
                    {kpis.estadoPiorMedia.uf}
                  </div>
                  <div className="text-xs truncate" style={{ color: "#505050" }}>{kpis.estadoPiorMedia.nome}</div>
                </div>
                <div className="text-right">
                  <ScoreNum v={kpis.estadoPiorMedia.media} />
                  <div className="mt-1"><Badge cat={kpis.estadoPiorMedia.categoria} /></div>
                </div>
              </div>
            ) : <span style={{ color: "#c8c8c8" }}>—</span>}
          </div>

          <div className="rounded-xl border bg-white px-4 py-3"
            style={{ borderColor: "#e8e8e8", borderTop: `3px solid ${kpis.estadoMelhorMedia ? COR[kpis.estadoMelhorMedia.categoria] : "#e8e8e8"}` }}>
            <p className="text-xs font-semibold mb-1.5" style={{ color: "#9f9f9f" }}>MENOR RISCO</p>
            {kpis.estadoMelhorMedia ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black" style={{ color: COR[kpis.estadoMelhorMedia.categoria] }}>
                    {kpis.estadoMelhorMedia.uf}
                  </div>
                  <div className="text-xs truncate" style={{ color: "#505050" }}>{kpis.estadoMelhorMedia.nome}</div>
                </div>
                <div className="text-right">
                  <ScoreNum v={kpis.estadoMelhorMedia.media} />
                  <div className="mt-1"><Badge cat={kpis.estadoMelhorMedia.categoria} /></div>
                </div>
              </div>
            ) : <span style={{ color: "#c8c8c8" }}>—</span>}
          </div>

          <div className="rounded-xl border bg-white px-4 py-3" style={{ borderColor: "#e8e8e8", borderTop: "3px solid #dc2626" }}>
            <p className="text-xs font-semibold mb-1.5" style={{ color: "#9f9f9f" }}>CIDADE MAIS CRÍTICA</p>
            {kpis.cidadeMaisCritica ? (
              <>
                <div className="font-black text-sm" style={{ color: "#1a1a1a" }}>{kpis.cidadeMaisCritica.cidade}</div>
                <div className="text-xs" style={{ color: "#9f9f9f" }}>{kpis.cidadeMaisCritica.uf}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <ScoreNum v={kpis.cidadeMaisCritica.mediaGeral} />
                  {kpis.cidadeMaisCritica.categoria && <Badge cat={kpis.cidadeMaisCritica.categoria} />}
                </div>
              </>
            ) : <span style={{ color: "#c8c8c8" }}>—</span>}
          </div>

          <div className="rounded-xl border bg-white px-4 py-3" style={{ borderColor: "#e8e8e8", borderTop: "3px solid #1d4ed8" }}>
            <p className="text-xs font-semibold mb-1.5" style={{ color: "#9f9f9f" }}>MAIOR CONCENTRAÇÃO</p>
            {kpis.concentracao ? (
              <>
                <div className="text-2xl font-black" style={{ color: "#1d4ed8" }}>{kpis.concentracao.percentual}%</div>
                <div className="text-xs" style={{ color: "#505050" }}>das empresas em <strong>{kpis.concentracao.uf}</strong></div>
                <div className="text-xs" style={{ color: "#9f9f9f" }}>{kpis.concentracao.nome}</div>
              </>
            ) : <span style={{ color: "#c8c8c8" }}>—</span>}
            {kpis.empresasSemGeo > 0 && (
              <div className="text-xs mt-2" style={{ color: "#d97706" }}>⚠ {kpis.empresasSemGeo} sem localização</div>
            )}
          </div>

          {/* Resumo geral */}
          <div className="rounded-xl border bg-white px-4 py-3" style={{ borderColor: "#e8e8e8" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#9f9f9f" }}>COBERTURA</p>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg py-2" style={{ background: "#f9fafb" }}>
                <div className="text-xl font-black" style={{ color: "#006635" }}>{kpis.totalEstados}</div>
                <div className="text-xs" style={{ color: "#9f9f9f" }}>estados</div>
              </div>
              <div className="rounded-lg py-2" style={{ background: "#f9fafb" }}>
                <div className="text-xl font-black" style={{ color: "#006635" }}>{kpis.totalCidades}</div>
                <div className="text-xs" style={{ color: "#9f9f9f" }}>municípios</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#f1f1f1" }}>
        {([
          { key: "estados", label: "Por Estado", icon: "🗺" },
          { key: "regioes", label: "Por Região", icon: "🇧🇷" },
          { key: "cidades", label: "Municípios",  icon: "🏙" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5"
            style={{
              background: tab === t.key ? "#fff" : "transparent",
              color: tab === t.key ? "#1a1a1a" : "#9f9f9f",
              boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Por Estado ───────────────────────────────── */}
      {tab === "estados" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <input value={buscaEstado} onChange={e => setBuscaEstado(e.target.value)}
                placeholder="Buscar estado..."
                className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-0"
                style={{ borderColor: "#e8e8e8", outline: "none", maxWidth: 200 }} />
              <div className="flex gap-1 rounded-lg overflow-hidden border" style={{ borderColor: "#e8e8e8" }}>
                {([["risco","Risco"],["empresas","Empresas"],["nome","A-Z"]] as const).map(([k,l]) => (
                  <button key={k} onClick={() => setOrdenacao(k)}
                    className="px-3 py-2 text-xs font-semibold transition-colors"
                    style={{ background: ordenacao === k ? "#006635" : "#fff", color: ordenacao === k ? "#fff" : "#9f9f9f" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {estadosFiltrados.map(e => {
                const isSelected = selectedUF === e.uf
                return (
                  <div key={e.uf}>
                    <button
                      onClick={() => setSelectedUF(isSelected ? null : e.uf)}
                      className="w-full rounded-xl border bg-white px-4 py-3 text-left transition-all hover:shadow-md"
                      style={{
                        borderColor: isSelected ? "#006635" : "#e8e8e8",
                        borderWidth: isSelected ? "2px" : "1px",
                        boxShadow: isSelected ? "0 0 0 3px rgba(0,102,53,0.08)" : undefined,
                      }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
                          style={{
                            background: e.mediaGeral !== null ? (e.mediaGeral >= 3.7 ? "#fef2f2" : e.mediaGeral >= 2.3 ? "#fffbeb" : "#f0fdf4") : "#f1f1f1",
                            color: e.mediaGeral !== null ? COR[e.categoria!] : "#9f9f9f",
                          }}>
                          {e.uf}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm truncate" style={{ color: "#1a1a1a" }}>{e.nome}</span>
                            <span className="text-xs shrink-0" style={{ color: "#9f9f9f" }}>{e.regiao}</span>
                          </div>
                          <DistBar pctG={e.pctGrave} pctC={e.pctCritico} pctS={e.pctSatisfatorio} total={e.empresasComRelatorio} />
                          <div className="flex gap-3 mt-1 text-xs" style={{ color: "#9f9f9f" }}>
                            <span>{e.totalEmpresas} empresa{e.totalEmpresas !== 1 ? "s" : ""}</span>
                            <span>{e.empresasComRelatorio} avaliada{e.empresasComRelatorio !== 1 ? "s" : ""}</span>
                            {e.empresasSemRelatorio > 0 && <span style={{ color: "#d97706" }}>⚠ {e.empresasSemRelatorio} sem relatório</span>}
                          </div>
                        </div>
                        <div className="shrink-0 text-right flex items-center gap-2">
                          <ScoreNum v={e.mediaGeral} />
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            style={{ color: "#9f9f9f", transform: isSelected ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {isSelected && cidadesDrillDown.length > 0 && (
                      <div className="ml-4 mt-1 rounded-xl border overflow-hidden"
                        style={{ borderColor: "#86efac", background: "#f0fdf4" }}>
                        <div className="px-4 py-2 border-b font-semibold text-xs flex items-center justify-between"
                          style={{ borderColor: "#bbf7d0", color: "#15803d" }}>
                          <span>Municípios em {e.nome}</span>
                          <span style={{ color: "#9f9f9f" }}>{cidadesDrillDown.length} cidade{cidadesDrillDown.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="divide-y" style={{ borderColor: "#dcfce7" }}>
                          {cidadesDrillDown.map(c => (
                            <div key={c.cidade} className="px-4 py-2.5 flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>{c.cidade}</div>
                                <div className="text-xs" style={{ color: "#9f9f9f" }}>
                                  {c.totalEmpresas} empresa{c.totalEmpresas !== 1 ? "s" : ""}
                                  {c.empresasComRelatorio > 0 && ` · ${c.empresasComRelatorio} avaliada${c.empresasComRelatorio !== 1 ? "s" : ""}`}
                                </div>
                                <div className="mt-1">
                                  <DistBar pctG={c.pctGrave} pctC={c.pctCritico} pctS={c.pctSatisfatorio} total={c.empresasComRelatorio} />
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <ScoreNum v={c.mediaGeral} />
                                {c.categoria && <div className="mt-1"><Badge cat={c.categoria} /></div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {isSelected && cidadesDrillDown.length === 0 && (
                      <div className="ml-4 mt-1 px-4 py-3 rounded-xl text-sm"
                        style={{ background: "#f9fafb", border: "1px solid #e8e8e8", color: "#9f9f9f" }}>
                        Nenhum município com dados geográficos registrado.
                      </div>
                    )}
                  </div>
                )
              })}
              {estadosFiltrados.length === 0 && (
                <div className="text-center py-12" style={{ color: "#9f9f9f" }}>Nenhum estado encontrado.</div>
              )}
            </div>
          </div>

          {/* Painel lateral */}
          <div>
            {estadoSelected ? (
              <div className="rounded-xl border bg-white p-5 sticky top-4"
                style={{ borderColor: "#e8e8e8", borderTop: `3px solid ${estadoSelected.mediaGeral !== null ? COR[estadoSelected.categoria!] : "#e8e8e8"}` }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-3xl font-black" style={{ color: "#1a1a1a" }}>{estadoSelected.uf}</div>
                    <div className="text-sm font-semibold" style={{ color: "#505050" }}>{estadoSelected.nome}</div>
                    <div className="text-xs" style={{ color: "#9f9f9f" }}>{estadoSelected.regiao}</div>
                  </div>
                  {estadoSelected.mediaGeral !== null && (
                    <div className="text-right">
                      <ScoreNum v={estadoSelected.mediaGeral} size="lg" />
                      <div className="mt-1"><Badge cat={estadoSelected.categoria!} /></div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Empresas", val: estadoSelected.totalEmpresas, cor: "#1a1a1a" },
                    { label: "Avaliadas", val: estadoSelected.empresasComRelatorio, cor: "#006635" },
                    { label: "Pendentes", val: estadoSelected.empresasSemRelatorio, cor: estadoSelected.empresasSemRelatorio > 0 ? "#d97706" : "#9f9f9f" },
                  ].map(item => (
                    <div key={item.label} className="text-center p-2 rounded-lg" style={{ background: "#f9fafb" }}>
                      <div className="text-lg font-black" style={{ color: item.cor }}>{item.val}</div>
                      <div className="text-xs" style={{ color: "#9f9f9f" }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                {estadoSelected.empresasComRelatorio > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold mb-2" style={{ color: "#9f9f9f" }}>DISTRIBUIÇÃO</p>
                    <DistBar pctG={estadoSelected.pctGrave} pctC={estadoSelected.pctCritico} pctS={estadoSelected.pctSatisfatorio} total={estadoSelected.empresasComRelatorio} />
                    <div className="flex justify-between mt-1 text-xs">
                      <span style={{ color: "#dc2626" }}>Grave {estadoSelected.pctGrave}%</span>
                      <span style={{ color: "#d97706" }}>Crítico {estadoSelected.pctCritico}%</span>
                      <span style={{ color: "#059669" }}>Sat. {estadoSelected.pctSatisfatorio}%</span>
                    </div>
                  </div>
                )}

                {estadoSelected.mediaDimensao1 !== null && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs font-semibold" style={{ color: "#9f9f9f" }}>POR DIMENSÃO</p>
                    <DimBar label="Organização" val={estadoSelected.mediaDimensao1} />
                    <DimBar label="Condições" val={estadoSelected.mediaDimensao2} />
                    <DimBar label="Relações" val={estadoSelected.mediaDimensao3} />
                  </div>
                )}

                {estadoSelected.empresasLista.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: "#9f9f9f" }}>EMPRESAS</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {estadoSelected.empresasLista.map((emp, i) => (
                        <div key={i} className="flex items-center justify-between py-1 text-xs">
                          <span className="truncate flex-1 mr-2" style={{ color: "#1a1a1a" }}>{emp.nome}</span>
                          {emp.media !== null ? (
                            <span className="font-bold shrink-0" style={{ color: COR[emp.cat!] ?? "#9f9f9f" }}>
                              {emp.media.toFixed(1)}
                            </span>
                          ) : <span style={{ color: "#c8c8c8" }}>—</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border bg-white p-6 text-center" style={{ borderColor: "#e8e8e8" }}>
                <div className="text-4xl mb-3">🗺</div>
                <p className="text-sm font-semibold mb-1" style={{ color: "#505050" }}>Selecione um estado</p>
                <p className="text-xs" style={{ color: "#9f9f9f" }}>
                  Clique no mapa ou em qualquer linha para ver detalhes por município e dimensão.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Por Região ──────────────────────────────── */}
      {tab === "regioes" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {porRegiao.map(r => {
              const cfg = REGIAO_CONFIG[r.regiao] ?? REGIAO_CONFIG["Outros"]
              return (
                <div key={r.regiao} className="rounded-xl border bg-white overflow-hidden"
                  style={{ borderColor: "#e8e8e8", borderTop: `3px solid ${cfg.cor}` }}>
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{cfg.emoji}</span>
                        <div>
                          <div className="font-black text-base" style={{ color: "#1a1a1a" }}>{r.regiao}</div>
                          <div className="text-xs" style={{ color: "#9f9f9f" }}>{r.estados.join(" · ")}</div>
                        </div>
                      </div>
                      {r.mediaGeral !== null && (
                        <div className="text-right">
                          <ScoreNum v={r.mediaGeral} />
                          <div className="mt-1"><Badge cat={r.categoria!} /></div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: "Total",     val: r.totalEmpresas,       cor: "#1a1a1a" },
                        { label: "Avaliadas", val: r.empresasComRelatorio, cor: "#006635" },
                        { label: "Pendentes", val: r.empresasSemRelatorio, cor: r.empresasSemRelatorio > 0 ? "#d97706" : "#9f9f9f" },
                      ].map(item => (
                        <div key={item.label} className="text-center p-2 rounded-lg" style={{ background: "#f9fafb" }}>
                          <div className="text-lg font-black" style={{ color: item.cor }}>{item.val}</div>
                          <div className="text-xs" style={{ color: "#9f9f9f" }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                    {r.empresasComRelatorio > 0 && (
                      <>
                        <DistBar pctG={r.pctGrave} pctC={r.pctCritico} pctS={r.pctSatisfatorio} total={r.empresasComRelatorio} />
                        <div className="flex justify-between mt-1.5 text-xs">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#dc2626" }} />
                            <span style={{ color: "#dc2626" }}>{r.distribuicao.grave} Grave</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#d97706" }} />
                            <span style={{ color: "#d97706" }}>{r.distribuicao.critico} Crítico</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#059669" }} />
                            <span style={{ color: "#059669" }}>{r.distribuicao.satisfatorio} Sat.</span>
                          </span>
                        </div>
                      </>
                    )}
                    {r.totalEmpresas > 0 && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: "#f1f1f1" }}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs" style={{ color: "#9f9f9f" }}>Taxa de avaliação</span>
                          <span className="text-xs font-bold" style={{ color: cfg.cor }}>
                            {Math.round((r.empresasComRelatorio / r.totalEmpresas) * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: "#f1f1f1" }}>
                          <div className="h-1.5 rounded-full transition-all"
                            style={{ width: `${(r.empresasComRelatorio / r.totalEmpresas) * 100}%`, background: cfg.cor }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {porRegiao.length > 1 && (
            <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: "#e8e8e8" }}>
              <div className="px-5 py-4 border-b font-bold text-sm" style={{ borderColor: "#f1f1f1" }}>Comparativo entre Regiões</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: "#f9fafb" }}>
                    <tr>
                      {["Região","Empresas","Avaliadas","Média","Classificação","Distribuição de Risco"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#6b7280" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...porRegiao].sort((a, b) => (b.mediaGeral ?? 0) - (a.mediaGeral ?? 0)).map((r, i) => (
                      <tr key={r.regiao} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderTop: "1px solid #f1f1f1" }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{REGIAO_CONFIG[r.regiao]?.emoji}</span>
                            <span className="font-semibold" style={{ color: "#1a1a1a" }}>{r.regiao}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: "#1a1a1a" }}>{r.totalEmpresas}</td>
                        <td className="px-4 py-3" style={{ color: "#6b7280" }}>{r.empresasComRelatorio}</td>
                        <td className="px-4 py-3"><ScoreNum v={r.mediaGeral} /></td>
                        <td className="px-4 py-3">{r.categoria ? <Badge cat={r.categoria} /> : "—"}</td>
                        <td className="px-4 py-3 min-w-32">
                          <DistBar pctG={r.pctGrave} pctC={r.pctCritico} pctS={r.pctSatisfatorio} total={r.empresasComRelatorio} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Municípios ──────────────────────────────── */}
      {tab === "cidades" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <input value={buscaCidade} onChange={e => setBuscaCidade(e.target.value)}
              placeholder="Buscar município..."
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: "#e8e8e8", outline: "none", width: 200 }} />
            <select value={cidadeFiltroUF} onChange={e => setCidadeFiltroUF(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: "#e8e8e8", outline: "none" }}>
              <option value="todos">Todos os estados</option>
              {porEstado.map(e => <option key={e.uf} value={e.uf}>{e.uf} — {e.nome}</option>)}
            </select>
            <span className="text-xs" style={{ color: "#9f9f9f" }}>
              {cidadesFiltradas.length} município{cidadesFiltradas.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: "#e8e8e8" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: "#f9fafb", borderBottom: "2px solid #f1f1f1" }}>
                  <tr>
                    {["#","Município","Estado","Região","Empresas","Avaliadas","Média","Classificação","Distribuição de Risco"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: "#6b7280" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cidadesFiltradas.map((c, i) => (
                    <tr key={`${c.cidade}-${c.uf}`}
                      style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderTop: "1px solid #f1f1f1" }}>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: "#9f9f9f" }}>{i + 1}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "#1a1a1a" }}>{c.cidade}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-xs px-2 py-0.5 rounded" style={{ background: "#f1f1f1", color: "#505050" }}>{c.uf}</span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#6b7280" }}>{c.regiao}</td>
                      <td className="px-4 py-3 font-semibold text-center" style={{ color: "#1a1a1a" }}>{c.totalEmpresas}</td>
                      <td className="px-4 py-3 text-center" style={{ color: "#6b7280" }}>{c.empresasComRelatorio}</td>
                      <td className="px-4 py-3"><ScoreNum v={c.mediaGeral} /></td>
                      <td className="px-4 py-3">
                        {c.categoria ? <Badge cat={c.categoria} /> : <span style={{ color: "#9f9f9f", fontSize: "0.75rem" }}>Sem relatório</span>}
                      </td>
                      <td className="px-4 py-3 min-w-28">
                        <DistBar pctG={c.pctGrave} pctC={c.pctCritico} pctS={c.pctSatisfatorio} total={c.empresasComRelatorio} />
                        <div className="text-xs mt-0.5">
                          {c.pctGrave > 0 && <span style={{ color: "#dc2626" }}>{c.pctGrave}% </span>}
                          {c.pctCritico > 0 && <span style={{ color: "#d97706" }}>{c.pctCritico}% </span>}
                          {c.pctSatisfatorio > 0 && <span style={{ color: "#059669" }}>{c.pctSatisfatorio}%</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {cidadesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center" style={{ color: "#9f9f9f" }}>Nenhum município encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
