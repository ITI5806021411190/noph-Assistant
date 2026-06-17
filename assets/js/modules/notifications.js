// Extracted from index.html: haos-v70-32-notification-guide-ui-script
(function(){
  const PATCH='v70.32-notification-guide-ui';
  if(window.__HAOS_V732_NOTIFICATION_GUIDE_UI__)return;
  window.__HAOS_V732_NOTIFICATION_GUIDE_UI__=true;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clean=v=>String(v||'').replace(/'/g,'').trim();
  const fmtDateTime=v=>{
    const D=window.HAOSDateDisplay;
    if(D&&typeof D.dateTime==='function')return D.dateTime(v,{forceTime:true});
    return String(v||'-');
  };
  const userObj=()=>{try{return window.user||user||{};}catch(e){return window.user||{};}};
  const gas=(fn,args)=>new Promise((resolve,reject)=>{try{google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[fn].apply(google.script.run,args||[]);}catch(e){reject(e);}});
  const adminLike=()=>/^(Admin|Super Admin|Head)$/i.test(String(userObj().role||''))||/^(Admin|Super Admin)$/i.test(String(userObj().accountRole||''));
  const superLike=()=>/^Super Admin$/i.test(String(userObj().role||userObj().accountRole||''));
  const moduleLabel=m=>({itBooking:'จองห้อง/Zoom',itRepair:'แจ้งซ่อม IT',itAsset:'ทรัพย์สิน/License',eMeeting:'e-Meeting',helpChat:'Help Chat',schedule:'ตารางงาน',userAdmin:'ผู้ใช้/PIN',systemTools:'ระบบขั้นสูง',system:'ระบบ'}[m]||m||'ระบบ');
  const moduleIcon=m=>({itBooking:'bi-camera-video',itRepair:'bi-tools',itAsset:'bi-hdd-network',eMeeting:'bi-easel2',helpChat:'bi-chat-dots',schedule:'bi-calendar2-check',userAdmin:'bi-person-gear',systemTools:'bi-shield-check',system:'bi-info-circle'}[m]||'bi-info-circle');

  async function openNotificationTarget(moduleName, entityId, action){
    try{if(entityId&&typeof markNotifAsRead==='function')setTimeout(()=>{try{loadNotifications();loadNotificationCenter();}catch(e){}},300);}catch(e){}
    if(moduleName==='itBooking'){
      try{openItBookingModule&&openItBookingModule();}catch(e){}
      setTimeout(()=>{try{loadItBookings&&loadItBookings();}catch(e){}},200);
      if(entityId)setTimeout(()=>{try{openItBookingDetail&&openItBookingDetail(entityId);}catch(e){}},950);
      return;
    }
    if(moduleName==='itRepair'){
      try{openITRepairModuleV70&&openITRepairModuleV70();}catch(e){}
      if(entityId)setTimeout(()=>{try{openITRepairDetailV70&&openITRepairDetailV70(entityId);}catch(e){}},950);
      return;
    }
    if(moduleName==='itAsset'){
      try{openITAssetModuleV70&&openITAssetModuleV70();}catch(e){}
      return;
    }
    if(moduleName==='eMeeting'){
      try{const openEM=window.openEMeetingModuleV715||window.openEMeetingModuleV714; if(openEM)openEM();}catch(e){}
      if(entityId)setTimeout(()=>{try{if(window.openEMeetingDetailV715)window.openEMeetingDetailV715(entityId);}catch(e){}},900);
      return;
    }
    if(moduleName==='helpChat'){
      if(adminLike()){try{openHelpChatInboxV713&&openHelpChatInboxV713();}catch(e){}}
      else {try{openHelpLiveChatV713&&openHelpLiveChatV713();}catch(e){}}
      return;
    }
    if(moduleName==='schedule'){
      if(action==='openApprovals'){try{document.getElementById('approval-tab')?.click();}catch(e){}}
      else {try{document.getElementById('schedule-tab')?.click();}catch(e){}}
      try{showSection&&showSection('appSection');}catch(e){}
      return;
    }
    if(moduleName==='userAdmin'){
      try{openUserManagement&&openUserManagement();}catch(e){}
      return;
    }
    if(moduleName==='systemTools'){
      try{openSystemHealthModal&&openSystemHealthModal();}catch(e){}
      return;
    }
    try{openNotificationCenterModal&&openNotificationCenterModal();}catch(e){}
  }
  window.openNotificationTargetV732=openNotificationTarget;

  function actionButton(n,small){
    const moduleName=n.module||'system', entity=String(n.entityId||'');
    if(n.virtual&&!entity)return '';
    const label=small?'เปิด':'เปิดรายการ';
    return `<button class="btn btn-sm btn-outline-primary" onclick="openNotificationTargetV732('${esc(moduleName)}','${esc(entity)}','${esc(n.action||'')}')"><i class="bi bi-box-arrow-up-right"></i> ${label}</button>`;
  }
  function notifHtml(n,compact){
    const unread=!n.isRead;
    return `<div class="list-group-item ${unread?'list-group-item-info':''}">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div class="flex-grow-1">
          <div class="fw-bold">${esc(n.message||'-')}</div>
          <div class="haos-v732-notif-meta">
            <span class="haos-v732-module-pill"><i class="bi ${moduleIcon(n.module)}"></i> ${esc(moduleLabel(n.module))}</span>
            <small class="text-muted">${esc(fmtDateTime(n.time||n.createdAt||n.timestamp||n.date||'-'))} • ${esc(n.type||'ทั่วไป')} • ${esc(n.priority||'ปกติ')}</small>
          </div>
        </div>
        <div class="text-nowrap">
          ${actionButton(n,compact)}
          ${n.virtual?'':`<button class="btn btn-sm btn-outline-success" onclick="readNotif('${esc(n.id)}'); setTimeout(()=>{try{loadNotificationCenter();loadNotifications();}catch(e){}},300)"><i class="bi bi-check"></i></button>`}
          ${compact||n.virtual?'':`<button class="btn btn-sm btn-outline-danger" onclick="deleteNotificationUI('${esc(n.id)}')"><i class="bi bi-trash"></i></button>`}
        </div>
      </div>
    </div>`;
  }
  window.loadNotifications=function(){
    const badge=$('notifBadge'), listBody=$('notifListBody'), u=userObj();
    if(!u.phone)return;
    google.script.run.withSuccessHandler(res=>{
      if(!res||!res.success)return;
      const data=res.data||[];
      if(badge){badge.style.display=data.length?'block':'none';badge.innerText=data.length;}
      if(!listBody)return;
      listBody.innerHTML=data.length?data.slice(0,12).map(n=>notifHtml(n,true)).join(''):'<div class="text-center p-4 text-muted">ไม่มีการแจ้งเตือนใหม่</div>';
    }).getNotifications(u.phone);
  };
  window.loadNotificationCenter=function(){
    const list=$('notificationCenterList'), filter=$('notifFilter')?.value||'all', u=userObj();
    if(list)list.innerHTML='<div class="text-center py-4 text-muted">กำลังโหลด...</div>';
    google.script.run.withSuccessHandler(res=>{
      if(!list)return;
      if(!res||!res.success){list.innerHTML=`<div class="text-danger p-3">${esc(res&&res.message?res.message:'โหลดไม่สำเร็จ')}</div>`;return;}
      const data=res.data||[];
      list.innerHTML=data.length?data.map(n=>notifHtml(n,false)).join(''):'<div class="text-center py-4 text-muted">ไม่มีแจ้งเตือน</div>';
    }).getNotificationCenter(u.phone,filter);
  };
  function installCoverageButton(){
    const bar=$('notifFilter')?.closest('.d-flex');
    if(!bar||$('btnNotifCoverageV732')||!adminLike())return;
    bar.insertAdjacentHTML('beforeend','<button id="btnNotifCoverageV732" class="btn btn-outline-dark btn-sm" onclick="openNotificationCoverageV732()"><i class="bi bi-diagram-3"></i> ตรวจการเชื่อมแจ้งเตือน</button>');
  }
  window.openNotificationCoverageV732=async function(){
    try{
      Swal.fire({title:'กำลังตรวจการเชื่อมแจ้งเตือน...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
      const res=await gas('getNotificationCoverageReportV732',[userObj().phone||'']);
      if(!res||!res.success)throw new Error(res&&res.message?res.message:'ตรวจไม่สำเร็จ');
      const html=`<div class="text-start"><div class="alert alert-info py-2 small">รวมแจ้งเตือนในฐานข้อมูล ${esc(res.total||0)} รายการ • ${esc(res.version||'v70.32')}</div><div class="haos-v732-coverage">${(res.modules||[]).map(m=>`<div class="item"><b><i class="bi ${moduleIcon(m.key)} text-primary"></i> ${esc(m.name)}</b><small class="text-muted">${esc(m.notes||'')}</small><div class="mt-2"><span class="badge bg-success">connected</span> <span class="badge bg-light text-dark">${esc(m.count||0)} รายการ</span></div></div>`).join('')}</div></div>`;
      Swal.fire({title:'ผลตรวจการเชื่อมแจ้งเตือน',width:980,html,confirmButtonText:'ปิด'});
    }catch(e){Swal.fire('ตรวจไม่สำเร็จ',e.message||String(e),'error');}
  };
  const oldOpenCenter=window.openNotificationCenterModal;
  window.openNotificationCenterModal=function(){
    const r=oldOpenCenter?oldOpenCenter.apply(this,arguments):undefined;
    setTimeout(()=>{installCoverageButton();try{loadNotificationCenter();}catch(e){}},180);
    return r;
  };

  function guideHtml(){
    const u=userObj(), role=u.role||u.accountRole||'User';
    const cards=[
      ['bi-person-vcard','โปรไฟล์การทำงาน','เลือก Active Profile ก่อนเริ่มงาน ระบบจะบันทึกสิทธิ์ กลุ่มงาน และ audit log ตามโปรไฟล์ที่ใช้งาน'],
      ['bi-bell-fill','Notification Center','แจ้งเตือนรวมของตารางงาน อนุมัติ จองห้อง/Zoom แจ้งซ่อม e-Meeting Help Chat และเครื่องมือระบบ พร้อมปุ่มเปิดปลายทาง'],
      ['bi-camera-video','จองห้องประชุม / Zoom','ส่งคำขอ จัดการอนุมัติ เปิด Digital View และติดตามผลผ่านแจ้งเตือนกลาง'],
      ['bi-tools','IT Services','ทะเบียนทรัพย์สิน License ใกล้หมดอายุ และ Helpdesk ใช้ notification adapter เดียวกัน'],
      ['bi-easel2','e-Meeting','จัดประชุม วาระ เอกสาร RSVP Live View และงานติดตามจากมติ'],
      ['bi-shield-check','เครื่องมือระบบ v63-v66','Backup/Restore, Permission Matrix, Branding/PWA และ Google Calendar Sync เชื่อมแจ้งเตือนและ audit log แล้ว']
    ];
    if(superLike())cards.push(['bi-wrench-adjustable-circle','ซ่อมฐานข้อมูล','ใช้ preview ก่อนซ่อมจริง ตรวจ duplicate profile, header ซ้ำ, demo data และแถวว่างท้ายชีต']);
    return `<div class="text-start">
      <div class="alert alert-primary py-2"><b><i class="bi bi-stars"></i> คู่มือ Health Assistant OS</b><br><small>สิทธิ์ปัจจุบัน: ${esc(role)} • อัปเดตสำหรับระบบโปรไฟล์และแจ้งเตือนกลาง v70.32</small></div>
      <div class="haos-v732-guide-grid">${cards.map(c=>`<div class="haos-v732-guide-card"><h6><i class="bi ${c[0]}"></i> ${esc(c[1])}</h6><div class="small text-muted">${esc(c[2])}</div></div>`).join('')}</div>
      <div class="guide-option-box mt-3">
        <div class="form-check mb-2"><input class="form-check-input" type="checkbox" id="guideHideToday"><label class="form-check-label small" for="guideHideToday">ไม่แสดงคำแนะนำนี้อีกในวันนี้</label></div>
        <div class="form-check"><input class="form-check-input" type="checkbox" id="guideNeverShow"><label class="form-check-label small" for="guideNeverShow">ไม่แสดงอัตโนมัติอีกจนกว่าจะกดคู่มือเอง</label></div>
      </div>
    </div>`;
  }
  function guideKeys(){
    const phone=clean(userObj().phone)||'guest', today=new Date().toISOString().split('T')[0];
    return {today,hideToday:`haos_guide_hide_today_${phone}`,never:`haos_guide_never_${phone}`};
  }
  window.openProgramGuide=function(force){
    const keys=guideKeys();
    if(!force){
      if(window.guideShownThisSession)return;
      if(localStorage.getItem(keys.never)==='1')return;
      if(localStorage.getItem(keys.hideToday)===keys.today)return;
    }
    try{guideShownThisSession=true;}catch(e){}
    Swal.fire({
      title:'ยินดีต้อนรับสู่ Health Assistant OS',
      width:920,
      html:guideHtml(),
      confirmButtonText:'เริ่มใช้งาน',
      showCloseButton:true,
      didOpen:()=>{
        if($('guideHideToday')&&localStorage.getItem(keys.hideToday)===keys.today)$('guideHideToday').checked=true;
        if($('guideNeverShow')&&localStorage.getItem(keys.never)==='1')$('guideNeverShow').checked=true;
      },
      preConfirm:()=>{
        if($('guideHideToday')?.checked)localStorage.setItem(keys.hideToday,keys.today);else localStorage.removeItem(keys.hideToday);
        if($('guideNeverShow')?.checked)localStorage.setItem(keys.never,'1');else localStorage.removeItem(keys.never);
      }
    });
  };
  function install(){installCoverageButton();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  setTimeout(install,900);setTimeout(install,2200);
  console.info('HAOS '+PATCH+' loaded');
})();
