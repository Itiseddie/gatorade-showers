import './style.css'
import { parseCsv, cleanDrafts, podiumStats, draftAverages, championDrafts, championshipsBySlot, playerStats, normalizeManager, managerSeasonCounts, faabStats } from './stats.js'

const base = import.meta.env.BASE_URL
const app = document.querySelector('#app')
let champions = [], drafts = [], years = [], allManagers = []
const state = { manager: 'All managers', from: 0, to: 0, minSeasons: 3, podiumMetric: 'podiums', historyYear: 0, playerQuery: '' }
const esc = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char])
const format = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const icon = () => '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H5v1a4 4 0 0 0 4 4m7-5h3v1a4 4 0 0 1-4 4M12 13v4m-4 3h8m-6-3h4"/></svg>'

function statCard(label, value, note, tone = '') { return `<article class="stat-card ${tone}"><span>${label}</span><strong>${value}</strong><p>${note}</p></article>` }
function sectionHead(kicker, title, copy) { return `<div class="section-head"><p class="eyebrow">${kicker}</p><h2>${title}</h2><p>${copy}</p></div>` }

function horizontalBars(rows, valueKey, max, formatter, className = '', secondary = () => '') {
  if (!rows.length) return '<p class="empty">No results match these filters.</p>'
  return `<div class="h-bars ${className}">${rows.map((row, index) => {
    const width = max ? Math.max(row[valueKey] ? 3 : 0, (row[valueKey] / max) * 100) : 0
    const detail = row.detail ?? formatter(row)
    return `<button class="bar-row" type="button" aria-label="${esc(detail)}"><span class="rank">${index + 1}</span><span class="bar-label"><span class="bar-name">${esc(row.manager ?? row.player)}</span><small>${esc(secondary(row))}</small></span><span class="bar-track"><span class="bar-fill" style="width:${width}%"></span></span><strong>${esc(formatter(row))}</strong><span class="tap-tip">${esc(detail)}</span></button>`
  }).join('')}</div>`
}

function lotteryPlot(rows) {
  if (!rows.length) return '<p class="empty">No manager meets this season threshold in the selected range.</p>'
  return `<div class="lottery-plot"><div class="plot-axis"><span>Earlier picks</span><span>Later picks</span></div>${rows.map((row, index) => `<button class="dot-row" type="button" aria-label="${esc(`${row.manager}: pick ${row.average.toFixed(2)} average across ${row.seasons} seasons`)}"><span class="rank">${index + 1}</span><span class="bar-label"><span class="bar-name">${esc(row.manager)}</span><small>${row.seasons} season${row.seasons === 1 ? '' : 's'}</small></span><span class="dot-track"><i style="left:${Math.max(0, Math.min(100, ((row.average - 1) / 11) * 100))}%"></i></span><strong>${row.average.toFixed(2)}</strong><span class="tap-tip">${row.topThree} Top 3 pick${row.topThree === 1 ? '' : 's'}</span></button>`).join('')}<div class="tick-axis">${[1, 3, 5, 7, 9, 12].map((tick) => `<span style="left:${((tick - 1) / 11) * 100}%">${tick}</span>`).join('')}</div></div>`
}

function slotChart(rows) {
  const max = Math.max(...rows.map((row) => row.championships), 1)
  return `<div class="slot-chart" role="img" aria-label="Championships won by draft slot">${rows.map((row) => `<div class="slot-column"><strong>${row.championships}</strong><span class="column-track"><i style="height:${(row.championships / max) * 100}%"></i></span><small>#${row.pick}</small></div>`).join('')}</div>`
}

function seasonCard(season, active = false) {
  return `<button class="season-card ${active ? 'active' : ''}" type="button" data-history-year="${season.year}"><span class="season-year">${season.year}</span><span class="team-count">${season.teams ? `${season.teams} teams` : 'Team count unavailable'}</span><span class="placement champion"><i>1</i><span><small>Champion</small><b>${esc(season.champion)}</b></span></span><span class="placement"><i>2</i><span><small>Runner up</small><b>${esc(season.runnerUp)}</b></span></span><span class="placement"><i>3</i><span><small>Third place</small><b>${esc(season.third)}</b></span></span></button>`
}

