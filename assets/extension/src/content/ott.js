/*
 * Reads watch history, watchlists and "Continue watching" from streaming
 * services, in the browser extension and in the app's built-in reader.
 * Only pages the person is signed in to, in their own browser or app; the
 * result goes to their own hypnotize account and nowhere else.
 *
 * Each service lists its pages. Where a site has a well-known layout, a
 * specific reader runs; every other page (and any site not listed) uses the
 * general reader, which collects title cards, scrolls to load more, and
 * notices "Continue watching" rows.
 *
 * Result items: { title, kind: 'movie'|'show'|'unknown'|'book'|'audiobook', author?, season?, episode?, date?, status: 'completed'|'in_progress'|'plan_to' }
 *
 * Profiles: most services have several profiles on one account. read() also
 * reports which profile the page is showing (when it can tell), so the app and
 * the extension import only from the profile the person chose.
 */
(function (root) {
  'use strict';

  var SERVICES = [
    { id: 'netflix', name: 'Netflix', host: /(^|\.)netflix\.com$/, home: 'https://www.netflix.com/browse',
      history: 'https://www.netflix.com/viewingactivity', list: 'https://www.netflix.com/browse/my-list' },
    { id: 'prime', name: 'Prime Video', host: /(^|\.)(primevideo\.com|amazon\.[a-z.]+)$/, home: 'https://www.primevideo.com/',
      history: 'https://www.primevideo.com/settings/watch-history', list: 'https://www.primevideo.com/watchlist' },
    { id: 'hotstar', name: 'JioHotstar', host: /(^|\.)(hotstar|jiohotstar)\.com$/, home: 'https://www.hotstar.com/in/home',
      list: 'https://www.hotstar.com/in/mywatchlist' },
    { id: 'disney', name: 'Disney+', host: /(^|\.)disneyplus\.com$/, home: 'https://www.disneyplus.com/home', list: 'https://www.disneyplus.com/watchlist' },
    { id: 'crunchyroll', name: 'Crunchyroll', host: /(^|\.)crunchyroll\.com$/, anime: true, home: 'https://www.crunchyroll.com/',
      history: 'https://www.crunchyroll.com/history', list: 'https://www.crunchyroll.com/watchlist' },
    { id: 'zee5', name: 'ZEE5', host: /(^|\.)zee5\.com$/, home: 'https://www.zee5.com/', list: 'https://www.zee5.com/mywatchlist' },
    { id: 'sonyliv', name: 'Sony LIV', host: /(^|\.)sonyliv\.com$/, home: 'https://www.sonyliv.com/', list: 'https://www.sonyliv.com/mylist' },
    { id: 'jiocinema', name: 'JioCinema', host: /(^|\.)jiocinema\.com$/, home: 'https://www.jiocinema.com/', list: 'https://www.jiocinema.com/watchlist' },
    { id: 'aha', name: 'aha', host: /(^|\.)aha\.video$/, home: 'https://www.aha.video/', list: 'https://www.aha.video/my-list' },
    { id: 'sunnxt', name: 'Sun NXT', host: /(^|\.)sunnxt\.com$/, home: 'https://www.sunnxt.com/', list: 'https://www.sunnxt.com/watchlist' },
    { id: 'hoichoi', name: 'hoichoi', host: /(^|\.)hoichoi\.tv$/, home: 'https://www.hoichoi.tv/', list: 'https://www.hoichoi.tv/watchlist' },
    { id: 'mxplayer', name: 'MX Player', host: /(^|\.)mxplayer\.in$/, home: 'https://www.mxplayer.in/', list: 'https://www.mxplayer.in/watchlist' },
    { id: 'lionsgate', name: 'Lionsgate Play', host: /(^|\.)lionsgateplay\.com$/, home: 'https://www.lionsgateplay.com/', list: 'https://www.lionsgateplay.com/watchlist' },
    { id: 'max', name: 'Max', host: /(^|\.)(max|hbomax)\.com$/, home: 'https://play.max.com/', list: 'https://play.max.com/my-stuff' },
    { id: 'hulu', name: 'Hulu', host: /(^|\.)hulu\.com$/, home: 'https://www.hulu.com/hub/home', list: 'https://www.hulu.com/my-stuff' },
    { id: 'appletv', name: 'Apple TV+', host: /^tv\.apple\.com$/, home: 'https://tv.apple.com/', list: 'https://tv.apple.com/watch-now' },
    { id: 'paramount', name: 'Paramount+', host: /(^|\.)paramountplus\.com$/, home: 'https://www.paramountplus.com/home/', list: 'https://www.paramountplus.com/account/watchlist/' },
    { id: 'peacock', name: 'Peacock', host: /(^|\.)peacocktv\.com$/, home: 'https://www.peacocktv.com/watch/home', list: 'https://www.peacocktv.com/watch/my-stuff' },
    { id: 'mubi', name: 'MUBI', host: /(^|\.)mubi\.com$/, films: true, home: 'https://mubi.com/', list: 'https://mubi.com/en/watchlist', history: 'https://mubi.com/en/ratings' },
    { id: 'viki', name: 'Viki', host: /(^|\.)viki\.com$/, home: 'https://www.viki.com/', list: 'https://www.viki.com/user-account/watchlist', history: 'https://www.viki.com/user-account/continue-watching' },
    { id: 'viu', name: 'Viu', host: /(^|\.)viu\.com$/, home: 'https://www.viu.com/', list: 'https://www.viu.com/ott/in/en/watchlist' },
    { id: 'iqiyi', name: 'iQIYI', host: /(^|\.)iq\.com$/, home: 'https://www.iq.com/', list: 'https://www.iq.com/personal/collection', history: 'https://www.iq.com/personal/history' },
    { id: 'youtube', name: 'YouTube (films and shows)', host: /(^|\.)youtube\.com$/, home: 'https://www.youtube.com/feed/storefront', list: 'https://www.youtube.com/feed/purchases' },
    { id: 'plex', name: 'Plex', host: /(^|\.)plex\.tv$/, home: 'https://watch.plex.tv/', list: 'https://watch.plex.tv/watchlist' },
    { id: 'tubi', name: 'Tubi', host: /(^|\.)tubitv\.com$/, home: 'https://tubitv.com/', list: 'https://tubitv.com/my-stuff' },
    { id: 'iplayer', name: 'BBC iPlayer', host: /(^|\.)bbc\.co\.uk$/, home: 'https://www.bbc.co.uk/iplayer', list: 'https://www.bbc.co.uk/iplayer/added', history: 'https://www.bbc.co.uk/iplayer/watching' },
    { id: 'itvx', name: 'ITVX', host: /(^|\.)itv\.com$/, home: 'https://www.itv.com/watch', list: 'https://www.itv.com/watch/my-list' },
    { id: 'stan', name: 'Stan', host: /(^|\.)stan\.com\.au$/, home: 'https://play.stan.com.au/', list: 'https://play.stan.com.au/my-list' },
    { id: 'crave', name: 'Crave', host: /(^|\.)crave\.ca$/, home: 'https://www.crave.ca/', list: 'https://www.crave.ca/en/my-list' },
    { id: 'shahid', name: 'Shahid', host: /(^|\.)shahid\.mbc\.net$/, home: 'https://shahid.mbc.net/', list: 'https://shahid.mbc.net/en/mylist' },
    { id: 'hidive', name: 'HIDIVE', host: /(^|\.)hidive\.com$/, anime: true, home: 'https://www.hidive.com/', list: 'https://www.hidive.com/my-list' },
    // Audiobooks and books. Audible keeps a separate site per country.
    { id: 'audible', name: 'Audible (US)', host: /(^|\.)audible\.com$/, books: 'audiobook', home: 'https://www.audible.com/library/titles',
      history: 'https://www.audible.com/library/titles', list: 'https://www.audible.com/wl' },
    { id: 'audible_in', name: 'Audible (India)', host: /(^|\.)audible\.in$/, books: 'audiobook', home: 'https://www.audible.in/library/titles',
      history: 'https://www.audible.in/library/titles', list: 'https://www.audible.in/wl' },
    { id: 'audible_uk', name: 'Audible (UK)', host: /(^|\.)audible\.co\.uk$/, books: 'audiobook', home: 'https://www.audible.co.uk/library/titles',
      history: 'https://www.audible.co.uk/library/titles', list: 'https://www.audible.co.uk/wl' },
    { id: 'storytel', name: 'Storytel', host: /(^|\.)storytel\.com$/, books: 'audiobook', home: 'https://www.storytel.com/',
      list: 'https://www.storytel.com/bookshelf' },
    { id: 'fable', name: 'Fable', host: /(^|\.)fable\.co$/, books: 'book', home: 'https://fable.co/' },
  ];

  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var all = function (sel, rootEl) { try { return Array.prototype.slice.call((rootEl || document).querySelectorAll(sel)); } catch (e) { return []; } };
  var txt = function (el, sel) { var x = sel ? el && el.querySelector(sel) : el; return x ? (x.textContent || '').replace(/\s+/g, ' ').trim() : ''; };

  var UI = /^(home|search|my list|my stuff|watchlist|continue watching|keep watching|up next|play|resume|more info|details|trailer|watch now|sign in|log in|menu|close|next|previous|back|see all|view all|show more|load more|settings|account|profile|kids|downloads|new|popular|trending|movies|films|tv shows|series|shows|sports|live|news|premium|subscribe|remove|add|share|like|episodes?|seasons?|logo|image|poster|thumbnail|banner|icon|avatar|.*\blogo)$/i;

  function service(host) {
    host = host || location.hostname;
    for (var i = 0; i < SERVICES.length; i++) if (SERVICES[i].host.test(host)) return SERVICES[i];
    return null;
  }

  /** "Panchayat Season 3 Episode 4", "S2:E5 The Rains", "Watch Dune - Full Movie Online" → parts. */
  function clean(raw) {
    var s = String(raw || '').replace(/\s+/g, ' ').trim();
    s = s.replace(/^(watch|play|resume|continue watching|stream)\s+/i, '').replace(/\s*[-–|:]\s*(watch|stream)\b.*$/i, '').replace(/\s+(full movie|online|in hd|now streaming)\b.*$/i, '');
    var season, episode;
    var m = s.match(/^(.*?)[\s:,–-]*(?:season|series|s)\s*0*(\d+)[\s:,–-]*(?:episode|ep\.?|e)\s*0*(\d+)\b.*$/i);
    if (m) { s = m[1]; season = +m[2]; episode = +m[3]; }
    else if ((m = s.match(/^(.*?)[\s:,–-]*(?:episode|ep\.?)\s*0*(\d+)\b.*$/i))) { s = m[1]; episode = +m[2]; }
    else if ((m = s.match(/^(.*?)[\s:,–-]*(?:season|series)\s*0*(\d+)\s*$/i))) { s = m[1]; season = +m[2]; }
    s = s.replace(/[\s:,–-]+$/, '').trim();
    return { title: s, season: season, episode: episode };
  }

  function ok(t) {
    return t && t.length >= 2 && t.length <= 120 && !UI.test(t) && !/^\d+$/.test(t) && !/^(\d+\s*(min|h|hr|m)|\d+%)/i.test(t);
  }

  async function settle(maxRounds) {
    var last = 0;
    for (var i = 0; i < (maxRounds || 30); i++) {
      var more = all('button, a[role="button"]').filter(function (b) { return /^(show|load|see) more$/i.test((b.textContent || '').trim()) && !b.disabled; })[0];
      if (more) { more.click(); await sleep(900); continue; }
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(700);
      var h = document.body.scrollHeight;
      if (h === last) break;
      last = h;
    }
    window.scrollTo(0, 0);
  }

  async function waitForContent(ms) {
    var t = Date.now();
    while (Date.now() - t < (ms || 15000)) {
      if (all('img[alt], a[aria-label]').length > 8) return;
      await sleep(400);
    }
  }

  /** Titles from cards in [rootEl]: image alt text, link labels, headings inside links. */
  function cardTitles(rootEl) {
    var raw = [];
    all('a[aria-label], [role="link"][aria-label]', rootEl).forEach(function (a) { raw.push(a.getAttribute('aria-label')); });
    all('a img[alt], [class*="card" i] img[alt], [class*="tile" i] img[alt], [data-testid*="card" i] img[alt]', rootEl).forEach(function (i) { raw.push(i.getAttribute('alt')); });
    all('a h3, a h4, [class*="card" i] h3, [class*="card" i] h4, [class*="title" i] > a', rootEl).forEach(function (h) { raw.push(h.textContent); });
    all('a[title]', rootEl).forEach(function (a) { raw.push(a.getAttribute('title')); });
    var seen = {}, out = [];
    raw.forEach(function (r) {
      var c = clean(r);
      var k = c.title.toLowerCase();
      if (!ok(c.title) || seen[k]) return;
      seen[k] = 1;
      out.push(c);
    });
    return out;
  }

  /** The "Continue watching" row, if the page has one. */
  function continueRow() {
    var heads = all('h1, h2, h3, h4, [role="heading"], [class*="title" i], [class*="heading" i]').filter(function (h) {
      return /^(continue watching|keep watching|resume watching|up next|watch next|continue|continue (listening|reading)|currently reading|now reading|in progress|reading now)(\s+for\s+.*)?$/i.test((h.textContent || '').trim());
    });
    for (var i = 0; i < heads.length; i++) {
      var el = heads[i];
      for (var up = 0; up < 6 && el; up++, el = el.parentElement) {
        var t = cardTitles(el);
        if (t.length >= 1 && el.querySelectorAll('img').length >= t.length) return t;
      }
    }
    return [];
  }

  function kindOf(svc, c) {
    if (svc && svc.films) return 'movie';
    if (svc && svc.books) return svc.books;
    if (c.episode || c.season) return 'show';
    return 'unknown';
  }

  function items(svc, list, status) {
    return list.map(function (c) {
      var book = svc && svc.books;
      return { title: c.title, kind: kindOf(svc, c), season: book ? undefined : c.season, episode: book ? undefined : c.episode, date: c.date,
        status: !book && c.episode ? 'in_progress' : status };
    });
  }

  // Specific readers for the busiest layouts; everything else is general.
  var SPECIFIC = {
    'netflix:history': async function () {
      var t = Date.now();
      while (!document.querySelector('.retableRow') && Date.now() - t < 15000) await sleep(300);
      await settle(80);
      return all('.retableRow').map(function (r) {
        var full = txt(r, '.title a') || txt(r, '.title');
        var parts = full.split(': ');
        var date = txt(r, '.date');
        if (parts.length >= 2) {
          var c = clean(parts.slice(1).join(' '));
          var m = full.match(/(?:season|series|part|volume|chapter)\s*(\d+)/i);
          var e = full.match(/(?:episode|ep\.?)\s*(\d+)/i);
          return { title: parts[0], kind: 'show', season: m ? +m[1] : c.season, episode: e ? +e[1] : undefined, date: date, status: 'completed' };
        }
        return { title: full, kind: 'movie', date: date, status: 'completed' };
      }).filter(function (x) { return x.title; });
    },
    'prime:history': async function () {
      await waitForContent();
      await settle(40);
      return all('[data-automation-id="activity-history-items"] li, ul[class*="history" i] li, [data-testid*="history" i] li').map(function (li) {
        var c = clean(txt(li, 'a') || txt(li, 'p'));
        return { title: c.title, kind: c.episode ? 'show' : 'unknown', season: c.season, episode: c.episode, status: 'completed' };
      }).filter(function (x) { return ok(x.title); });
    },
    'crunchyroll:history': async function () {
      await waitForContent();
      await settle(30);
      return all('[class*="playable-card"]').map(function (c) {
        var series = txt(c, '[class*="series-title"], small');
        var ep = clean(txt(c, '[class*="title"] h4, h4'));
        return { title: series, kind: 'show', season: ep.season, episode: ep.episode, status: 'in_progress' };
      }).filter(function (x) { return ok(x.title); });
    },
  };

  /** Audible library: every page of it, fetched with the person's own sign-in. */
  function audibleRows(doc) {
    return all('.adbl-library-content-row, [id^="adbl-library-content-row"]', doc).map(function (row) {
      var title = txt(row, '.bc-size-headline3') || txt(row, 'h2') || txt(row, 'a[href*="/pd/"]');
      var author = txt(row, '.authorLabel a') || txt(row, 'a[href*="/author/"]');
      var all_ = txt(row);
      var status = /\bfinished\b/i.test(all_) ? 'completed' : /\b(left|remaining)\b/i.test(all_) ? 'in_progress' : 'plan_to';
      return { title: clean(title).title, author: author || undefined, kind: 'audiobook', status: status };
    }).filter(function (x) { return ok(x.title); });
  }
  async function audibleLibrary() {
    var out = audibleRows(document);
    if (!/\/library\/titles/.test(location.pathname)) return out;
    out = [];
    for (var page = 1; page <= 40; page++) {
      var r = await fetch(location.origin + '/library/titles?pageSize=50&page=' + page, { credentials: 'include' });
      if (!r.ok) break;
      var rows = audibleRows(new DOMParser().parseFromString(await r.text(), 'text/html'));
      if (!rows.length) break;
      out = out.concat(rows);
      if (rows.length < 50) break;
    }
    return out;
  }

  /**
   * The profile the page is showing, or '' when it can't tell. Looks at the
   * site's own data first (Netflix), then at profile menus and headings.
   */
  function profile() {
    try {
      var n = root.netflix && root.netflix.reactContext && root.netflix.reactContext.models.userInfo.data.name;
      if (n) return String(n).trim();
    } catch (e) { /* not Netflix, or not loaded */ }
    var tidy = function (t) {
      t = String(t || '').replace(/\s+/g, ' ').trim()
        .replace(/^(switch|manage|change|current|active)\s+profiles?[:\s-]*/i, '')
        .replace(/^(profile|account)( menu| picture| avatar| icon)?[:\s-]*/i, '')
        .replace(/[:\s-]*(profile|account)( menu| picture| avatar| icon)?$/i, '').trim();
      return t.length >= 1 && t.length <= 40 && !UI.test(t) && !/^(menu|open|switch|manage|profiles?|accounts?|edit|sign out)$/i.test(t) ? t : '';
    };
    var heads = all('h1, h2, [role="heading"]');
    for (var i = 0; i < heads.length; i++) {
      var h = (heads[i].textContent || '').replace(/\s+/g, ' ').trim(), m;
      if ((m = h.match(/^(?:viewing |watch )?(?:activity|history) for (.+)$/i)) || (m = h.match(/^(.+?)['’]s (?:profile|watch history|activity|library|bookshelf)$/i))) return m[1].trim();
    }
    var sel = '[data-uia*="profile" i], [data-testid*="profile" i], [data-automation-id*="profile" i], [class*="profile-name" i], [class*="profileName" i], ' +
      '[class*="current-profile" i], [class*="currentProfile" i], [aria-label*="profile" i], [aria-label*="account" i]';
    var cands = all(sel, document.querySelector('header, nav, [role="banner"]') || document.body);
    for (var j = 0; j < cands.length; j++) {
      var el = cands[j];
      var t = tidy(el.getAttribute('aria-label')) || tidy(el.getAttribute('title')) || tidy(txt(el));
      if (!t) { var img = el.querySelector('img[alt]'); if (img) t = tidy(img.getAttribute('alt')); }
      if (t) return t;
    }
    return '';
  }

  /**
   * Reads the current page. kind: 'history' | 'list' | 'continue' | 'auto'.
   * Returns { source, items, count }.
   */
  async function read(kind) {
    var svc = service();
    var path = location.href;
    kind = kind || 'auto';
    if (kind === 'auto' && svc) kind = svc.history && path.indexOf(svc.history.replace(/^https?:\/\/[^/]+/, '')) >= 0 ? 'history' : (svc.list && path.indexOf(svc.list.replace(/^https?:\/\/[^/]+/, '')) >= 0 ? 'list' : 'continue');
    var specific = svc && (SPECIFIC[svc.id + ':' + kind] || (/^audible/.test(svc.id) && kind !== 'list' && /\/library\//.test(location.pathname) ? audibleLibrary : null));
    var out;
    if (specific) {
      out = await specific();
    } else {
      await waitForContent();
      if (kind === 'continue' || kind === 'auto') {
        out = items(svc, continueRow(), 'in_progress');
        if (!out.length && kind === 'auto') { await settle(20); out = items(svc, cardTitles(document.querySelector('main') || document.body), 'plan_to'); }
      } else {
        await settle(40);
        out = items(svc, cardTitles(document.querySelector('main') || document.body), kind === 'history' ? 'completed' : 'plan_to');
      }
    }
    if (svc && svc.anime) out.forEach(function (x) { x.anime = true; });
    return { source: svc ? svc.id : location.hostname, profile: profile(), items: out, count: out.length };
  }

  root.HypnotizeOtt = { services: SERVICES, service: service, read: read, profile: profile };

  // Browser extension: the popup asks the tab to read itself.
  var rt = (root.browser || root.chrome || {}).runtime;
  if (rt && rt.onMessage) rt.onMessage.addListener(function (msg, _s, reply) {
    if (msg.type !== 'readPage') return;
    read(msg.kind).then(function (r) { reply({ ok: true, result: r }); }, function (e) { reply({ ok: false, error: String(e && e.message || e) }); });
    return true;
  });
})(globalThis);
