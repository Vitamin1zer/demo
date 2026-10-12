/* Кабинет сотрудника, руководителя и HR — прототип 3.0. Данные: data.js. Роутинг по hash:
   #/employee/... — сотрудник (видит себя), #/manager/... — руководитель отдела (видит отдел), #/hr/... — HR и директор (видят всё). */
(() => {
  const D = window.HR;
  const TODAY = new Date('2026-10-12');
  const USERS = { employee: 'e03', manager: 'e15', hr: 'e18' }; // демо: Анна Соколова, Вера Ситникова, Светлана Руднева
  let ROLE = 'employee';
  const charts = [];
  // Состояние прототипа (подтверждения из транскриптов, новая ОС): живёт пока открыта страница
  const TS = JSON.parse(JSON.stringify(D.transcripts));
  const FB = D.feedbackLog.slice();
  const TASKS = JSON.parse(JSON.stringify(D.tasks));

  // ---------- helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const emp = (id) => D.employees.find((e) => e.id === id);
  const dept = (id) => D.departments.find((d) => d.id === id);
  const deptName = (id) => (dept(id) ? dept(id).name : 'Руководство');
  const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  const colors = ['var(--s1)', 'var(--s3)', 'var(--s7)', 'var(--s2)', 'var(--s8)', 'var(--s5)', 'var(--s4)', 'var(--s6)'];
  const avatarColor = (id) => colors[parseInt(id.slice(1), 10) % colors.length];
  const avatar = (e, cls = '') => `<span class="avatar ${cls}" style="background:${avatarColor(e.id)}">${esc(initials(e.name))}</span>`;
  const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
  const fmtShort = (iso) => (iso ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—');
  const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
  const plural = (n, f) => { const m10 = n % 10, m100 = n % 100; return f[(m10 === 1 && m100 !== 11) ? 0 : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) ? 1 : 2]; };
  const tenure = (iso) => { const m = Math.floor(daysBetween(iso, TODAY) / 30.44); const y = Math.floor(m / 12), mm = m % 12; const p = []; if (y) p.push(`${y} ${plural(y, ['год', 'года', 'лет'])}`); if (mm) p.push(`${mm} ${plural(mm, ['месяц', 'месяца', 'месяцев'])}`); return p.join(' ') || 'меньше месяца'; };
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const taskStatus = { in_progress: ['В работе', 'accent'], done: ['Сделано', 'good'], overdue: ['Просрочено', 'critical'], planned: ['Запланировано', ''] };
  const courseStatus = { assigned: ['Назначен', 'accent'], done: ['Пройден', 'good'], overdue: ['Просрочен', 'critical'] };
  const fbSrc = { transcript: 'из транскрипта', manual: 'наблюдение руководителя', 360: 'из 360', form: 'анкета' };
  const chip = (text, cls = '') => `<span class="chip ${cls}">${esc(text)}</span>`;
  const perfChip = (l) => (l ? `<span class="chip perf ${esc(l)}">${esc(l)}</span>` : '<span class="hint">—</span>');
  const bar = (p, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></div>`;
  const checkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>';
  const check = (done) => `<span class="check ${done ? 'done' : ''}">${done ? checkIcon : ''}</span>`;
  const scale10 = (v, tgt) => `<span class="scale" title="${v} из 10">${Array.from({ length: 10 }, (_, i) => `<i class="${i < v ? 'on' : ''}${tgt && i < tgt && i >= v ? ' tgt' : ''}"></i>`).join('')}</span>`;
  const subordinates = (mid) => D.employees.filter((e) => e.manager === mid);
  const allBelow = (mid) => { const out = []; const walk = (id) => subordinates(id).forEach((e) => { out.push(e); walk(e.id); }); walk(mid); return out; };
  const link = (hash, text) => `<a href="#${hash}">${text}</a>`;
  const me = () => emp(USERS[ROLE]);
  const base = () => (ROLE === 'hr' ? '/hr' : '/manager');
  const personLink = (e) => link(`${base()}/person/${e.id}`, esc(e.name));
  // Область видимости: руководитель — свой отдел, HR и директор — все сотрудники кроме директора и HR
  const scope = () => (ROLE === 'hr' ? D.employees.filter((e) => e.dept) : allBelow(USERS.manager));
  const scopeDepts = () => (ROLE === 'hr' ? D.departments : D.departments.filter((d) => d.id === me().dept));
  const inScope = (id) => scope().some((e) => e.id === id);
  const toast = (text) => { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#131313;color:#fff;padding:10px 16px;border-radius:12px;font-size:13px;z-index:99;transition:opacity .3s'; document.body.appendChild(t); } t.textContent = text; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = 0; }, 2600); };
  window.hrAct = {};

  // ---------- матрица компетенций ----------
  const compsOf = (e) => D.competencies[e.dept] || [];
  const matrixOf = (e) => compsOf(e).map((c) => ({ ...c, score: e.matrix[c.name] ?? 0 }));
  const matrixSum = (e) => matrixOf(e).reduce((s, c) => s + c.score, 0);
  const matrixMax = (e) => compsOf(e).length * 10;
  const groupsOf = (e) => { const g = {}; matrixOf(e).forEach((c) => { (g[c.group] ||= []).push(c.score); }); return Object.entries(g).map(([name, arr]) => ({ name, avg: arr.reduce((s, v) => s + v, 0) / arr.length })); };
  const levelOf = (s) => (s <= 3 ? 'base' : s <= 6 ? 'mid' : s <= 8 ? 'adv' : 'expert');
  // Столбцы матрицы аккаунтов соответствуют грейдам роли (ТЗ 3.0: у каждой роли свой набор грейдов)
  const levelName = { base: 'Junior', mid: 'Middle', adv: 'Middle+', expert: 'Senior' };
  const ladderOf = (e) => D.gradeLadders[e.dept] || ['Junior', 'Middle', 'Senior'];
  const nextGrade = (e) => { const l = ladderOf(e); const i = l.indexOf(e.grade); return i < 0 ? e.grade : l[Math.min(i + 1, l.length - 1)]; };
  const ladderChips = (e) => ladderOf(e).map((g) => chip(g, g === e.grade ? 'grade' : '')).join(' ');
  const hardsOf = (e) => D.hardSkills[e.id] || [];
  const hardStatus = { confirmed: ['Подтверждено', 'good'], progress: ['В работе', 'accent'], todo: ['Не начато', ''] };
  const isAccount = (e) => e.dept === 'account';
  // Проверка ограничений перехода на следующий грейд (только для аккаунтов: там есть правила)
  const constraintsFor = (e, g) => (isAccount(e) ? (D.gradeRules.constraints[g] || []).map(([c, min]) => ({ c, min, cur: e.matrix[c] ?? 0, ok: (e.matrix[c] ?? 0) >= min })) : []);
  const weakComps = (e) => matrixOf(e).filter((c) => c.score <= 5).sort((a, b) => a.score - b.score).map((c) => c.name);
  const strongComps = (e) => matrixOf(e).filter((c) => c.score >= 8).map((c) => c.name);

  // ---------- charts ----------
  function destroyCharts() { while (charts.length) charts.pop().destroy(); }
  function chartDefaults() { Chart.defaults.animation = false; Chart.defaults.color = css('--text-2'); Chart.defaults.borderColor = css('--line'); Chart.defaults.font.family = getComputedStyle(document.body).fontFamily; Chart.defaults.font.size = 12; }
  function mk(id, cfg) { const el = document.getElementById(id); if (!el) return; const c = new Chart(el, cfg); charts.push(c); return c; }
  const tooltipBase = () => ({ backgroundColor: css('--text'), titleColor: css('--bg'), bodyColor: css('--bg'), padding: 10, cornerRadius: 8, displayColors: true });
  function radar(id, labels, datasets, max = 10) {
    mk(id, { type: 'radar', data: { labels, datasets: datasets.map((d) => ({ ...d, borderWidth: 2, pointRadius: 3, pointHoverRadius: 6, fill: true })) },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: tooltipBase() },
        scales: { r: { min: 0, max, ticks: { stepSize: max / 5, backdropColor: 'transparent', color: css('--text-3') }, grid: { color: css('--line') }, angleLines: { color: css('--line') }, pointLabels: { font: { size: window.innerWidth < 600 ? 10 : 11 }, color: css('--text-2'), callback: (l) => (window.innerWidth < 600 && l.length > 16 ? l.slice(0, 15) + '…' : l) } } } } });
  }
  function line(id, labels, datasets, opts = {}) {
    mk(id, { type: 'line', data: { labels, datasets: datasets.map((d) => ({ tension: 0.3, borderWidth: 2, pointRadius: 3, pointHoverRadius: 6, fill: false, ...d })) },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: tooltipBase() },
        scales: { x: { grid: { display: false } }, y: { min: opts.min, max: opts.max, grid: { color: css('--line') }, ticks: { color: css('--text-3') }, border: { display: false } } } } });
  }
  function bars(id, labels, datasets, opts = {}) {
    const wrap = (l) => (typeof l === 'string' && l.length > 12 && !opts.horizontal) ? l.split(' ').reduce((a, w) => { const last = a[a.length - 1]; if (last !== undefined && (last + ' ' + w).length <= 14) a[a.length - 1] = last + ' ' + w; else a.push(w); return a; }, []) : l;
    mk(id, { type: 'bar', data: { labels: labels.map(wrap), datasets: datasets.map((d) => ({ borderRadius: 4, borderSkipped: 'start', barPercentage: 0.6, categoryPercentage: 0.7, maxBarThickness: 44, ...d })) },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: opts.horizontal ? 'y' : 'x', plugins: { legend: { display: false }, tooltip: tooltipBase() },
        scales: { x: { grid: { display: !!opts.horizontal, color: css('--line') }, max: opts.horizontal ? opts.max : undefined, border: { display: false }, ticks: { color: css('--text-3'), maxRotation: 0, autoSkip: false } },
          y: { grid: { display: !opts.horizontal, color: css('--line') }, max: opts.horizontal ? undefined : opts.max, min: 0, border: { display: false }, ticks: { color: css('--text-3'), precision: 0 } } } } });
  }
  const legend = (items) => `<div class="legend">${items.map(([c, t]) => `<span><i class="dot" style="background:${c}"></i>${esc(t)}</span>`).join('')}</div>`;

  // ---------- nav ----------
  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    tasks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l2 2 4-4"/><rect x="3" y="4" width="18" height="16" rx="3"/></svg>',
    learn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4l9 4-9 4-9-4z"/><path d="M5 10v5c0 1.5 3 3 7 3s7-1.5 7-3v-5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/></svg>',
    growth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19h16M6 15l4-5 4 3 5-7"/></svg>',
    grade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    form: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>',
    org: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="3" width="6" height="5" rx="1.5"/><rect x="3" y="16" width="6" height="5" rx="1.5"/><rect x="15" y="16" width="6" height="5" rx="1.5"/><path d="M12 8v4M6 16v-4h12v4"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5a5 5 0 0 1 6 4.5"/></svg>',
    pulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>',
    onb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h12l4 4v12H4z"/><path d="M8 13l2.5 2.5L16 10"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    flow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7.5 12h4l5-5M11.5 12l5 5"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></svg>',
  };
  const pendingCount = () => TS.flatMap((t) => t.items).filter((i) => i.status === 'pending' && inScope(i.emp)).length;
  const managerNav = (p) => [
    { g: 'Команда' },
    { h: `${p}/dashboard`, t: 'Дашборд', i: I.dash },
    { h: `${p}/structure`, t: 'Структура', i: I.org },
    { h: `${p}/team`, t: 'Сотрудники', i: I.people },
    { g: 'Процессы' },
    { h: `${p}/transcripts`, t: 'Транскрипты встреч', s: 'Транскрипты', i: I.mic, badge: pendingCount },
    { h: `${p}/feedback`, t: 'Обратная связь', s: 'Обратная связь', i: I.chat },
    { h: `${p}/reviews`, t: 'Performance Review', s: 'PR', i: I.star },
    { h: `${p}/onboarding`, t: 'Адаптация и обучение', s: 'Адаптация', i: I.onb, badge: () => Object.entries(D.onboarding).filter(([id, o]) => o.risk !== 'low' && inScope(id)).length },
    { h: `${p}/pulse`, t: 'Пульс и mNPS', s: 'Пульс', i: I.pulse },
    { h: `${p}/processes`, t: 'Карта процессов', s: 'Процессы', i: I.flow },
  ];
  const NAV = {
    employee: [
      { g: 'Мой кабинет' },
      { h: '/employee/profile', t: 'Профиль', i: I.home },
      { h: '/employee/tasks', t: 'Задачи', i: I.tasks, badge: () => TASKS[USERS.employee].filter((t) => t.status === 'overdue').length },
      { h: '/employee/one-on-one', t: 'Постмиты 1:1', i: I.chat },
      { h: '/employee/learning', t: 'Обучение (LMS)', s: 'Обучение', i: I.learn },
      { g: 'Развитие' },
      { h: '/employee/review', t: 'Performance Review', s: 'PR', i: I.star },
      { h: '/employee/grades', t: 'Матрица грейдов', s: 'Грейды', i: I.grade },
      { h: '/employee/idp', t: 'ИПР', i: I.growth },
      { h: '/employee/forms', t: 'Анкеты и самооценка', s: 'Анкеты', i: I.form },
    ],
    manager: [...managerNav('/manager')],
    hr: [...managerNav('/hr'), { g: 'Администрирование' }, { h: '/hr/people', t: 'Данные сотрудников', s: 'Данные', i: I.people }, { h: '/hr/settings', t: 'Шаблоны и циклы', s: 'Шаблоны', i: I.gear }, { h: '/hr/access', t: 'Роли и доступ', s: 'Доступ', i: I.lock }],
  };

  // ---------- shared blocks ----------
  function matrixRadarCard(e, id) {
    const groups = groupsOf(e); const sum = matrixSum(e), max = matrixMax(e); const ng = nextGrade(e);
    const rng = isAccount(e) && D.gradeRules.ranges[ng]; const cons = constraintsFor(e, ng);
    setTimeout(() => radar(id, groups.map((g) => g.name), [{ label: 'Текущий уровень', data: groups.map((g) => +g.avg.toFixed(1)), borderColor: css('--s1'), backgroundColor: css('--s1') + '26', pointBackgroundColor: css('--s1') }]));
    return `<div class="chart h-300"><canvas id="${id}"></canvas></div>
      <div class="row between" style="margin-top:8px"><div><b>${sum}</b> <span class="hint">из ${max} баллов</span></div>${rng ? `<span class="hint">на ${esc(ng)}: ${rng[0]}–${rng[1]}${cons.length ? `, ограничения ${cons.every((c) => c.ok) ? chip('выполнены', 'good') : chip(`${cons.filter((c) => !c.ok).length} не выполнено`, 'warn')}` : ''}</span>` : ''}</div>
      <div class="hint" style="margin-top:8px">Зоны роста (5 и ниже): ${weakComps(e).length ? weakComps(e).map((g) => chip(g, 'warn')).join(' ') : 'нет'}</div>`;
  }
  function matrixTable(e, withLevels) {
    const rows = matrixOf(e); let lastGroup = '';
    return `<table class="matrix"><thead><tr><th>Компетенция</th><th class="hide-m">Тип</th><th>Балл</th><th class="hide-m">${withLevels ? 'Уровень проявления сейчас' : 'Уровень'}</th></tr></thead><tbody>${rows.map((c) => {
      const lv = levelOf(c.score); const g = c.group !== lastGroup && c.group !== c.name ? `<span class="cgroup">${esc(c.group)}</span>` : ''; lastGroup = c.group;
      return `<tr><td class="cname">${g}${esc(c.name)}</td><td class="hide-m">${chip(c.kind === 'hard' ? 'хард' : 'софт', c.kind === 'hard' ? 'accent kind' : 'kind')}</td><td style="white-space:nowrap">${scale10(c.score)} <b style="margin-left:6px">${c.score}</b></td>${withLevels && c.levels ? `<td class="lvl cur hide-m"><b>${levelName[lv]}:</b> ${esc(c.levels[lv])}</td>` : `<td class="hide-m">${chip(levelName[lv], lv === 'base' ? 'warn' : lv === 'expert' ? 'good' : '')}</td>`}</tr>`;
    }).join('')}</tbody></table>`;
  }
  function hardsCard(e) {
    const h = hardsOf(e); if (!h.length) return '';
    const ok = h.filter((x) => x.status === 'confirmed').length;
    return `<div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Харды</h2><span class="hint">задание на навык, подтверждение артефактом, валидирует руководитель</span></div>
      <div class="progress-row" style="grid-template-columns:auto 1fr 60px;margin-bottom:10px"><div class="hint">Подтверждено ${ok} из ${h.length}</div>${bar(Math.round(100 * ok / h.length), 'good')}<div class="num">${Math.round(100 * ok / h.length)}%</div></div>
      <table><thead><tr><th>Навык</th><th class="hide-m">Задание</th><th>Статус</th><th class="hide-m">Артефакт</th></tr></thead><tbody>${h.map((x) => `<tr><td>${esc(x.skill)}</td><td class="hide-m"><small>${esc(x.task)}</small></td><td>${chip(hardStatus[x.status][0], hardStatus[x.status][1])}</td><td class="hide-m"><small>${esc(x.artifact || '—')}</small></td></tr>`).join('')}</tbody></table></div>`;
  }
  function tasksTable(list, showResult = true) {
    if (!list.length) return '<div class="empty">Задач нет</div>';
    return `<table><thead><tr><th>Задача</th><th class="hide-m">Откуда</th><th>Срок</th><th>Статус</th>${showResult ? '<th class="hide-m">Результат / прогресс</th>' : ''}</tr></thead><tbody>${list.map((t) => {
      const [txt, cls] = taskStatus[t.status]; return `<tr><td>${esc(t.title)}</td><td class="hide-m"><small>${esc(t.source)}</small></td><td style="white-space:nowrap">${fmtShort(t.due)}</td><td>${chip(txt, cls)}</td>${showResult ? `<td class="hide-m">${t.kind === 'long' ? `<div class="row" style="flex-wrap:nowrap"><div style="flex:1">${bar(t.progress)}</div><small>${t.progress}%</small></div>` : `<small>${esc(t.result || '—')}</small>`}</td>` : ''}</tr>`;
    }).join('')}</tbody></table>`;
  }
  function coursesTable(list) {
    if (!list.length) return '<div class="empty">Курсов нет</div>';
    return `<table><thead><tr><th>Курс в LMS</th><th class="hide-m">Тип</th><th>Срок</th><th>Статус</th></tr></thead><tbody>${list.map((c) => { const [txt, cls] = courseStatus[c.status]; return `<tr><td>${esc(c.title)}</td><td class="hide-m">${chip(c.type, c.type === 'обязательный' ? 'serious' : '')}</td><td style="white-space:nowrap">${fmtShort(c.due)}</td><td>${chip(txt, cls)}</td></tr>`; }).join('')}</tbody></table>`;
  }
  function gradeTimeline(e) {
    const h = D.gradeHistory[e.id] || [{ date: e.hired, grade: e.grade, note: 'Приём на работу' }];
    return `<ul class="timeline">${[...h].reverse().map((x) => `<li><div class="row"><span class="chip grade">${esc(x.grade)}</span><b style="font-size:14px;font-weight:500">${esc(x.note)}</b></div><div class="date">${fmt(x.date)}</div></li>`).join('')}</ul>`;
  }
  function profileHeader(e, forManager) {
    const m = e.manager ? emp(e.manager) : null; const onb = D.onboarding[e.id]; const pr = (D.prCycles[e.id] || [])[0];
    return `<div class="card"><div class="row" style="gap:18px;align-items:flex-start">${avatar(e, 'lg')}<div style="flex:1;min-width:0">
      <div class="row"><h2>${esc(e.name)}</h2>${chip(e.grade, 'grade')}${e.status === 'probation' ? chip('Испытательный срок', 'warn') : ''}</div>
      <div class="muted" style="margin:2px 0 6px">${esc(e.role)} · ${esc(deptName(e.dept))}</div>${e.dept && e.grade !== 'Lead' ? `<div class="row" style="gap:4px;margin-bottom:12px"><span class="hint">Грейды роли:</span> ${ladderChips(e)}</div>` : '<div style="height:6px"></div>'}
      <div class="grid cols-4" style="gap:10px">
        <div class="stat"><span class="label">В компании</span><span class="value" style="font-size:18px">${tenure(e.hired)}</span><span class="hint">с ${fmt(e.hired)}</span></div>
        <div class="stat"><span class="label">Руководитель</span><span class="value" style="font-size:18px">${m ? (forManager && inScope(m.id) ? personLink(m) : esc(m.name)) : '—'}</span></div>
        <div class="stat"><span class="label">Матрица грейдов</span><span class="value" style="font-size:18px">${matrixSum(e)}<small>из ${matrixMax(e)}</small></span><span class="hint">${(D.gradeHistory[e.id] || []).length > 1 ? 'грейд с ' + fmt(D.gradeHistory[e.id].slice(-1)[0].date) : 'грейд с приёма'}</span></div>
        <div class="stat"><span class="label">${onb ? 'Испытательный срок до' : 'Performance Review'}</span><span class="value" style="font-size:18px">${onb ? fmt(onb.end) : (pr ? perfChip(pr.performance.point1 || pr.performance.start) + ' ' + esc(pr.period) : '—')}</span><span class="hint">${onb ? `осталось ${daysBetween(TODAY, onb.end)} дн.` : (pr ? 'уровень на контрольной точке 1' : '')}</span></div>
      </div></div></div></div>`;
  }
  function postmitList(list, tasks, compact) {
    if (!list.length) return '<div class="empty">Постмитов нет</div>';
    const moods = ['', 'Тяжело', 'Напряжённо', 'Нормально', 'Хорошо', 'Отлично'];
    return `<ul class="list">${list.map((m) => `<li><div class="body"><div class="row between"><div><b style="font-weight:500">${fmt(m.date)}</b> · ${esc(m.topic)}</div>${m.mood ? chip(`Самочувствие: ${moods[m.mood]}`, m.mood >= 4 ? 'good' : m.mood === 3 ? '' : 'warn') : ''}</div>
      ${compact ? '' : `<div class="grid cols-2" style="gap:12px;margin-top:8px"><div><div class="hint">Вопросы руководителя</div><ul class="dots" style="margin:4px 0 0;padding-left:18px;font-size:13px">${m.managerQuestions.map((q) => `<li>${esc(q)}</li>`).join('') || '<li class="hint">—</li>'}</ul></div><div><div class="hint">Вопросы сотрудника</div><ul style="margin:4px 0 0;padding-left:18px;font-size:13px">${m.employeeQuestions.map((q) => `<li>${esc(q)}</li>`).join('') || '<li class="hint">—</li>'}</ul></div></div>`}
      <div class="hint" style="margin-top:8px">Действия, что договорились делать · сроки, задачи и артефакты</div>
      <div class="row" style="margin-top:4px">${m.actions.map((a) => { const t = (tasks || []).find((x) => x.id === a.taskId); return chip(`${a.text} · до ${fmtShort(a.due)}`, t ? taskStatus[t.status][1] : ''); }).join('')}${m.artifacts.map((a) => chip(a, 'accent')).join('')}</div></div></li>`).join('')}</ul>`;
  }
  function prBlock(c, forManager) {
    const perfRow = (label, v) => `<div class="stat"><span class="label">${label}</span><span class="value" style="font-size:20px">${perfChip(v)}</span></div>`;
    return `<div class="row between" style="margin-bottom:12px"><div><b style="font-size:16px;font-weight:500">${esc(c.period)}</b> <span class="hint">· встреча ${fmt(c.meetingDate)} · ${esc(c.participants)} · грейд ${esc(c.grade)}</span></div>
        <div class="row">${c.points.map((p) => chip(`${p.name}: ${p.dates}`, p.done ? 'good' : '')).join('')}</div></div>
      <div class="card flat" style="margin-bottom:12px"><div class="card-head"><h3>Метрики эффективности по роли</h3><span class="hint">план → контрольная точка 1 → точка 2 → факт</span></div>
        <table><thead><tr><th>Метрика</th><th class="hide-m">План</th><th>Точка 1</th><th class="hide-m">Точка 2</th><th class="hide-m">Факт</th></tr></thead><tbody>${c.metrics.map((m) => `<tr><td>${esc(m.name)}</td><td class="hide-m"><small>${esc(m.plan)}</small></td><td class="${m.bad ? 'bad' : ''}">${esc(m.point1 || '—')}</td><td class="hide-m">${esc(m.point2 || '—')}</td><td class="hide-m">${esc(m.fact || '—')}</td></tr>`).join('')}</tbody></table></div>
      <div class="grid cols-2" style="margin-bottom:12px">
        <div class="card flat"><div class="card-head"><h3>Цели на развитие</h3><span class="hint">полугодие</span></div>${c.goals.map((g, i) => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b style="font-weight:500">${i + 1}. ${esc(g.text)}</b><div class="hint" style="margin-top:4px">Критерии: ${esc(g.criteria)}</div><div class="row" style="margin-top:6px">${g.point1 ? chip(`Точка 1: ${g.point1}`, 'accent') : ''}${g.fact ? chip(`Факт: ${g.fact}`, 'good') : ''}${g.link ? chip(g.link) : ''}</div></div>`).join('')}</div>
        <div class="stack">
          <div class="card flat"><div class="card-head"><h3>Оценка 360 в цикле</h3></div><div class="hint">Начало периода</div><div style="font-size:14px"><b style="font-weight:500">Сильные стороны:</b> ${esc(c.review360.start.strengths)}<br><b style="font-weight:500">Зоны роста:</b> ${esc(c.review360.start.growth)}</div>${c.review360.end ? `<div class="hint" style="margin-top:8px">Конец периода</div><div style="font-size:14px"><b style="font-weight:500">Сильные стороны:</b> ${esc(c.review360.end.strengths)}<br><b style="font-weight:500">Зоны роста:</b> ${esc(c.review360.end.growth)}</div>` : '<div class="hint" style="margin-top:8px">Конец периода: после итоговой 360</div>'}</div>
          <div class="card flat"><div class="card-head"><h3>Итоговый перформанс</h3></div><div class="grid cols-4" style="gap:8px">${perfRow('Начало', c.performance.start)}${perfRow('Точка 1', c.performance.point1)}${perfRow('Точка 2', c.performance.point2)}${perfRow('Итог', c.performance.end)}</div>
            <div class="hint" style="margin-top:10px">${Object.entries(D.performanceLevels).map(([k, v]) => `<b>${k}</b> — ${esc(v)}`).join('<br>')}</div></div>
        </div>
      </div>
      <div class="grid cols-2"><div class="card flat"><div class="card-head"><h3>Прямая речь</h3></div><div style="font-size:14px">${esc(c.speech)}</div></div>
        <div class="card flat"><div class="card-head"><h3>Шаги изменений</h3></div>${c.steps.length ? `<ul class="list">${c.steps.map((s) => `<li>${check(false)}<div class="body" style="font-size:14px">${esc(s)}</div></li>`).join('')}</ul>` : '<div class="empty">Фиксируются на итоговой встрече</div>'}</div></div>`;
  }
  // 360: агрегат. detailed — показывать колонки «Руководитель» и «Коллеги» отдельно (руководитель и HR), иначе только «Окружение»
  function review360Block(r, detailed) {
    const env = (i) => (i.manager + i.peers) / 2; const avg = (i) => (i.self + env(i)) / 2;
    const compRows = r.competencies.map((c) => ({ name: c.name, self: c.indicators.reduce((s, i) => s + i.self, 0) / c.indicators.length, env: c.indicators.reduce((s, i) => s + env(i), 0) / c.indicators.length }));
    setTimeout(() => bars('chart-360', compRows.map((c) => c.name), [
      { label: 'Самооценка', data: compRows.map((c) => +c.self.toFixed(1)), backgroundColor: css('--s2') },
      { label: 'Оценка окружения', data: compRows.map((c) => +c.env.toFixed(1)), backgroundColor: css('--s1') }], { max: 5 }));
    const gaps = compRows.map((c) => ({ ...c, gap: c.env - c.self })).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 2);
    return `<div class="grid cols-2" style="margin-bottom:16px">
        <div class="card"><div class="card-head"><h3>Оценка 360 · ${esc(r.period)}</h3><span class="hint">${r.respondents.manager} руководитель, ${r.respondents.peers} коллег · шкала 1–5</span></div><div class="chart h-260"><canvas id="chart-360"></canvas></div>${legend([[css('--s2'), 'Самооценка'], [css('--s1'), 'Оценка окружения (руководитель и коллеги)']])}</div>
        <div class="card"><div class="card-head"><h3>Разрывы</h3><span class="hint">где оценка окружения расходится с самооценкой</span></div>
          ${gaps.map((g) => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="row between"><b style="font-weight:500">${esc(g.name)}</b>${chip(g.gap > 0.3 ? 'недооцениваете себя' : g.gap < -0.3 ? 'переоцениваете себя' : 'совпадает', g.gap > 0.3 ? 'accent' : g.gap < -0.3 ? 'warn' : 'good')}</div><div class="hint">самооценка ${g.self.toFixed(1)} · окружение ${g.env.toFixed(1)}</div></div>`).join('')}
          <div class="hint" style="margin-top:10px">Самые высокие оценки: как ещё использовать эти сильные стороны? Самые низкие: критичны ли они для роли, или полезнее опереться на сильные.</div></div>
      </div>
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h3>По индикаторам</h3><span class="hint">0 — не наблюдал, в среднем не учитывается</span></div>
        <table><thead><tr><th>Компетенция и индикатор</th><th class="num">Сам</th>${detailed ? '<th class="num hide-m">Рук.</th><th class="num hide-m">Коллеги</th>' : ''}<th class="num">Окружение</th><th class="num hide-m">Средняя</th><th class="hide-m">Комментарий</th></tr></thead><tbody>
        ${r.competencies.map((c) => `<tr><td colspan="${detailed ? 7 : 5}" style="padding-top:14px"><b style="font-weight:500;color:var(--accent)">${esc(c.name)}</b></td></tr>${c.indicators.map((i) => `<tr><td><small>${esc(i.text)}</small></td><td class="num">${i.self.toFixed(1)}</td>${detailed ? `<td class="num hide-m">${i.manager.toFixed(1)}</td><td class="num hide-m">${i.peers.toFixed(1)}</td>` : ''}<td class="num">${env(i).toFixed(1)}</td><td class="num hide-m"><b>${avg(i).toFixed(1)}</b></td><td class="hide-m"><small class="hint">${esc(i.comment || '')}</small></td></tr>`).join('')}`).join('')}</tbody></table></div>
      <div class="grid cols-2">${r.open.map((o) => `<div class="card"><div class="card-head"><h3 style="font-size:15px">${esc(o.q)}</h3></div><ul class="list">${o.answers.map((a) => `<li><div class="body" style="font-size:14px">«${esc(a)}»</div></li>`).join('')}</ul></div>`).join('')}</div>`;
  }
  function idpBlock(e) {
    const p = D.idp[e.id]; if (!p) return '<div class="empty">ИПР ещё не составлен. Он фиксируется после Performance Review или оценки на грейд: одна компетенция на квартал.</div>';
    return `<div class="card flat" style="margin-bottom:12px"><div class="row between"><div><span class="hint">Цель на квартал · ${esc(p.period)}</span><h3 style="margin-top:4px">${esc(p.goal)}</h3></div><div style="min-width:160px"><div class="progress-row" style="grid-template-columns:1fr 40px"><div>${bar(p.progress, 'orange')}</div><div class="num">${p.progress}%</div></div><div class="hint" style="text-align:right">обновлён ${fmt(p.reviewedAt)} · чекин ${fmt(p.next)}</div></div></div>
      <div class="grid cols-2" style="margin-top:12px;gap:12px"><div><div class="hint">Зачем именно сейчас</div><div style="font-size:14px">${esc(p.why)}</div></div><div><div class="hint">Тайминг</div><div style="font-size:14px">${esc(p.timing)}</div></div></div></div>
      <div class="card flat" style="margin-bottom:12px"><div class="card-head"><h3>Поднавыки: сейчас → план</h3><span class="hint">шкала 1–10</span></div>
        <table><thead><tr><th>Поднавык</th><th>Сейчас → план</th><th class="hide-m">Что значат цифры</th><th class="hide-m">На что влияет</th></tr></thead><tbody>${p.subskills.map((s) => `<tr><td>${esc(s.text)}</td><td style="white-space:nowrap">${scale10(s.now, s.plan)} <b style="margin-left:6px">${s.now} → ${s.plan}</b></td><td class="hide-m"><small>${esc(s.meaning)}</small></td><td class="hide-m"><small>${esc(s.results)}</small></td></tr>`).join('')}</tbody></table></div>
      <div class="grid cols-2">${p.plan.map((s) => `<div class="card flat"><h3 style="margin-bottom:8px">${esc(s.skill)}</h3>
        <table><tbody><tr><td class="hint" style="width:120px">Проекты и задачи</td><td><small>${esc(s.projects)}</small></td></tr><tr><td class="hint">Эксперты</td><td><small>${esc(s.experts)}</small></td></tr><tr><td class="hint">Информация</td><td><small>${esc(s.info)}</small></td></tr><tr><td class="hint">Метрики</td><td><small>${esc(s.metrics)}</small></td></tr></tbody></table>
        <ul class="list" style="margin-top:6px"><li>${check(s.done1)}<div class="body" style="font-size:13px">${esc(s.cp1)}</div></li><li>${check(s.done2)}<div class="body" style="font-size:13px">${esc(s.cp2)}</div></li></ul></div>`).join('')}</div>`;
  }
  function onboardingCard(id, o, full) {
    const e = emp(id); const dayN = daysBetween(o.start, TODAY); const total = daysBetween(o.start, o.end); const doneM = o.meetings.filter((m) => m.done).length;
    return `<div class="card ${full ? '' : 'flat'}"><div class="row" style="flex-wrap:nowrap">${avatar(e)}<div style="flex:1"><b style="font-weight:500">${full ? esc(e.name) : personLink(e)}</b><div class="hint">${esc(e.role)} · наставник ${esc(o.buddy)} · рекрутер ${esc(o.recruiter)} · HR BP ${esc(o.hrbp)}</div></div>${chip(o.risk === 'low' ? 'по плану' : 'есть риск', o.risk === 'low' ? 'good' : 'warn')}</div>
      <div class="progress-row" style="margin:12px 0 4px"><div class="hint">День ${dayN} из ${total} · ИС до ${fmt(o.end)}</div>${bar(Math.round(100 * dayN / total), 'good')}<div class="num">${Math.round(100 * dayN / total)}%</div></div>
      <div class="progress-row" style="margin-bottom:10px"><div class="hint">Встречи ${doneM} из ${o.meetings.length}</div>${bar(Math.round(100 * doneM / o.meetings.length))}<div class="num">${Math.round(100 * doneM / o.meetings.length)}%</div></div>
      <div class="grid ${full ? 'cols-3' : 'cols-1'}" style="gap:12px">
        <div><div class="hint" style="margin-bottom:4px">Встречи онбординга</div><ul class="list">${o.meetings.map((m) => `<li>${check(m.done)}<div class="body" style="font-size:13px"><b style="font-weight:500">${esc(m.name)}</b> · ${fmtShort(m.date)}${!m.done && new Date(m.date) < TODAY ? ' ' + chip('просрочена', 'critical') : ''}<div class="meta">${esc(m.participants)}${m.note ? ' · ' + esc(m.note) : ''}</div></div></li>`).join('')}</ul></div>
        ${full ? `<div><div class="hint" style="margin-bottom:4px">Совместная оценка погружения (1–4)</div><table><thead><tr><th>Параметр</th><th class="num">Сотрудник</th><th class="num">Руководитель</th></tr></thead><tbody>${o.immersion.map((i) => `<tr><td><small>${esc(i.param)}</small></td><td class="num">${i.self}</td><td class="num ${i.manager < 3 ? 'bad' : ''}">${i.manager}</td></tr>`).join('')}</tbody></table></div>
        <div><div class="hint" style="margin-bottom:4px">Цели и критерии прохождения ИС</div><ul class="list">${o.goals.map((g) => `<li><span class="dot" style="background:var(--accent);margin-top:8px"></span><div class="body" style="font-size:13px">${esc(g)}</div></li>`).join('')}</ul><ul class="list" style="margin-top:6px">${o.criteria.map((c) => `<li>${check(c.done)}<div class="body" style="font-size:13px">${esc(c.text)}</div></li>`).join('')}</ul></div>` : ''}
      </div><div class="hint" style="margin-top:10px">${esc(o.riskNote)}</div></div>`;
  }
  function feedbackTable(ids, quarter) {
    const rows = ids.map((id) => ({ e: emp(id), items: FB.filter((f) => f.to === id && (!quarter || f.quarter === quarter)) })).filter((r) => r.items.length);
    if (!rows.length) return '<div class="empty">Записей за период нет</div>';
    const src = { transcript: 'транскрипт', manual: 'вручную', 360: '360', form: 'анкета' };
    const cell = (items) => items.length ? `<ul class="list">${items.map((f) => `<li><div class="body" style="font-size:13px">${esc(f.text)}<div class="meta">${fmt(f.date)} · ${chip(src[f.source] || f.source)}</div></div></li>`).join('')}</ul>` : '<span class="hint">—</span>';
    return `<table><thead><tr><th style="width:180px">Сотрудник</th><th style="width:40%">Молодец</th><th>Не молодец</th></tr></thead><tbody>${rows.map((r) => `<tr><td><div class="row" style="flex-wrap:nowrap">${avatar(r.e, 'sm')}<div><b style="font-weight:500">${ROLE === 'employee' ? esc(r.e.name) : personLink(r.e)}</b><div class="hint">${esc(r.e.role)}</div></div></div></td><td>${cell(r.items.filter((f) => f.kind === 'success'))}</td><td>${cell(r.items.filter((f) => f.kind === 'growth'))}</td></tr>`).join('')}</tbody></table>`;
  }

  // ---------- employee views ----------
  const V = {};
  V['/employee/profile'] = () => {
    const e = emp(USERS.employee); const tasks = TASKS[e.id] || []; const ops = tasks.filter((t) => t.kind === 'ops' && t.status !== 'done'); const long = tasks.filter((t) => t.kind === 'long');
    const courses = D.courses[e.id] || []; const pr = (D.prCycles[e.id] || [])[0]; const last11 = (D.oneOnOnes[e.id] || [])[0]; const fb = FB.filter((f) => f.to === e.id).slice(0, 3);
    return { title: 'Мой профиль', crumbs: 'Кабинет сотрудника', html: `
      ${profileHeader(e, false)}
      <div class="grid cols-3" style="margin-top:16px">
        <div class="card"><div class="card-head"><h3>Оперативные задачи</h3>${link('/employee/tasks', 'все')}</div><div class="hint" style="margin-bottom:6px">из постмитов 1:1</div>
          <ul class="list">${ops.map((t) => `<li>${check(false)}<div class="body"><div style="font-size:14px">${esc(t.title)}</div><div class="meta">до ${fmtShort(t.due)} · ${esc(t.source)} ${t.status === 'overdue' ? chip('просрочено', 'critical') : ''}</div></div></li>`).join('') || '<li class="empty">Нет открытых задач</li>'}</ul></div>
        <div class="card"><div class="card-head"><h3>Длительные задачи</h3>${link('/employee/tasks', 'все')}</div><div class="hint" style="margin-bottom:6px">из целей PR и ИПР</div>
          <div class="stack">${long.map((t) => `<div><div style="font-size:14px">${esc(t.title)}</div><div class="progress-row" style="margin-top:4px"><div class="hint">${esc(t.source)} · до ${fmtShort(t.due)}</div>${bar(t.progress)}<div class="num">${t.progress}%</div></div></div>`).join('')}</div></div>
        <div class="card blue"><div class="card-head"><h3>Performance Review</h3>${link('/employee/review', 'подробно')}</div>
          ${pr ? `<div class="stat"><span class="label">${esc(pr.period)} · грейд ${esc(pr.grade)}</span><span class="value">${esc(pr.performance.point1 || pr.performance.start)}</span><span class="hint">уровень на контрольной точке 1 · ${esc(D.performanceLevels[pr.performance.point1 || pr.performance.start])}</span></div>
          <div style="margin-top:12px;font-size:13px"><b>Сильные стороны (360):</b> ${esc(pr.review360.start.strengths)}<br><b>Зоны роста:</b> ${esc(pr.review360.start.growth)}</div>` : '<div class="empty">Первый PR — после испытательного срока</div>'}</div>
      </div>
      <div class="grid cols-2" style="margin-top:16px">
        <div class="card"><div class="card-head"><h3>Матрица грейдов · ${esc(e.grade)}</h3>${link('/employee/grades', 'матрица и план')}</div>${matrixRadarCard(e, 'radar-profile')}</div>
        <div class="stack">
          <div class="card"><div class="card-head"><h3>Обучение в LMS</h3>${link('/employee/learning', 'все курсы')}</div><ul class="list">${courses.filter((c) => c.status !== 'done').map((c) => `<li><div class="body"><div style="font-size:14px">${esc(c.title)}</div><div class="meta">до ${fmtShort(c.due)} · ${esc(c.type)}</div></div>${chip(courseStatus[c.status][0], courseStatus[c.status][1])}</li>`).join('') || '<li class="empty">Назначенных курсов нет</li>'}</ul></div>
          <div class="card"><div class="card-head"><h3>Обратная связь по мне</h3><span class="hint">из транскриптов и от коллег</span></div><ul class="list">${fb.map((f) => `<li>${chip(f.kind === 'success' ? 'Молодец' : 'Зона роста', f.kind === 'success' ? 'good' : 'warn')}<div class="body" style="font-size:13px">${esc(f.text)}<div class="meta">${fmt(f.date)} · ${esc(fbSrc[f.source] || f.source)}</div></div></li>`).join('')}</ul></div>
          ${last11 ? `<div class="card"><div class="card-head"><h3>Последний постмит 1:1</h3>${link('/employee/one-on-one', 'все')}</div>${postmitList([last11], tasks, true)}</div>` : ''}
          <div class="card"><div class="card-head"><h3>История грейдов</h3></div>${gradeTimeline(e)}</div>
        </div>
      </div>` };
  };
  V['/employee/tasks'] = () => {
    const tasks = TASKS[USERS.employee] || [];
    return { title: 'Задачи', crumbs: 'Кабинет сотрудника', html: `
      <div class="grid cols-4" style="margin-bottom:16px">${[['Оперативных открыто', tasks.filter((t) => t.kind === 'ops' && t.status !== 'done').length], ['Просрочено', tasks.filter((t) => t.status === 'overdue').length], ['Длительных в работе', tasks.filter((t) => t.kind === 'long').length], ['Закрыто за 30 дней', tasks.filter((t) => t.status === 'done').length]].map(([l, v]) => `<div class="card stat"><span class="label">${l}</span><span class="value">${v}</span></div>`).join('')}</div>
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Оперативные задачи</h2><span class="hint">из блока «Действия, что договорились делать» постмита 1:1 и из транскриптов после подтверждения руководителем</span></div>${tasksTable(tasks.filter((t) => t.kind === 'ops'))}</div>
      <div class="card"><div class="card-head"><h2>Длительные задачи</h2><span class="hint">цели Performance Review на полугодие и шаги ИПР на квартал</span></div>${tasksTable(tasks.filter((t) => t.kind === 'long'))}</div>` };
  };
  V['/employee/one-on-one'] = () => {
    const e = emp(USERS.employee); const list = D.oneOnOnes[e.id] || [];
    return { title: 'Постмиты 1:1', crumbs: 'Кабинет сотрудника', html: `
      <div class="grid cols-3" style="margin-bottom:16px">
        <div class="card span-2"><div class="row between"><div><h3>Следующая встреча: 20.10.2026, 11:00</h3><div class="hint">раз в 2 недели · 30 минут · с Верой Ситниковой</div></div><button class="btn primary" onclick="hrAct.demo()">Добавить вопрос к встрече</button></div>
          <div class="grid cols-2" style="margin-top:12px;gap:12px"><div><div class="hint">Вопросы руководителя</div><ul class="list"><li>${check(false)}<div class="body" style="font-size:14px">Промт для проверки SEO-отчётов: что готово</div></li><li>${check(false)}<div class="body" style="font-size:14px">Шаблон отчёта (перенесено с прошлой встречи, просрочено)</div></li></ul></div><div><div class="hint">Вопросы сотрудника</div><ul class="list"><li>${check(false)}<div class="body" style="font-size:14px">Чекин по ИПР: разбор первых 5 сообщений клиентам</div></li></ul></div></div></div>
        <div class="card lav"><div class="card-head"><h3>С чем можно прийти на 1:1</h3></div><ul style="margin:0;padding-left:18px;font-size:13px;color:var(--text-2)"><li>Хочу вырасти в доходе: что для этого сделать</li><li>Хочу развиваться в роли или сменить роль</li><li>Нужна обратная связь по ситуации или результату</li><li>Устал, перегорел, конфликт, личные обстоятельства</li><li>Мои успехи за месяц и проблемы, где нужна помощь</li></ul></div>
      </div>
      <div class="card"><div class="card-head"><h2>Прошедшие встречи</h2><span class="hint">постмит заполняет сотрудник, руководитель дополняет и валидирует</span></div>${postmitList(list, TASKS[e.id])}</div>
      <div class="hint" style="margin-top:10px">Приватные заметки руководителя в кабинете сотрудника не показываются. Если встреча записана, транскрипт загружает руководитель: задачи и обратная связь из него попадают сюда после его подтверждения.</div>` };
  };
  V['/employee/learning'] = () => {
    const c = D.courses[USERS.employee] || [];
    return { title: 'Обучение (LMS)', crumbs: 'Кабинет сотрудника', html: `
      <div class="grid cols-4" style="margin-bottom:16px">
        <div class="card stat"><span class="label">Назначено</span><span class="value">${c.filter((x) => x.status === 'assigned').length}</span></div>
        <div class="card stat"><span class="label">Просрочено</span><span class="value">${c.filter((x) => x.status === 'overdue').length}</span></div>
        <div class="card stat"><span class="label">Пройдено</span><span class="value">${c.filter((x) => x.status === 'done').length}</span></div>
        <div class="card stat"><span class="label">Источник</span><span class="value" style="font-size:18px">iSpring Learn</span><span class="hint">по API: название и статус</span></div>
      </div>
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Назначенные курсы</h2></div>${coursesTable(c.filter((x) => x.status !== 'done'))}</div>
      <div class="card"><div class="card-head"><h2>Пройденные</h2></div>${coursesTable(c.filter((x) => x.status === 'done'))}</div>` };
  };
  V['/employee/review'] = () => {
    const e = emp(USERS.employee); const cycles = D.prCycles[e.id] || []; const r360 = D.review360[e.id];
    return { title: 'Performance Review', crumbs: 'Кабинет сотрудника', html: `
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Текущий цикл</h2><span class="hint">раз в полугодие, две контрольные точки, к зарплате не привязан</span></div>${cycles[0] ? prBlock(cycles[0], false) : '<div class="empty">Цикл не начат</div>'}</div>
      ${r360 ? review360Block(r360, false) : ''}
      <div class="grid cols-2" style="margin-top:16px">
        <div class="card"><div class="card-head"><h3>Прошлые циклы</h3></div><table><thead><tr><th>Период</th><th>Грейд</th><th>Итог</th><th class="hide-m">Решение</th></tr></thead><tbody>${cycles.slice(1).map((c) => `<tr><td>${esc(c.period)}</td><td>${esc(c.grade)}</td><td>${perfChip(c.performance.end)}</td><td class="hide-m"><small>${esc(c.speech)}</small></td></tr>`).join('') || '<tr><td colspan="4" class="hint">Нет</td></tr>'}</tbody></table></div>
        <div class="card lav"><div class="card-head"><h3>Self Review перед встречей</h3>${link('/employee/forms', 'заполнить')}</div><div class="hint">Вопросы для подготовки по блокам: цели, метрики, 360, динамика развития, командная работа. Ответы видит руководитель.</div><ul style="margin:8px 0 0;padding-left:18px;font-size:13px">${D.selfReview.map((b) => `<li><b style="font-weight:500">${esc(b.block)}</b>: ${esc(b.questions[0])}</li>`).join('')}</ul></div>
      </div>` };
  };
  V['/employee/grades'] = () => {
    const e = emp(USERS.employee); const ng = nextGrade(e); const cons = constraintsFor(e, ng); const plan = D.gradePlan[e.id]; const rng = D.gradeRules.ranges;
    return { title: 'Матрица грейдов и план', crumbs: 'Кабинет сотрудника', html: `
      <div class="grid cols-4" style="margin-bottom:16px">
        <div class="card stat"><span class="label">Текущий грейд</span><span class="value">${esc(e.grade)}</span><span class="hint">с ${fmt(D.gradeHistory[e.id].slice(-1)[0].date)}</span></div>
        <div class="card stat"><span class="label">Баллы по матрице</span><span class="value">${matrixSum(e)}<small>из ${matrixMax(e)}</small></span><span class="hint">${isAccount(e) ? `${esc(e.grade)}: ${rng[e.grade][0]}–${rng[e.grade][1]}` : ''}</span></div>
        <div class="card stat"><span class="label">Следующий грейд</span><span class="value">${esc(ng)}</span><span class="hint">${isAccount(e) ? `нужно ${rng[ng][0]}–${rng[ng][1]} баллов` : ''} · не раньше ${esc(D.gradeRules.minMonths[e.grade])} на текущем</span></div>
        <div class="card stat"><span class="label">Плановая дата оценки</span><span class="value" style="font-size:20px">${plan ? fmt(plan.planned[ng]) : '—'}</span><span class="hint">оценка на грейд после успешного PR (уровень не ниже B)</span></div>
      </div>
      <div class="grid cols-2" style="margin-bottom:16px">
        <div class="card"><div class="card-head"><h3>Профиль по группам компетенций</h3></div>${matrixRadarCard(e, 'radar-grades')}</div>
        <div class="stack">
          <div class="card"><div class="card-head"><h3>Ограничения для перехода на ${esc(ng)}</h3><span class="hint">переход невозможен при любой сумме баллов, если</span></div>${cons.length ? `<table><thead><tr><th>Компетенция</th><th class="num">Минимум</th><th class="num">Сейчас</th><th></th></tr></thead><tbody>${cons.map((c) => `<tr><td>${esc(c.c)}</td><td class="num">${c.min}</td><td class="num">${c.cur}</td><td>${chip(c.ok ? 'ок' : 'ниже минимума', c.ok ? 'good' : 'critical')}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Для этого трека ограничения не заданы</div>'}
            <div class="hint" style="margin-top:10px">${esc(D.gradeRules.summary[ng] || '')}</div></div>
          <div class="card"><div class="card-head"><h3>Проверь себя перед оценкой на грейд</h3></div><ul class="list">${(plan ? plan.checklist : []).map((c) => `<li>${check(c.done)}<div class="body" style="font-size:14px">${esc(c.text)}</div></li>`).join('')}</ul><div class="row" style="margin-top:10px"><button class="btn primary sm" onclick="location.hash='/employee/forms'">Заполнить матрицу с артефактами</button></div></div>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Софты · ${esc(deptName(e.dept))}</h2><span class="hint">баллы 1–10; уровень проявления подписан грейдом роли и подсвечен по текущему баллу</span></div>${matrixTable(e, isAccount(e))}</div>
      ${hardsCard(e)}
      <div class="grid cols-2"><div class="card"><div class="card-head"><h3>Минимальные сроки переходов</h3></div><table><thead><tr><th>Грейд</th><th>Не раньше</th><th class="num hide-m">Баллы</th></tr></thead><tbody>${ladderOf(e).map((g) => `<tr><td>${chip(g, g === e.grade ? 'grade' : '')}</td><td><small>${esc(D.gradeRules.minMonths[g] || '—')}</small></td><td class="num hide-m">${rng[g] ? `${rng[g][0]}–${rng[g][1]}` : '—'}</td></tr>`).join('')}</tbody></table></div>
        <div class="card lav"><div class="card-head"><h3>Постмит по итогу оценки на грейд</h3></div><ul style="margin:0;padding-left:18px;font-size:13px;color:var(--text-2)"><li>Сдал / не сдал, итоговая сумма и ограничения</li><li>Сильные компетенции</li><li>Что скорректировать и как: план корректировки</li><li>Кто поможет: наставник, эксперт</li><li>Цель ИПР на следующий квартал</li></ul></div></div>` };
  };
  V['/employee/idp'] = () => ({ title: 'Индивидуальный план развития', crumbs: 'Кабинет сотрудника', html: `<div class="card">${idpBlock(emp(USERS.employee))}</div><div class="hint" style="margin-top:10px">Правило заказчика: одна компетенция в квартал, один фокус. Компетенцию выбирают там, где зона роста повторяется в разных источниках: самоанализ, 360, оценка на грейд, PR, ОС руководителя и клиентов.</div>` });
  V['/employee/forms'] = () => {
    const e = emp(USERS.employee); const peers = D.employees.filter((x) => x.dept === e.dept && x.id !== e.id);
    const tabs = [['self', 'Самооценка по матрице'], ['f360', 'Анкета 360 о коллеге'], ['sr', 'Self Review']];
    const radio = (name, from, to, cls = '') => `<div class="radio-scale ${cls}">${Array.from({ length: to - from + 1 }, (_, i) => `<label><input type="radio" name="${name}" value="${from + i}"><span>${from + i}</span></label>`).join('')}</div>`;
    const panes = {
      self: `<div class="notice" style="margin-bottom:14px">Перед встречей «Оценка на грейд» проставь баллы по каждой компетенции от 1 до 10 и добавь артефакты: ссылки на задачи, скрины, кейсы. Руководитель валидирует. Текущие баллы подставлены из последней оценки.</div>
        <table class="matrix"><thead><tr><th>Компетенция</th><th>Оценка 1–10</th><th class="hide-m">Артефакты, ссылки, кейсы</th></tr></thead><tbody>${matrixOf(e).map((c, i) => `<tr><td class="cname"><span class="cgroup">${esc(c.group)}</span>${esc(c.name)}${c.levels ? `<div class="hint" style="margin-top:4px">${esc(c.levels[levelOf(c.score)])}</div>` : ''}</td><td>${radio(`m${i}`, 1, 10, 'ten').replace(`value="${c.score}"`, `value="${c.score}" checked`)}</td><td class="hide-m"><textarea class="btn" style="width:100%;height:56px;border-radius:12px;font:inherit;font-size:13px;padding:8px 10px;text-align:left" placeholder="Ссылка на задачу в Планфиксе, кейс, скрин"></textarea></td></tr>`).join('')}</tbody></table>
        <div class="row" style="margin-top:14px"><button class="btn primary" onclick="hrAct.demo()">Отправить руководителю</button><span class="hint">Сумма пересчитывается автоматически, ограничения проверяются при отправке</span></div>`,
      f360: `<div class="notice" style="margin-bottom:14px">Анкета о коллеге: индикаторы по компетенциям, шкала 1–5, 0 — не наблюдал. Ответы анонимны и усредняются по группе «коллеги» при 3 и более респондентах.</div>
        <div class="field"><label>Кого оцениваешь</label><select>${peers.map((p) => `<option>${esc(p.name)} · ${esc(p.role)}</option>`).join('')}</select></div>
        ${D.review360[e.id].competencies.map((c, ci) => `<div class="card flat" style="margin-bottom:10px"><h3 style="margin-bottom:8px">${esc(c.name)}</h3>${c.indicators.map((ind, ii) => `<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--line)"><div style="flex:1;min-width:220px;font-size:13px">${esc(ind.text)}</div>${radio(`q${ci}_${ii}`, 0, 5)}</div>`).join('')}<div class="field" style="margin-top:10px"><label>Комментарий к оценкам</label><input type="text" placeholder="Пример или ситуация"></div></div>`).join('')}
        <div class="card flat" style="margin-bottom:10px">${D.templates.review360.open.map((q) => `<div class="field"><label>${esc(q)}</label><textarea></textarea></div>`).join('')}</div>
        <div class="row"><button class="btn primary" onclick="hrAct.demo()">Отправить анонимно</button></div>`,
      sr: `<div class="notice" style="margin-bottom:14px">Шпаргалка для подготовки к Performance Review. Ответы помогают структурировать мысли и видны руководителю перед встречей.</div>
        ${D.selfReview.map((b) => `<div class="card flat" style="margin-bottom:10px"><h3 style="margin-bottom:8px">${esc(b.block)}</h3>${b.questions.map((q) => `<div class="field"><label>${esc(q)}</label><textarea></textarea></div>`).join('')}</div>`).join('')}
        <div class="row"><button class="btn primary" onclick="hrAct.demo()">Сохранить</button></div>`,
    };
    return { title: 'Анкеты и самооценка', crumbs: 'Кабинет сотрудника', html: `<div class="tabs" id="ftabs">${tabs.map(([k, t], i) => `<button data-tab="${k}" class="${i ? '' : 'active'}">${t}</button>`).join('')}</div><div id="fpane">${panes.self}</div>`,
      after: () => { document.querySelectorAll('#ftabs button').forEach((b) => { b.onclick = () => { document.querySelectorAll('#ftabs button').forEach((x) => x.classList.remove('active')); b.classList.add('active'); $('#fpane').innerHTML = panes[b.dataset.tab]; }; }); } };
  };

  // ---------- manager / hr views ----------
  const crumbsM = () => (ROLE === 'hr' ? 'Кабинет HR-менеджера и директора · все отделы' : `Кабинет руководителя · ${esc(deptName(me().dept))}`);
  V['/manager/dashboard'] = () => {
    const team = scope(); const ids = team.map((e) => e.id); const depts = scopeDepts();
    const newcomers = team.filter((e) => e.status === 'probation'); const risky = Object.entries(D.onboarding).filter(([id, o]) => ids.includes(id) && o.risk !== 'low');
    const allTasks = ids.flatMap((id) => TASKS[id] || []); const overdueT = allTasks.filter((t) => t.status === 'overdue');
    const allCourses = ids.flatMap((id) => D.courses[id] || []); const overdueC = allCourses.filter((c) => c.status === 'overdue');
    const gradeList = D.grades.filter((g) => team.some((e) => e.grade === g)); const gradeCount = gradeList.map((g) => team.filter((e) => e.grade === g).length);
    const EY = D.engagementYear; const engNow = depts.reduce((s, d) => s + EY.values[d.id], 0) / depts.length; const engPrev = depts.reduce((s, d) => s + EY.prev[d.id], 0) / depts.length;
    const perf = ['A', 'B', 'C', 'D'].map((l) => D.prSummary.results.filter((r) => ids.includes(r.id) && r.performance === l).length);
    const pend = pendingCount(); const fb30 = FB.filter((f) => ids.includes(f.to) && daysBetween(f.date, TODAY) <= 30);
    setTimeout(() => {
      bars('chart-grades', gradeList, [{ data: gradeCount, backgroundColor: css('--s1') }]);
      bars('chart-perf', ['A', 'B', 'C', 'D'], [{ data: perf, backgroundColor: [css('--s7'), css('--s1'), css('--s8'), css('--s2')] }]);
      if (ROLE === 'hr') bars('chart-eng', D.departments.map((d) => d.short || d.name), [{ label: EY.prevDate, data: D.departments.map((d) => EY.prev[d.id]), backgroundColor: css('--s4') }, { label: EY.date, data: D.departments.map((d) => EY.values[d.id]), backgroundColor: css('--s1') }], { horizontal: true, max: 10 });
    });
    const risks = [
      ...TS.flatMap((t) => t.items).filter((i) => i.status === 'pending' && ids.includes(i.emp)).slice(0, 3).map((i) => ({ who: emp(i.emp), what: `Ждёт подтверждения из транскрипта: ${i.text}`, cls: 'accent', to: `${base()}/transcripts` })),
      ...risky.map(([id, o]) => ({ who: emp(id), what: `Адаптация: ${o.riskNote}`, cls: 'warn', to: `${base()}/onboarding` })),
      ...ids.flatMap((id) => (TASKS[id] || []).filter((t) => t.status === 'overdue').map((t) => ({ who: emp(id), what: `Просрочена задача: ${t.title}`, cls: 'critical', to: `${base()}/person/${id}` }))),
      ...ids.flatMap((id) => (D.courses[id] || []).filter((c) => c.status === 'overdue').map((c) => ({ who: emp(id), what: `Просрочен обязательный курс: ${c.title}`, cls: 'critical', to: `${base()}/onboarding` }))),
      ...(D.prCycles.e03 && ids.includes('e03') ? D.prCycles.e03[0].metrics.filter((m) => m.bad).map((m) => ({ who: emp('e03'), what: `PR, точка 1: ${m.name} — ${m.point1}`, cls: 'serious', to: `${base()}/person/e03` })) : []),
    ];
    const events = [
      ...Object.entries(D.onboarding).filter(([id]) => ids.includes(id)).flatMap(([id, o]) => o.meetings.filter((m) => !m.done).slice(0, 1).map((m) => ({ date: m.date, text: `${m.name} по ИС — ${emp(id).name}`, meta: `${deptName(emp(id).dept)} · ${m.participants}` }))),
      ...(ids.includes('e03') ? [{ date: '2026-12-14', text: 'Контрольная точка 2 Performance Review — Анна Соколова', meta: 'Аккаунтинг · Вера Ситникова' }, { date: '2026-11-03', text: 'Чекин по ИПР на 1:1 — Анна Соколова', meta: 'Аккаунтинг' }] : []),
      ...(ROLE === 'hr' ? [{ date: '2026-10-15', text: 'Старт пульс-опроса за октябрь', meta: '5 вопросов, 3 минуты, анонимно' }, { date: '2027-01-11', text: 'Итоги Performance Review за 2-е полугодие по всем отделам', meta: 'HR BP' }] : []),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    return { title: ROLE === 'hr' ? 'Дашборд агентства' : `Дашборд отдела «${deptName(me().dept)}»`, crumbs: crumbsM(), html: `
      <div class="grid cols-4" style="margin-bottom:16px">
        <div class="card stat"><span class="label">Сотрудников</span><span class="value">${team.length}</span><span class="delta flat">${depts.length} ${plural(depts.length, ['отдел', 'отдела', 'отделов'])}</span></div>
        <div class="card stat"><span class="label">На испытательном сроке</span><span class="value">${newcomers.length}</span><span class="delta ${risky.length ? 'down' : 'flat'}">${risky.length} с риском</span></div>
        <div class="card stat"><span class="label">Ждут подтверждения из транскриптов</span><span class="value">${pend}</span><span class="delta flat">${TS.filter((t) => t.status === 'new' && t.participants.some((p) => ids.includes(p))).length} новых транскриптов</span></div>
        <div class="card stat"><span class="label">Обратная связь за 30 дней</span><span class="value">${fb30.length}</span><span class="delta flat">${fb30.filter((f) => f.kind === 'success').length} молодец · ${fb30.filter((f) => f.kind === 'growth').length} зоны роста</span></div>
        <div class="card stat"><span class="label">Просрочено задач</span><span class="value">${overdueT.length}</span><span class="delta flat">из ${allTasks.length} в постмитах</span></div>
        <div class="card stat"><span class="label">Просрочено обязательных курсов</span><span class="value">${overdueC.length}</span><span class="delta flat">${allCourses.filter((c) => c.status === 'assigned').length} назначено</span></div>
        <div class="card stat"><span class="label">1:1 за последние 2 недели</span><span class="value">${ROLE === 'hr' ? 81 : 100}<small>%</small></span><span class="delta ${ROLE === 'hr' ? 'down' : 'up'}">${ROLE === 'hr' ? '−7 п.п. к сентябрю' : 'все сотрудники отдела'}</span></div>
        <div class="card stat"><span class="label">Вовлечённость ${ROLE === 'hr' ? 'агентства' : 'отдела'} · раз в год</span><span class="value">${engNow.toFixed(1)}<small>из 10</small></span><span class="delta ${engNow >= engPrev ? 'up' : 'down'}">${engNow >= engPrev ? '+' : '−'}${Math.abs(engNow - engPrev).toFixed(1).replace('.', ',')} к ${EY.prevDate} · замер ${EY.date}</span></div>
      </div>
      <div class="grid ${ROLE === 'hr' ? 'cols-3' : 'cols-2'}" style="margin-bottom:16px">
        <div class="card"><div class="card-head"><h3>Распределение по грейдам</h3></div><div class="chart h-220"><canvas id="chart-grades"></canvas></div></div>
        <div class="card"><div class="card-head"><h3>Performance Review · ${esc(D.prSummary.period)}</h3>${link(`${base()}/reviews`, 'подробно')}</div><div class="chart h-220"><canvas id="chart-perf"></canvas></div></div>
        ${ROLE === 'hr' ? `<div class="card"><div class="card-head"><h3>Вовлечённость по отделам · годовой замер</h3><span class="hint">из 10</span></div><div class="chart h-220"><canvas id="chart-eng"></canvas></div>${legend([[css('--s4'), EY.prevDate], [css('--s1'), EY.date]])}</div>` : ''}
      </div>
      <div class="grid cols-2">
        <div class="card"><div class="card-head"><h3>Требует внимания</h3><span class="hint">${risks.length}</span></div><ul class="list">${risks.map((r) => `<li>${avatar(r.who, 'sm')}<div class="body"><div style="font-size:14px">${personLink(r.who)} <span class="muted">· ${esc(r.who.role)}</span></div><div class="meta">${chip(r.what, r.cls)} ${link(r.to, 'открыть')}</div></div></li>`).join('') || '<li class="empty">Всё в порядке</li>'}</ul></div>
        <div class="card"><div class="card-head"><h3>Ближайшие события</h3></div><ul class="list">${events.map((ev) => `<li><div class="body"><div class="title" style="font-size:14px">${fmtShort(ev.date)} · ${esc(ev.text)}</div><div class="meta">${esc(ev.meta)}</div></div></li>`).join('')}</ul></div>
      </div>` };
  };
  V['/manager/structure'] = () => {
    const head = emp('e01'); const visible = scopeDepts().map((d) => d.id);
    const node = (e, off) => `<div class="node" ${off ? '' : `onclick="location.hash='${base()}/person/${e.id}'"`}>${avatar(e, 'sm')}<div><b>${esc(e.name)}</b><small>${esc(e.role)} · ${esc(e.grade)}</small></div>${e.status === 'probation' ? '<span class="dot" style="background:var(--orange)" title="Испытательный срок"></span>' : ''}</div>`;
    return { title: 'Структура агентства', crumbs: crumbsM(), html: `
      <div class="card" style="overflow-x:auto"><div class="org">${node(head, true)}<div class="v"></div><div class="level">${node(emp('e18'), true)}</div><div class="v"></div><div class="level">${D.departments.map((d) => { const h = emp(d.head); const subs = subordinates(h.id); const off = !visible.includes(d.id); return `<div class="dept ${off ? 'off' : ''}"><div class="dname">${esc(d.name)} · ${subs.length + 1}</div>${node(h, off)}${subs.length ? '<div class="v"></div>' : ''}${subs.map((s) => node(s, off)).join('')}</div>`; }).join('')}</div></div>
        ${ROLE === 'manager' ? '<div class="hint" style="margin-top:12px">Другие отделы показаны серым: руководителю доступен только свой отдел.</div>' : ''}</div>
      <div class="grid cols-3" style="margin-top:16px">
        <div class="card"><div class="card-head"><h3>Роли в системе</h3>${link(ROLE === 'hr' ? '/hr/access' : '/about', 'подробно')}</div><table><tbody>${D.roles.map((r) => `<tr><td style="white-space:nowrap">${esc(r.name)}</td><td><small>${esc(r.sees)}</small></td></tr>`).join('')}</tbody></table></div>
        <div class="card"><div class="card-head"><h3>Треки и грейды</h3></div><div class="row" style="margin-bottom:8px">${['Junior', 'Middle', 'Middle+', 'Senior'].map((g) => chip(g, 'grade')).join('')}</div><div class="hint">Пять треков, у каждого своя матрица компетенций: у аккаунтов 14 компетенций по 10 баллов с диапазонами и ограничениями по грейдам, у разработки матрица хардов и софтов с подтверждением артефактами. Переход на следующий грейд: после PR с уровнем не ниже B, не раньше минимального срока.</div></div>
        <div class="card"><div class="card-head"><h3>Сводка по отделам</h3></div><table><thead><tr><th>Отдел</th><th class="num">Людей</th><th class="num">На ИС</th><th class="num">Вовлеч.</th></tr></thead><tbody>${scopeDepts().map((d) => { const ppl = D.employees.filter((e) => e.dept === d.id); return `<tr><td>${esc(d.name)}</td><td class="num">${ppl.length}</td><td class="num">${ppl.filter((e) => e.status === 'probation').length}</td><td class="num">${D.pulse.engagement[d.id].slice(-1)[0].toFixed(1)}</td></tr>`; }).join('')}</tbody></table></div>
      </div>` };
  };
  V['/manager/team'] = () => {
    const list = scope();
    return { title: 'Сотрудники', crumbs: crumbsM(), html: `
      <div class="card"><div class="row between" style="margin-bottom:12px"><div class="row">${ROLE === 'hr' ? `<select class="btn" id="f-dept"><option value="">Все отделы</option>${D.departments.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select>` : '<span class="hint" id="f-dept-stub"></span>'}<select class="btn" id="f-status"><option value="">Все статусы</option><option value="probation">Испытательный срок</option><option value="active">В штате</option></select></div><span class="hint" id="f-count"></span></div>
        <table id="team-table"><thead><tr><th>Сотрудник</th><th class="hide-m">Отдел</th><th>Грейд</th><th class="num hide-m">Матрица</th><th class="hide-m">В компании</th><th>PR</th><th>Статус</th><th class="hide-m">Зоны роста</th></tr></thead><tbody>${list.map((e) => {
          const pr = D.prSummary.results.find((r) => r.id === e.id); const weak = weakComps(e).slice(0, 2);
          return `<tr class="clickable" data-dept="${e.dept}" data-status="${e.status}" onclick="location.hash='${base()}/person/${e.id}'"><td><div class="row" style="flex-wrap:nowrap">${avatar(e, 'sm')}<div><b style="font-weight:500">${esc(e.name)}</b><div class="hint">${esc(e.role)}</div></div></div></td><td class="hide-m">${esc(deptName(e.dept))}</td><td>${chip(e.grade, 'grade')}</td><td class="num hide-m">${matrixSum(e)} <span class="hint">/ ${matrixMax(e)}</span></td><td class="hide-m">${tenure(e.hired)}</td><td>${pr ? perfChip(pr.performance) : '<span class="hint">—</span>'}</td><td>${e.status === 'probation' ? chip('ИС', 'warn') : chip('В штате', 'good')}</td><td class="hide-m">${weak.length ? weak.map((w) => chip(w, 'warn')).join(' ') : '<span class="hint">—</span>'}</td></tr>`;
        }).join('')}</tbody></table></div>`, after: () => {
        const apply = () => { const d = $('#f-dept') ? $('#f-dept').value : '', s = $('#f-status').value; let n = 0; document.querySelectorAll('#team-table tbody tr').forEach((tr) => { const ok = (!d || tr.dataset.dept === d) && (!s || tr.dataset.status === s); tr.style.display = ok ? '' : 'none'; if (ok) n++; }); $('#f-count').textContent = `${n} ${plural(n, ['сотрудник', 'сотрудника', 'сотрудников'])}`; };
        if ($('#f-dept')) $('#f-dept').onchange = apply; $('#f-status').onchange = apply; apply();
      } };
  };
  V['/manager/person'] = (id) => {
    const e = emp(id); if (!e || !inScope(id)) return { title: 'Нет доступа', crumbs: crumbsM(), html: '<div class="card"><div class="empty">Сотрудник не в вашей области видимости: руководитель видит только свой отдел.</div></div>' };
    const tasks = TASKS[id] || []; const courses = D.courses[id] || []; const cycles = D.prCycles[id] || []; const onb = D.onboarding[id]; const oo = D.oneOnOnes[id] || []; const r360 = D.review360[id]; const pend = TS.flatMap((t) => t.items.filter((i) => i.emp === id && i.status === 'pending').map((i) => ({ ...i, t })));
    const tabs = [['overview', 'Обзор'], ['matrix', 'Матрица грейдов'], ['tasks', 'Задачи'], ['oneonone', 'Постмиты 1:1'], ['pr', 'Performance Review'], ['r360', 'Оценка 360'], ['idp', 'ИПР'], ['learning', 'LMS'], ['feedback', 'Обратная связь']];
    const panes = {
      overview: `<div class="grid cols-2"><div class="card"><div class="card-head"><h3>Профиль компетенций · ${esc(e.grade)}</h3></div>${matrixRadarCard(e, 'radar-person')}</div>
        <div class="stack">
          <div class="card"><div class="card-head"><h3>Сильные навыки и зоны роста</h3></div><div class="hint">Сильные (8–10)</div><div class="row" style="margin:4px 0 8px">${strongComps(e).map((c) => chip(c, 'good')).join('') || '<span class="hint">—</span>'}</div><div class="hint">Зоны роста (5 и ниже)</div><div class="row" style="margin-top:4px">${weakComps(e).map((c) => chip(c, 'warn')).join('') || '<span class="hint">—</span>'}</div></div>
          ${pend.length ? `<div class="card lav"><div class="card-head"><h3>Из транскриптов, ждут подтверждения</h3>${link(`${base()}/transcripts`, 'разобрать')}</div><ul class="list">${pend.map((i) => `<li>${chip(i.type === 'task' ? 'задача' : i.kind === 'success' ? 'молодец' : 'зона роста', i.type === 'task' ? 'accent' : i.kind === 'success' ? 'good' : 'warn')}<div class="body" style="font-size:13px">${esc(i.text)}<div class="meta">${esc(i.t.title)} · ${fmt(i.t.date)}</div></div></li>`).join('')}</ul></div>` : ''}
          <div class="card"><div class="card-head"><h3>История грейдов</h3></div>${gradeTimeline(e)}</div>
          ${onb ? onboardingCard(id, onb, false) : ''}
          <div class="private"><div class="lab">Приватная заметка руководителя · видите только вы</div>${id === 'e03' ? 'Обсудить нагрузку: 4 проекта, сроки по отчётам поплыли. Кандидат на Middle+ после контрольной точки 2, если дебиторка и скорость ответов войдут в норму.' : 'Заметок нет'}</div>
        </div></div>`,
      matrix: `${hardsCard(e)}<div class="card">${matrixTable(e, isAccount(e))}${isAccount(e) ? `<div class="hint" style="margin-top:12px">Ограничения для ${esc(nextGrade(e))}: ${constraintsFor(e, nextGrade(e)).map((c) => chip(`${c.c} ≥ ${c.min} (сейчас ${c.cur})`, c.ok ? 'good' : 'critical')).join(' ')}</div>` : ''}</div>`,
      tasks: `<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>Оперативные (из постмитов 1:1 и транскриптов)</h3></div>${tasksTable(tasks.filter((t) => t.kind === 'ops'))}</div><div class="card"><div class="card-head"><h3>Длительные (PR, ИПР)</h3></div>${tasksTable(tasks.filter((t) => t.kind === 'long'))}</div>`,
      oneonone: `<div class="card"><div class="card-head"><h3>Постмиты 1:1</h3><button class="btn primary sm" onclick="hrAct.demo()">Новый постмит</button></div>${postmitList(oo, tasks)}</div>`,
      pr: cycles.length ? `<div class="card" style="margin-bottom:16px">${prBlock(cycles[0], true)}</div>${cycles.slice(1).map((c) => `<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>${esc(c.period)} · итог ${perfChip(c.performance.end)}</h3></div><div class="hint">${esc(c.speech)}</div></div>`).join('')}` : '<div class="card"><div class="empty">Performance Review ещё не проводился. Для новичков первый PR после испытательного срока.</div></div>',
      r360: r360 ? review360Block(r360, true) : '<div class="card"><div class="empty">Оценка 360 ещё не проводилась.</div></div>',
      idp: `<div class="card">${idpBlock(e)}</div>`,
      learning: `<div class="card">${coursesTable(courses)}<div class="hint" style="margin-top:10px">Из iSpring Learn по API приходят название курса, срок и статус.</div></div>`,
      feedback: `<div class="card"><div class="card-head"><h3>Обратная связь · молодец / не молодец</h3><button class="btn primary sm" onclick="location.hash='${base()}/feedback'">Зафиксировать</button></div>${feedbackTable([id])}</div>`,
    };
    return { title: e.name, crumbs: `${crumbsM()} · ${link(`${base()}/team`, 'Сотрудники')}`, html: `${profileHeader(e, true)}<div class="tabs" style="margin-top:16px" id="ptabs">${tabs.map(([k, t], i) => `<button data-tab="${k}" class="${i ? '' : 'active'}">${t}</button>`).join('')}</div><div id="ppane">${panes.overview}</div>`,
      after: () => { document.querySelectorAll('#ptabs button').forEach((b) => { b.onclick = () => { document.querySelectorAll('#ptabs button').forEach((x) => x.classList.remove('active')); b.classList.add('active'); destroyCharts(); $('#ppane').innerHTML = panes[b.dataset.tab]; }; }); } };
  };
  V['/manager/transcripts'] = (id) => {
    const list = TS.filter((t) => t.participants.some((p) => inScope(p))); const cur = list.find((t) => t.id === id) || list[0];
    const names = (ids) => ids.map((p) => emp(p).name.split(' ')[0]).join(', ');
    const itemRow = (i) => `<div class="item ${i.status}">${chip(i.type === 'task' ? 'задача' : i.kind === 'success' ? 'молодец' : 'зона роста', i.type === 'task' ? 'accent' : i.kind === 'success' ? 'good' : 'warn')}<div><b style="font-weight:500">${esc(emp(i.emp).name)}</b>${inScope(i.emp) ? '' : chip('другой отдел', '')}<div style="font-size:14px">${esc(i.text)}</div><div class="hint">${i.due ? 'срок ' + fmt(i.due) + ' · ' : ''}${i.status === 'confirmed' ? 'подтверждено, записано в кабинет сотрудника' : i.status === 'rejected' ? 'отклонено' + (i.reason ? ': ' + esc(i.reason) : '') : 'ждёт решения руководителя'}</div></div>
      <div class="acts">${i.status === 'pending' && inScope(i.emp) ? `<button class="btn blue sm" onclick="hrAct.confirm('${cur.id}','${i.id}')">Подтвердить</button><button class="btn sm" onclick="hrAct.reject('${cur.id}','${i.id}')">Отклонить</button>` : ''}</div></div>`;
    const hit = (text) => { let t = esc(text); cur.items.forEach((i) => { const w = i.text.split(' ').slice(0, 2).join(' ').replace(/[«»,.]/g, ''); if (w && t.includes(esc(w))) t = t.replace(esc(w), `<mark>${esc(w)}</mark>`); }); return t; };
    return { title: 'Транскрипты встреч', crumbs: crumbsM(), html: `
      <div class="card lav" style="margin-bottom:16px"><div class="flow">
        <div class="fstep"><b>1. Запись встречи</b>1:1, синхрон группы, встреча по ИС. Транскрипт загружает руководитель или приходит из сервиса записи.</div>
        <div class="fstep"><b>2. Извлечение</b>Из текста автоматически выделяются задачи для сотрудников и обратная связь о сотрудниках: кто, что, срок.</div>
        <div class="fstep"><b>3. Подтверждение</b>Руководитель подтверждает, правит или отклоняет каждый пункт. Без подтверждения ничего не записывается.</div>
        <div class="fstep"><b>4. В кабинет</b>Задача попадает в задачи и постмит сотрудника, обратная связь в журнал «Молодец / Не молодец» и в профиль.</div></div></div>
      <div class="grid cols-3">
        <div class="card"><div class="card-head"><h3>Транскрипты</h3><button class="btn primary sm" onclick="hrAct.demo()">Загрузить</button></div><ul class="list">${list.map((t) => { const p = t.items.filter((i) => i.status === 'pending').length; return `<li class="${t.id === cur.id ? '' : ''}" style="cursor:pointer" onclick="location.hash='${base()}/transcripts/${t.id}'"><div class="body"><div style="font-size:14px;${t.id === cur.id ? 'color:var(--accent);font-weight:500' : ''}">${esc(t.title)}</div><div class="meta">${fmt(t.date)} · ${t.duration} · ${esc(names(t.participants))}</div></div>${p ? chip(`${p}`, 'orange') : chip('разобран', 'good')}</li>`; }).join('')}</ul></div>
        <div class="card span-2"><div class="card-head"><h3>${esc(cur.title)} · ${fmt(cur.date)}</h3><span class="hint">${esc(names(cur.participants))}</span></div>
          <div class="transcript">${cur.excerpt.map((x) => `<p><span class="who">${esc(emp(x.who).name.split(' ')[0])}:</span>${hit(x.text)}</p>`).join('')}<p class="hint">… фрагмент транскрипта, в рабочей версии текст целиком с таймкодами</p></div>
          <div class="card-head" style="margin-top:16px"><h3>Извлечено: ${cur.items.length}</h3><span class="hint">${cur.items.filter((i) => i.status === 'pending').length} ждут решения</span></div>
          <div id="items">${cur.items.map(itemRow).join('')}</div></div>
      </div>` };
  };
  hrAct.confirm = (tid, iid) => {
    const t = TS.find((x) => x.id === tid); const i = t.items.find((x) => x.id === iid); i.status = 'confirmed';
    if (i.type === 'task') { (TASKS[i.emp] ||= []).unshift({ id: 'tx' + Date.now(), kind: 'ops', title: i.text, source: `Транскрипт: ${t.title} от ${fmt(t.date)}`, due: i.due || '', status: 'in_progress', result: '' }); }
    else { FB.unshift({ date: '2026-10-12', to: i.emp, from: USERS[ROLE], kind: i.kind, text: i.text, source: 'transcript', quarter: '4 кв 2026' }); }
    if (!t.items.some((x) => x.status === 'pending')) t.status = 'reviewed';
    toast(i.type === 'task' ? 'Задача записана в кабинет сотрудника' : 'Обратная связь записана в журнал и профиль'); route();
  };
  hrAct.reject = (tid, iid) => { const t = TS.find((x) => x.id === tid); const i = t.items.find((x) => x.id === iid); i.status = 'rejected'; i.reason = 'отклонено руководителем'; if (!t.items.some((x) => x.status === 'pending')) t.status = 'reviewed'; toast('Пункт отклонён'); route(); };
  hrAct.demo = () => toast('В прототипе действие не выполняется: показан формат экрана');
  hrAct.addFeedback = () => {
    const to = $('#fb-to').value, kind = $('#fb-kind').value, text = $('#fb-text').value.trim(), source = $('#fb-src').value;
    if (!text) { toast('Напишите текст обратной связи'); return; }
    FB.unshift({ date: '2026-10-12', to, from: USERS[ROLE], kind, text, source, quarter: '4 кв 2026' }); toast('Записано в журнал и профиль сотрудника'); route();
  };
  V['/manager/feedback'] = (q) => {
    const ids = scope().map((e) => e.id); const quarters = ['4 кв 2026', '3 кв 2026']; const quarter = quarters.includes(q) ? q : quarters[0];
    const pend = pendingCount();
    return { title: 'Обратная связь по сотрудникам', crumbs: crumbsM(), html: `
      <div class="grid cols-3" style="margin-bottom:16px">
        <div class="card span-2"><div class="card-head"><h3>Зафиксировать обратную связь</h3><span class="hint">успех или зона роста, попадает в профиль сотрудника и в журнал</span></div>
          <div class="form-row"><div class="field"><label>Кому</label><select id="fb-to">${scope().map((e) => `<option value="${e.id}">${esc(e.name)} · ${esc(e.role)}</option>`).join('')}</select></div><div class="field"><label>Тип</label><select id="fb-kind"><option value="success">Молодец</option><option value="growth">Не молодец (зона роста)</option></select></div></div>
          <div class="form-row"><div class="field"><label>Источник</label><select id="fb-src"><option value="manual">Наблюдение руководителя</option><option value="form">Анкета коллеги или клиента</option><option value="transcript">Встреча (без транскрипта)</option></select></div><div class="field"><label>Квартал</label><select><option>4 кв 2026</option></select></div></div>
          <div class="field"><label>Что произошло, пример, что делать дальше</label><textarea id="fb-text" placeholder="Пример: ОС от ПМ, что стала активно спрашивать по клиентам на синхах групп и добиваться ответов"></textarea></div>
          <div class="row"><button class="btn primary" onclick="hrAct.addFeedback()">Записать</button><span class="hint">Запись попадёт в профиль сотрудника и в журнал квартала</span></div></div>
        <div class="card ${pend ? 'lav' : ''}"><div class="card-head"><h3>Из транскриптов</h3></div><div class="stat"><span class="label">Ждут подтверждения</span><span class="value">${pend}</span></div><div class="hint" style="margin:8px 0 12px">Задачи и обратная связь, которые упомянуты на встречах, попадают сюда только после решения руководителя.</div><button class="btn blue sm" onclick="location.hash='${base()}/transcripts'">Разобрать</button>
          <div class="hint" style="margin-top:16px">Источники записей: транскрипты встреч, наблюдения руководителя, анкеты коллег и клиентов, итоги 360. Раз в квартал журнал сверяется с 360 и PR.</div></div>
      </div>
      <div class="card"><div class="card-head"><h2>Журнал по кварталам</h2><div class="seg">${quarters.map((x) => `<button class="${x === quarter ? 'on' : ''}" onclick="location.hash='${base()}/feedback/${encodeURIComponent(x)}'">${x}</button>`).join('')}</div></div>${feedbackTable(ids, quarter)}</div>` };
  };
  V['/manager/reviews'] = () => {
    const ids = scope().map((e) => e.id); const res = D.prSummary.results.filter((r) => ids.includes(r.id));
    const byLevel = (l) => res.filter((r) => r.performance === l);
    return { title: 'Performance Review', crumbs: crumbsM(), html: `
      <div class="grid cols-4" style="margin-bottom:16px">
        <div class="card stat"><span class="label">Текущий цикл</span><span class="value" style="font-size:20px">2-е полугодие 2026</span><span class="hint">постановка целей в августе, точка 1 пройдена</span></div>
        <div class="card stat"><span class="label">Контрольная точка 2</span><span class="value" style="font-size:20px">14–18 декабря</span><span class="hint">итоги в январе 2027</span></div>
        <div class="card stat"><span class="label">Оценено в прошлом цикле</span><span class="value">${res.length}<small>из ${ids.filter((i) => !D.onboarding[i]).length}</small></span><span class="hint">новички оцениваются после ИС</span></div>
        <div class="card stat"><span class="label">Уровни</span><span class="value" style="font-size:20px">${['A', 'B', 'C', 'D'].map((l) => `<span class="chip perf ${l}">${l}</span> ${byLevel(l).length}`).join(' ')}</span></div>
      </div>
      <div class="grid cols-2">
        <div class="card"><div class="card-head"><h3>Итоги ${esc(D.prSummary.period)}</h3><span class="hint">нажмите на сотрудника</span></div><table><thead><tr><th>Сотрудник</th><th>Грейд</th><th>Итог</th><th class="hide-m">Решение</th></tr></thead><tbody>${res.map((r) => { const e = emp(r.id); return `<tr class="clickable" onclick="location.hash='${base()}/person/${r.id}'"><td>${esc(e.name)}<div class="hint">${esc(deptName(e.dept))}</div></td><td>${chip(e.grade, 'grade')}</td><td>${perfChip(r.performance)}</td><td class="hide-m"><small>${esc(r.decision)}</small></td></tr>`; }).join('')}</tbody></table></div>
        <div class="stack">
          <div class="card"><div class="card-head"><h3>Как устроен цикл</h3></div><ol class="list">${D.templates.prCycle.meetings.map((s, i) => `<li><span class="avatar sm" style="background:var(--accent)">${i + 1}</span><div class="body" style="font-size:14px">${esc(s)}</div></li>`).join('')}</ol><div class="hint" style="margin-top:8px">Входы: ${D.templates.prCycle.inputs.join('; ').toLowerCase()}. После успешного PR (уровень не ниже B) сотрудник может выйти на оценку на грейд в плановые сроки.</div></div>
          ${ROLE === 'hr' ? `<div class="card"><div class="card-head"><h3>Руководители отделов</h3><span class="hint">видит директор</span></div><table><thead><tr><th>Руководитель</th><th>Грейд</th><th>PR</th><th class="num">mNPS</th></tr></thead><tbody>${D.departments.map((d) => { const h = emp(d.head); const m = D.mnps[h.id]; const lvl = { e15: 'A', e06: 'B', e02: 'B', e09: 'C', e12: 'B' }[h.id]; return `<tr><td>${esc(h.name)}<div class="hint">${esc(d.name)}</div></td><td>${chip(h.grade, 'grade')}</td><td>${perfChip(lvl)}</td><td class="num">${m ? (m.score > 0 ? '+' : '') + m.score : '—'}</td></tr>`; }).join('')}</tbody></table></div>` : ''}
          <div class="card lav"><div class="card-head"><h3>Уровни перформанса</h3></div>${Object.entries(D.performanceLevels).map(([k, v]) => `<div class="row" style="padding:6px 0;flex-wrap:nowrap;align-items:flex-start">${perfChip(k)}<div style="font-size:13px">${esc(v)}</div></div>`).join('')}</div>
        </div>
      </div>` };
  };
  V['/manager/onboarding'] = () => {
    const ids = scope().map((e) => e.id); const onb = Object.entries(D.onboarding).filter(([id]) => ids.includes(id));
    const allCourses = ids.flatMap((id) => (D.courses[id] || []).map((c) => ({ ...c, id })));
    return { title: 'Адаптация и обучение', crumbs: crumbsM(), html: `
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Новички на испытательном сроке</h2><span class="hint">установочная → неделя → экватор → финиш; оценка погружения 1–4</span></div>${onb.length ? `<div class="stack">${onb.map(([id, o]) => onboardingCard(id, o, true)).join('')}</div>` : '<div class="empty">Новичков нет</div>'}</div>
      <div class="grid cols-2">
        <div class="card"><div class="card-head"><h3>Обязательные курсы: назначены и просрочены</h3></div><table><thead><tr><th>Сотрудник</th><th>Курс</th><th>Срок</th><th>Статус</th></tr></thead><tbody>${allCourses.filter((c) => c.type === 'обязательный' && c.status !== 'done').map((c) => `<tr><td>${personLink(emp(c.id))}</td><td><small>${esc(c.title)}</small></td><td style="white-space:nowrap">${fmtShort(c.due)}</td><td>${chip(courseStatus[c.status][0], courseStatus[c.status][1])}</td></tr>`).join('') || '<tr><td colspan="4" class="hint">Нет</td></tr>'}</tbody></table></div>
        <div class="card"><div class="card-head"><h3>Развивающие курсы</h3></div><table><thead><tr><th>Сотрудник</th><th>Курс</th><th>Статус</th></tr></thead><tbody>${allCourses.filter((c) => c.type !== 'обязательный').map((c) => `<tr><td>${personLink(emp(c.id))}</td><td><small>${esc(c.title)}</small></td><td>${chip(courseStatus[c.status][0], courseStatus[c.status][1])}</td></tr>`).join('') || '<tr><td colspan="3" class="hint">Нет</td></tr>'}</tbody></table>
          <div class="hint" style="margin-top:10px">Источник: iSpring Learn по API, раз в неделю: название курса, срок, статус. Курс из ИПР назначается в LMS руководителем.</div></div>
      </div>` };
  };
  V['/manager/pulse'] = () => {
    const P = D.pulse; const depts = scopeDepts();
    // Цвет ячейки — доля акцента поверх фона карточки: работает во всех вариантах и темах
    const pct = (v) => Math.round(Math.min(1, Math.max(0, (v - 6.4) / 2.2)) * 85 + 10); const color = (v) => `color-mix(in srgb, var(--s1) ${pct(v)}%, var(--surface))`; const txt = (v) => (pct(v) >= 55 ? '#fff' : 'var(--text)');
    const heads = depts.map((d) => d.head);
    setTimeout(() => {
      line('chart-enps2', P.months, [{ data: P.enps, borderColor: css('--s1'), backgroundColor: css('--s1') }], { min: -20, max: 50 });
      bars('chart-q', P.questions.map((q) => q.short), [{ data: P.questions.map((q) => q.avg), backgroundColor: css('--s1') }], { horizontal: true, max: 10 });
    });
    return { title: 'Пульс-опросы и mNPS', crumbs: crumbsM(), html: `
      <div class="grid cols-4" style="margin-bottom:16px">
        <div class="card stat"><span class="label">eNPS агентства, октябрь</span><span class="value">+${P.enps.slice(-1)[0]}</span><span class="delta up">+7 к сентябрю</span></div>
        <div class="card stat"><span class="label">Пульс ${ROLE === 'hr' ? 'агентства' : 'отдела'}, октябрь</span><span class="value">${(depts.reduce((s, d) => s + P.engagement[d.id].slice(-1)[0], 0) / depts.length).toFixed(1)}<small>из 10</small></span></div>
        <div class="card stat"><span class="label">Отклик</span><span class="value">${P.responseRate.slice(-1)[0]}<small>%</small></span><span class="delta down">−6 п.п.</span></div>
        <div class="card stat"><span class="label">Следующий опрос</span><span class="value" style="font-size:20px">15.10</span><span class="hint">${esc(D.templates.pulse.frequency)}</span></div>
      </div>
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h3>Пульс по месяцам</h3><span class="hint">из 10 · ${ROLE === 'hr' ? 'все отделы' : 'свой отдел и среднее по агентству'}</span></div>
        <div class="heat" style="grid-template-columns:180px repeat(${P.months.length},1fr)"><div></div>${P.months.map((m) => `<div class="collab">${m}</div>`).join('')}${depts.map((d) => `<div class="rowlab">${esc(d.name)}</div>${P.engagement[d.id].map((v) => `<div class="cell" style="background:${color(v)};color:${txt(v)}">${v.toFixed(1)}</div>`).join('')}`).join('')}${ROLE === 'hr' ? '' : `<div class="rowlab">Среднее по агентству</div>${P.months.map((_, i) => { const v = D.departments.reduce((s, d) => s + P.engagement[d.id][i], 0) / 5; return `<div class="cell" style="background:${color(v)};color:${txt(v)}">${v.toFixed(1)}</div>`; }).join('')}`}</div></div>
      <div class="grid cols-2" style="margin-bottom:16px">
        <div class="card"><div class="card-head"><h3>eNPS</h3></div><div class="chart h-220"><canvas id="chart-enps2"></canvas></div><div class="hint">Ориентиры: до +20 норма, +21…+40 хорошо, выше +40 отлично</div></div>
        <div class="card"><div class="card-head"><h3>Вопросы октября, среднее</h3></div><div class="chart h-220"><canvas id="chart-q"></canvas></div></div>
      </div>
      <div class="grid cols-2">
        <div class="card"><div class="card-head"><h3>mNPS: как подчинённые оценивают руководителя</h3><span class="hint">анонимно, шкала 1–5 по блокам, mNPS от −100 до +100</span></div>
          <table><thead><tr><th>Руководитель</th><th class="num">mNPS</th><th class="num hide-m">Ответов</th><th class="hide-m">Слабый блок</th></tr></thead><tbody>${heads.filter((h) => D.mnps[h]).map((h) => { const m = D.mnps[h]; const weak = [...m.blocks].sort((a, b) => a[1] - b[1])[0]; return `<tr><td>${esc(emp(h).name)}<div class="hint">${esc(deptName(emp(h).dept))}</div></td><td class="num"><b>${m.score > 0 ? '+' : ''}${m.score}</b></td><td class="num hide-m">${m.respondents}</td><td class="hide-m"><small>${esc(weak[0])}: ${weak[1].toFixed(1)}</small></td></tr>`; }).join('')}</tbody></table>
          <div class="hint" style="margin-top:10px">Блоки: вовлечение и лидерство, постановка задач, контроль и нагрузка, коммуникации, обучение и развитие, улучшение процессов, решение сложных ситуаций. ${ROLE === 'hr' ? 'Полный отчёт видят директор и сам руководитель.' : 'Полный отчёт по себе руководитель видит в своём профиле.'}</div></div>
        <div class="card"><div class="card-head"><h3>Что сделали по итогам прошлого опроса</h3><span class="hint">за обратную связь отвечает руководитель</span></div><ul class="list">${P.actions.map((a) => `<li>${check(a.done)}<div class="body" style="font-size:14px">${esc(a.text)}</div></li>`).join('')}</ul></div>
      </div>` };
  };
  V['/manager/processes'] = () => ({ title: 'Карта HR-процессов', crumbs: crumbsM(), html: `
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Три блока процессов</h2><span class="hint">одинаковы для всех отделов, отличаются только матрицы компетенций и метрики PR</span></div><div class="steps">
        <div class="step off"><div class="n">1</div><b>Приём на работу</b><ul><li>Собеседование</li><li>Тестовое задание</li><li>Финальное собеседование</li></ul><div class="hint" style="margin-top:8px">По решению заказчика в кабинете не ведётся. Карточку сотрудника заводит HR или руководитель при выходе.</div></div>
        <div class="step"><div class="n">2</div><b>Онбординг (испытательный срок)</b><ul><li>Установочная встреча: цели и критерии ИС, план адаптации в LMS, наставник</li><li>Неделя: техника, сервисы, оценка погружения</li><li>Экватор: оценка погружения 1–4, актуализация критериев</li><li>Финиш: 360 от команды, решение по ИС</li><li>Встреча с HR BP на 5-й месяц</li></ul><div class="hint" style="margin-top:8px">Артефакты: постмиты встреч, план адаптации, статусы курсов LMS</div></div>
        <div class="step"><div class="n">3</div><b>После испытательного срока</b><ul><li>1:1 раз в 1–2 недели с постмитом</li><li>Performance Review раз в полугодие с двумя контрольными точками</li><li>Оценка 360 перед PR и на точках</li><li>Оценка на грейд по матрице после PR не ниже B</li><li>ИПР: одна компетенция в квартал</li><li>Пульс-опрос раз в месяц, mNPS руководителей</li></ul><div class="hint" style="margin-top:8px">Артефакты: Self Review, лист PR, отчёт 360, матрица с артефактами, ИПР</div></div>
      </div></div>
      <div class="grid cols-2">
        <div class="card"><div class="card-head"><h3>Календарь цикла (год)</h3></div><table><thead><tr><th>Когда</th><th>Что</th><th class="hide-m">Кто</th></tr></thead><tbody>
          ${[['Раз в 1–2 недели', '1:1 с постмитом: вопросы обеих сторон, действия, сроки, артефакты', 'руководитель, сотрудник'], ['Каждый месяц', 'Пульс-опрос; чекин по ИПР на 1:1', 'все'], ['Раз в квартал', 'Новая цель ИПР; журнал обратной связи сверяется с 360', 'руководитель, сотрудник'], ['Февраль, август', 'Постановка целей PR на полугодие; Self Review; 360 на начало', 'все'], ['Апрель, сентябрь', 'Контрольная точка 1 PR', 'руководитель'], ['Июнь, декабрь', 'Контрольная точка 2 PR', 'руководитель'], ['Июль, январь', 'Итоги PR: уровень A–D, прямая речь, шаги; оценки на грейд по плану', 'все, HR'], ['По факту', 'Онбординг: установочная, неделя, экватор, финиш', 'руководитель, рекрутер, наставник, HR BP']].map(([a, b, c]) => `<tr><td style="white-space:nowrap">${a}</td><td>${b}</td><td class="hide-m"><small>${c}</small></td></tr>`).join('')}
        </tbody></table></div>
        <div class="card"><div class="card-head"><h3>Откуда берутся данные</h3></div><table><thead><tr><th>Блок кабинета</th><th>Источник</th></tr></thead><tbody>
          ${[['Карточка сотрудника, грейд, руководитель, отдел', 'Заводит HR-менеджер или руководитель, история изменений'], ['Задачи оперативные', 'Постмиты 1:1 (блок «Действия») и транскрипты после подтверждения руководителем'], ['Задачи длительные', 'Цели PR на полугодие и шаги ИПР'], ['Курсы LMS', 'iSpring Learn по API: название, срок, статус'], ['Матрица грейдов', 'Самооценка с артефактами, валидация руководителя'], ['Performance Review', 'Лист PR: метрики по роли, цели, 360, уровень A–D'], ['Оценка 360 и mNPS', 'Анкеты в системе, агрегированный отчёт'], ['Обратная связь', 'Транскрипты встреч, наблюдения руководителя, анкеты, 360'], ['Пульс-опросы', 'Анкета раз в месяц, анонимно, разрез по отделам']].map(([a, b]) => `<tr><td>${a}</td><td><small>${b}</small></td></tr>`).join('')}
        </tbody></table></div>
      </div>` });

  // ---------- HR admin ----------
  V['/hr/people'] = () => ({ title: 'Данные сотрудников', crumbs: crumbsM(), html: `
      <div class="grid cols-3" style="margin-bottom:16px">
        <div class="card span-2"><div class="card-head"><h3>Добавить сотрудника</h3><span class="hint">заводит HR-менеджер или руководитель отдела</span></div>
          <div class="form-row"><div class="field"><label>ФИО</label><input type="text" placeholder="Имя Фамилия"></div><div class="field"><label>Роль</label><input type="text" placeholder="Аккаунт-менеджер"></div></div>
          <div class="form-row"><div class="field"><label>Отдел</label><select>${D.departments.map((d) => `<option>${esc(d.name)}</option>`).join('')}</select></div><div class="field"><label>Руководитель</label><select>${D.departments.map((d) => `<option>${esc(emp(d.head).name)}</option>`).join('')}</select></div></div>
          <div class="form-row"><div class="field"><label>Грейд на входе</label><select>${D.gradeLadders.account.map((g) => `<option>${g}</option>`).join('')}</select><span class="hint">список грейдов зависит от роли</span></div><div class="field"><label>Дата выхода</label><input type="date" value="2026-10-19"></div></div>
          <div class="form-row"><div class="field"><label>Наставник</label><select>${D.employees.filter((e) => ['Senior', 'Lead'].includes(e.grade) && e.dept).map((e) => `<option>${esc(e.name)}</option>`).join('')}</select></div><div class="field"><label>Статус</label><select><option>Испытательный срок</option><option>В штате</option><option>Уволен</option></select></div></div>
          <div class="row"><button class="btn primary" onclick="hrAct.demo()">Создать карточку и план адаптации</button><span class="hint">Создаются: кабинет сотрудника, план онбординга из шаблона, назначения обязательных курсов в LMS</span></div></div>
        <div class="card"><div class="card-head"><h3>Что меняет HR</h3></div><ul style="margin:0;padding-left:18px;font-size:13px;color:var(--text-2)"><li>Отдел, руководитель, наставник</li><li>Грейд: по итогам оценки, с датой и основанием</li><li>Статус: испытательный срок, в штате, уволен</li><li>Плановые даты PR и оценки на грейд</li><li>Шаблоны матриц, PR, 360, адаптации</li></ul><div class="hint" style="margin-top:10px">Каждое изменение попадает в журнал с автором и датой.</div></div>
      </div>
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Все сотрудники</h2></div><table><thead><tr><th>Сотрудник</th><th class="hide-m">Отдел</th><th>Грейд</th><th class="hide-m">Руководитель</th><th class="hide-m">Выход</th><th>Статус</th><th></th></tr></thead><tbody>${D.employees.filter((e) => e.id !== 'e01').map((e) => `<tr><td><div class="row" style="flex-wrap:nowrap">${avatar(e, 'sm')}<div><b style="font-weight:500">${esc(e.name)}</b><div class="hint">${esc(e.role)}</div></div></div></td><td class="hide-m">${esc(deptName(e.dept))}</td><td>${chip(e.grade, 'grade')}</td><td class="hide-m">${e.manager ? esc(emp(e.manager).name) : '—'}</td><td class="hide-m">${fmt(e.hired)}</td><td>${e.status === 'probation' ? chip('ИС', 'warn') : chip('В штате', 'good')}</td><td><button class="btn sm ghost" onclick="hrAct.demo()">Изменить</button></td></tr>`).join('')}</tbody></table></div>
      <div class="card"><div class="card-head"><h3>Журнал изменений</h3></div><ul class="list">${D.changeLog.map((c) => `<li><div class="body" style="font-size:14px">${esc(c.what)}<div class="meta">${fmt(c.date)} · ${esc(emp(c.who).name)}</div></div></li>`).join('')}</ul></div>` });
  V['/hr/settings'] = () => {
    const T = D.templates;
    return { title: 'Шаблоны и циклы', crumbs: crumbsM(), html: `
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Матрицы компетенций по трекам</h2><span class="hint">шаблоны заказчика; редактирует HR</span></div>
        <table><thead><tr><th>Трек</th><th class="num">Компетенций</th><th>Грейды роли</th><th class="hide-m">Диапазоны баллов</th><th class="hide-m">Ограничения</th><th></th></tr></thead><tbody>${D.departments.map((d) => `<tr><td>${esc(d.name)}</td><td class="num">${D.competencies[d.id].length}</td><td><small>${D.gradeLadders[d.id].join(' → ')}</small></td><td class="hide-m"><small>${d.id === 'account' ? Object.entries(D.gradeRules.ranges).map(([g, r]) => `${g} ${r[0]}–${r[1]}`).join(' · ') : 'заполнить по шаблону трека'}</small></td><td class="hide-m"><small>${d.id === 'account' ? 'софты: по 3 компетенции на Middle, Middle+, Senior; харды: задания с артефактом' : 'харды и софты: подтверждение заданием'}</small></td><td><button class="btn sm ghost" onclick="hrAct.demo()">Открыть</button></td></tr>`).join('')}</tbody></table></div>
      <div class="grid cols-3">
        <div class="card"><div class="card-head"><h3>Цикл Performance Review</h3></div><div class="hint">Период: ${esc(T.prCycle.period)} · шкала ${esc(T.prCycle.scale)}</div><ol style="margin:8px 0;padding-left:18px;font-size:13px">${T.prCycle.meetings.map((m) => `<li>${esc(m)}</li>`).join('')}</ol><div class="hint">Входы: ${esc(T.prCycle.inputs.join(', '))}</div><div class="hint" style="margin-top:6px">Метрики эффективности задаются по роли: у аккаунтов 10 метрик (отток, допродажи, дебиторка, скорость реакции, NPS клиентов и др.)</div></div>
        <div class="card"><div class="card-head"><h3>Оценка 360</h3></div><div class="hint">Шкала ${esc(T.review360.scale)} · группы: ${esc(T.review360.groups.join(', '))} · когда: ${esc(T.review360.when)}</div><div class="hint" style="margin-top:8px">Открытые вопросы:</div><ul style="margin:4px 0 0;padding-left:18px;font-size:13px">${T.review360.open.map((q) => `<li>${esc(q)}</li>`).join('')}</ul><div class="hint" style="margin-top:8px">Набор компетенций и индикаторов — свой на трек</div></div>
        <div class="card"><div class="card-head"><h3>План адаптации</h3></div><ol style="margin:0;padding-left:18px;font-size:13px">${T.adaptation.meetings.map((m) => `<li>${esc(m)}</li>`).join('')}</ol><div class="hint" style="margin-top:8px">${esc(T.adaptation.scale)}</div><ul style="margin:6px 0 0;padding-left:18px;font-size:13px;color:var(--text-2)">${T.adaptation.roles.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
        <div class="card"><div class="card-head"><h3>Постмит 1:1</h3></div><ul style="margin:0;padding-left:18px;font-size:13px">${T.oneOnOne.fields.map((f) => `<li>${esc(f)}</li>`).join('')}</ul><div class="hint" style="margin-top:8px">${esc(T.oneOnOne.frequency)}</div></div>
        <div class="card"><div class="card-head"><h3>Пульс-опрос</h3></div><div class="hint">${esc(T.pulse.frequency)}</div><ol style="margin:8px 0 0;padding-left:18px;font-size:13px">${T.pulse.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol></div>
        <div class="card"><div class="card-head"><h3>Интеграции</h3></div><table><tbody><tr><td>LMS</td><td><small>${esc(T.lms.system)}: ${esc(T.lms.api)}. ${esc(T.lms.sync)}</small></td></tr><tr><td>Транскрипты</td><td><small>Загрузка текста или файла; извлечение задач и ОС; подтверждение руководителем</small></td></tr><tr><td>Трекер задач</td><td><small>Не подключается: задачи живут в постмитах. Ссылки на Планфикс как текст</small></td></tr><tr><td>Кадровые данные</td><td><small>Вводят HR-менеджер или руководитель; история изменений обязательна</small></td></tr></tbody></table></div>
      </div>` };
  };
  V['/hr/access'] = () => ({ title: 'Роли и доступ', crumbs: crumbsM(), html: `
      <div class="card" style="margin-bottom:16px"><table><thead><tr><th>Роль</th><th>Видит</th><th>Меняет</th></tr></thead><tbody>${D.roles.map((r) => `<tr><td style="white-space:nowrap"><b style="font-weight:500">${esc(r.name)}</b></td><td><small>${esc(r.sees)}</small></td><td><small>${esc(r.edits)}</small></td></tr>`).join('')}</tbody></table></div>
      <div class="card"><div class="card-head"><h3>Матрица видимости данных</h3></div><table><thead><tr><th>Данные</th><th>Сотрудник</th><th>Руководитель отдела</th><th>HR-менеджер и директор</th></tr></thead><tbody>
        ${[['Грейд, матрица, история грейдов', 'свои', 'свой отдел', 'все'], ['Задачи и постмиты 1:1', 'свои', 'свой отдел', 'все'], ['Performance Review', 'свой', 'свой отдел', 'все; директор — и руководителей отделов'], ['Оценка 360', 'своя, в агрегате', 'свой отдел, по группам', 'все'], ['mNPS руководителя', '—', 'свой', 'все'], ['Приватные заметки руководителя', '—', 'только сам руководитель', '—'], ['Журнал обратной связи', 'записи о себе', 'свой отдел', 'все'], ['Транскрипты встреч', '—', 'свои встречи', 'все'], ['Пульс-опросы', 'итоги по агентству', 'свой отдел и среднее', 'все'], ['Карточки, грейды, шаблоны (редактирование)', '—', 'карточки своего отдела', 'всё']].map((r) => `<tr>${r.map((c, i) => `<td>${i ? `<small>${c}</small>` : c}</td>`).join('')}</tr>`).join('')}
      </tbody></table><div class="hint" style="margin-top:10px">HR-менеджер и директор работают в одном кабинете. Директор дополнительно видит PR, грейдирование и mNPS руководителей отделов.</div></div>` });

  V['/tz'] = () => ({ title: 'ТЗ 3.0', crumbs: 'Документы · вкладка «3.0. Задача» Google-документа заказчика', html: $('#tz-content').innerHTML });
  V['/about'] = () => ({ title: 'Что нового в версии 3.0', crumbs: 'Документы · каркас для обсуждения', html: $('#about-content').innerHTML });
  V['/scheme'] = () => {
    const S = D.scheme; const srcById = Object.fromEntries(S.sources.map((x) => [x.id, x]));
    const tag = (id) => `<span style="color:var(--src-${id})">${esc(srcById[id].name)}</span>`;
    const reach = (id) => S.cabinets.filter((c) => c.screens.some((x) => x.src.includes(id))).length;
    return { title: 'Схема и промт', crumbs: 'Документы · блок-схема трёх кабинетов по ТЗ 3.0', html: `
      <div class="notice" style="margin-bottom:16px">Слева источники данных, справа три кабинета. У каждого источника свой цвет: тем же цветом он подписан в каждом экране, куда идут его данные. Наведите курсор или нажмите на источник, чтобы подсветить все экраны, куда он попадает.</div>
      <div class="scheme" id="scheme">
        <div class="col"><div class="col-head"><b>Источники данных</b><span>${S.sources.length} источников</span></div>
          ${S.sources.map((x) => `<button type="button" class="src-item" data-src="${x.id}" style="color:var(--src-${x.id})"><b>${esc(x.name)}</b><small>${esc(x.who)}</small><em>в ${reach(x.id)} ${plural(reach(x.id), ['кабинет', 'кабинета', 'кабинетов'])}</em></button>`).join('')}
        </div>
        ${S.cabinets.map((c) => `<div class="col"><div class="col-head"><b>${esc(c.name)}</b><span>${esc(c.scope)}</span></div>
          ${c.screens.map((x) => `<div class="scr" data-srcs="${x.src.join(' ')}"><b>${esc(x.name)}</b><p>${esc(x.what)}</p><div class="srcs">${x.src.map(tag).join('')}</div></div>`).join('')}</div>`).join('')}
      </div>
      <div class="card" style="margin-top:16px"><div class="card-head"><h2>Связи: один источник — несколько кабинетов</h2><span class="hint">экраны, куда идут данные источника</span></div>
        <div style="overflow-x:auto"><table class="links"><thead><tr><th>Источник</th>${S.cabinets.map((c) => `<th>${esc(c.name.replace('Кабинет ', ''))}</th>`).join('')}</tr></thead><tbody>
        ${S.sources.map((x) => `<tr><td><b style="color:var(--src-${x.id})">${esc(x.name)}</b></td>${S.cabinets.map((c) => { const l = c.screens.filter((y) => y.src.includes(x.id)).map((y) => y.name); return `<td style="color:var(--src-${x.id})">${l.length ? esc(l.join(', ')) : '<span class="hint">—</span>'}</td>`; }).join('')}</tr>`).join('')}
        </tbody></table></div></div>
      <div class="card" style="margin-top:16px" id="prompt-card">${$('#prompt-content').innerHTML}</div>`,
      after: () => {
        const box = $('#scheme'); let locked = null;
        const show = (id) => { box.classList.toggle('focus', !!id); box.querySelectorAll('.scr').forEach((el) => { const on = id && el.dataset.srcs.split(' ').includes(id); el.classList.toggle('hl', !!on); el.classList.toggle('dim', !!id && !on); el.style.setProperty('--hl', id ? `var(--src-${id})` : ''); }); box.querySelectorAll('.src-item').forEach((el) => { el.classList.toggle('on', el.dataset.src === id); el.classList.toggle('dim', !!id && el.dataset.src !== id); }); };
        box.querySelectorAll('.src-item').forEach((b) => { b.onmouseenter = () => { if (!locked) show(b.dataset.src); }; b.onmouseleave = () => { if (!locked) show(null); }; b.onfocus = () => { if (!locked) show(b.dataset.src); }; b.onclick = () => { locked = locked === b.dataset.src ? null : b.dataset.src; show(locked); }; });
        document.querySelectorAll('#prompt-card pre').forEach((pre) => { const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn sm'; btn.textContent = 'Скопировать промт'; btn.onclick = () => { const t = pre.innerText; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Промт скопирован')).catch(() => { const r = document.createRange(); r.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast('Выделено: нажмите Ctrl+C'); }); }; const row = document.createElement('div'); row.className = 'copy-row'; row.appendChild(btn); pre.before(row); });
      } };
  };

  // ---------- router ----------
  function route() {
    const hash = location.hash.replace(/^#/, '') || '/employee/profile';
    const parts = hash.split('/'); const prefix = parts[1];
    ROLE = prefix === 'hr' ? 'hr' : prefix === 'manager' ? 'manager' : prefix === 'employee' ? 'employee' : (localStorage.getItem('hr-role') || 'employee');
    try { localStorage.setItem('hr-role', ROLE); } catch (e) { /* ignore */ }
    let view, arg;
    if (prefix === 'hr' || prefix === 'manager') {
      const name = parts[2] || 'dashboard'; arg = parts.slice(3).join('/') ? decodeURIComponent(parts.slice(3).join('/')) : undefined;
      view = V[`/${prefix}/${name}`] || V[`/manager/${name}`] || V['/manager/dashboard'];
    } else { view = V[hash] || V['/employee/profile']; }
    destroyCharts(); chartDefaults();
    const r = view(arg);
    $('#page-title').textContent = r.title; $('#crumbs').innerHTML = r.crumbs || ''; $('#content').innerHTML = r.html;
    if (r.after) r.after();
    renderNav(hash); document.title = `${r.title} · Кабинет HR`;
    $('#sidebar').classList.remove('open'); if (!route._keep) window.scrollTo(0, 0); route._keep = false;
  }
  function renderNav(hash) {
    document.querySelectorAll('#seg-role button').forEach((b) => b.classList.toggle('on', b.dataset.role === ROLE));
    document.querySelectorAll('#seg-design button').forEach((b) => b.classList.toggle('on', b.dataset.design === document.documentElement.dataset.design));
    document.querySelectorAll('#seg-theme button').forEach((b) => b.classList.toggle('on', b.dataset.themeSet === document.documentElement.dataset.theme));
    document.querySelectorAll('.db-docs a').forEach((a) => a.classList.toggle('on', a.dataset.doc === hash));
    const isActive = (h) => hash === h || (h.endsWith('/team') && /\/person\//.test(hash)) || (h.endsWith('/transcripts') && hash.includes('/transcripts')) || (h.endsWith('/feedback') && hash.includes('/feedback'));
    $('#nav').innerHTML = NAV[ROLE].map((n) => n.g ? `<div class="group">${n.g}</div>` : `<a href="#${n.h}" class="${isActive(n.h) ? 'active' : ''}">${n.i}<span class="l">${n.t}</span><span class="s">${n.s || n.t}</span>${n.badge && n.badge() ? `<span class="badge">${n.badge()}</span>` : ''}</a>`).join('');
    const u = me();
    $('#me').innerHTML = `${avatar(u)}<div style="min-width:0"><b style="font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500">${esc(u.name)}</b><small style="font-size:12px;color:var(--text-3)">${esc(u.role)}</small></div>`;
  }
  const origRoute = route; window.__hrRoute = origRoute;
  document.querySelectorAll('#seg-role button').forEach((b) => { b.onclick = () => { location.hash = b.dataset.role === 'manager' ? '/manager/dashboard' : b.dataset.role === 'hr' ? '/hr/dashboard' : '/employee/profile'; }; });
  // Вариант дизайна и тема: атрибуты на <html>, запоминаются в браузере и в адресе (ссылку можно отправить)
  const setView = (key, val) => { document.documentElement.dataset[key] = val; try { localStorage.setItem(`hr-${key}`, val); } catch (e) { /* ignore */ } const u = new URL(location.href); u.searchParams.set(key, val); history.replaceState(null, '', u); route._keep = true; const y = window.scrollY; route(); window.scrollTo(0, y); };
  document.querySelectorAll('#seg-design button').forEach((b) => { b.onclick = () => setView('design', b.dataset.design); });
  document.querySelectorAll('#seg-theme button').forEach((b) => { b.onclick = () => setView('theme', b.dataset.themeSet); });
  $('#menu-btn').onclick = () => $('#sidebar').classList.toggle('open');
  // Подтверждения из транскриптов перерисовывают экран без прокрутки вверх
  const keepScroll = (fn) => (...a) => { route._keep = true; const y = window.scrollY; fn(...a); window.scrollTo(0, y); };
  hrAct.confirm = keepScroll(hrAct.confirm); hrAct.reject = keepScroll(hrAct.reject); hrAct.addFeedback = keepScroll(hrAct.addFeedback);
  window.addEventListener('hashchange', route);
  route();
})();
