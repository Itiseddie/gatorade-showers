import './style.css'
import {
  parseCsv, cleanDrafts, podiumStats, draftAverages, championDrafts,
  championshipsBySlot, playerStats, normalizeManager,
} from './stats.js'

const base = import.meta.env.BASE_URL
const app = document.querySelector('#app')
let champions = [], drafts = []

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const icon = (name) => `<svg aria-hidden="true" viewBox="0 0 24 24"><use href="#${name}" /></svg>`
const esc = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char])

function statCard(label, value, note, tone = '') {
  return `<article class="stat-card ${tone}"><span>${label}</span><strong>${value}</strong><p>${note}</p></article>`
}

function horizontalBars(rows, valueKey, max, formatter, className = '') {
  return `<div class="h-bars ${className}">${rows.map((row, index) => {
    const width = max ? Math.max(3, (row[valueKey] / max) * 100) : 0
    const detail = row.detail ?? formatter(row)
    return `<button class="bar-row" type="button" aria-label="${esc(detail)}">
      <span class="rank">${index + 1}</span><span class="bar-name">${esc(row.manager ?? row.player)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${width}%"></span></span>
      <strong>${esc(formatter(row))}</strong><span class="tap-tip">${esc(detail)}</span>
    </button>`
  }).join('')}</div>`
}

function lotteryPlot(rows) {
  return `<div class="lottery-plot">
    <div class="plot-axis"><span>Earlier picks</span><span>Later picks</span></div>
    ${rows.map((row, index) => `<button class="dot-row" type="button" aria-label="${esc(`${row.manager}: Pick ${row.average.toFixed(2)} average across ${row.seasons} seasons; ${row.topThree} Top 3 picks`)}">
      <span class="rank">${index + 1}</span><span class="bar-name">${esc(row.manager)}</span>
      <span class="dot-track"><i style="left:${((row.average - 1) / 11) * 100}%"></i></span>
      <strong>${row.average.toFixed(2)}</strong><small>${row.seasons} yrs</small>
      <span class="tap-tip">${row.topThree} Top 3 pick${row.topThree === 1 ? '' : 's'}</span>
    </button>`).join('')}
    <div class="tick-axis">${[1, 3, 5, 7, 9, 12].map((tick) => `<span style="left:${((tick - 1) / 11) * 100}%">${tick}</span>`).join('')}</div>
  </div>`
}

function slotChart(rows) {
  const max = Math.max(...rows.map((row) => row.championships), 1)
  return `<div class="slot-chart" role="img" aria-label="Championships won by each draft slot">
    ${rows.map((row) => `<div class="slot-column"><strong>${row.championships}</strong><span class="column-track"><i style="height:${(row.championships / max) * 100}%"></i></span><small>#${row.pick}</small></div>`).join('')}
  </div>`
}

function sectionHead(kicker, title, copy) {
  return `<div class="section-head"><p class="eyebrow">${kicker}</p><h2>${title}</h2><p>${copy}</p></div>`
}

function render() {
  const minYear = Number(document.querySelector('#from-year')?.value ?? Math.min(...champions.map((row) => row.year)))
  const maxYear = Number(document.querySelector('#to-year')?.value ?? Math.max(...champions.map((row) => row.year)))
  const manager = document.querySelector('#manager-filter')?.value ?? 'All managers'
  const seasons = champions.filter((row) => row.year >= minYear && row.year <= maxYear)
  const draftRows = drafts.filter((row) => row.year >= minYear && row.year <= maxYear)
  const podium = podiumStats(seasons)
  const shownPodium = manager === 'All managers' ? podium : podium.filter((row) => row.manager === manager)
  const averages = draftAverages(draftRows)
  const eligible = averages.filter((row) => row.seasons >= 5 && (manager === 'All managers' || row.manager === manager))
  const champDraftRows = championDrafts(seasons, draftRows)
  const slots = championshipsBySlot(champDraftRows)
  const players = playerStats(draftRows)
  const leader = podium[0]
  const maxPodiums = Math.max(...podium.map((row) => row.podiums))
  const podiumLeaders = podium.filter((row) => row.podiums === maxPodiums).map((row) => row.manager).join(' & ')
  const earliest = averages.filter((row) => row.seasons >= 5)[0]
  const latest = averages.filter((row) => row.seasons >= 5).at(-1)
  const fifth = slots.find((row) => row.pick === 5)
  const averageChampPick = champDraftRows.reduce((sum, row) => sum + row.draft.pick, 0) / champDraftRows.length
  const unlikely = champDraftRows.filter((row) => row.draft.pick >= 9).sort((a, b) => b.draft.pick - a.draft.pick)
  const allManagers = [...new Set([...drafts.map((row) => row.manager), ...champions.flatMap((row) => [row.champion, row.runnerUp, row.third].map(normalizeManager))])].sort()
  const years = [...new Set([...champions.map((row) => row.year), ...drafts.map((row) => row.year)])].sort((a, b) => a - b)

  app.innerHTML = `
    <svg class="svg-sprite" aria-hidden="true"><symbol id="trophy" viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H5v1a4 4 0 0 0 4 4m7-5h3v1a4 4 0 0 1-4 4M12 13v4m-4 3h8m-6-3h4"/></symbol><symbol id="football" viewBox="0 0 24 24"><path d="M20 4C14 3 7 7 4 12c-2 3-1 7 0 8 2 1 6 2 9 0 5-3 8-10 7-16ZM8 16l8-8m-5 3 2 2m-5 0 3 3"/></symbol><symbol id="spark" viewBox="0 0 24 24"><path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2Zm7 13 .7 3.3L23 19l-3.3.7L19 23l-.7-3.3L15 19l3.3-.7L19 15Z"/></symbol></svg>
    <header class="site-header"><a class="brand" href="#top"><span>GS</span><b>Gatorade Showers</b></a><button class="nav-toggle" type="button" aria-label="Toggle navigation">Menu</button><nav><a href="#overview">Overview</a><a href="#championships">Championships</a><a href="#lottery">Draft Lottery</a><a href="#draft-position">Draft Position</a><a href="#players">Player Drafts</a></nav></header>
    <main id="top">
      <section class="hero" id="overview">
        <div class="hero-copy"><p class="eyebrow"><span></span> The official league record book</p><h1>Where legends are made.<br><em>And receipts are kept.</em></h1><p>Thirteen seasons of champions, draft-day luck, and first-round decisions from the Gatorade Showers fantasy football league.</p><div class="hero-actions"><a class="button primary" href="#championships">Explore the history</a><a class="button ghost" href="#lottery">Check the lottery</a></div></div>
        <aside class="hero-score"><p>All-time title leader</p><div class="score-main"><span>${icon('trophy')}</span><strong>${leader.championships}</strong></div><h2>${esc(leader.manager)}</h2><small>${champions.length} recorded seasons · ${Math.min(...years)}–${Math.max(...years)}</small></aside>
      </section>
      <section class="filter-band" aria-label="Dashboard filters"><div><b>Filter the record book</b><span>Every chart updates together</span></div><label>Manager<select id="manager-filter"><option>All managers</option>${allManagers.map((name) => `<option ${name === manager ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></label><label>From<select id="from-year">${years.map((year) => `<option ${year === minYear ? 'selected' : ''}>${year}</option>`).join('')}</select></label><label>To<select id="to-year">${years.map((year) => `<option ${year === maxYear ? 'selected' : ''}>${year}</option>`).join('')}</select></label></section>

      <section class="section" id="championships">${sectionHead('01 · League legends', 'The trophy case', 'Championships lead the story. Tap or hover any manager to see the full podium résumé.')}
        <div class="feature-grid"><article class="panel chart-panel"><div class="panel-title"><div><span>Championship leaderboard</span><h3>Titles by manager</h3></div><span class="live-badge">${seasons.length} seasons</span></div>${horizontalBars(shownPodium.filter((row) => row.championships > 0), 'championships', Math.max(...podium.map((row) => row.championships), 1), (row) => `${row.championships}`, 'gold-bars')}</article>
        <aside class="callout-stack">${statCard('The standard', `${leader.championships}×`, `${leader.manager} has more titles than anyone in league history.`, 'dark')}${statCard('Podium royalty', `${maxPodiums}`, `${podiumLeaders} lead all managers in total podium finishes.`)}${statCard('Repeat winner', `${podium.find((row) => row.manager === 'Oliver')?.championships ?? 0}×`, 'Oliver won back-to-back from the final two lottery spots.', 'orange')}</aside></div>
      </section>

      <section class="section alt" id="lottery">${sectionHead('02 · The annual conspiracy', 'Is the draft lottery rigged?', 'Lower is luckier. Only managers with at least five appearances make the primary leaderboard.')}
        <div class="feature-grid wide-chart"><article class="panel chart-panel"><div class="panel-title"><div><span>Historical average</span><h3>Average first-round draft position</h3></div><span class="live-badge">Min. 5 seasons</span></div>${eligible.length ? lotteryPlot(eligible) : '<p class="empty">No manager meets the five-season threshold for this filter.</p>'}</article>
        <aside class="callout-stack">${statCard('Luckiest average', `#${earliest.average.toFixed(2)}`, `${earliest.manager}, across ${earliest.seasons} draft lotteries.`, 'green')}${statCard('Latest average', `#${latest.average.toFixed(2)}`, `${latest.manager}, across ${latest.seasons} draft lotteries.`, 'dark')}${statCard('Top-three picks', `${latest.topThree}`, `${latest.manager} has never selected in the Top 3.`, 'orange')}</aside></div>
      </section>

      <section class="section" id="draft-position">${sectionHead('03 · Titles from the board', 'Does draft position matter?', 'We joined each champion to that season’s lottery result. The top of the board has not delivered the trophy.')}
        <div class="feature-grid"><article class="panel chart-panel"><div class="panel-title"><div><span>Championship outcomes</span><h3>Titles by draft slot</h3></div><span class="live-badge">${champDraftRows.length} matched champions</span></div>${slotChart(slots)}<div class="chart-note"><b>Average champion pick</b><strong>#${averageChampPick.toFixed(1)}</strong><span>across all recorded title seasons</span></div></article>
        <aside class="callout-stack">${statCard('The cold zone', '0', 'Picks 1, 2, and 3 have never produced a champion.', 'dark')}${statCard('The sweet spot', `${fifth.championships}×`, 'Pick #5 has produced more champions than any other slot.', 'green')}</aside></div>
        <div class="against"><div><p class="eyebrow">Against the odds</p><h3>Champions from the back of the line</h3></div><div class="against-list">${unlikely.map((row) => `<article><span>#${row.draft.pick}</span><div><b>${esc(row.champion)}</b><small>${row.year} champion</small></div></article>`).join('')}</div></div>
      </section>

      <section class="section alt" id="oddities">${sectionHead('04 · League oddities', 'Stats that deserve their own broadcast graphic', 'The weird, impressive, and deeply suspicious corners of the record book.')}
        <div class="oddity-grid">${statCard('All-time titles', `${podium.find((row) => row.manager === 'Eddie')?.championships ?? 0}`, 'Eddie owns the league’s biggest trophy shelf.', 'dark')}${statCard('Podium finishes', `${maxPodiums}`, `${podiumLeaders} share the record.`)}${statCard('Pick #5 titles', `${fifth.championships}`, 'The accidental championship factory.', 'green')}${statCard('Top-three titles', '0', 'Still waiting for one to finish the job.', 'orange')}${statCard('Back-to-back', '#12 → #11', 'Oliver won consecutive titles from 2015–16.')}${statCard('Shared-team luck', '#1 twice', 'Jane/Ryan drew the first pick in both shared seasons.', 'dark')}</div>
      </section>

      <section class="section" id="players">${sectionHead('05 · First-round history', 'The names we kept calling', 'Every selection below comes directly from the historical draft log—appearances, managers, and pick range only.')}
        <div class="feature-grid"><article class="panel chart-panel"><div class="panel-title"><div><span>Most frequent selections</span><h3>First-round appearances</h3></div><span class="live-badge">${draftRows.length} picks</span></div>${horizontalBars(players.leaders.slice(0, 10).map((row) => ({ ...row, detail: `${row.player}: ${row.appearances} appearances, selected by ${row.managers.length} managers, pick range ${row.minPick}–${row.maxPick}` })), 'appearances', players.leaders[0]?.appearances ?? 1, (row) => `${row.appearances}×`, 'player-bars')}</article>
        <aside class="panel repeat-panel"><div class="panel-title"><div><span>Déjà vu</span><h3>Repeat manager–player pairings</h3></div></div>${players.repeats.slice(0, 8).map((pair) => `<div class="pair"><span>${esc(pair.manager)}</span><b>${esc(pair.player)}</b><strong>${pair.count}×</strong></div>`).join('')}</aside></div>
      </section>

      <section class="section future"><div class="future-copy"><p class="eyebrow">06 · Coming next</p><h2>Hit or bust?</h2><p>This part of the story needs real player-performance history. Once that data is added, this space will compare hit rates, bust rates, steals, injuries, and draft value—without rewriting the past.</p><span class="future-badge">Preview · No performance results yet</span></div><div class="future-preview"><div><span>Smash hit</span><i style="width:72%"></i></div><div><span>Hit</span><i style="width:58%"></i></div><div><span>Fine</span><i style="width:42%"></i></div><div><span>Bust</span><i style="width:28%"></i></div><p>Illustrative layout only</p></div></section>
    </main>
    <footer><div class="brand"><span>GS</span><b>Gatorade Showers</b></div><p>Built from the league’s Champions Log and Historical Draft Order.</p><a href="#top">Back to top ↑</a></footer>`

  document.querySelectorAll('#manager-filter, #from-year, #to-year').forEach((control) => control.addEventListener('change', () => {
    const from = Number(document.querySelector('#from-year').value), to = Number(document.querySelector('#to-year').value)
    if (from > to) document.querySelector(control.id === 'from-year' ? '#to-year' : '#from-year').value = control.value
    render()
  }))
  document.querySelector('.nav-toggle').addEventListener('click', () => document.querySelector('.site-header nav').classList.toggle('open'))
  document.querySelectorAll('.bar-row, .dot-row').forEach((row) => row.addEventListener('click', () => row.classList.toggle('show-tip')))
}

async function start() {
  try {
    const [championsResponse, draftsResponse] = await Promise.all([fetch(`${base}data/champions.json`), fetch(`${base}data/drafts.csv`)])
    if (!championsResponse.ok || !draftsResponse.ok) throw new Error('League data could not be loaded')
    champions = (await championsResponse.json()).map((row) => ({ ...row, champion: normalizeManager(row.champion), runnerUp: normalizeManager(row.runnerUp), third: normalizeManager(row.third) }))
    drafts = cleanDrafts(parseCsv(await draftsResponse.text()))
    render()
  } catch (error) {
    app.innerHTML = `<main class="error"><h1>The record book is temporarily unavailable.</h1><p>${esc(error.message)}</p></main>`
  }
}

start()
