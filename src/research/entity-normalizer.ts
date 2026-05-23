// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Entity Normalizer
//
// Transforms raz--o social into canonical names, aliases and
// search terms for website/social/news discovery.
//
// Example:
// "WOOD PACK INDUSTRIA E COMERCIO LTDA"
// --- canonical: "Wood Pack"
// --- aliases: ["WoodPack", "Wood Pack Ind--stria", "Wood Pack Embalagens"]
// --- search_terms: ["Wood Pack", "Wood Pack empresa", "site:woodpack.com.br"]
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// --------- Tokens to strip ---------------------------------------------------------------------------------------------------------------------------

const STRIP_TOKENS = [
  // Legal suffixes
  "LTDA", "EIRELI", "ME", "EPP", "S/A", "SA", "SS", "SLU",
  "SOCIEDADE LIMITADA", "SOCIEDADE ANONIMA",
  // Generic qualifiers
  "INDUSTRIA E COMERCIO", "INDUSTRIA E COMÉRCIO", "INDUSTRIA",
  "COMERCIO", "COMÉRCIO", "SERVICOS", "SERVIÇOS", "IMPORTACAO",
  "EXPORTACAO", "IMPORTAÇÃO", "EXPORTAÇÃO", "DISTRIBUICAO",
  "DISTRIBUIÇÃO", "PARTICIPACOES", "PARTICIPAÇÕES",
  "ADMINISTRACAO", "ADMINISTRAÇÃO", "HOLDING", "GESTAO", "GESTÃO",
  "E COMERCIO", "E COMÉRCIO", "E CIA", "E COMPANHIA",
  "SOLUCOES", "SOLUÇÕES", "TECNOLOGIA", "EMPREENDIMENTOS",
  "REPRESENTACOES", "REPRESENTAÇÕES",
]

// CNAE-derived product hints (to generate aliases)
const CNAE_PRODUCT_MAP: Record<string, string[]> = {
  embalagem:    ["Embalagens", "Packaging"],
  alimento:     ["Alimentos", "Foods"],
  metalurgi:    ["Metal", "Metalúrgica"],
  confecção:    ["Moda", "Confecções"],
  construct:    ["Construção", "Obras"],
  farmacêut:    ["Farma", "Saúde"],
  eletrôn:      ["Eletrônica", "Tech"],
  transpor:     ["Logística", "Transporte"],
  educac:       ["Educação", "Ensino"],
  restauran:    ["Gastronomia", "Restaurante"],
}

// --------- Core normalizer ------------------------------------------------------------------------------------------------------------------------------

export interface CompanyIdentity {
  canonical_name:  string    // "Wood Pack" — used as primary search term
  short_name:      string    // "Wood" or "WoodPack" — 1-2 word version
  aliases:         string[]  // alternative names to try
  search_terms:    string[]  // ready to use in search queries
  domain_guesses:  string[]  // probable domain names
  nome_fantasia?:  string    // if available from Receita
}

export function normalizeCompanyIdentity(
  razao_social:   string,
  nome_fantasia?: string | null,
  municipio?:     string | null,
  cnae_descricao?: string | null,
): CompanyIdentity {
  // ------ Prefer nome_fantasia if clean and meaningful ------------------------------
  const fantasia = nome_fantasia && nome_fantasia.length > 3 &&
    !["MATRIZ","FILIAL","ESTABELECIMENTO"].includes(nome_fantasia.toUpperCase())
    ? nome_fantasia : null

  // ------ Clean raz--o social ------------------------------------------------------------------------------------------------------------
  let clean = (razao_social ?? "").toUpperCase()

  // Remove all strip tokens
  for (const token of STRIP_TOKENS) {
    clean = clean.replace(new RegExp(`\\b${token}\\b`, "g"), "").trim()
  }

  // Remove trailing punctuation and extra spaces
  clean = clean.replace(/[,./\\-]+$/, "").replace(/\s+/g, " ").trim()

  // Title case
  function toTitle(s: string): string {
    const skipWords = new Set(["e", "de", "da", "do", "das", "dos", "em", "a", "o", "as", "os"])
    return s.toLowerCase().split(" ").map((w, i) => i === 0 || !skipWords.has(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(" ")
  }

  const canonical_name = fantasia ? toTitle(fantasia) : toTitle(clean)
  const words          = canonical_name.split(" ").filter(w => w.length > 1)
  const short_name     = words.length >= 2 ? words.slice(0, 2).join(" ") : words[0] ?? canonical_name

  // ------ Aliases ---------------------------------------------------------------------------------------------------------------------------------------------
  const aliases: string[] = [canonical_name]

  // Without spaces: "WoodPack"
  const nospaces = words.join("")
  if (nospaces !== canonical_name && nospaces.length > 3) aliases.push(nospaces)

  // First word only if meaningful
  if (words[0] && words[0].length >= 4 && !aliases.includes(words[0])) aliases.push(words[0])

  // With city if provided
  if (municipio && municipio.length > 2) {
    aliases.push(`${short_name} ${toTitle(municipio)}`)
  }

  // CNAE-based product alias
  if (cnae_descricao) {
    const cnaeLower = cnae_descricao.toLowerCase()
    for (const [key, products] of Object.entries(CNAE_PRODUCT_MAP)) {
      if (cnaeLower.includes(key)) {
        aliases.push(`${short_name} ${products[0]}`)
        break
      }
    }
  }

  // De-duplicate
  const uniqueAliases = [...new Set(aliases)].slice(0, 5)

  // ------ Search terms ------------------------------------------------------------------------------------------------------------------------------
  const search_terms = [
    canonical_name,
    `"${canonical_name}"`,
    `${canonical_name} empresa`,
    `${short_name} site oficial`,
    municipio ? `${short_name} ${municipio}` : null,
    cnae_descricao ? `${short_name} ${cnae_descricao.split(" ").slice(0,2).join(" ")}` : null,
  ].filter((x): x is string => Boolean(x)).slice(0, 6)

  // ------ Domain guesses ------------------------------------------------------------------------------------------------------------------------
  const slug = (s: string) => s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")

  const slugCanonical = slug(canonical_name)
  const slugShort     = slug(short_name)
  const slugNospace   = slug(nospaces)

  const domain_guesses = [
    `https://www.${slugShort}.com.br`,
    `https://www.${slugCanonical}.com.br`,
    `https://www.${slugNospace}.com.br`,
    `https://${slugShort}.com.br`,
    `https://www.${slugShort}.com`,
    `https://www.${slugCanonical}.com`,
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5)

  return {
    canonical_name,
    short_name,
    aliases:      uniqueAliases,
    search_terms,
    domain_guesses,
    nome_fantasia: fantasia ?? undefined,
  }
}