function render() {
  const seasons = champions.filter((row) => row.year >= state.from && row.year <= state.to)
  const draftRows = drafts.filter((row) => row.year >= state.from && row.year <= state.to)
  const podium = podiumStats(seasons), seasonCounts = managerSeasonCounts(draftRows)
  const shownPodium = (state.manager === 'All managers' ? podium : podium.filter((row) => row.manager === state.manager)).sort((a, b) => b[state.podiumMetric] - a[state.podiumMetric] || b.podiums - a.podiums || a.manager.localeCompare(b.manager))
  const maxPodiumMetric = Math.max(...podium.map((row) => row[state.podiumMetric]), 1)
  const averages = draftAverages(draftRows)
  const eligible = averages.filter((row) => (state.minSeasons === 0 || row.seasons >= state.minSeasons) && (state.manager === 'All managers' || row.manager === state.manager))
  const comparisonPool = averages.filter((row) => state.minSeasons === 0 || row.seasons >= state.minSeasons)
  const champDraftRows = championDrafts(seasons, draftRows), slots = championshipsBySlot(champDraftRows), players = playerStats(draftRows)
  const query = state.playerQuery.trim().toLowerCase()
  const shownPlayers = players.leaders.filter((row) => !query || row.player.toLowerCase().includes(query) || row.managers.some((name) => name.toLowerCase().includes(query)))
  const faabRows = faabStats(draftRows).filter((row) => state.manager === 'All managers' || row.manager === state.manager)
  const faabYears = [...new Set(drafts.filter((row) => row.faab !== null).map((row) => row.year))].sort((a, b) => a - b)
  const selectedSeason = seasons.find((row) => row.year === state.historyYear) ?? seasons.at(-1)
  const managerPodium = state.manager === 'All managers' ? null : podium.find((row) => row.manager === state.manager)
  const allTimePodium = podiumStats(champions), allTimeLeader = allTimePodium[0]
  const uniqueChampions = new Set(champions.map((row) => row.champion)).size, maxTitles = Math.max(...allTimePodium.map((row) => row.championships))
  const podiumLeader = [...podium].sort((a, b) => b.podiums - a.podiums)[0], earliest = comparisonPool[0], latest = comparisonPool.at(-1)
  const fifth = slots.find((row) => row.pick === 5), averageChampPick = champDraftRows.length ? champDraftRows.reduce((sum, row) => sum + row.draft.pick, 0) / champDraftRows.length : 0
  const unlikely = champDraftRows.filter((row) => row.draft.pick >= 9).sort((a, b) => b.draft.pick - a.draft.pick)
  const metricLabels = { championships: 'Championships', runnerUps: 'Runner-up finishes', thirds: 'Third-place finishes', podiums: 'Total podiums' }

  app.innerHTML = `<header class="site-header"><a class="brand" href="#top"><span>GS</span><b>Gatorade Showers</b></a><button class="nav-toggle" type="button" aria-label="Toggle navigation">Menu</button><nav><a href="#overview">Overview</a><a href="#championships">Podiums</a><a href="#history">History</a><a href="#lottery">Lottery</a><a href="#players">Drafts</a><a href="#waivers">Waivers</a></nav></header><main id="top">
    <section class="hero" id="overview"><div class="hero-copy"><p class="eyebrow"><span></span>The official league record book</p><h1>Where legends are made.<br><em>And receipts are kept.</em></h1><p>Explore every championship, podium, first-round pick, and recorded waiver balance in Gatorade Showers history.</p><div class="hero-actions"><a class="button primary" href="#history">Browse every season</a><a class="button ghost" href="#championships">Open the trophy case</a></div></div><aside class="hero-score"><p>All-time title leader</p><div class="score-main"><span>${icon()}</span><strong>${allTimeLeader.championships}</strong></div><h2>${esc(allTimeLeader.manager)}</h2><small>${champions.length} recorded seasons · ${Math.min(...years)}–${Math.max(...years)}</small></aside></section>
    <section class="headline-stats" aria-label="League summary">${statCard('Recorded seasons', champions.length, `${Math.min(...years)}–${Math.max(...years)}`, 'dark')}${statCard('League champions', uniqueChampions, 'Different managers have lifted the trophy.', 'green')}${statCard('Most titles', maxTitles, `${allTimeLeader.manager} sets the standard.`, 'orange')}</section>
    <section class="filter-band" aria-label="Dashboard filters"><div><b>Filter the record book</b><span>Charts and season cards update together</span></div><label>Manager<select id="manager-filter"><option>All managers</option>${allManagers.map((name) => `<option ${name === state.manager ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></label><label>From<select id="from-year">${years.map((year) => `<option ${year === state.from ? 'selected' : ''}>${year}</option>`).join('')}</select></label><label>To<select id="to-year">${years.map((year) => `<option ${year === state.to ? 'selected' : ''}>${year}</option>`).join('')}</select></label><button id="reset-filters" class="text-button" type="button">Reset</button></section>

    <section class="section" id="championships">${sectionHead('01 · League legends', 'The podium room', 'Switch the result to compare titles, runner-up finishes, third places, or total podiums. Every manager includes the number of seasons played in the selected range.')}<div class="metric-tabs" role="group" aria-label="Podium result">${Object.entries(metricLabels).map(([key, label]) => `<button type="button" data-podium-metric="${key}" class="${state.podiumMetric === key ? 'active' : ''}">${label}</button>`).join('')}</div><div class="feature-grid"><article class="panel chart-panel"><div class="panel-title"><div><span>Manager ranking</span><h3>${state.podiumMetric === 'championships' ? 'Champions by Manager' : metricLabels[state.podiumMetric]}</h3></div><span class="live-badge">${seasons.length} seasons</span></div>${horizontalBars(shownPodium, state.podiumMetric, maxPodiumMetric, (row) => `${row[state.podiumMetric]}`, state.podiumMetric === 'championships' ? 'gold-bars' : 'podium-bars', (row) => `${seasonCounts.get(row.manager) ?? 0} season${(seasonCounts.get(row.manager) ?? 0) === 1 ? '' : 's'}`)}</article><aside class="callout-stack">${statCard('Titles leader', `${allTimeLeader.championships}×`, `${allTimeLeader.manager} owns the all-time record.`, 'dark')}${statCard('Podium leader', podiumLeader?.podiums ?? 0, `${podiumLeader?.manager ?? 'No one'} in this range.`)}${managerPodium ? statCard(`${managerPodium.manager}'s years`, managerPodium.podiums, managerPodium.years.length ? managerPodium.years.sort((a,b)=>a-b).join(' · ') : 'No podiums in this range.', 'orange') : statCard('Explore a manager', '↗', 'Choose a manager above to reveal every year they podiumed.', 'orange')}</aside></div></section>

    <section class="section alt" id="history">${sectionHead('02 · Season by season', 'The league board', 'Pick a season to inspect its podium, then scroll the cards to browse the full history.')}${selectedSeason ? `<div class="selected-season"><span>${selectedSeason.year}</span><div><small>Champion</small><strong>${esc(selectedSeason.champion)}</strong></div><div><small>Runner up</small><strong>${esc(selectedSeason.runnerUp)}</strong></div><div><small>Third place</small><strong>${esc(selectedSeason.third)}</strong></div><b>${selectedSeason.teams ?? '—'} teams</b></div>` : '<p class="empty">No seasons match this range.</p>'}<div class="season-rail" aria-label="League seasons">${seasons.map((season) => seasonCard(season, selectedSeason?.year === season.year)).join('')}</div></section>

    <section class="section" id="lottery">${sectionHead('03 · The annual conspiracy', 'Is the draft lottery rigged?', 'Lower is luckier. Set the sample-size threshold yourself, or turn it off to see everyone.')}<div class="section-control"><label>Minimum seasons<select id="minimum-seasons"><option value="0" ${state.minSeasons === 0 ? 'selected' : ''}>No minimum</option><option value="1" ${state.minSeasons === 1 ? 'selected' : ''}>1 season</option><option value="3" ${state.minSeasons === 3 ? 'selected' : ''}>3 seasons</option><option value="5" ${state.minSeasons === 5 ? 'selected' : ''}>5 seasons</option></select></label></div><div class="feature-grid wide-chart"><article class="panel chart-panel"><div class="panel-title"><div><span>Historical average</span><h3>Average first-round draft position</h3></div><span class="live-badge">${state.minSeasons ? `Min. ${state.minSeasons} seasons` : 'Everyone'}</span></div>${lotteryPlot(eligible)}</article><aside class="callout-stack">${earliest ? statCard('Luckiest average', `#${earliest.average.toFixed(2)}`, `${earliest.manager}, ${earliest.seasons} seasons.`, 'green') : ''}${latest ? statCard('Latest average', `#${latest.average.toFixed(2)}`, `${latest.manager}, ${latest.seasons} seasons.`, 'dark') : ''}${latest ? statCard('Top-three picks', latest.topThree, `${latest.manager}'s total in this range.`, 'orange') : ''}</aside></div></section>

    <section class="section alt" id="draft-position">${sectionHead('04 · Titles from the board', 'Does draft position matter?', 'Each champion is joined to that season’s lottery result using the local league records.')}<div class="feature-grid"><article class="panel chart-panel"><div class="panel-title"><div><span>Championship outcomes</span><h3>Titles by draft slot</h3></div><span class="live-badge">${champDraftRows.length} matched</span></div>${slotChart(slots)}<div class="chart-note"><b>Average champion pick</b><strong>#${averageChampPick.toFixed(1)}</strong><span>in the selected seasons</span></div></article><aside class="callout-stack">${statCard('Top-three titles', slots.slice(0, 3).reduce((sum, row) => sum + row.championships, 0), 'Titles produced by picks 1–3.', 'dark')}${statCard('Pick #5 titles', fifth.championships, 'The league’s accidental championship factory.', 'green')}</aside></div>${unlikely.length ? `<div class="against"><div><p class="eyebrow">Against the odds</p><h3>Champions from the back of the line</h3></div><div class="against-list">${unlikely.map((row) => `<article><span>#${row.draft.pick}</span><div><b>${esc(row.champion)}</b><small>${row.year} champion</small></div></article>`).join('')}</div></div>` : ''}</section>

    <section class="section" id="players">${sectionHead('05 · First-round history', 'The names we kept calling', 'Search by player or manager. These are appearance and draft-position records only—not claims about fantasy performance.')}<div class="search-row"><label>Find a player or manager<input id="player-search" type="search" value="${esc(state.playerQuery)}" placeholder="Try McCaffrey or Eddie"></label><span>${shownPlayers.length} players</span></div><div class="feature-grid"><article class="panel chart-panel"><div class="panel-title"><div><span>Most frequent selections</span><h3>First Round Appearances</h3></div><span class="live-badge">${draftRows.length} picks</span></div>${horizontalBars(shownPlayers.slice(0, 12).map((row) => ({ ...row, detail: `${row.player}: ${row.appearances} appearances, ${row.managers.length} managers, picks ${row.minPick}–${row.maxPick}, years ${row.years.sort().join(', ')}` })), 'appearances', shownPlayers[0]?.appearances ?? 1, (row) => `${row.appearances}×`, 'player-bars', (row) => `${row.managers.length} manager${row.managers.length === 1 ? '' : 's'} · picks ${row.minPick}–${row.maxPick}`)}</article><aside class="panel repeat-panel"><div class="panel-title"><div><span>Déjà vu</span><h3>Repeat manager–player pairings</h3></div></div>${players.repeats.filter((pair) => state.manager === 'All managers' || pair.manager === state.manager).slice(0, 8).map((pair) => `<div class="pair"><span>${esc(pair.manager)}</span><b>${esc(pair.player)}</b><strong>${pair.count}×</strong></div>`).join('') || '<p class="empty">No repeat pairings match.</p>'}<div class="mini-ranking"><span>Drafted by the most managers</span>${players.mostManagers.slice(0, 3).map((row) => `<p><b>${esc(row.player)}</b><strong>${row.managers.length}</strong></p>`).join('')}</div></aside></div></section>

    <section class="section alt" id="waivers">${sectionHead('06 · Waiver wire philosophy', 'Spend it or save it?', `FAAB balances were recorded from ${faabYears[0]}–${faabYears.at(-1)} only. Lower ending balances indicate more spending; they do not measure whether those moves succeeded.`)}<div class="method-note"><b>Transparent style rule</b><span>Aggressive: average ending FAAB $0–25 · Balanced: over $25–60 · Conservative: over $60.</span></div><div class="feature-grid"><article class="panel chart-panel"><div class="panel-title"><div><span>Average balance at season end</span><h3>FAAB remaining by manager</h3></div><span class="live-badge">Recorded era only</span></div>${horizontalBars(faabRows, 'average', 100, (row) => `$${format.format(row.average)}`, 'faab-bars', (row) => `${row.style} · median $${format.format(row.median)}`)}</article><aside class="panel faab-details"><div class="panel-title"><div><span>Underlying records</span><h3>Season balances</h3></div></div>${faabRows.map((row) => `<details ${state.manager !== 'All managers' ? 'open' : ''}><summary><span><b>${esc(row.manager)}</b><small>${row.style} · ${row.zeroSeasons} at $0 · ${row.highUnusedSeasons} at $75+</small></span><strong>$${format.format(row.average)}</strong></summary><div>${row.seasons.sort((a,b)=>b.year-a.year).map((season) => `<span>${season.year}<b>$${season.faab}</b></span>`).join('')}</div></details>`).join('') || '<p class="empty">No recorded FAAB data matches these filters.</p>'}</aside></div></section>

    <section class="section hit-bust" id="hit-bust"><div class="future-copy"><p class="eyebrow">07 · Data-ready, results pending</p><h2>Hit / Bust Lab</h2><p>The league records prove who was drafted, where, and by whom. They do not contain actual fantasy finishes, points, games missed, or injury status, so no pick is labeled a hit or bust yet.</p><div class="category-row">${['Smash Hit','Hit','Fine','Bust','Injury Bust'].map((label) => `<span>${label}</span>`).join('')}</div></div><div class="data-requirements"><span>Required enrichment</span><h3>What unlocks the analysis</h3><ul><li>Season fantasy points and positional finish</li><li>Games played / games missed</li><li>Validated injury designation</li><li>Scoring format and position</li></ul><p>Once joined by player + season, the existing draft records can support hit rate, bust rate, best value, and manager effectiveness without fabricating outcomes.</p></div></section>
  </main><footer><div class="brand"><span>GS</span><b>Gatorade Showers</b></div><p>Built from the league’s Champions Log and Historical Draft Order.</p><a href="#top">Back to top ↑</a></footer>`
  bindEvents()
}

function bindEvents() {
  const set = (selector, event, handler) => document.querySelector(selector)?.addEventListener(event, handler)
  set('#manager-filter', 'change', (event) => { state.manager = event.target.value; render() })
  set('#from-year', 'change', (event) => { state.from = Number(event.target.value); if (state.from > state.to) state.to = state.from; state.historyYear = state.to; render() })
  set('#to-year', 'change', (event) => { state.to = Number(event.target.value); if (state.to < state.from) state.from = state.to; state.historyYear = state.to; render() })
  set('#minimum-seasons', 'change', (event) => { state.minSeasons = Number(event.target.value); render() })
  set('#player-search', 'input', (event) => { state.playerQuery = event.target.value; render(); const input = document.querySelector('#player-search'); input?.focus(); input?.setSelectionRange(state.playerQuery.length, state.playerQuery.length) })
  set('#reset-filters', 'click', () => { state.manager = 'All managers'; state.from = years[0]; state.to = years.at(-1); state.minSeasons = 3; state.playerQuery = ''; state.historyYear = state.to; render() })
  set('.nav-toggle', 'click', () => document.querySelector('.site-header nav')?.classList.toggle('open'))
  document.querySelectorAll('[data-podium-metric]').forEach((button) => button.addEventListener('click', () => { state.podiumMetric = button.dataset.podiumMetric; render() }))
  document.querySelectorAll('[data-history-year]').forEach((button) => button.addEventListener('click', () => { state.historyYear = Number(button.dataset.historyYear); render(); document.querySelector('.selected-season')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }))
  document.querySelectorAll('.bar-row, .dot-row').forEach((row) => row.addEventListener('click', () => row.classList.toggle('show-tip')))
}

async function start() {
  try {
    const [championsResponse, draftsResponse] = await Promise.all([fetch(`${base}data/champions.json`), fetch(`${base}data/drafts.csv`)])
    if (!championsResponse.ok || !draftsResponse.ok) throw new Error('League data could not be loaded')
    champions = (await championsResponse.json()).map((row) => ({ ...row, champion: normalizeManager(row.champion), runnerUp: normalizeManager(row.runnerUp), third: normalizeManager(row.third) }))
    drafts = cleanDrafts(parseCsv(await draftsResponse.text()))
    years = [...new Set([...champions.map((row) => row.year), ...drafts.map((row) => row.year)])].sort((a, b) => a - b)
    allManagers = [...new Set([...drafts.map((row) => row.manager), ...champions.flatMap((row) => [row.champion, row.runnerUp, row.third])])].sort()
    state.from = years[0]; state.to = years.at(-1); state.historyYear = state.to
    render()
  } catch (error) { app.innerHTML = `<main class="error"><h1>The record book is temporarily unavailable.</h1><p>${esc(error.message)}</p></main>` }
}

start()
