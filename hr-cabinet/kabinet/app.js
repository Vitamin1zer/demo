/* Кабинет сотрудника и руководителя — прототип. Данные: data.js. Роутинг по hash: #/employee/... и #/manager/... */
(() => {
  const D = window.HR;
  const TODAY = new Date('2026-10-11');
  const CURRENT_EMPLOYEE = 'e03'; // Анна Соколова — демо-сотрудник
  const CURRENT_MANAGER = 'e02';  // Мария Климова — демо-руководитель
  const charts = [];

  // ---------- helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const emp = (id) => D.employees.find((e) => e.id === id);
  const dept = (id) => D.departments.find((d) => d.id === id);
  const deptName = (id) => (dept(id) ? dept(id).name : 'Руководство');
  const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  const colors = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];
  const avatarColor = (id) => colors[parseInt(id.slice(1), 10) % colors.length];
  const avatar = (e, cls = '') => `<span class="avatar ${cls}" style="background:${avatarColor(e.id)}">${esc(initials(e.name))}</span>`;
  const fmt = (iso) => { const d = new Date(iso); return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const fmtShort = (iso) => { const d = new Date(iso); return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); };
  const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
  const plural = (n, f) => { const m10 = n % 10, m100 = n % 100; return f[(m10 === 1 && m100 !== 11) ? 0 : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) ? 1 : 2]; };
  const tenure = (iso) => {
    const m = Math.floor(daysBetween(iso, TODAY) / 30.44); const y = Math.floor(m / 12), mm = m % 12;
    const parts = []; if (y) parts.push(`${y} ${plural(y, ['год', 'года', 'лет'])}`); if (mm) parts.push(`${mm} ${plural(mm, ['месяц', 'месяца', 'месяцев'])}`);
    return parts.join(' ') || 'меньше месяца';
  };
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const taskStatus = { in_progress: ['В работе', 'accent'], done: ['Сделано', 'good'], overdue: ['Просрочено', 'critical'], planned: ['Запланировано', ''] };
  const courseStatus = { assigned: ['Назначен', ''], in_progress: ['В процессе', 'accent'], done: ['Пройден', 'good'], overdue: ['Просрочен', 'critical'] };
  const chip = (text, cls = '') => `<span class="chip ${cls}">${esc(text)}</span>`;
  const bar = (p, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></div>`;
  const checkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>';
  const check = (done) => `<span class="check ${done ? 'done' : ''}">${done ? checkIcon : ''}</span>`;
  const subordinates = (mid) => D.employees.filter((e) => e.manager === mid);
  const allBelow = (mid) => { const out = []; const walk = (id) => subordinates(id).forEach((e) => { out.push(e); walk(e.id); }); walk(mid); return out; };
  const teamOf = (mid) => (mid === 'e01' ? D.employees.filter((e) => e.id !== 'e01') : allBelow(mid));
  const link = (hash, text) => `<a href="#${hash}">${text}</a>`;
  const personLink = (e) => link(`/manager/person/${e.id}`, esc(e.name));

  // ---------- charts ----------
  function destroyCharts() { while (charts.length) charts.pop().destroy(); }
  function chartDefaults() {
    Chart.defaults.color = css('--text-2'); Chart.defaults.borderColor = css('--line'); Chart.defaults.font.family = getComputedStyle(document.body).fontFamily; Chart.defaults.font.size = 12;
  }
  function mk(id, cfg) { const el = document.getElementById(id); if (!el) return; const c = new Chart(el, cfg); charts.push(c); return c; }
  const tooltipBase = { backgroundColor: css('--text'), titleColor: css('--bg'), bodyColor: css('--bg'), padding: 10, cornerRadius: 8, displayColors: true };
  function radar(id, labels, datasets) {
    mk(id, { type: 'radar', data: { labels, datasets: datasets.map((d) => ({ ...d, borderWidth: 2, pointRadius: 3, pointHoverRadius: 6, fill: true })) },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: tooltipBase },
        scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, backdropColor: 'transparent', color: css('--text-3') }, grid: { color: css('--line') }, angleLines: { color: css('--line') }, pointLabels: { font: { size: 11 }, color: css('--text-2') } } } } });
  }
  function line(id, labels, datasets, opts = {}) {
    mk(id, { type: 'line', data: { labels, datasets: datasets.map((d) => ({ tension: 0.3, borderWidth: 2, pointRadius: 3, pointHoverRadius: 6, ...d })) },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: tooltipBase },
        scales: { x: { grid: { display: false } }, y: { min: opts.min, max: opts.max, grid: { color: css('--line') }, ticks: { color: css('--text-3') }, border: { display: false } } } } });
  }
  function bars(id, labels, datasets, opts = {}) {
    const wrap = (l) => (typeof l === 'string' && l.length > 12 && !opts.horizontal) ? l.split(' ').reduce((a, w) => { const last = a[a.length - 1]; if (last !== undefined && (last + ' ' + w).length <= 14) a[a.length - 1] = last + ' ' + w; else a.push(w); return a; }, []) : l;
    mk(id, { type: 'bar', data: { labels: labels.map(wrap), datasets: datasets.map((d) => ({ borderRadius: 4, borderSkipped: 'start', barPercentage: 0.6, categoryPercentage: 0.7, ...d })) },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: opts.horizontal ? 'y' : 'x', plugins: { legend: { display: false }, tooltip: tooltipBase },
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
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>',
    org: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="3" width="6" height="5" rx="1.5"/><rect x="3" y="16" width="6" height="5" rx="1.5"/><rect x="15" y="16" width="6" height="5" rx="1.5"/><path d="M12 8v4M6 16v-4h12v4"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5a5 5 0 0 1 6 4.5"/></svg>',
    pulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>',
    onb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h12l4 4v12H4z"/><path d="M8 13l2.5 2.5L16 10"/></svg>',
    hire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>',
    flow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7.5 12h4l5-5M11.5 12l5 5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></svg>',
  };
  const NAV = {
    employee: [
      { g: 'Мой кабинет' },
      { h: '/employee/profile', t: 'Профиль', i: I.home },
      { h: '/employee/tasks', t: 'Задачи', i: I.tasks, badge: () => D.tasks[CURRENT_EMPLOYEE].filter((t) => t.status === 'overdue').length },
      { h: '/employee/learning', t: 'Обучение (LMS)', i: I.learn },
      { h: '/employee/reviews', t: 'Оценки', i: I.star },
      { h: '/employee/idp', t: 'ИПР и зоны роста', i: I.growth },
      { h: '/employee/one-on-one', t: 'Встречи 1:1', i: I.chat },
      { g: 'О прототипе' },
      { h: '/about', t: 'Вопросы и улучшения', i: I.info },
    ],
    manager: [
      { g: 'Команда' },
      { h: '/manager/dashboard', t: 'Дашборд', i: I.dash },
      { h: '/manager/structure', t: 'Структура', i: I.org },
      { h: '/manager/team', t: 'Сотрудники', i: I.people },
      { g: 'Процессы' },
      { h: '/manager/reviews', t: 'Performance Review', i: I.star },
      { h: '/manager/onboarding', t: 'Адаптация и обучение', i: I.onb, badge: () => Object.values(D.onboarding).filter((o) => o.risk !== 'low').length },
      { h: '/manager/pulse', t: 'Пульс-опросы', i: I.pulse },
      { h: '/manager/feedback', t: 'Обратная связь', i: I.chat },
      { h: '/manager/hiring', t: 'Найм', i: I.hire },
      { h: '/manager/processes', t: 'Карта процессов', i: I.flow },
      { g: 'О прототипе' },
      { h: '/about', t: 'Вопросы и улучшения', i: I.info },
    ],
  };

  // ---------- shared blocks ----------
  function skillsRadarCard(e, id, withTarget = true) {
    const comps = D.competencies[e.dept] || [];
    const cur = comps.map((c) => e.skills[c] ?? 0); const tgt = comps.map((c) => (e.target || {})[c] ?? Math.min(5, (e.skills[c] ?? 0) + 1));
    const gaps = comps.filter((c, i) => tgt[i] > cur[i]).map((c, i) => c);
    setTimeout(() => radar(id, comps, [
      { label: 'Текущий уровень', data: cur, borderColor: css('--s1'), backgroundColor: css('--s1') + '33', pointBackgroundColor: css('--s1') },
      ...(withTarget ? [{ label: 'Целевой уровень', data: tgt, borderColor: css('--s2'), backgroundColor: 'transparent', borderDash: [5, 4], pointBackgroundColor: css('--s2') }] : []),
    ]));
    return `<div class="chart h-260"><canvas id="${id}"></canvas></div>${legend([[css('--s1') || '#2a78d6', 'Текущий уровень'], ...(withTarget ? [[css('--s2') || '#eb6834', 'Целевой уровень на следующий грейд']] : [])])}
      <div class="hint" style="margin-top:8px">Зоны роста по матрице: ${gaps.length ? gaps.map((g) => chip(g, 'warn')).join(' ') : 'нет расхождений с целевым профилем'}</div>`;
  }
  function tasksTable(list, showResult = true) {
    if (!list.length) return '<div class="empty">Задач нет</div>';
    return `<table><thead><tr><th>Задача</th><th class="hide-m">Откуда</th><th>Срок</th><th>Статус</th>${showResult ? '<th class="hide-m">Результат / прогресс</th>' : ''}</tr></thead><tbody>${list.map((t) => {
      const [txt, cls] = taskStatus[t.status]; return `<tr><td>${esc(t.title)}</td><td class="hide-m"><small>${esc(t.source)}</small></td><td style="white-space:nowrap">${fmtShort(t.due)}</td><td>${chip(txt, cls)}</td>${showResult ? `<td class="hide-m">${t.kind === 'long' ? `<div class="row"><div class="bar" style="flex:1">${bar(t.progress).slice(17)}</div><small>${t.progress}%</small></div>` : `<small>${esc(t.result || '—')}</small>`}</td>` : ''}</tr>`;
    }).join('')}</tbody></table>`;
  }
  function coursesTable(list) {
    if (!list.length) return '<div class="empty">Курсов нет</div>';
    return `<table><thead><tr><th>Курс</th><th class="hide-m">Тип</th><th>Срок</th><th>Прогресс</th><th>Статус</th></tr></thead><tbody>${list.map((c) => {
      const [txt, cls] = courseStatus[c.status];
      return `<tr><td>${esc(c.title)}${c.score ? `<div class="hint">итоговый тест: ${c.score} из 100</div>` : ''}</td><td class="hide-m">${chip(c.type, c.type === 'обязательный' ? 'serious' : '')}</td><td style="white-space:nowrap">${fmtShort(c.due)}</td><td><div class="row"><div style="flex:1">${bar(c.progress, c.status === 'overdue' ? 'critical' : c.status === 'done' ? 'good' : '')}</div><small>${c.progress}%</small></div></td><td>${chip(txt, cls)}</td></tr>`;
    }).join('')}</tbody></table>`;
  }
  function idpBlock(e) {
    const p = D.idp[e.id]; if (!p) return '<div class="empty">ИПР ещё не составлен. Обычно его фиксируют на 1:1 после Performance Review.</div>';
    const kinds = { learn: ['Обучение', ''], mentor: ['Наставник', 'accent'], practice: ['Практика', 'good'] };
    return `<div class="row between" style="margin-bottom:12px"><div><b>${esc(p.period)}</b> · куратор ${esc(p.owner)}</div><div class="hint">обновлён ${fmt(p.reviewedAt)} · следующий обзор ${fmt(p.next)}</div></div>
      <div class="grid cols-3">${p.goals.map((g) => `<div class="card flat"><h3>${esc(g.title)}</h3><div class="hint" style="margin:4px 0 10px">${esc(g.competency)}: уровень ${g.from} → ${g.to}</div>
        <div class="progress-row" style="grid-template-columns:1fr 40px"><div>${bar(g.progress)}</div><div class="num">${g.progress}%</div></div>
        <ul class="list" style="margin-top:8px">${g.steps.map((s) => `<li>${check(s.done)}<div class="body"><div style="font-size:13px">${esc(s.text)}</div><div class="meta">${chip(kinds[s.kind][0], kinds[s.kind][1])}</div></div></li>`).join('')}</ul></div>`).join('')}</div>
      <div class="hint" style="margin-top:10px">Модель 70-20-10: практика в задачах, наставничество, курсы. Прогресс цели считается по чекпоинтам и подтверждается руководителем на 1:1.</div>`;
  }
  function gradeTimeline(e) {
    const h = D.gradeHistory[e.id] || [{ date: e.hired, grade: e.grade, note: 'Приём на работу' }];
    return `<ul class="timeline">${[...h].reverse().map((x) => `<li><div class="row"><span class="chip grade">${esc(x.grade)}</span><b style="font-size:14px">${esc(x.note)}</b></div><div class="date">${fmt(x.date)}</div></li>`).join('')}</ul>`;
  }
  function profileHeader(e, forManager) {
    const m = e.manager ? emp(e.manager) : null; const onb = D.onboarding[e.id];
    return `<div class="card"><div class="row" style="gap:18px;align-items:flex-start">${avatar(e, 'lg')}<div style="flex:1;min-width:0">
      <div class="row"><h2>${esc(e.name)}</h2>${chip(e.grade, 'grade')}${e.status === 'probation' ? chip('Испытательный срок', 'warn') : ''}</div>
      <div class="muted" style="margin:2px 0 10px">${esc(e.role)} · ${esc(deptName(e.dept))}</div>
      <div class="grid cols-4" style="gap:10px">
        <div class="stat"><span class="label">В компании</span><span class="value" style="font-size:18px">${tenure(e.hired)}</span><span class="hint">с ${fmt(e.hired)}</span></div>
        <div class="stat"><span class="label">Руководитель</span><span class="value" style="font-size:18px">${m ? (forManager ? personLink(m) : esc(m.name)) : '—'}</span></div>
        <div class="stat"><span class="label">Текущий грейд</span><span class="value" style="font-size:18px">${esc(e.grade)}</span><span class="hint">${(D.gradeHistory[e.id] || []).length > 1 ? 'с ' + fmt(D.gradeHistory[e.id].slice(-1)[0].date) : 'с приёма'}</span></div>
        <div class="stat"><span class="label">${onb ? 'Испытательный срок до' : 'Следующий PR'}</span><span class="value" style="font-size:18px">${onb ? fmt(onb.end) : 'Q4 2026'}</span><span class="hint">${onb ? `осталось ${daysBetween(TODAY, onb.end)} дн.` : 'январь 2027'}</span></div>
      </div></div></div></div>`;
  }

  // ---------- employee views ----------
  const V = {};
  V['/employee/profile'] = () => {
    const e = emp(CURRENT_EMPLOYEE); const tasks = D.tasks[e.id] || []; const ops = tasks.filter((t) => t.kind === 'ops' && t.status !== 'done'); const long = tasks.filter((t) => t.kind === 'long');
    const courses = D.courses[e.id] || []; const rv = D.reviews[e.id]?.[0]; const next11 = D.oneOnOnes[e.id]?.[0];
    return { title: 'Мой профиль', crumbs: 'Кабинет сотрудника', html: `
      ${profileHeader(e, false)}
      <div class="grid cols-3" style="margin-top:16px">
        <div class="card"><div class="card-head"><h3>Оперативные задачи (из 1:1)</h3>${link('/employee/tasks', 'все')}</div>
          <ul class="list">${ops.map((t) => `<li>${check(false)}<div class="body"><div class="title" style="font-size:14px">${esc(t.title)}</div><div class="meta">до ${fmtShort(t.due)} · ${esc(t.source)} ${t.status === 'overdue' ? chip('просрочено', 'critical') : ''}</div></div></li>`).join('') || '<li class="empty">Нет открытых задач</li>'}</ul></div>
        <div class="card"><div class="card-head"><h3>Длительные задачи</h3>${link('/employee/tasks', 'все')}</div>
          <div class="stack">${long.map((t) => `<div><div style="font-size:14px">${esc(t.title)}</div><div class="progress-row" style="margin-top:4px"><div class="hint">${esc(t.source)} · до ${fmtShort(t.due)}</div>${bar(t.progress)}<div class="num">${t.progress}%</div></div></div>`).join('')}</div></div>
        <div class="card"><div class="card-head"><h3>Последняя оценка</h3>${link('/employee/reviews', 'история')}</div>
          ${rv ? `<div class="stat"><span class="label">Performance Review ${esc(rv.period)}</span><span class="value">${rv.score.toFixed(1)}<small>из 5</small></span><span class="hint">${esc(rv.decision)}</span></div>
          <div style="margin-top:12px"><div class="hint">Сильные стороны</div><div class="row" style="margin:4px 0 8px">${rv.strengths.map((s) => chip(s, 'good')).join('')}</div><div class="hint">Зоны роста</div><div class="row" style="margin-top:4px">${rv.growth.map((s) => chip(s, 'warn')).join('')}</div></div>` : '<div class="empty">Оценок ещё не было</div>'}</div>
      </div>
      <div class="grid cols-2" style="margin-top:16px">
        <div class="card"><div class="card-head"><h3>Матрица компетенций</h3>${link('/employee/idp', 'ИПР')}</div>${skillsRadarCard(e, 'radar-profile')}</div>
        <div class="stack">
          <div class="card"><div class="card-head"><h3>Обучение в LMS</h3>${link('/employee/learning', 'все курсы')}</div>
            <div class="stack">${courses.filter((c) => c.status !== 'done').map((c) => `<div class="progress-row"><div style="font-size:14px">${esc(c.title)}<div class="hint">до ${fmtShort(c.due)} · ${esc(c.type)}</div></div>${bar(c.progress, c.status === 'overdue' ? 'critical' : '')}<div class="num">${c.progress}%</div></div>`).join('')}</div></div>
          <div class="card"><div class="card-head"><h3>История грейдов</h3></div>${gradeTimeline(e)}</div>
          ${next11 ? `<div class="card"><div class="card-head"><h3>Последняя встреча 1:1</h3>${link('/employee/one-on-one', 'все встречи')}</div><div class="hint">${fmt(next11.date)}</div><div style="font-size:14px;margin-top:4px">${esc(next11.notes)}</div></div>` : ''}
        </div>
      </div>` };
  };
  V['/employee/tasks'] = () => {
    const tasks = D.tasks[CURRENT_EMPLOYEE] || [];
    return { title: 'Задачи', crumbs: 'Кабинет сотрудника', html: `
      <div class="grid cols-4" style="margin-bottom:16px">
        ${[['Оперативных открыто', tasks.filter((t) => t.kind === 'ops' && t.status !== 'done').length], ['Просрочено', tasks.filter((t) => t.status === 'overdue').length], ['Длительных в работе', tasks.filter((t) => t.kind === 'long').length], ['Закрыто за 30 дней', tasks.filter((t) => t.status === 'done').length]].map(([l, v]) => `<div class="card stat"><span class="label">${l}</span><span class="value">${v}</span></div>`).join('')}
      </div>
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Оперативные задачи</h2><span class="hint">ставятся на 1:1, срок 1–2 недели</span></div>${tasksTable(tasks.filter((t) => t.kind === 'ops'))}</div>
      <div class="card"><div class="card-head"><h2>Длительные задачи</h2><span class="hint">из Performance Review, ИПР, проектов; срок — квартал и дольше</span></div>${tasksTable(tasks.filter((t) => t.kind === 'long'))}</div>
      <div class="hint" style="margin-top:10px">В рабочей версии задачи приходят из трекера (Kaiten, Jira, Битрикс24) или фиксируются прямо в протоколе 1:1; здесь показан формат карточек.</div>` };
  };
  V['/employee/learning'] = () => {
    const c = D.courses[CURRENT_EMPLOYEE] || []; const done = c.filter((x) => x.status === 'done');
    return { title: 'Обучение (LMS)', crumbs: 'Кабинет сотрудника', html: `
      <div class="grid cols-4" style="margin-bottom:16px">
        <div class="card stat"><span class="label">Назначено курсов</span><span class="value">${c.length}</span></div>
        <div class="card stat"><span class="label">Пройдено</span><span class="value">${done.length}</span></div>
        <div class="card stat"><span class="label">Средний балл тестов</span><span class="value">${done.length ? Math.round(done.reduce((s, x) => s + x.score, 0) / done.length) : '—'}</span></div>
        <div class="card stat"><span class="label">Просрочено</span><span class="value">${c.filter((x) => x.status === 'overdue').length}</span></div>
      </div>
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Назначенные курсы</h2></div>${coursesTable(c.filter((x) => x.status !== 'done'))}</div>
      <div class="card"><div class="card-head"><h2>Пройденные курсы</h2></div>${coursesTable(done)}</div>` };
  };
  V['/employee/reviews'] = () => {
    const e = emp(CURRENT_EMPLOYEE); const rv = D.reviews[e.id] || []; const r360 = D.review360[e.id];
    setTimeout(() => {
      line('chart-pr', [...rv].reverse().map((r) => r.period), [
        { label: 'Итог', data: [...rv].reverse().map((r) => r.score), borderColor: css('--s1'), backgroundColor: css('--s1') },
        { label: 'Самооценка', data: [...rv].reverse().map((r) => r.selfScore), borderColor: css('--s2'), backgroundColor: css('--s2'), borderDash: [5, 4] },
      ], { min: 1, max: 5 });
      if (r360) bars('chart-360', r360.blocks.map((b) => b.name), [
        { label: 'Самооценка', data: r360.blocks.map((b) => b.self), backgroundColor: css('--s2') },
        { label: 'Руководитель', data: r360.blocks.map((b) => b.manager), backgroundColor: css('--s1') },
        { label: 'Коллеги', data: r360.blocks.map((b) => b.peers), backgroundColor: css('--s3') },
      ], { max: 5 });
    });
    return { title: 'Итоги оценок', crumbs: 'Кабинет сотрудника', html: `
      <div class="grid cols-2" style="margin-bottom:16px">
        <div class="card"><div class="card-head"><h3>Динамика Performance Review</h3></div><div class="chart h-220"><canvas id="chart-pr"></canvas></div>${legend([[css('--s1'), 'Итоговая оценка'], [css('--s2'), 'Самооценка']])}</div>
        <div class="card"><div class="card-head"><h3>Оценка 360 · ${esc(r360.period)}</h3><span class="hint">${r360.respondents} респондентов</span></div><div class="chart h-220"><canvas id="chart-360"></canvas></div>${legend([[css('--s2'), 'Самооценка'], [css('--s1'), 'Руководитель'], [css('--s3'), 'Коллеги']])}</div>
      </div>
      <div class="grid cols-2">
        <div class="card"><div class="card-head"><h3>История Performance Review</h3></div>
          <table><thead><tr><th>Период</th><th class="num">Итог</th><th class="num hide-m">Сам</th><th class="num hide-m">Рук.</th><th class="num hide-m">360</th><th>Решение</th></tr></thead><tbody>${rv.map((r) => `<tr><td>${esc(r.period)}<div class="hint">${fmt(r.date)}</div></td><td class="num"><b>${r.score.toFixed(1)}</b></td><td class="num hide-m">${r.selfScore.toFixed(1)}</td><td class="num hide-m">${r.managerScore.toFixed(1)}</td><td class="num hide-m">${r.peers360.toFixed(1)}</td><td><small>${esc(r.decision)}</small></td></tr>`).join('')}</tbody></table></div>
        <div class="card"><div class="card-head"><h3>Комментарии из 360</h3><span class="hint">обезличены, показаны при ≥ 3 ответах</span></div>
          <ul class="list">${r360.comments.map((c) => `<li><div class="body" style="font-size:14px">«${esc(c)}»</div></li>`).join('')}</ul>
          <div class="hint" style="margin-top:10px">Самооценка в среднем ниже оценки окружения на ${(r360.blocks.reduce((s, b) => s + (b.manager + b.peers) / 2 - b.self, 0) / r360.blocks.length).toFixed(1)} балла — это «скрытый потенциал» в терминах окна Джохари.</div></div>
      </div>` };
  };
  V['/employee/idp'] = () => {
    const e = emp(CURRENT_EMPLOYEE);
    return { title: 'ИПР и зоны роста', crumbs: 'Кабинет сотрудника', html: `
      <div class="grid cols-2" style="margin-bottom:16px">
        <div class="card"><div class="card-head"><h3>Профиль компетенций и цель на M2</h3></div>${skillsRadarCard(e, 'radar-idp')}</div>
        <div class="card"><div class="card-head"><h3>Что нужно для следующего грейда</h3></div>
          <table><thead><tr><th>Компетенция</th><th class="num">Сейчас</th><th class="num">Цель M2</th><th>Разрыв</th></tr></thead><tbody>${D.competencies[e.dept].map((c) => { const a = e.skills[c], b = (e.target || {})[c] ?? a; const gap = b - a; return `<tr><td>${esc(c)}</td><td class="num">${a}</td><td class="num">${b}</td><td>${gap > 0 ? chip(`−${gap}`, gap >= 2 ? 'critical' : 'warn') : chip('ок', 'good')}</td></tr>`; }).join('')}</tbody></table>
          <div class="hint" style="margin-top:10px">Целевой профиль берётся из матрицы компетенций для грейда M2 в треке SEO. Матрица — единый источник для ИПР, 360 и Performance Review.</div></div>
      </div>
      <div class="card"><div class="card-head"><h2>Индивидуальный план развития</h2></div>${idpBlock(e)}</div>` };
  };
  V['/employee/one-on-one'] = () => {
    const e = emp(CURRENT_EMPLOYEE); const list = D.oneOnOnes[e.id] || []; const tasks = D.tasks[e.id] || [];
    const moods = ['', 'Тяжело', 'Напряжённо', 'Нормально', 'Хорошо', 'Отлично'];
    return { title: 'Встречи 1:1', crumbs: 'Кабинет сотрудника', html: `
      <div class="card" style="margin-bottom:16px"><div class="row between"><div><h3>Следующая встреча: 13.10.2026, 11:00</h3><div class="hint">раз в неделю · 30 минут · с Марией Климовой</div></div><button class="btn primary">Добавить пункт в повестку</button></div>
        <div style="margin-top:12px"><div class="hint">Повестка (общая, видна обоим)</div><ul class="list"><li>${check(false)}<div class="body" style="font-size:14px">Семантика «Ривьера»: что уже собрано</div></li><li>${check(false)}<div class="body" style="font-size:14px">Перенос шаблона отчёта (перенесено с прошлой встречи)</div></li><li>${check(false)}<div class="body" style="font-size:14px">Чекпоинт ИПР: курс Looker Studio</div></li></ul></div></div>
      <div class="card"><div class="card-head"><h2>Прошедшие встречи</h2></div>
        <ul class="list">${list.map((m) => `<li><div class="body"><div class="row between"><b>${fmt(m.date)}</b>${chip(`Самочувствие: ${moods[m.mood]}`, m.mood >= 4 ? 'good' : m.mood === 3 ? '' : 'warn')}</div>
          <div class="hint" style="margin:4px 0">Повестка: ${m.agenda.map(esc).join(' · ')}</div><div style="font-size:14px">${esc(m.notes)}</div>
          ${m.actions.length ? `<div class="row" style="margin-top:6px">${m.actions.map((id) => { const t = tasks.find((x) => x.id === id); return t ? chip(`→ ${t.title.slice(0, 48)}${t.title.length > 48 ? '…' : ''}`, taskStatus[t.status][1]) : ''; }).join('')}</div>` : ''}</div></li>`).join('')}</ul></div>
      <div class="hint" style="margin-top:10px">Заметки руководителя «только для себя» в кабинете сотрудника не показываются; общие заметки и задачи видят оба.</div>` };
  };

  // ---------- manager views ----------
  V['/manager/dashboard'] = () => {
    const team = teamOf(CURRENT_MANAGER === 'e01' ? 'e01' : 'e01'); // Для демо показываем всё агентство
    const newcomers = team.filter((e) => e.status === 'probation');
    const allCourses = Object.values(D.courses).flat(); const lmsDone = Math.round(100 * allCourses.filter((c) => c.status === 'done').length / allCourses.length);
    const allTasks = Object.values(D.tasks).flat(); const longT = allTasks.filter((t) => t.kind === 'long'); const avgLong = Math.round(longT.reduce((s, t) => s + t.progress, 0) / longT.length);
    const gradeCount = D.grades.map((g) => team.filter((e) => e.grade === g).length);
    const enps = D.pulse.enps; const eng = D.departments.map((d) => D.pulse.engagement[d.id].slice(-1)[0]);
    setTimeout(() => {
      bars('chart-grades', D.grades, [{ data: gradeCount, backgroundColor: css('--s1') }]);
      line('chart-enps', D.pulse.months, [{ data: enps, borderColor: css('--s1'), backgroundColor: css('--s1'), fill: false }], { min: -20, max: 50 });
      bars('chart-eng', D.departments.map((d) => d.short || d.name), [{ data: eng, backgroundColor: css('--s1') }], { horizontal: true, max: 10 });
    });
    const risks = [
      ...Object.entries(D.onboarding).filter(([, o]) => o.risk !== 'low').map(([id, o]) => ({ who: emp(id), what: `Адаптация: ${o.riskNote}`, cls: 'warn' })),
      ...Object.entries(D.tasks).flatMap(([id, ts]) => ts.filter((t) => t.status === 'overdue').map((t) => ({ who: emp(id), what: `Просрочена задача: ${t.title}`, cls: 'critical' }))),
      ...Object.entries(D.courses).flatMap(([id, cs]) => cs.filter((c) => c.status === 'overdue').map((c) => ({ who: emp(id), what: `Просрочен обязательный курс: ${c.title}`, cls: 'critical' }))),
      { who: emp('e12'), what: 'Вовлечённость отдела падает 4 месяца подряд (8,4 → 7,1)', cls: 'serious' },
    ];
    return { title: 'Дашборд руководителя', crumbs: 'Кабинет руководителя · всё агентство', html: `
      <div class="grid cols-4" style="margin-bottom:16px">
        <div class="card stat"><span class="label">Сотрудников</span><span class="value">${team.length}</span><span class="delta up">+2 за квартал · текучесть 0 %</span></div>
        <div class="card stat"><span class="label">На испытательном сроке</span><span class="value">${newcomers.length}</span><span class="delta ${risks.some((r) => r.what.startsWith('Адаптация')) ? 'down' : 'flat'}">1 с риском</span></div>
        <div class="card stat"><span class="label">1:1 за последние 2 недели</span><span class="value">81<small>%</small></span><span class="delta down">−7 п.п. к сентябрю</span></div>
        <div class="card stat"><span class="label">eNPS (октябрь)</span><span class="value">+${enps.slice(-1)[0]}</span><span class="delta up">+7 к сентябрю · отклик ${D.pulse.responseRate.slice(-1)[0]} %</span></div>
        <div class="card stat"><span class="label">Курсы LMS пройдены</span><span class="value">${lmsDone}<small>%</small></span><span class="delta flat">2 обязательных просрочены</span></div>
        <div class="card stat"><span class="label">Длительные задачи, средний прогресс</span><span class="value">${avgLong}<small>%</small></span><span class="delta flat">${longT.length} задач в работе</span></div>
        <div class="card stat"><span class="label">ИПР актуальны</span><span class="value">9<small>из 14</small></span><span class="delta down">5 без обновления &gt; 60 дней</span></div>
        <div class="card stat"><span class="label">Открытых вакансий</span><span class="value">${D.hiring.length}</span><span class="delta flat">${D.hiring.reduce((s, h) => s + h.candidates.filter((c) => c.stage !== 'rejected').length, 0)} кандидатов в работе</span></div>
      </div>
      <div class="grid cols-3" style="margin-bottom:16px">
        <div class="card"><div class="card-head"><h3>Распределение по грейдам</h3></div><div class="chart h-220"><canvas id="chart-grades"></canvas></div></div>
        <div class="card"><div class="card-head"><h3>eNPS по месяцам</h3>${link('/manager/pulse', 'опросы')}</div><div class="chart h-220"><canvas id="chart-enps"></canvas></div></div>
        <div class="card"><div class="card-head"><h3>Вовлечённость по отделам, октябрь</h3><span class="hint">из 10</span></div><div class="chart h-220"><canvas id="chart-eng"></canvas></div></div>
      </div>
      <div class="grid cols-2">
        <div class="card"><div class="card-head"><h3>Требует внимания</h3><span class="hint">${risks.length}</span></div><ul class="list">${risks.map((r) => `<li>${avatar(r.who, 'sm')}<div class="body"><div style="font-size:14px">${personLink(r.who)} <span class="muted">· ${esc(r.who.role)}</span></div><div class="meta">${chip(r.what, r.cls)}</div></div></li>`).join('')}</ul></div>
        <div class="card"><div class="card-head"><h3>Ближайшие события</h3></div><ul class="list">
          <li><div class="body"><div class="title" style="font-size:14px">13.10 · Финальная встреча по испытательному сроку — Тимур Галиев</div><div class="meta">Контекстная реклама · Сергей Лапин</div></div></li>
          <li><div class="body"><div class="title" style="font-size:14px">15.10 · Старт пульс-опроса за октябрь</div><div class="meta">5 вопросов, 3 минуты, анонимно</div></div></li>
          <li><div class="body"><div class="title" style="font-size:14px">30.10 · 60 дней — промежуточная встреча — Полина Ветрова</div><div class="meta">SEO · Мария Климова</div></div></li>
          <li><div class="body"><div class="title" style="font-size:14px">11.01.2027 · Старт Performance Review Q4 2026</div><div class="meta">самооценка → 360 → оценка руководителя → калибровка → итоги</div></div></li>
        </ul></div>
      </div>` };
  };
  V['/manager/structure'] = () => {
    const head = emp('e01');
    const node = (e) => `<div class="node" onclick="location.hash='/manager/person/${e.id}'">${avatar(e, 'sm')}<div><b>${esc(e.name)}</b><small>${esc(e.role)} · ${esc(e.grade)}</small></div>${e.status === 'probation' ? '<span class="dot" style="background:var(--warn)" title="Испытательный срок"></span>' : ''}</div>`;
    return { title: 'Структура агентства', crumbs: 'Кабинет руководителя', html: `
      <div class="card" style="overflow-x:auto"><div class="org">${node(head)}<div class="v"></div><div class="level">${D.departments.map((d) => { const h = emp(d.head); const subs = subordinates(h.id); return `<div class="dept"><div class="dname">${esc(d.name)} · ${subs.length + 1}</div>${node(h)}${subs.length ? '<div class="v"></div>' : ''}${subs.map(node).join('')}</div>`; }).join('')}</div></div></div>
      <div class="grid cols-3" style="margin-top:16px">
        <div class="card"><div class="card-head"><h3>Роли в системе</h3></div><table><tbody>
          <tr><td>Руководитель агентства</td><td><small>видит всё агентство, дашборды, результаты PR всех отделов</small></td></tr>
          <tr><td>Руководитель отдела</td><td><small>свой отдел: профили, 1:1, оценки, ИПР, онбординг</small></td></tr>
          <tr><td>Сотрудник</td><td><small>свой кабинет; результаты 360 — в агрегированном виде</small></td></tr>
          <tr><td>HR / администратор</td><td><small>настройка циклов, матриц, опросов; без доступа к приватным заметкам</small></td></tr></tbody></table></div>
        <div class="card"><div class="card-head"><h3>Треки и грейды</h3></div><div class="row" style="margin-bottom:8px">${D.grades.map((g) => chip(g, 'grade')).join('')}</div><div class="hint">Пять треков: SEO, контекстная реклама, дизайн, разработка, аккаунтинг. У каждого — своя матрица из 6 компетенций, ожидания расписаны по грейдам. Переход на следующий грейд фиксируется по итогам Performance Review.</div></div>
        <div class="card"><div class="card-head"><h3>Сводка по отделам</h3></div><table><thead><tr><th>Отдел</th><th class="num">Людей</th><th class="num">Новички</th><th class="num">Вовлеч.</th></tr></thead><tbody>${D.departments.map((d) => { const ppl = D.employees.filter((e) => e.dept === d.id); return `<tr><td>${esc(d.name)}</td><td class="num">${ppl.length}</td><td class="num">${ppl.filter((e) => e.status === 'probation').length}</td><td class="num">${D.pulse.engagement[d.id].slice(-1)[0].toFixed(1)}</td></tr>`; }).join('')}</tbody></table></div>
      </div>` };
  };
  V['/manager/team'] = () => {
    const list = D.employees.filter((e) => e.id !== 'e01');
    return { title: 'Сотрудники', crumbs: 'Кабинет руководителя', html: `
      <div class="card"><div class="row between" style="margin-bottom:12px"><div class="row"><select class="btn" id="f-dept"><option value="">Все отделы</option>${D.departments.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select><select class="btn" id="f-status"><option value="">Все статусы</option><option value="probation">Испытательный срок</option><option value="active">В штате</option></select></div><span class="hint" id="f-count"></span></div>
        <table id="team-table"><thead><tr><th>Сотрудник</th><th class="hide-m">Отдел</th><th>Грейд</th><th class="hide-m">В компании</th><th class="hide-m">Последний PR</th><th>Статус</th><th class="hide-m">Зоны роста</th></tr></thead><tbody>${list.map((e) => {
          const comps = D.competencies[e.dept] || []; const weak = comps.filter((c) => (e.skills[c] ?? 5) <= 2); const pr = D.prCycle.results.find((r) => r.id === e.id);
          return `<tr class="clickable" data-dept="${e.dept}" data-status="${e.status}" onclick="location.hash='/manager/person/${e.id}'"><td><div class="row" style="flex-wrap:nowrap">${avatar(e, 'sm')}<div><b>${esc(e.name)}</b><div class="hint">${esc(e.role)}</div></div></div></td><td class="hide-m">${esc(deptName(e.dept))}</td><td>${chip(e.grade, 'grade')}</td><td class="hide-m">${tenure(e.hired)}</td><td class="hide-m">${pr ? `${['', 'ниже ожиданий', 'соответствует', 'выше ожиданий'][pr.performance]}` : '<span class="hint">не оценивался</span>'}</td><td>${e.status === 'probation' ? chip('Испытательный', 'warn') : chip('В штате', 'good')}</td><td class="hide-m">${weak.length ? weak.map((w) => chip(w, 'warn')).join(' ') : '<span class="hint">—</span>'}</td></tr>`;
        }).join('')}</tbody></table></div>`, after: () => {
        const apply = () => { const d = $('#f-dept').value, s = $('#f-status').value; let n = 0; document.querySelectorAll('#team-table tbody tr').forEach((tr) => { const ok = (!d || tr.dataset.dept === d) && (!s || tr.dataset.status === s); tr.style.display = ok ? '' : 'none'; if (ok) n++; }); $('#f-count').textContent = `${n} ${plural(n, ['сотрудник', 'сотрудника', 'сотрудников'])}`; };
        $('#f-dept').onchange = apply; $('#f-status').onchange = apply; apply();
      } };
  };
  V['/manager/person'] = (id) => {
    const e = emp(id); if (!e) return { title: 'Не найдено', html: '<div class="empty">Сотрудник не найден</div>' };
    const tasks = D.tasks[id] || []; const courses = D.courses[id] || []; const rv = D.reviews[id] || []; const onb = D.onboarding[id]; const fb = D.feedbackLog.filter((f) => f.to === id); const oo = D.oneOnOnes[id] || [];
    const tabs = [['overview', 'Обзор'], ['tasks', 'Задачи'], ['reviews', 'Оценки и 360'], ['idp', 'ИПР'], ['learning', 'Обучение'], ['oneonone', '1:1'], ['feedback', 'Обратная связь']];
    const panes = {
      overview: `<div class="grid cols-2"><div class="card"><div class="card-head"><h3>Профиль компетенций</h3></div>${skillsRadarCard(e, 'radar-person', !!e.target)}</div>
        <div class="stack">
          <div class="card"><div class="card-head"><h3>Сильные навыки и зоны роста</h3></div><div class="hint">Сильные (уровень 4–5)</div><div class="row" style="margin:4px 0 8px">${(D.competencies[e.dept] || []).filter((c) => e.skills[c] >= 4).map((c) => chip(c, 'good')).join('') || '<span class="hint">—</span>'}</div><div class="hint">Зоны роста (уровень 1–2)</div><div class="row" style="margin-top:4px">${(D.competencies[e.dept] || []).filter((c) => e.skills[c] <= 2).map((c) => chip(c, 'warn')).join('') || '<span class="hint">—</span>'}</div></div>
          <div class="card"><div class="card-head"><h3>История грейдов</h3></div>${gradeTimeline(e)}</div>
          <div class="card"><div class="card-head"><h3>Достижения</h3></div><ul class="list">${fb.filter((f) => f.kind === 'success').map((f) => `<li><div class="body" style="font-size:14px">${esc(f.text)}<div class="meta">${fmt(f.date)} · ${esc(emp(f.from).name)}</div></div></li>`).join('') || '<li class="empty">Пока нет записей</li>'}</ul></div>
          ${onb ? `<div class="card"><div class="card-head"><h3>Испытательный срок</h3>${chip(onb.risk === 'low' ? 'по плану' : 'есть риск', onb.risk === 'low' ? 'good' : 'warn')}</div><div class="hint">${fmt(onb.start)} — ${fmt(onb.end)} · бадди ${esc(onb.buddy)}</div><ul class="list">${onb.stages.map((s) => `<li>${check(s.done)}<div class="body" style="font-size:13px">${esc(s.name)}<div class="meta">до ${fmtShort(s.due)}</div></div></li>`).join('')}</ul></div>` : ''}
          <div class="private"><div class="lab">Приватная заметка руководителя · видите только вы</div>Обсудить на следующем 1:1 нагрузку: 4 проекта одновременно, сроки по отчётам поплыли. Кандидат на M2 в апреле, если закроет цель по аналитике.</div>
        </div></div>`,
      tasks: `<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>Оперативные (из 1:1)</h3></div>${tasksTable(tasks.filter((t) => t.kind === 'ops'))}</div><div class="card"><div class="card-head"><h3>Длительные (PR, ИПР, проекты)</h3></div>${tasksTable(tasks.filter((t) => t.kind === 'long'))}</div>`,
      reviews: rv.length ? `<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>Performance Review</h3></div><table><thead><tr><th>Период</th><th class="num">Итог</th><th class="num">Сам</th><th class="num">Рук.</th><th class="num">360</th><th>Решение</th><th class="hide-m">Зоны роста</th></tr></thead><tbody>${rv.map((r) => `<tr><td>${esc(r.period)}</td><td class="num"><b>${r.score.toFixed(1)}</b></td><td class="num">${r.selfScore.toFixed(1)}</td><td class="num">${r.managerScore.toFixed(1)}</td><td class="num">${r.peers360.toFixed(1)}</td><td><small>${esc(r.decision)}</small></td><td class="hide-m">${r.growth.map((g) => chip(g, 'warn')).join(' ')}</td></tr>`).join('')}</tbody></table></div>
        ${D.review360[id] ? `<div class="card"><div class="card-head"><h3>Оценка 360 · ${esc(D.review360[id].period)}</h3><span class="hint">${D.review360[id].respondents} респондентов</span></div><table><thead><tr><th>Блок</th><th class="num">Сам</th><th class="num">Рук.</th><th class="num">Коллеги</th><th class="num">Клиенты</th><th>Разрыв</th></tr></thead><tbody>${D.review360[id].blocks.map((b) => { const avg = (b.manager + b.peers + (b.clients ?? b.peers)) / 3; const gap = avg - b.self; return `<tr><td>${esc(b.name)}</td><td class="num">${b.self.toFixed(1)}</td><td class="num">${b.manager.toFixed(1)}</td><td class="num">${b.peers.toFixed(1)}</td><td class="num">${b.clients ? b.clients.toFixed(1) : '—'}</td><td>${chip(gap > 0.3 ? 'недооценивает себя' : gap < -0.3 ? 'переоценивает себя' : 'совпадает', gap > 0.3 ? 'accent' : gap < -0.3 ? 'warn' : 'good')}</td></tr>`; }).join('')}</tbody></table></div>` : ''}`
        : '<div class="card"><div class="empty">Сотрудник ещё не проходил Performance Review. Для новичков первая оценка — по итогам испытательного срока.</div></div>',
      idp: `<div class="card">${idpBlock(e)}</div>`,
      learning: `<div class="card">${coursesTable(courses)}</div>`,
      oneonone: `<div class="card"><div class="card-head"><h3>Встречи 1:1</h3><button class="btn primary sm">Запланировать встречу</button></div>${oo.length ? `<ul class="list">${oo.map((m) => `<li><div class="body"><b>${fmt(m.date)}</b><div class="hint">${m.agenda.map(esc).join(' · ')}</div><div style="font-size:14px;margin-top:4px">${esc(m.notes)}</div></div></li>`).join('')}</ul>` : '<div class="empty">Протоколов 1:1 в демо-данных нет. Регулярность: раз в неделю для новичков, раз в две недели для опытных.</div>'}</div>`,
      feedback: `<div class="card"><div class="card-head"><h3>Обратная связь</h3><button class="btn primary sm">Дать обратную связь</button></div><ul class="list">${fb.map((f) => `<li>${avatar(emp(f.from), 'sm')}<div class="body"><div class="row">${chip(f.kind === 'success' ? 'Успех' : 'Зона роста', f.kind === 'success' ? 'good' : 'warn')}<span class="hint">${fmt(f.date)} · ${esc(emp(f.from).name)}</span></div><div style="font-size:14px;margin-top:4px">${esc(f.text)}</div></div></li>`).join('') || '<li class="empty">Записей нет</li>'}</ul></div>`,
    };
    return { title: e.name, crumbs: `Кабинет руководителя · ${link('/manager/team', 'Сотрудники')}`, html: `${profileHeader(e, true)}<div class="tabs" style="margin-top:16px" id="ptabs">${tabs.map(([k, t], i) => `<button data-tab="${k}" class="${i ? '' : 'active'}">${t}</button>`).join('')}</div><div id="ppane">${panes.overview}</div>`,
      after: () => { document.querySelectorAll('#ptabs button').forEach((b) => { b.onclick = () => { document.querySelectorAll('#ptabs button').forEach((x) => x.classList.remove('active')); b.classList.add('active'); destroyCharts(); $('#ppane').innerHTML = panes[b.dataset.tab]; }; }); } };
  };
  V['/manager/reviews'] = () => {
    const boxes = {}; D.prCycle.results.forEach((r) => { (boxes[`${r.performance}-${r.potential}`] ||= []).push(emp(r.id)); });
    const labels = { '3-3': 'Звёзды', '2-3': 'Высокий потенциал', '1-3': 'Загадка', '3-2': 'Опора команды', '2-2': 'Ядро', '1-2': 'Нужна поддержка', '3-1': 'Эксперт', '2-1': 'Стабильный', '1-1': 'Риск' };
    const cell = (p, q) => { const k = `${p}-${q}`; const cls = (p + q >= 5) ? 'hi' : (p + q <= 3) ? 'lo' : ''; return `<div class="cell ${cls}"><span class="lab">${labels[k]}</span>${(boxes[k] || []).map((e) => `<span class="person" onclick="location.hash='/manager/person/${e.id}'">${avatar(e, 'sm')}${esc(e.name.split(' ')[0])}</span>`).join('')}</div>`; };
    return { title: 'Performance Review', crumbs: 'Кабинет руководителя', html: `
      <div class="grid cols-4" style="margin-bottom:16px">
        <div class="card stat"><span class="label">Цикл</span><span class="value" style="font-size:20px">${esc(D.prCycle.period)}</span><span class="hint">завершён 10.07.2026</span></div>
        <div class="card stat"><span class="label">Оценено</span><span class="value">${D.prCycle.results.length}<small>из 11</small></span><span class="hint">руководители отделов оцениваются директором</span></div>
        <div class="card stat"><span class="label">Повышений</span><span class="value">3</span><span class="hint">Q1 2026: Анна С., Ольга Д., Алина М.</span></div>
        <div class="card stat"><span class="label">Следующий цикл</span><span class="value" style="font-size:20px">Q4 2026</span><span class="hint">старт 11.01.2027</span></div>
      </div>
      <div class="grid cols-2">
        <div class="card"><div class="card-head"><h3>9-box: результативность × потенциал</h3><span class="hint">нажмите на человека</span></div>
          <div class="ninebox">
            <div class="ax">высокий потенциал</div>${cell(1, 3)}${cell(2, 3)}${cell(3, 3)}
            <div class="ax">средний</div>${cell(1, 2)}${cell(2, 2)}${cell(3, 2)}
            <div class="ax">низкий</div>${cell(1, 1)}${cell(2, 1)}${cell(3, 1)}
            <div></div><div class="ax">ниже ожиданий</div><div class="ax">соответствует</div><div class="ax">выше ожиданий</div>
          </div>
          <div class="hint" style="margin-top:10px">Критерии результативности и потенциала фиксируются до оценки; после 9-box каждому — план развития, а не ярлык. Сетка калибруется на встрече руководителей отделов.</div></div>
        <div class="card"><div class="card-head"><h3>Как устроен цикл</h3></div>
          <ol class="list" style="counter-reset:n">${['Самооценка сотрудника по матрице компетенций и целям (1 неделя)', 'Оценка 360: 3–6 коллег и клиентские менеджеры, анонимно (1 неделя)', 'Оценка руководителя и встреча 1:1 с разбором (1 неделя)', 'Калибровка между руководителями отделов: единая шкала, сверка 9-box', 'Итоги: решение по грейду, зоны роста → ИПР на полгода', 'Прогресс-ревью через 3 месяца на 1:1 (без переоценки)'].map((s, i) => `<li><span class="avatar sm" style="background:var(--accent)">${i + 1}</span><div class="body" style="font-size:14px">${esc(s)}</div></li>`).join('')}</ol>
          <div class="card-head" style="margin-top:14px"><h3>История обратной связи по циклу</h3></div>
          <table><thead><tr><th>Сотрудник</th><th class="num">Итог</th><th>Решение</th></tr></thead><tbody>${Object.entries(D.reviews).flatMap(([id, rs]) => rs.filter((r) => r.period === D.prCycle.period).map((r) => `<tr class="clickable" onclick="location.hash='/manager/person/${id}'"><td>${esc(emp(id).name)}</td><td class="num"><b>${r.score.toFixed(1)}</b></td><td><small>${esc(r.decision)}</small></td></tr>`)).join('')}<tr><td colspan="3" class="hint">Остальные результаты в демо-данных не заполнены</td></tr></tbody></table></div>
      </div>` };
  };
  V['/manager/onboarding'] = () => {
    const allCourses = Object.entries(D.courses).flatMap(([id, cs]) => cs.map((c) => ({ ...c, id })));
    const mandatory = allCourses.filter((c) => c.type === 'обязательный');
    return { title: 'Адаптация и обучение', crumbs: 'Кабинет руководителя', html: `
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Новички на испытательном сроке</h2><span class="hint">чекпоинты 30 / 60 / 90 дней</span></div>
        <div class="grid cols-3">${Object.entries(D.onboarding).map(([id, o]) => { const e = emp(id); const done = o.stages.filter((s) => s.done).length; const pct = Math.round(100 * done / o.stages.length); const dayN = daysBetween(o.start, TODAY); const total = daysBetween(o.start, o.end);
          return `<div class="card flat"><div class="row" style="flex-wrap:nowrap">${avatar(e)}<div style="flex:1"><b>${personLink(e)}</b><div class="hint">${esc(e.role)} · бадди ${esc(o.buddy)}</div></div>${chip(o.risk === 'low' ? 'по плану' : 'риск', o.risk === 'low' ? 'good' : 'warn')}</div>
            <div class="progress-row" style="margin:10px 0 4px"><div class="hint">День ${dayN} из ${total}</div>${bar(Math.round(100 * dayN / total), 'good')}<div class="num">${Math.round(100 * dayN / total)}%</div></div>
            <div class="progress-row" style="margin-bottom:8px"><div class="hint">Чекпоинты ${done} из ${o.stages.length}</div>${bar(pct, pct < Math.round(100 * dayN / total) - 15 ? 'warn' : '')}<div class="num">${pct}%</div></div>
            <ul class="list">${o.stages.map((s) => `<li>${check(s.done)}<div class="body" style="font-size:13px">${esc(s.name)}<div class="meta">до ${fmtShort(s.due)}${!s.done && new Date(s.due) < TODAY ? ' · ' + chip('просрочен', 'critical') : ''}</div></div></li>`).join('')}</ul>
            <div class="hint" style="margin-top:8px">${esc(o.riskNote)}</div></div>`; }).join('')}</div></div>
      <div class="grid cols-2">
        <div class="card"><div class="card-head"><h3>Обязательные курсы по сотрудникам</h3></div><table><thead><tr><th>Сотрудник</th><th>Курс</th><th>Прогресс</th><th>Статус</th></tr></thead><tbody>${mandatory.filter((c) => c.status !== 'done').map((c) => `<tr><td>${personLink(emp(c.id))}</td><td><small>${esc(c.title)}</small></td><td>${bar(c.progress, c.status === 'overdue' ? 'critical' : '')}</td><td>${chip(courseStatus[c.status][0], courseStatus[c.status][1])}</td></tr>`).join('')}</tbody></table></div>
        <div class="card"><div class="card-head"><h3>Развивающие курсы</h3></div><table><thead><tr><th>Сотрудник</th><th>Курс</th><th>Прогресс</th><th>Статус</th></tr></thead><tbody>${allCourses.filter((c) => c.type !== 'обязательный').map((c) => `<tr><td>${personLink(emp(c.id))}</td><td><small>${esc(c.title)}</small></td><td>${bar(c.progress, c.status === 'done' ? 'good' : '')}</td><td>${chip(courseStatus[c.status][0], courseStatus[c.status][1])}</td></tr>`).join('')}</tbody></table>
          <div class="hint" style="margin-top:10px">Источник — LMS по API: назначения, прогресс, баллы тестов. Курсы из ИПР назначаются автоматически при утверждении цели.</div></div>
      </div>` };
  };
  V['/manager/pulse'] = () => {
    const P = D.pulse; const steps = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95'];
    const color = (v) => { const i = Math.min(5, Math.max(0, Math.round((v - 6.5) / 0.4))); return steps[i]; };
    const txt = (v) => (v >= 7.9 ? '#fff' : 'var(--text)');
    setTimeout(() => {
      line('chart-enps2', P.months, [{ data: P.enps, borderColor: css('--s1'), backgroundColor: css('--s1'), fill: false }], { min: -20, max: 50 });
      line('chart-rr', P.months, [{ data: P.responseRate, borderColor: css('--s1'), backgroundColor: css('--s1'), fill: false }], { min: 0, max: 100 });
      bars('chart-q', P.questions.map((q) => q.short), [{ data: P.questions.map((q) => q.avg), backgroundColor: css('--s1') }], { horizontal: true, max: 10 });
    });
    return { title: 'Пульс-опросы', crumbs: 'Кабинет руководителя', html: `
      <div class="grid cols-4" style="margin-bottom:16px">
        <div class="card stat"><span class="label">eNPS, октябрь</span><span class="value">+${P.enps.slice(-1)[0]}</span><span class="delta up">+7 к сентябрю</span></div>
        <div class="card stat"><span class="label">Вовлечённость, среднее</span><span class="value">${(D.departments.reduce((s, d) => s + P.engagement[d.id].slice(-1)[0], 0) / 5).toFixed(1)}<small>из 10</small></span><span class="delta flat">без изменений</span></div>
        <div class="card stat"><span class="label">Отклик</span><span class="value">${P.responseRate.slice(-1)[0]}<small>%</small></span><span class="delta down">−6 п.п.</span></div>
        <div class="card stat"><span class="label">Следующий опрос</span><span class="value" style="font-size:20px">15.10</span><span class="hint">5 вопросов · 3 минуты</span></div>
      </div>
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h3>Тепловая карта вовлечённости по отделам</h3><span class="hint">из 10 · группы меньше 5 человек показаны только в сумме с соседним отделом</span></div>
        <div class="heat" style="grid-template-columns:160px repeat(${P.months.length},1fr)"><div></div>${P.months.map((m) => `<div class="collab">${m}</div>`).join('')}${D.departments.map((d) => `<div class="rowlab">${esc(d.name)}</div>${P.engagement[d.id].map((v) => `<div class="cell" style="background:${color(v)};color:${txt(v)}" title="${esc(d.name)}, ${v}">${v.toFixed(1)}</div>`).join('')}`).join('')}</div>
        <div class="legend" style="margin-top:10px"><span><i class="dot" style="background:${steps[0]}"></i>6,5 и ниже</span><span><i class="dot" style="background:${steps[5]}"></i>8,5 и выше</span></div></div>
      <div class="grid cols-3">
        <div class="card"><div class="card-head"><h3>eNPS</h3></div><div class="chart h-220"><canvas id="chart-enps2"></canvas></div><div class="hint">Ориентиры: до +20 норма, +21…+40 хорошо, выше +40 отлично</div></div>
        <div class="card"><div class="card-head"><h3>Отклик, %</h3></div><div class="chart h-220"><canvas id="chart-rr"></canvas></div><div class="hint">Падает, когда по итогам опроса ничего не меняется</div></div>
        <div class="card"><div class="card-head"><h3>Вопросы октября, среднее</h3></div><div class="chart h-220"><canvas id="chart-q"></canvas></div></div>
      </div>
      <div class="card" style="margin-top:16px"><div class="card-head"><h3>Что сделали по итогам прошлого опроса</h3><span class="hint">закрытие петли — видят все сотрудники</span></div><ul class="list"><li>${check(true)}<div class="body" style="font-size:14px">Нагрузка в SEO: перераспределили 2 проекта, наняли ещё одного специалиста (вакансия открыта 15.09)</div></li><li>${check(true)}<div class="body" style="font-size:14px">«Не хватает инструментов»: оплатили командные лицензии на аналитику</div></li><li>${check(false)}<div class="body" style="font-size:14px">«Не вижу, как расти»: опубликовать матрицы компетенций по всем трекам — в работе</div></li></ul></div>` };
  };
  V['/manager/feedback'] = () => ({ title: 'Обратная связь по сотрудникам', crumbs: 'Кабинет руководителя', html: `
      <div class="grid cols-2">
        <div class="card"><div class="card-head"><h3>Успехи</h3><span class="hint">последние 30 дней</span></div><ul class="list">${D.feedbackLog.filter((f) => f.kind === 'success').map((f) => `<li>${avatar(emp(f.to), 'sm')}<div class="body"><div style="font-size:14px"><b>${personLink(emp(f.to))}</b> <span class="hint">· от ${esc(emp(f.from).name)} · ${fmt(f.date)}</span></div><div style="font-size:14px;margin-top:2px">${esc(f.text)}</div></div></li>`).join('')}</ul></div>
        <div class="card"><div class="card-head"><h3>Зоны роста</h3><span class="hint">последние 30 дней</span></div><ul class="list">${D.feedbackLog.filter((f) => f.kind === 'growth').map((f) => `<li>${avatar(emp(f.to), 'sm')}<div class="body"><div style="font-size:14px"><b>${personLink(emp(f.to))}</b> <span class="hint">· от ${esc(emp(f.from).name)} · ${fmt(f.date)}</span></div><div style="font-size:14px;margin-top:2px">${esc(f.text)}</div></div></li>`).join('')}</ul></div>
      </div>
      <div class="card" style="margin-top:16px"><div class="card-head"><h3>Источники обратной связи</h3></div><div class="grid cols-4">
        ${[['Записи встреч и транскрипты', 'Видео 1:1 и клиентских встреч расшифровываются; из транскрипта извлекаются договорённости и задачи — в протокол 1:1 после подтверждения руководителем'], ['Анкеты обратной связи', 'Анкеты коллег и клиентов по шаблону; ответы попадают в профиль сотрудника как «успех» или «зона роста»'], ['Оценка 360', 'Раз в полгода в цикле Performance Review; в профиле — в агрегированном виде'], ['Пульс-опросы', 'Ежемесячно, анонимно; в профиль сотрудника не попадают, только в разрез отдела']].map(([t, d]) => `<div class="card flat"><h3 style="font-size:14px">${t}</h3><div class="hint" style="margin-top:4px">${d}</div></div>`).join('')}
      </div></div>` });
  V['/manager/hiring'] = () => ({ title: 'Найм', crumbs: 'Кабинет руководителя', html: `
      ${D.hiring.map((h) => `<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>${esc(h.position)}</h3><span class="hint">${esc(deptName(h.dept))} · открыта ${fmt(h.opened)} · ${h.candidates.filter((c) => c.stage !== 'rejected').length} в работе</span></div>
        <div class="kanban">${D.hiringStages.map((s) => `<div class="col"><h4>${esc(s.name)}</h4>${h.candidates.filter((c) => c.stage === s.id).map((c) => `<div class="cand">${esc(c.name)}<small>на этапе с ${fmtShort(c.since)}</small></div>`).join('') || '<div class="hint">—</div>'}</div>`).join('')}</div></div>`).join('')}
      <div class="card"><div class="card-head"><h3>Что фиксируется на каждом этапе</h3></div><div class="steps">
        <div class="step"><div class="n">1</div><b>Собеседование</b><ul><li>Оценка по чек-листу роли (матрица компетенций, уровни 1–5)</li><li>Запись и транскрипт встречи</li><li>Решение: тестовое / отказ</li></ul></div>
        <div class="step"><div class="n">2</div><b>Тестовое задание</b><ul><li>Шаблон задания по треку, срок, критерии</li><li>Оценка 2 экспертами независимо</li><li>Результат виден кандидату в обезличенном виде</li></ul></div>
        <div class="step"><div class="n">3</div><b>Финальное собеседование</b><ul><li>Руководитель отдела + директор</li><li>Грейд и условия оффера</li><li>Профиль переносится в кабинет сотрудника при выходе</li></ul></div>
      </div><div class="hint" style="margin-top:10px">Источник кандидатов — ATS (Хантфлоу, Talantix) по API; в системе — только оценки и решения, чтобы профиль с первого дня был связан с матрицей компетенций.</div></div>` });
  V['/manager/processes'] = () => ({ title: 'Карта HR-процессов', crumbs: 'Кабинет руководителя', html: `
      <div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Три блока процессов</h2><span class="hint">одинаковы для всех отделов, отличаются только матрицы компетенций</span></div><div class="steps">
        <div class="step"><div class="n">1</div><b>Приём на работу</b><ul><li>Собеседование</li><li>Тестовое задание</li><li>Финальное собеседование</li><li>Оффер и грейд на входе</li></ul><div class="hint" style="margin-top:8px">Артефакты: оценка по чек-листу, транскрипты, тестовое</div></div>
        <div class="step"><div class="n">2</div><b>Онбординг (испытательный срок)</b><ul><li>Установочная встреча, бадди</li><li>Еженедельные 1:1 с руководителем</li><li>Чекпоинты 30 / 60 дней по задачам адаптации</li><li>Обязательные курсы LMS</li><li>Финальная встреча по итогам</li></ul><div class="hint" style="margin-top:8px">Артефакты: план адаптации, протоколы 1:1, прогресс LMS</div></div>
        <div class="step"><div class="n">3</div><b>После испытательного срока</b><ul><li>1:1 раз в 1–2 недели</li><li>Оценка 360 и по матрице компетенций — раз в полгода</li><li>Performance Review с калибровкой</li><li>ИПР на полгода с ежемесячным чекином</li><li>Анкеты обратной связи от коллег и клиентов</li><li>Пульс-опрос раз в месяц</li></ul><div class="hint" style="margin-top:8px">Артефакты: самооценка, 360, решение по грейду, ИПР</div></div>
      </div></div>
      <div class="grid cols-2">
        <div class="card"><div class="card-head"><h3>Календарь цикла (год)</h3></div><table><thead><tr><th>Когда</th><th>Что</th><th class="hide-m">Кто</th></tr></thead><tbody>
          ${[['Каждую неделю', 'Чек-ин сотрудника: приоритеты, блокеры (2 минуты)', 'сотрудник'], ['Раз в 1–2 недели', '1:1 с руководителем, action items в задачи', 'руководитель'], ['Каждый месяц', 'Пульс-опрос; чекин по ИПР на 1:1', 'все'], ['Январь, июль', 'Performance Review: самооценка → 360 → руководитель → калибровка → итоги', 'все'], ['Апрель, октябрь', 'Прогресс-ревью ИПР (без оценки)', 'руководитель'], ['По факту', 'Онбординг: 30 / 60 / 90 дней', 'руководитель, бадди']].map(([a, b, c]) => `<tr><td style="white-space:nowrap">${a}</td><td>${b}</td><td class="hide-m"><small>${c}</small></td></tr>`).join('')}
        </tbody></table></div>
        <div class="card"><div class="card-head"><h3>Откуда берутся данные</h3></div><table><thead><tr><th>Блок кабинета</th><th>Источник</th></tr></thead><tbody>
          ${[['Личные данные, грейд, структура', 'Справочник сотрудников системы (или 1С ЗУП / Битрикс24 по API)'], ['Задачи оперативные', 'Протоколы 1:1 (action items) → трекер задач'], ['Задачи длительные', 'Performance Review, ИПР, проектный трекер'], ['Курсы LMS', 'LMS по API: iSpring Learn, Unicraft, своя'], ['Оценки 360, матрица', 'Модуль опросов системы; шаблоны матриц — по трекам'], ['Пульс-опросы', 'Модуль опросов; анонимно, порог группы ≥ 5'], ['Записи встреч', 'Видео + транскрипт → извлечение договорённостей (после подтверждения)'], ['Обратная связь', 'Анкеты коллег и клиентов → журнал в профиле']].map(([a, b]) => `<tr><td>${a}</td><td><small>${b}</small></td></tr>`).join('')}
        </tbody></table></div>
      </div>` });

  V['/about'] = () => ({ title: 'О прототипе: вопросы и предложения', crumbs: 'Каркас для обсуждения ТЗ', html: $('#about-content').innerHTML });

  // ---------- router ----------
  function route() {
    const hash = location.hash.replace(/^#/, '') || '/employee/profile';
    const role = hash.startsWith('/manager') ? 'manager' : hash.startsWith('/employee') ? 'employee' : (localStorage.getItem('hr-role') || 'employee');
    try { localStorage.setItem('hr-role', role); } catch (e) { /* ignore */ }
    const parts = hash.split('/'); let view, arg;
    if (parts[1] === 'manager' && parts[2] === 'person') { view = V['/manager/person']; arg = parts[3]; } else { view = V[hash] || V['/employee/profile']; }
    destroyCharts(); chartDefaults();
    const r = view(arg);
    $('#page-title').textContent = r.title; $('#crumbs').innerHTML = r.crumbs || ''; $('#content').innerHTML = r.html;
    if (r.after) r.after();
    renderNav(role, hash); document.title = `${r.title} · Кабинет HR`;
    $('#sidebar').classList.remove('open'); window.scrollTo(0, 0);
  }
  function renderNav(role, hash) {
    document.querySelectorAll('.role-switch button').forEach((b) => b.classList.toggle('active', b.dataset.role === role));
    $('#nav').innerHTML = NAV[role].map((n) => n.g ? `<div class="group">${n.g}</div>` : `<a href="#${n.h}" class="${hash === n.h || (n.h.includes('/manager/team') && hash.startsWith('/manager/person')) ? 'active' : ''}">${n.i}<span>${n.t}</span>${n.badge && n.badge() ? `<span class="badge">${n.badge()}</span>` : ''}</a>`).join('');
    const me = role === 'employee' ? emp(CURRENT_EMPLOYEE) : emp(CURRENT_MANAGER);
    $('#me').innerHTML = `${avatar(me)}<div style="min-width:0"><b style="font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(me.name)}</b><small style="font-size:12px">${esc(me.role)}</small></div>`;
  }
  document.querySelectorAll('.role-switch button').forEach((b) => { b.onclick = () => { location.hash = b.dataset.role === 'manager' ? '/manager/dashboard' : '/employee/profile'; }; });
  $('#menu-btn').onclick = () => $('#sidebar').classList.toggle('open');
  $('#theme-btn').onclick = () => { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); document.documentElement.dataset.theme = cur === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('hr-theme', document.documentElement.dataset.theme); } catch (e) { /* ignore */ } route(); };
  try { const q = new URLSearchParams(location.search).get('theme'); const t = q || localStorage.getItem('hr-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* ignore */ }
  window.addEventListener('hashchange', route);
  route();
})();
