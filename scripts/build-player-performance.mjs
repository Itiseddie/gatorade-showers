import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const sourceDirectory = process.argv[2]
const outputFile = process.argv[3]

if (!sourceDirectory || !outputFile) {
  throw new Error('Usage: node scripts/build-player-performance.mjs <nflverse-csv-directory> <output-json>')
}

function parseCsv(text) {
  const rows = []
  let row = [], cell = '', quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1 }
    else if (character === '"') quoted = !quoted
    else if (character === ',' && !quoted) { row.push(cell); cell = '' }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell)
      if (row.some(Boolean)) rows.push(row)
      row = []; cell = ''
    } else cell += character
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [headers, ...values] = rows
  return values.map((valuesRow) => Object.fromEntries(headers.map((header, index) => [header, valuesRow[index] ?? ''])))
}

const number = (value) => Number(value || 0)
const normalizedName = (value) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b/g, '')
  .replace(/[^a-z0-9]/g, '')

const positionGroup = (position) => ({ HB: 'RB', FB: 'RB' })[position] ?? position

const manualInjuryEvidence = new Map([
  [`2015|${normalizedName("Le'Veon Bell")}`, { injury: 'Knee', source: 'https://www.nfl.com/news/le-veon-bell-suffers-knee-injury-in-steelers-loss-0ap3000000569888' }],
  [`2015|${normalizedName('Jamaal Charles')}`, { injury: 'Torn ACL', source: 'https://www.nfl.com/_amp/jamaal-charles-out-for-season-with-torn-acl-0ap3000000555626' }],
  [`2017|${normalizedName('David Johnson')}`, { injury: 'Dislocated wrist', source: 'https://www.nfl.com/news/fantasy-football-impact-of-david-johnson-injury-0ap3000000843343' }],
  [`2020|${normalizedName('Saquon Barkley')}`, { injury: 'Torn ACL', source: 'https://www.nfl.com/news/giants-rb-saquon-barkley-carted-off-in-2q-vs-bears' }],
  [`2021|${normalizedName('Derrick Henry')}`, { injury: 'Foot fracture', source: 'https://www.nfl.com/news/titans-designate-rb-derrick-henry-to-return-from-injured-reserve' }],
  [`2023|${normalizedName('Nick Chubb')}`, { injury: 'Knee ligament damage', source: 'https://www.nfl.com/news/browns-rb-nick-chubb-undergoes-successful-knee-surgery' }],
  [`2024|${normalizedName('Christian McCaffrey')}`, { injury: 'Achilles/calf and PCL', source: 'https://www.nfl.com/news/niners-placing-christian-mccaffrey-knee-on-injured-reserve-rb-to-miss-at-least-six-weeks' }],
  [`2025|${normalizedName('Tyreek Hill')}`, { injury: 'Dislocated knee and torn ligaments', source: 'https://www.nfl.com/news/miami-dolphins-wr-tyreek-hill-tore-multiple-ligaments-including-acl-and-will-undergo-surgery-tuesday' }],
  [`2025|${normalizedName('Malik Nabers')}`, { injury: 'Torn ACL', source: 'https://www.nfl.com/_amp/malik-nabers-torn-acl-out-for-2025-season-giants' }],
])

function fantasyPoints(row, halfPpr) {
  const points = number(row.passing_yards) * 0.04
    + number(row.passing_tds) * 4
    - number(row.passing_interceptions)
    + number(row.rushing_yards) * 0.1
    + number(row.rushing_tds) * 6
    + number(row.receiving_yards) * 0.1
    + number(row.receiving_tds) * 6
    + (halfPpr ? number(row.receptions) * 0.5 : 0)
    + (number(row.passing_2pt_conversions) + number(row.rushing_2pt_conversions) + number(row.receiving_2pt_conversions)) * 2
    + number(row.special_teams_tds) * 6
    + number(row.fumble_recovery_tds) * 6
    - number(row.fumbles_lost_total) * 2
  return Math.round(points * 100) / 100
}

