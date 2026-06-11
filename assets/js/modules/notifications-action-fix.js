// Extracted from index.html: haos-v70-34-notification-action-fix-script
(function(){
  const PATCH='v70.34-notification-action-fix';
  if(window.__HAOS_V734_NOTIFICATION_ACTION_FIX__)return;
  window.__HAOS_V734_NOTIFICATION_ACTION_FIX__=true;
  const $=id=>document.getElementById(id);
  const clean=v=>String(v||'').replace(/'/g,'').trim();

  function hideNotificationCenterV734(){
    try{
      const modalEl=$('notificationCenterModal');
      if(modalEl&&window.bootstrap&&bootstrap.Modal){
        const inst=bootstrap.Modal.getInstance(modalEl)||bootstrap.Modal.getOrCreateInstance(modalEl);
        inst.hide();
      }
    }catch(e){}
  }

  function showMainTabV734(tabId){
    const btn=$(tabId);
    if(!btn)return;
    try{
      if(window.bootstrap&&bootstrap.Tab)bootstrap.Tab.getOrCreateInstance(btn).show();
      else btn.click();
    }catch(e){
      try{btn.click();}catch(ignore){}
    }
  }

  function focusTodayScheduleV734(){
    try{if($('schedulePeriodFilter'))$('schedulePeriodFilter').value='today';}catch(e){}
    try{if($('globalSchedulePeriodV49'))$('globalSchedulePeriodV49').value='today';}catch(e){}
    try{if($('unifiedSchedulePeriodV702'))$('unifiedSchedulePeriodV702').value='today';}catch(e){}
    try{if(typeof window.setUnifiedScheduleViewV702==='function')window.setUnifiedScheduleViewV702('list');}catch(e){}
    try{if(typeof window.applyScheduleFilters==='function')window.applyScheduleFilters();}catch(e){}
    try{if(typeof window.renderUnifiedScheduleV702==='function')window.renderUnifiedScheduleV702();}catch(e){}
  }

  function hasScheduleItemV734(id){
    try{
      const lists=[window.mySchedulesGlobal,window.departmentSchedulesGlobal];
      try{if(typeof mySchedulesGlobal!=='undefined')lists.push(mySchedulesGlobal);}catch(e){}
      try{if(typeof departmentSchedulesGlobal!=='undefined')lists.push(departmentSchedulesGlobal);}catch(e){}
      return lists.some(list=>Array.isArray(list)&&list.some(item=>String(item&&item.id)===String(id)));
    }catch(e){return false;}
  }

  function openScheduleDetailWhenReadyV734(entityId, attempt){
    if(!clean(entityId)||String(entityId).indexOf('TODAY-')===0)return;
    attempt=attempt||0;
    if(hasScheduleItemV734(entityId)||attempt>=6){
      try{if(typeof window.viewScheduleDetail==='function')window.viewScheduleDetail(entityId);}catch(e){console.warn('[HAOS v70.34] open schedule detail failed',e);}
      return;
    }
    try{if(attempt===0&&typeof window.loadMySchedules==='function')window.loadMySchedules();}catch(e){}
    try{if(attempt===0&&typeof window.loadDepartmentSchedules==='function')window.loadDepartmentSchedules();}catch(e){}
    setTimeout(()=>openScheduleDetailWhenReadyV734(entityId,attempt+1),650);
  }

  function openScheduleFromNotificationV734(entityId, action){
    hideNotificationCenterV734();
    setTimeout(()=>{
      try{sessionStorage.setItem('haos_user_tab_choice_v733','1');}catch(e){}
      showMainTabV734('schedule-tab');
      try{if(typeof window.haosOpenScheduleV687==='function')window.haosOpenScheduleV687();}catch(e){}
      setTimeout(focusTodayScheduleV734,180);
      setTimeout(focusTodayScheduleV734,750);
      setTimeout(()=>openScheduleDetailWhenReadyV734(entityId,0),950);
    },220);
  }

  function openGenericTargetV734(moduleName, entityId, action){
    hideNotificationCenterV734();
    const old=window.__HAOS_V734_PREV_OPEN_NOTIFICATION_TARGET__;
    if(typeof old==='function')return old(moduleName, entityId, action);
  }

  window.__HAOS_V734_PREV_OPEN_NOTIFICATION_TARGET__=window.openNotificationTargetV732;
  window.openNotificationTargetV732=function(moduleName, entityId, action){
    const mod=String(moduleName||'');
    const act=String(action||'');
    if(mod==='schedule'||mod==='today'||act==='openSchedule'||act==='openApprovals'){
      openScheduleFromNotificationV734(entityId, act);
      return false;
    }
    openGenericTargetV734(moduleName, entityId, action);
    return false;
  };

  console.info('HAOS '+PATCH+' loaded');
})();
