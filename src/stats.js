export const MANAGER_ALIASES = Object.freeze({ Richard: 'Rich' })

export const normalizeManager = (name) => MANAGER_ALIASES[name] ?? name

export function parseCsv(text) {
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i += 1 }
    else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { row.push(cell); cell = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell)
      if (row.some(Boolean)) rows.push(row)
      row = []; cell = ''
    } else cell += char
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [headers, ...values] = rows
  return values.map((valuesRow) => Object.fromEntries(headers.map((header, index) => [header, valuesRow[index] ?? ''])))
}

export function cleanDrafts(rows) {
  return rows.map((row) => ({
    year: Number(row.Year),
    pick: Number(row['Pick #']),
    manager: normalizeManager(row.Manager),
    player: row['Player Drafted'],
    faab: row['FAAB Remaining'] === '' ? null : Number(row['FAAB Remaining']),
  }))
}

export function podiumStats(seasons) {
  const map = new Map()
  const touch = (rawName) => {
    const name = normalizeManager(rawName)
    if (!map.has(name)) map.set(name, { manager: name, championships: 0, runnerUps: 0, thirds: 0, podiums: 0 })
    return map.get(name)
  }
  seasons.forEach(({ champion, runnerUp, third }) => {
    touch(champion).championships += 1
    touch(runnerUp).runnerUps += 1
    touch(third).thirds += 1
  })
  map.forEach((entry) => { entry.podiums = entry.championships + entry.runnerUps + entry.thirds })
  return [...map.values()].sort((a, b) => b.championships - a.championships || b.podiums - a.podiums || a.manager.localeCompare(b.manager))
}

export function draftAverages(rows) {
  const map = new Map()
  rows.forEach(({ manager, pick }) => {
    if (!map.has(manager)) map.set(manager, { manager, picks: [], seasons: 0, topThree: 0, numberOnes: 0 })
    const entry = map.get(manager)
    entry.picks.push(pick); entry.seasons += 1
    if (pick <= 3) entry.topThree += 1
    if (pick === 1) entry.numberOnes += 1
  })
  return [...map.values()].map((entry) => ({ ...entry, average: entry.picks.reduce((sum, pick) => sum + pick, 0) / entry.picks.length }))
    .sort((a, b) => a.average - b.average || b.seasons - a.seasons)
}

export function championDrafts(seasons, drafts) {
  const draftIndex = new Map(drafts.map((draft) => [`${draft.year}|${draft.manager}`, draft]))
  return seasons.map((season) => ({ ...season, draft: draftIndex.get(`${season.year}|${normalizeManager(season.champion)}`) }))
    .filter((season) => season.draft)
}

export function championshipsBySlot(championRows) {
  const slots = Array.from({ length: 12 }, (_, index) => ({ pick: index + 1, championships: 0 }))
  championRows.forEach(({ draft }) => { slots[draft.pick - 1].championships += 1 })
  return slots
}

export function playerStats(rows) {
  const players = new Map(), pairs = new Map()
  rows.forEach(({ player, manager, pick, year }) => {
    if (!players.has(player)) players.set(player, { player, appearances: 0, managers: new Set(), picks: [], years: [] })
    const entry = players.get(player)
    entry.appearances += 1; entry.managers.add(manager); entry.picks.push(pick); entry.years.push(year)
    const key = `${manager}|${player}`
    if (!pairs.has(key)) pairs.set(key, { manager, player, count: 0 })
    pairs.get(key).count += 1
  })
  const leaders = [...players.values()].map((entry) => ({ ...entry, managers: [...entry.managers], minPick: Math.min(...entry.picks), maxPick: Math.max(...entry.picks) }))
    .sort((a, b) => b.appearances - a.appearances || b.managers.length - a.managers.length || a.player.localeCompare(b.player))
  const repeats = [...pairs.values()].filter((pair) => pair.count > 1).sort((a, b) => b.count - a.count || a.manager.localeCompare(b.manager))
  return { leaders, repeats }
}