const draftText = await readFile(path.resolve('public/data/drafts.csv'), 'utf8')
const drafts = parseCsv(draftText).map((row) => ({
  year: Number(row.Year),
  pick: Number(row['Pick #']),
  manager: row.Manager === 'Richard' ? 'Rich' : row.Manager,
  player: row['Player Drafted'],
}))

const performances = []
const unmatched = []

for (const year of [...new Set(drafts.map((row) => row.year))].sort()) {
  const statsText = await readFile(path.join(sourceDirectory, `stats_player_reg_${year}.csv`), 'utf8')
  const injuriesText = await readFile(path.join(sourceDirectory, `injuries_${year}.csv`), 'utf8')
  const injuries = parseCsv(injuriesText)
  const stats = parseCsv(statsText)
    .filter((row) => ['QB', 'RB', 'WR', 'TE'].includes(positionGroup(row.position)))
    .map((row) => ({
      ...row,
      position: positionGroup(row.position),
      points: fantasyPoints(row, year >= 2017),
    }))
  const ranked = new Map()
  for (const position of ['QB', 'RB', 'WR', 'TE']) {
    stats.filter((row) => row.position === position)
      .sort((a, b) => b.points - a.points || b.games - a.games || a.player_display_name.localeCompare(b.player_display_name))
      .forEach((row, index) => ranked.set(row.player_id, index + 1))
  }
  const byName = new Map(stats.map((row) => [normalizedName(row.player_display_name), row]))
  for (const draft of drafts.filter((row) => row.year === year)) {
    const stat = byName.get(normalizedName(draft.player))
    if (!stat) {
      if (year === 2018 && normalizedName(draft.player) === normalizedName("Le'Veon Bell")) {
        const runningBackCount = stats.filter((row) => row.position === 'RB').length
        performances.push({
          ...draft,
          playerId: '00-0029615',
          position: 'RB',
          team: 'PIT',
          games: 0,
          teamGames: 16,
          points: 0,
          positionalRank: runningBackCount + 1,
          grade: 'Bust',
          injuryVerified: false,
          absenceReason: 'Season-long contract holdout',
        })
        continue
      }
      unmatched.push(draft); continue
    }
    const positionalRank = ranked.get(stat.player_id)
    const teamGames = year <= 2020 ? 16 : 17
    const injuryNames = [...new Set(injuries
      .filter((row) => row.gsis_id === stat.player_id)
      .flatMap((row) => [row.report_primary_injury, row.practice_primary_injury])
      .filter((name) => name && !name.toLowerCase().startsWith('not injury related')))]
    const manualEvidence = manualInjuryEvidence.get(`${year}|${normalizedName(draft.player)}`)
    const injuryVerified = number(stat.games) < teamGames / 2 && (injuryNames.length > 0 || manualEvidence)
    const grade = injuryVerified ? 'Injury Bust' : positionalRank <= 3 ? 'Smash Hit' : positionalRank <= 8 ? 'Hit' : positionalRank <= 25 ? 'Fine' : 'Bust'
    performances.push({
      ...draft,
      playerId: stat.player_id,
      position: stat.position,
      team: stat.recent_team,
      games: number(stat.games),
      teamGames,
      points: stat.points,
      positionalRank,
      grade,
      injuryVerified,
      ...(injuryVerified ? {
        injury: manualEvidence?.injury ?? injuryNames.join(', '),
        injurySource: manualEvidence?.source ?? `https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_${year}.csv`,
      } : {}),
    })
  }
}

performances.sort((a, b) => b.year - a.year || a.pick - b.pick)
await writeFile(outputFile, `${JSON.stringify({
  methodology: {
    scoring: { '2012-2016': 'Standard', '2017-2025': 'Half-PPR' },
    grades: { 'Smash Hit': 'Position rank 1-3', Hit: 'Position rank 4-8', Fine: 'Position rank 9-25', Bust: 'Position rank 26+', 'Injury Bust': 'Missed more than half of the season because of a verified injury' },
    sources: ['nflverse regular-season player statistics', 'nflverse weekly injury reports'],
  },
  picks: performances,
}, null, 2)}\n`, 'utf8')

console.log(JSON.stringify({ matched: performances.length, unmatched }, null, 2))
