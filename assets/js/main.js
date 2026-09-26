/* 团队门户 —— 交互脚本（无框架，原生 JS） */
(function () {
  'use strict';

  /* ---------- 顶部导航（移动端） ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('siteNav');
  if (burger && nav) {
    burger.addEventListener('click', function () { nav.classList.toggle('open'); });
  }

  /* ---------- 站内搜索 ---------- */
  var modal = document.getElementById('searchModal');
  var input = document.getElementById('searchInput');
  var results = document.getElementById('searchResults');
  var index = [];
  var currentUser = (window.LAB_ACCESS && window.LAB_ACCESS.current) || '';

  fetch('/search-index.json')
    .then(function (r) { return r.json(); })
    .then(function (d) { index = d; })
    .catch(function () { /* 索引缺失时静默降级 */ });

  function openSearch() {
    if (!modal) return;
    modal.hidden = false;
    input.focus();
    render('');
  }
  function closeSearch() {
    if (!modal) return;
    modal.hidden = true;
    results.innerHTML = '';
    input.value = '';
  }
  function render(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) {
      results.innerHTML = '<li><small>输入关键词开始搜索，例如「缺陷」「专利」「2025」。</small></li>';
      return;
    }
    var hits = index.filter(function (it) {
      return (it.title + ' ' + it.section + ' ' + it.summary + ' ' + it.text).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 30);
    if (!hits.length) {
      results.innerHTML = '<li><small>没有匹配结果。</small></li>';
      return;
    }
    results.innerHTML = hits.map(function (it) {
      var clean = (it.summary || it.text || '').replace(/<[^>]+>/g, '').slice(0, 90);
      return '<li><a href="' + it.url + '"><b>' + it.title + '</b>' +
        '<small>[' + it.section + '] ' + clean + '…</small></a></li>';
    }).join('');
  }

  var toggle = document.getElementById('searchToggle');
  if (toggle) toggle.addEventListener('click', openSearch);
  var closeBtn = document.getElementById('searchClose');
  if (closeBtn) closeBtn.addEventListener('click', closeSearch);
  if (modal) {
    modal.addEventListener('click', function (e) { if (e.target === modal) closeSearch(); });
  }
  if (input) input.addEventListener('input', function () { render(input.value); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal && !modal.hidden) closeSearch();
    if (e.key === '/' && (!modal || modal.hidden)) { e.preventDefault(); openSearch(); }
  });

  /* ---------- 权限演示：身份切换 ---------- */
  var chip = document.getElementById('identityChip');
  var permPanel = document.getElementById('permPanel');
  var permWho = document.getElementById('permWho');
  var permScope = document.getElementById('permScope');
  var permHint = document.getElementById('permHint');

  function grantOf(uid) {
    if (!window.LAB_ACCESS) return null;
    return window.LAB_ACCESS.grants.filter(function (g) { return g.member === uid; })[0] || null;
  }

  function memberName(uid) {
    var m = (window.LAB_ACCESS && window.LAB_ACCESS.members || []).filter(function (x) { return x.id === uid; })[0];
    return m ? m.name + '（' + m.role + '）' : uid;
  }

  function scopeText(scope) {
    if (!scope || !scope.length) return '无内容管理权限';
    if (scope.indexOf('__all__') >= 0) return '全部板块';
    return scope.map(function (s) { return s.replace(/^.*\//, ''); }).join('、');
  }

  function applyUser(uid) {
    var g = grantOf(uid);
    document.querySelectorAll('.edit-link').forEach(function (a) {
      var ok = g && (g.scope.indexOf('__all__') >= 0 || g.scope.indexOf(a.dataset.coll) >= 0 ||
        g.scope.indexOf(a.dataset.coll + '/' + a.dataset.id) >= 0);
      a.style.display = ok ? '' : 'none';
    });
    if (permWho) permWho.textContent = memberName(uid);
    if (permScope) {
      permScope.innerHTML = g
        ? '<ul class="scope-list"><li>角色：<b>' + ((window.LAB_ACCESS.roles || {})[g.role] || {}).title + '</b></li>' +
          '<li>管理范围：<b>' + scopeText(g.scope) + '</b></li></ul>'
        : '<p class="muted small">该身份没有任何管理权限。</p>';
    }
    if (permHint) {
      permHint.textContent = '当前身份下，本页'
        + (document.querySelectorAll('.edit-link') && window.__hasEdit ? '可编辑' : '')
        + '。切换右上角身份查看不同成员的权限范围。';
      // 由下方 applyUser 统一控制按钮显隐
    }
  }

  if (chip && window.LAB_ACCESS) {
    var users = window.LAB_ACCESS.members.map(function (m) { return m.id; });
    chip.textContent = '身份：' + memberName(currentUser);
    chip.addEventListener('click', function () {
      if (!permPanel.hidden) { permPanel.hidden = true; return; }
      permPanel.hidden = false;
      applyUser(currentUser);
    });
    if (permWho) permWho.textContent = memberName(currentUser);
  }

  document.addEventListener('click', function (e) {
    if (!permPanel || permPanel.hidden) return;
    if (e.target.closest('.perm-panel') || e.target === chip || chip.contains(e.target)) return;
    permPanel.hidden = true;
  });

  /* ---------- 首页数字滚动 ---------- */
  document.querySelectorAll('.stat b').forEach(function (el) {
    var target = parseInt(el.dataset.count || '0', 10);
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / 700, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });

  /* ---------- 列表筛选 ---------- */
  document.addEventListener('click', function (e) {
    var chipEl = e.target.closest('#filterBar .chip');
    if (!chipEl) return;
    var bar = document.getElementById('filterBar');
    var key = chipEl.dataset.group, val = chipEl.dataset.value;
    bar.querySelectorAll('.chip[data-group="' + key + '"]').forEach(function (c) {
      c.classList.toggle('active', c === chipEl);
    });
    var active = {};
    bar.querySelectorAll('.chip.active').forEach(function (c) { active[c.dataset.group] = c.dataset.value; });
    var shown = 0;
    document.querySelectorAll('.group-block').forEach(function (block) {
      var visible = 0;
      block.querySelectorAll('.h-card, .person-card, .row-item').forEach(function (card) {
        var tags = card.dataset.tags || '';
        var ok = Object.keys(active).every(function (k) {
          return !active[k] || tags.indexOf(k + ':' + active[k]) >= 0;
        });
        card.style.display = ok ? '' : 'none';
        if (ok) visible++;
      });
      block.style.display = visible ? '' : 'none';
      shown += visible;
    });
    var counter = document.getElementById('itemCount');
    if (counter) counter.textContent = '当前显示 ' + shown + ' 条';
  });

  /* ---------- 本页「编辑本页」按钮：无权限时隐藏 ---------- */
  function initEditLinks() {
    if (!currentUser) return;
    applyUser(currentUser);
  }
  initEditLinks();
})();
