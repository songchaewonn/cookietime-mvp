/* Follow-up behavior requested for the November 15–16 UI review. */
(function () {
  'use strict';

  let editingSettings = false;
  state.notifications = Array.isArray(state.notifications) ? state.notifications : [];

  function updateNotificationBadge() {
    const button = document.querySelector('#settings-shortcut');
    if (button) button.classList.toggle('has-unread', state.notifications.some(item => !item.read));
  }

  function addNotification(title, type = 'reminder') {
    state.notifications.unshift({ id: `${Date.now()}-${Math.random()}`, title, type, at: Date.now(), read: false });
    state.notifications = state.notifications.slice(0, 100);
    save();
    updateNotificationBadge();
  }

  const originalToast = showToast;
  showToast = function (message, ...args) {
    if (/분 뒤 시작해요|마감이에요/.test(String(message))) addNotification(String(message), 'reminder');
    return originalToast.call(this, message, ...args);
  };

  const originalVibrateStage = vibrateStage;
  vibrateStage = function (stage) {
    if (state.settings.vibration && stage > 0) addNotification(`앱 이탈 ${stage}단계 진동 알림`, 'vibration');
    return originalVibrateStage.call(this, stage);
  };

  classEndPoll = function () {};

  openAppsModal = function () {
    const root = document.querySelector('#modal-root');
    const defaults = ['Instagram', 'YouTube', 'TikTok', 'X', 'Netflix'];
    let apps = defaults.map(label => ({ label, value: label }));
    try {
      const raw = window.NativeMvp?.installedAppsJson?.();
      const installed = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
      if (installed.length) apps = installed.map(app => ({
        label: app.label || app.name || app.packageName || app.value,
        value: app.packageName || app.value || app.label || app.name
      })).filter(app => app.label && app.value).sort((a, b) => a.label.localeCompare(b.label, 'ko'));
    } catch (error) { console.warn('Installed app list is not available:', error); }
    const selected = new Set(state.blocked);
    const body = `<p class="page-subtitle">권한이 허용되면 기기에 설치된 앱 전체에서 선택할 수 있어요.</p><div style="margin-top:13px;max-height:45vh;overflow:auto">${apps.map(app => `<div class="app-chip"><label><input type="checkbox" name="blocked" value="${esc(app.value)}" ${selected.has(app.value) ? 'checked' : ''}/>${esc(app.label)}</label><span class="eyebrow">앱</span></div>`).join('')}</div><div class="notice">앱 사용 기록 권한을 허용하면 Android에서 설치 앱 목록을 불러옵니다.</div><button class="button full" id="save-apps">선택 저장</button>`;
    root.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><div class="modal-top"><h2>집중 방해 앱 선택</h2><button class="close" data-close aria-label="닫기">×</button></div>${body}</section></div>`;
    root.querySelector('[data-close]').onclick = () => { root.innerHTML = ''; };
    root.querySelector('#save-apps').onclick = () => {
      state.blocked = [...root.querySelectorAll('[name=blocked]:checked')].map(input => input.value);
      save(); root.innerHTML = ''; render(); showToast('집중 방해 앱을 저장했어요');
    };
  };

  function cookieEarnedOn(date) {
    const legacyReward = (state.cookieRewards?.history || []).some(entry => {
      const at = Number(entry.at);
      return Number.isFinite(at) && at > 0 && dayKey(new Date(at)) === date && Number(entry.cookies || entry.count || 1) > 0;
    });
    if (legacyReward) return true;

    // A tower cookie is awarded at each uninterrupted focus-hour boundary.
    const sessions = [...(state.focusSessions || [])];
    if (state.focus?.active && !state.focus.deviation && state.focus.sessionStartedAt) {
      sessions.push({ start: state.focus.sessionStartedAt, seconds: state.focus.sessionSeconds || 0 });
    }
    return sessions.some(session => {
      const start = Number(session.start), seconds = Number(session.seconds) || 0;
      if (!Number.isFinite(start) || seconds < 3600) return false;
      for (let hour = 1; hour <= Math.floor(seconds / 3600); hour++) {
        if (dayKey(new Date(start + hour * 3600000)) === date) return true;
      }
      return false;
    });
  }

  dayQualifies = function (record) {
    if (!record) return false;
    const criterion = state.settings.streakCriterion || 'any';
    const onTime = !!record.onTimeStart;
    const hasActivity = onTime || !!record.taskCompletions;
    const deviationOk = deviationSecondsFor(record.date) <= Number(state.settings.dailyDeviationGoalMinutes ?? 60) * 60;
    const hasCookie = cookieEarnedOn(record.date);
    if (criterion === 'onTime') return onTime;
    if (criterion === 'deviation') return hasActivity && deviationOk;
    if (criterion === 'cookie') return hasCookie;
    return onTime || (hasActivity && deviationOk) || hasCookie;
  };

  schedulePage = function () {
    const shift = new Date(today);
    shift.setDate(today.getDate() + weekOffset * 7);
    const weekStart = new Date(shift);
    weekStart.setDate(shift.getDate() - shift.getDay());
    const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
    const dayDate = days[selectedDay];
    const classes = state.classes.filter(item => item.day === selectedDay).sort((a, b) => a.start.localeCompare(b.start));
    const minGap = Number(state.settings.gapMinutes ?? 30);
    const dayIsToday = dayKey(dayDate) === dayKey();

    function timeOnDay(text) {
      const date = new Date(dayDate);
      date.setHours(Number(text.slice(0, 2)), Number(text.slice(3, 5)), 0, 0);
      return date;
    }

    function intervalMarkup(from, to, kind) {
      const span = (timeOnDay(to) - timeOnDay(from)) / 60000;
      if (span < 10) return '';
      const startAt = timeOnDay(from), endAt = timeOnDay(to);
      const now = dayIsToday ? Date.now() : startAt.getTime();
      const effectiveStart = new Date(Math.max(startAt.getTime(), now));
      const remaining = Math.floor((endAt.getTime() - effectiveStart.getTime()) / 60000);
      const length = span >= 60 ? `${Math.floor(span / 60)}시간${span % 60 ? ` ${span % 60}분` : ''}` : `${span}분`;
      const title = kind === 'after' ? '수업 후 시간' : span >= minGap ? '공강' : '짧은 틈새';
      const past = dayIsToday && remaining < 10;
      const slot = `<div class="free-slot"><span>☕ ${title}</span><span>${from} — ${to}${past ? ' · 지난 시간' : ` · ${length}`}</span></div>`;
      if (past) return slot;

      const size = remaining < 30 ? 'short' : remaining < 60 ? 'medium' : 'long';
      const labels = { short: '짧게 복습·암기', medium: '과제 한 단계 진행', long: '과제 집중과 휴식' };
      const task = nextSuggestedTask();
      const suggestion = getMajorGapSuggestion(state.settings.major, size, dayKey(dayDate));
      const startValue = localDate(effectiveStart);
      const endValue = localDate(endAt);
      const accepted = state.tasks.some(item => !item.done && item.start === startValue && (item.id === task?.id || item.memo === '시간표 공강 추천으로 추가됨'));
      const copy = task
        ? `${esc(task.title)}을(를) ${Math.min(remaining, Math.max(15, (task.hours || 1) * 30))}분 진행해보세요.`
        : `${suggestion.title} · ${suggestion.detail}`;
      const basis = task ? '마감이 가까운 할 일을 먼저 추천해요.' : state.settings.major
        ? `${esc(state.settings.major)} 전공 분야별 추천 예시예요. 저장된 학생 데이터는 사용하지 않아요.`
        : 'MY에서 전공을 입력하면 전공 분야별 추천을 보여드려요.';
      return `${slot}<section class="recommend-card"><div class="recommend-heading"><span class="recommend-icon">✦</span><strong>${kind === 'after' ? '수업 후 추천' : labels[size]}</strong></div><p>${copy}${size === 'long' ? ' 중간에 짧게 쉬어가세요.' : ''}</p><small class="eyebrow">${basis}</small><button class="button secondary" data-gap-start="${startValue}" data-gap-end="${endValue}" data-gap-task="${task?.id || ''}" data-gap-size="${size}" ${accepted ? 'disabled' : ''}>${accepted ? '시작 예약됨' : '이 시간에 시작 예약'}</button></section>`;
    }

    let rows = '';
    for (let i = 0; i < classes.length; i++) {
      const item = classes[i];
      if (i > 0) rows += intervalMarkup(classes[i - 1].end, item.start, 'gap');
      rows += `<div class="schedule-row"><div class="schedule-time">${item.start}</div><div class="schedule-block ${i % 3 === 1 ? 'green' : i % 3 === 2 ? 'blue' : ''}"><strong>${esc(item.title)}</strong><small>${item.start} — ${item.end}&nbsp;${esc(item.room || '강의실 미정')}</small><div class="class-actions"><button class="text-link" data-edit-class="${item.id}">수정</button><button class="text-link" data-delete-class="${item.id}">삭제</button></div></div></div>`;
    }
    if (classes.length && classes.at(-1).end < '23:00') rows += intervalMarkup(classes.at(-1).end, '23:00', 'after');

    return `<div class="page-heading"><div><div class="eyebrow">나의 한 주</div><h1 class="page-title">시간표</h1></div><button class="button" data-modal="class">＋ 수업 추가</button></div><div class="week-switch"><button data-week="-1">‹</button><span>${days[0].getMonth() + 1}월 ${days[0].getDate()}일 — ${days[6].getMonth() + 1}월 ${days[6].getDate()}일</span><button data-week="1">›</button></div><div class="day-strip">${days.map((date, i) => `<button class="day-chip ${selectedDay === i ? 'selected' : ''}" data-day="${i}">${weekdays[i]}<b>${date.getDate()}</b></button>`).join('')}</div><div class="section-head" style="margin-top:2px"><h3>${dayLabel(selectedDay)} 일정</h3><span class="eyebrow">${classes.length}개 수업</span></div>${classes.length ? `<div class="schedule-list">${rows}</div>` : '<div class="card week-empty">아직 등록된 수업이 없어요.<br/>수업을 추가하면 수업 사이 시간을 함께 보여드릴게요.</div>'}<div class="notice">첫 수업 전 시간은 공강으로 표시하지 않아요. 마지막 수업 이후는 ‘수업 후 시간’으로 구분해요.</div>`;
  };

  function timeLabel(at) {
    return Number.isFinite(Number(at)) ? new Date(Number(at)).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '시간 정보 없음';
  }

  function openRecentActivity() {
    const root = document.querySelector('#modal-root');
    const alerts = (state.notifications || []).map(item => ({ at: item.at, kind: item.type === 'vibration' ? '진동 알림' : '알림', text: item.title }));
    const deviations = (state.logs || []).map(item => ({ at: item.end || item.start, kind: '앱 이탈', text: `${item.app || '앱'} · ${Math.floor(Number(item.duration || 0) / 60)}분` }));
    const focus = (state.focusSessions || []).map(item => ({ at: item.end || item.start, kind: '집중 기록', text: `${Math.floor(Number(item.seconds || 0) / 60)}분 집중` }));
    const entries = [...alerts, ...deviations, ...focus].filter(item => Number.isFinite(Number(item.at))).sort((a, b) => b.at - a.at).slice(0, 40);
    state.notifications = (state.notifications || []).map(item => ({ ...item, read: true }));
    save(); updateNotificationBadge();
    root.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><div class="modal-top"><h2>최근 집중·이탈 기록</h2><button class="close" data-close aria-label="닫기">×</button></div><p class="page-subtitle">앱 이탈, 집중 세션, 진동 알림을 최근 순으로 모았어요.</p><div class="notification-history">${entries.length ? entries.map(item => `<article class="notification-history-item"><strong>${esc(item.kind)} · ${esc(item.text)}</strong><small>${timeLabel(item.at)}</small></article>`).join('') : '<div class="card empty">아직 표시할 기록이 없어요.</div>'}</div></section></div>`;
    root.querySelector('[data-close]').onclick = () => { root.innerHTML = ''; };
  }

  const originalRender = render;
  render = function (...args) {
    const result = originalRender.apply(this, args);
    updateNotificationBadge();
    if (page === 'settings' && state.settings.onboardingDone) {
      const root = document.querySelector('#app');
      const children = [...root.children];
      const header = children.slice(0, 3);
      const rest = children.slice(3);
      const legacySettings = rest.find(node => node.classList?.contains('card') && node.textContent.includes('스트릭 기준'));
      legacySettings?.querySelectorAll('label').forEach(label => { if (label.textContent.includes('수업 종료 알림')) label.remove(); });
      const panelNodes = rest.filter(node => !(node.textContent?.includes('CookieTime MVP') && node.tagName === 'P'));
      const profile = document.createElement('section');
      profile.className = 'settings-profile-card';
      profile.innerHTML = `<span class="settings-avatar" aria-hidden="true">🍪</span><span><strong>${esc(window.CookieAuth?.currentUser?.displayName || '김쿠키')}</strong><small>${esc(state.settings.major || '전공을 설정해 주세요')}</small></span><button type="button" data-settings-edit>편집</button>`;
      const toggle = document.createElement('button');
      toggle.type = 'button'; toggle.className = 'button settings-edit-toggle';
      toggle.textContent = editingSettings ? '설정 편집 완료' : '나에게 맞게 설정하기';
      const panel = document.createElement('div'); panel.className = 'settings-edit-panel'; panel.hidden = !editingSettings;
      panelNodes.forEach(node => panel.append(node));
      const streak = panel.querySelector('#streak-criterion');
      if (streak) {
        const any = streak.querySelector('option[value="any"]');
        if (any) any.textContent = '세 조건 중 하나';
        if (!streak.querySelector('option[value="cookie"]')) streak.insertAdjacentHTML('beforeend', `<option value="cookie" ${state.settings.streakCriterion === 'cookie' ? 'selected' : ''}>쿠키 1개 이상 쌓기</option>`);
      }
      root.replaceChildren(...header, profile, toggle, panel);
      toggle.onclick = () => { editingSettings = !editingSettings; render(); };
      profile.querySelector('[data-settings-edit]').onclick = () => { editingSettings = true; render(); };
    }
    return result;
  };

  document.querySelector('#settings-shortcut')?.addEventListener('click', event => {
    event.preventDefault(); event.stopImmediatePropagation(); openRecentActivity();
  }, true);
  updateNotificationBadge();
  render();
})();
