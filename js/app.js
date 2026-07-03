// Auto-login on page load (login paused for development)
// Reuse the PlaySpare cube image (topbar/loader) as the browser-tab favicon.
function setFavicon(){
  const cube = document.querySelector('.brandCube') || document.querySelector('.loaderLogo');
  const link = g('faviconLink');
  if(cube && cube.src && link) link.href = cube.src;
}

window.addEventListener('DOMContentLoaded', () => {
  cacheStaticDom();
  setFavicon();
  if(!checkSession()) {
    g('loginScreen').style.display = 'flex';
    // Warn if opened as file://
    if(location.protocol === 'file:') {
      setTimeout(showFileProtocolWarning, 800);
    }
  }
});

// Re-render LTV charts on theme toggle so colors stay accurate
const _origToggleTheme = toggleTheme;
toggleTheme = function(){
  _origToggleTheme();
  if(_ltvLoaded && g('tab-ltv').classList.contains('active')) renderLtv();
};

function bindStaticHandlers(){
  const bind = (selector, eventName, handler) => {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener(eventName, function(event){
        handler.call(this, event);
      });
    });
  };
  const bindId = (id, eventName, handler) => {
    const el = g(id);
    if(el) el.addEventListener(eventName, handler);
  };
  const delegate = (selector, eventName, handler) => {
    document.addEventListener(eventName, event => {
      const el = event.target.closest(selector);
      if(el) handler.call(el, event);
    });
  };

  bind('#bulkOverlay .bClose,#bulkOverlay .tbtn:not(.primary)', 'click', () => closeBulkModal());
  bind('#bulkOverlay .tbtn.primary', 'click', () => saveBulkTargets());
  bind('#userOverlay .uClose', 'click', () => closeUserModal());
  bind('#userOverlay .tbtn.primary', 'click', () => addUser());

  bindId('lEye', 'click', () => toggleLoginPw());
  bind('.loginBtn', 'click', () => doLogin());
  bind('.tabBtn[data-tab]', 'click', function(){ switchTab(this.dataset.tab, this); });
  bindId('alertBadge', 'click', () => scrollToAlerts());
  bindId('refreshBtn', 'click', () => refreshData());
  bindId('csvBtn', 'click', () => exportCSV());
  bindId('pdfBtn', 'click', () => exportPDF());
  bindId('themeBtn', 'click', () => toggleTheme());
  bindId('userMgmtBtn', 'click', () => openUserModal());
  bindId('logoutBtn', 'click', () => doLogout());

  bind('.presetBtn[data-preset]', 'click', function(){ applyPreset(this); });
  bindId('fGame', 'change', () => applyFilters());
  bindId('fPlat', 'change', () => applyFilters());
  bindId('fFrom', 'change', () => onCustomDate());
  bindId('fTo', 'change', () => onCustomDate());

  bind('.qPill[data-q]', 'click', function(){ selectQuarter(Number(this.dataset.q), this); });
  bind('.presetBtn[data-gplat]', 'click', function(){ setGamePlatform(this.dataset.gplat, this); });
  bindId('roiExpandBtn', 'click', () => toggleRoiRank());
  bind('.tBulkBtn', 'click', () => openBulkModal());
  bind('.tSaveBtn', 'click', () => saveTargets());

  bind('[data-ltv-plat]', 'click', function(){ setLtvPlat(this.dataset.ltvPlat, this); });
  bind('[data-ltv-type]', 'click', function(){ setLtvType(this.dataset.ltvType, this); });
  bindId('ltvGame', 'change', () => onLtvGameChange());
  bindId('ltvCountry', 'change', () => renderLtv());
  bind('[data-ltv-days]', 'click', function(){ setLtvDateRange(Number(this.dataset.ltvDays)); });
  bindId('ltvFrom', 'change', () => onLtvDateInput());
  bindId('ltvTo', 'change', () => onLtvDateInput());
  bind('[data-ltv-range]', 'click', function(){ setLtvRange(this.dataset.ltvRange, this); });
  bindId('ltvPerfPeriod', 'change', () => renderLtvPerformance());
  bindId('ltvPerfDay', 'change', () => renderLtvPerformance());
  bindId('ltvShowAllBtn', 'click', () => toggleLtvShowAll());

  delegate('[data-close-file-warning]', 'click', function(){
    const warning = g('fileProtoWarning');
    if(warning) warning.style.display = 'none';
  });
  delegate('[data-proj-month]', 'click', function(){
    projSelectedMonth = this.dataset.projMonth;
    buildMonthFilter();
    renderProjected();
  });
  delegate('[data-action="toggleLegacy"]', 'click', () => toggleLegacy());
  delegate('.uRoleSel[data-user-index]', 'change', function(){
    changeRole(Number(this.dataset.userIndex), this.value);
  });
  delegate('.uDel[data-user-index]', 'click', function(){
    deleteUser(Number(this.dataset.userIndex));
  });
  delegate('[data-ltv-day]', 'click', function(){
    toggleLtvDay(this.dataset.ltvDay);
  });
  delegate('[data-ltv-forecast-toggle]', 'click', () => toggleLtvForecast());
  delegate('[data-ltv-forecast-target]', 'click', function(){
    setLtvForecastTarget(this.dataset.ltvForecastTarget);
  });
  delegate('[data-ltv-sort]', 'click', function(){
    setLtvLeadSort(this.dataset.ltvSort);
  });
}

bindStaticHandlers();
