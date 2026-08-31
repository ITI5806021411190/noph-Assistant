// Extracted from index.html: haos-v70-33-current-guide-tabs-script
(function(){
  const PATCH='v70.33-current-guide-tabs';
  if(window.__HAOS_V733_CURRENT_GUIDE_TABS__)return;
  window.__HAOS_V733_CURRENT_GUIDE_TABS__=true;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clean=v=>String(v||'').replace(/'/g,'').trim();
  const userObj=()=>{try{return window.user||user||{};}catch(e){return window.user||{};}};
  const roleOf=()=>String(userObj().role||userObj().accountRole||'User');
  const isAdminLike=()=>/^(Head|Admin|Super Admin)$/i.test(roleOf());
  const isSuper=()=>/^Super Admin$/i.test(roleOf());
  const hasDeepLink=()=>{
    const p=new URLSearchParams(location.search);
    return !!(location.hash&&location.hash!=='#') || !!p.get('module') || !!p.get('view') || !!p.get('tab');
  };

  function reorderMainTabsV733(){
    const main=$('mainTab'), it=$('itservices-tab'), upcoming=$('upcoming-agenda-tab'), schedule=$('schedule-tab'), workspace=$('workspace-tab'), report=$('report-tab');
    if(!main||!it||!schedule||!report)return;
    [it,upcoming,schedule,workspace,report].filter(Boolean).forEach(btn=>{const li=btn.closest('li'); if(li&&li.parentElement===main)main.appendChild(li);});
    if(!it.dataset.haosV733ShownHook){
      it.dataset.haosV733ShownHook='1';
      it.addEventListener('shown.bs.tab',()=>setTimeout(initITIfReadyV733,120));
      it.addEventListener('click',()=>setTimeout(initITIfReadyV733,180),true);
    }
  }

  function showTabV733(tabId){
    const btn=$(tabId);
    if(!btn)return;
    try{
      if(window.bootstrap&&bootstrap.Tab)bootstrap.Tab.getOrCreateInstance(btn).show();
      else btn.click();
    }catch(e){
      const target=btn.getAttribute('data-bs-target');
      document.querySelectorAll('#mainTab .nav-link').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected','false');});
      document.querySelectorAll('#myTabContent .tab-pane').forEach(x=>x.classList.remove('active','show'));
      btn.classList.add('active');btn.setAttribute('aria-selected','true');
      if(target)document.querySelector(target)?.classList.add('active','show');
    }
  }

  function initITIfReadyV733(){
    const it=$('itservices-tab');
    if(!it||!it.classList.contains('active'))return;
    if(!clean(userObj().phone))return;
    try{if(typeof initItServicesHub==='function')initItServicesHub();}catch(e){console.warn('[HAOS v70.33] init IT Services failed',e);}
  }

  function applyDefaultTabV733(force){
    reorderMainTabsV733();
    if(!force&&hasDeepLink())return;
    if(!force&&sessionStorage.getItem('haos_user_tab_choice_v733')==='1')return;
    showTabV733('itservices-tab');
    setTimeout(initITIfReadyV733,180);
    setTimeout(initITIfReadyV733,900);
  }

  document.addEventListener('click',ev=>{
    if(ev.target.closest('#mainTab .nav-link'))sessionStorage.setItem('haos_user_tab_choice_v733','1');
  },true);
  document.addEventListener('DOMContentLoaded',()=>{applyDefaultTabV733(false);setTimeout(()=>applyDefaultTabV733(false),500);},{once:true});
  window.addEventListener('load',()=>setTimeout(()=>applyDefaultTabV733(false),300));

  const oldInitDashboardV733=window.initDashboard;
  if(typeof oldInitDashboardV733==='function'){
    window.initDashboard=function(){
      const r=oldInitDashboardV733.apply(this,arguments);
      setTimeout(()=>applyDefaultTabV733(false),120);
      setTimeout(initITIfReadyV733,700);
      return r;
    };
  }

  function onboardingStepsV733(){
    const steps=[
      {t:'IT Services Hub',i:'bi-pc-display-horizontal',d:'แท็บแรกของระบบสำหรับงานบริการ IT ทั้งหมด เปิดจองห้องประชุม/Zoom, แจ้งซ่อม, ทะเบียนทรัพย์สิน, License, Dashboard สาธารณะ และเครื่องมือที่เกี่ยวข้องได้จากจุดเดียว',h:['แท็บแรก','ศูนย์กลางบริการ','เชื่อมแจ้งเตือน']},
      {t:'จองห้องประชุม / Zoom',i:'bi-camera-video',d:'ส่งคำขอจองห้องหรือ Zoom พร้อมลายเซ็น ติดตามสถานะจาก Notification Center และให้เจ้าหน้าที่ IT อนุมัติ/จัดเตรียม Meeting ID, Passcode และ Link ได้ครบวงจร',h:['Digital form','Approval','Notification']},
      {t:'แจ้งซ่อม IT / ทรัพย์สิน / License',i:'bi-tools',d:'ผู้ใช้แจ้งซ่อมพร้อมรูปและรายละเอียดได้ ทีม IT ติดตามสถานะงานซ่อม, SLA, ทะเบียนทรัพย์สิน, Software License และการแจ้งเตือน License ใกล้หมดอายุ',h:['Helpdesk','Asset','License']},
      {t:'ตารางงาน & นัดหมาย',i:'bi-calendar2-week',d:'สร้างงานส่วนตัวหรือกลุ่มงาน ใช้มุมมองรายการ/การ์ด/ปฏิทิน กรองตามสถานะ ช่วงเวลา Priority และ Tags รวมถึงสร้าง Public Link หรือ QR สำหรับส่งต่อได้',h:['งานส่วนตัว','งานกลุ่ม','Calendar']},
      {t:'พื้นที่ทำงานร่วมกัน',i:'bi-kanban',d:'แท็บเฉพาะสำหรับสร้างตาราง Checklist แบบฟอร์มและ Quiz กำหนดสิทธิ์ ใช้ AI ช่วยออกแบบ ดูคำตอบ และส่งออกข้อมูลได้',h:['Workspace','Form/Quiz','AI Designer']},
      {t:'e-Meeting Manage',i:'bi-easel2',d:'จัดการประชุม วาระ เอกสาร RSVP Live View สรุปมติ และงานติดตามหลังประชุม พร้อมแจ้งเตือนผู้เกี่ยวข้องผ่านระบบกลาง',h:['Agenda','RSVP','Action follow-up']},
      {t:'Notification Center',i:'bi-bell-fill',d:'รวมแจ้งเตือนจากตารางงาน การอนุมัติ จองห้อง/Zoom แจ้งซ่อม e-Meeting Help Chat และเครื่องมือระบบ พร้อมปุ่มเปิดรายการปลายทางโดยตรง',h:['แจ้งเตือนรวม','เปิดปลายทาง','อ่าน/ลบได้']},
      {t:'โปรไฟล์การทำงาน / Auto Login',i:'bi-person-vcard',d:'บัญชีเดียวมีหลายโปรไฟล์การทำงานได้ เลือก Active Profile ก่อนทำงาน เปิด/ปิดเข้าสู่ระบบอัตโนมัติ และตรวจสอบอุปกรณ์ที่จำการเข้าสู่ระบบไว้ได้จากตั้งค่าโปรไฟล์',h:['Active Profile','อุปกรณ์','Audit log']},
      {t:'รายงานการปฏิบัติงาน',i:'bi-journal-check',d:'บันทึกรายงานประจำวัน แนบไฟล์ ใช้ AI ช่วยเรียบเรียง ดูประวัติแบบรายการ/การ์ด/ปฏิทิน และให้หัวหน้าดูภาพรวมรายงานของกลุ่มงานได้',h:['รายงานประจำวัน','AI','สรุปทีม']}
    ];
    if(isAdminLike())steps.push({t:'Dashboard / Export / อนุมัติ',i:'bi-graph-up-arrow',d:'หัวหน้าและผู้ดูแลระบบดู Executive Dashboard, สรุปรายงานตามช่วงเวลา, อนุมัติงาน และส่งออก PDF/Excel แบบเป็นทางการได้ตามสิทธิ์',h:['Head/Admin','Export','Approval']});
    if(isSuper())steps.push({t:'เครื่องมือระบบขั้นสูง',i:'bi-shield-check',d:'Super Admin จัดการผู้ใช้ โปรไฟล์หลายกลุ่มงาน Permission Matrix, Branding/PWA, Backup/Restore, ซ่อมฐานข้อมูล และตรวจสุขภาพระบบได้',h:['v63-v66','DB repair','System health']});
    return steps;
  }

  window.openOnboardingV60=function(force){
    const key='haos_onboarding_seen_'+new Date().toISOString().slice(0,10);
    if(!force&&localStorage.getItem(key))return;
    let idx=0;
    const steps=onboardingStepsV733();
    const show=()=>{
      const s=steps[idx];
      let hideToday=false;
      Swal.fire({
        title:`${idx+1}/${steps.length} ${esc(s.t)}`,
        width:760,
        showCancelButton:true,
        showDenyButton:idx>0,
        cancelButtonText:'ปิด',
        denyButtonText:'ย้อนกลับ',
        confirmButtonText:idx===steps.length-1?'เสร็จสิ้น':'ถัดไป',
        html:`<div class="haos-v733-tour-step"><div class="icon"><i class="bi ${esc(s.i)}"></i></div><p>${esc(s.d)}</p><div class="hint">${(s.h||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div></div><div class="form-check text-start mt-3"><input class="form-check-input" type="checkbox" id="dontShowTourToday"><label class="form-check-label" for="dontShowTourToday">ไม่แสดงไกด์นี้อีกวันนี้</label></div>`,
        didOpen:()=>{$('dontShowTourToday')?.addEventListener('change',ev=>{hideToday=!!ev.target.checked;});},
        willClose:()=>{hideToday=hideToday||!!$('dontShowTourToday')?.checked;},
        preConfirm:()=>({hideToday:!!$('dontShowTourToday')?.checked}),
        preDeny:()=>({hideToday:!!$('dontShowTourToday')?.checked})
      }).then(r=>{
        if(hideToday||(r.value&&r.value.hideToday))localStorage.setItem(key,'1');
        if(r.isDenied&&idx>0){idx--;show();return;}
        if(r.isConfirmed&&idx<steps.length-1){idx++;show();return;}
        if(r.isConfirmed&&idx===steps.length-1&&r.value&&r.value.hideToday)localStorage.setItem(key,'1');
      });
    };
    show();
  };

  function guideCardsV733(){
    const cards=[
      ['bi-pc-display-horizontal','IT Services Hub','แท็บแรกของระบบ รวมจองห้อง/Zoom, Helpdesk, ทรัพย์สิน, License, Public IT Dashboard และเครื่องมือบริการ IT','ใหม่'],
      ['bi-camera-video','จองห้องประชุม / Zoom','สร้างคำขอ ติดตามสถานะ อนุมัติ/ไม่อนุมัติ พร้อมแจ้งเตือนกลางและ Digital View','อัปเดต'],
      ['bi-tools','แจ้งซ่อม IT / Helpdesk','แจ้งซ่อมพร้อมรูป ทีม IT เปลี่ยนสถานะ ติดตาม SLA และเปิดรายการจาก Notification Center','ใหม่'],
      ['bi-hdd-network','ทรัพย์สิน IT / License','ทะเบียน Hardware, Software License, วันหมดอายุ, Dashboard และแจ้งเตือน License ใกล้หมดอายุ','ใหม่'],
      ['bi-calendar2-week','ตารางงาน & นัดหมาย','งานส่วนตัว/กลุ่มงาน มุมมองรายการ การ์ด ปฏิทิน Tags, Priority, Public Link และ QR','หลัก'],
      ['bi-kanban','พื้นที่ทำงานร่วมกัน','แท็บเฉพาะสำหรับตาราง Checklist แบบฟอร์ม Quiz สิทธิ์ผู้ใช้ AI Designer และการส่งออก','หลัก'],
      ['bi-easel2','e-Meeting Manage','จัดประชุม วาระ เอกสาร RSVP Live View สรุปมติ และงานติดตามจากมติ','ใหม่'],
      ['bi-bell-fill','Notification Center','รวมแจ้งเตือนทุกโมดูล พร้อมปุ่มเปิดปลายทาง อ่านทั้งหมด ลบ และตรวจ coverage สำหรับ Admin','อัปเดต'],
      ['bi-person-vcard','Active Profile','บัญชีเดียวมีหลายโปรไฟล์การทำงาน ระบบบันทึกงานและ audit log ตามโปรไฟล์ที่เลือก','ใหม่'],
      ['bi-key','Auto Login / อุปกรณ์','จำการเข้าสู่ระบบ เปิด/ปิดจากตั้งค่าโปรไฟล์ และดูอุปกรณ์ที่ล็อกอินค้างไว้ได้','ใหม่'],
      ['bi-journal-check','รายงานการปฏิบัติงาน','บันทึกรายงานประจำวัน แนบไฟล์ ใช้ AI ช่วยเรียบเรียง และดูประวัติได้หลายมุมมอง','หลัก']
    ];
    if(isAdminLike())cards.push(['bi-graph-up-arrow','Executive / Export','Dashboard ผู้บริหาร อนุมัติงาน สรุปรายงาน และ Export PDF/Excel ตามสิทธิ์','Admin']);
    if(isSuper())cards.push(['bi-shield-check','เครื่องมือระบบขั้นสูง','ผู้ใช้/โปรไฟล์ Permission Matrix Branding Backup/Restore ซ่อมฐานข้อมูล และ System Health','Super']);
    return cards;
  }

  function guideKeysV733(){
    const phone=clean(userObj().phone)||'guest', today=new Date().toISOString().split('T')[0];
    return {today,hideToday:`haos_guide_hide_today_${phone}`,never:`haos_guide_never_${phone}`};
  }

  window.openProgramGuide=function(force){
    const keys=guideKeysV733();
    if(!force){
      try{if(window.guideShownThisSession)return;}catch(e){}
      if(localStorage.getItem(keys.never)==='1')return;
      if(localStorage.getItem(keys.hideToday)===keys.today)return;
    }
    try{window.guideShownThisSession=true;guideShownThisSession=true;}catch(e){}
    const role=roleOf();
    Swal.fire({
      title:'คู่มือ Health Assistant OS',
      width:1040,
      showCloseButton:true,
      confirmButtonText:'เริ่มใช้งาน',
      html:`<div class="haos-v733-guide-hero"><h5><i class="bi bi-stars"></i> อัปเดตคู่มือฟังก์ชันล่าสุด</h5><div class="small opacity-75">สิทธิ์ปัจจุบัน: ${esc(role)} • เริ่มต้นที่ IT Services Hub แล้วต่อด้วยตารางงาน & นัดหมาย ส่วนรายงานการปฏิบัติงานย้ายไปท้ายแท็บ</div></div><div class="haos-v733-guide-grid">${guideCardsV733().map(c=>`<div class="haos-v733-guide-card"><div class="d-flex justify-content-between gap-2"><h6><i class="bi ${esc(c[0])}"></i> ${esc(c[1])}</h6><span class="badge bg-primary-subtle text-primary">${esc(c[3])}</span></div><div class="small text-muted">${esc(c[2])}</div></div>`).join('')}</div><div class="guide-option-box mt-3 text-start"><div class="form-check mb-2"><input class="form-check-input" type="checkbox" id="guideHideToday"><label class="form-check-label small" for="guideHideToday">ไม่แสดงคำแนะนำนี้อีกในวันนี้</label></div><div class="form-check"><input class="form-check-input" type="checkbox" id="guideNeverShow"><label class="form-check-label small" for="guideNeverShow">ไม่แสดงอัตโนมัติอีกจนกว่าจะกดคู่มือเอง</label></div></div>`,
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

  setTimeout(()=>applyDefaultTabV733(false),1300);
  setTimeout(()=>applyDefaultTabV733(false),2600);
  console.info('HAOS '+PATCH+' loaded');
})();
