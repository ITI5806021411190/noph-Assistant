// Extracted from index.html: haos-v70-58-remote-support-anydesk-entry-script
(function(){
  const PATCH='v70.58-remote-support-anydesk-entry';
  if(window.__HAOS_V752_REMOTE_ENTRY__)return;
  window.__HAOS_V752_REMOTE_ENTRY__=true;
  function currentUserV752(){try{if(typeof window.currentUser==='function')return window.currentUser()||{};}catch(e){}try{return window.user||user||{};}catch(e){return window.user||{};}}
  function escV752(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function isRemoteStaffV752(){
    try{if(typeof isAdmin==='function'&&isAdmin())return true;}catch(e){}
    try{if(typeof isSuper==='function'&&isSuper())return true;}catch(e){}
    const u=currentUserV752();
    const role=String(u.role||u.profileRole||'').toLowerCase();
    const dept=String(u.department||u.departmentName||'').toLowerCase();
    return /admin|super|head/.test(role)||dept.indexOf('สุขภาพดิจิทัล')!==-1;
  }
  window.openRemoteSupportHubV752=function(){
    const u=currentUserV752();
    const phone=String(u.phone||'').replace(/\D/g,'');
    const mode=isRemoteStaffV752()?'staff':'user';
    const url='/remote.html?v=7058&mode='+encodeURIComponent(mode)+(phone?('&phone='+encodeURIComponent(phone)):'');
    window.open(url,'_blank','noopener');
  };
  function installRemoteSupportCardV752(){
    const pane=document.getElementById('itservices-pane');
    if(!pane||document.getElementById('remoteSupportCardV752'))return;
    const rows=Array.from(pane.querySelectorAll('.row.g-3.mb-4,.row.g-3'));
    const row=rows.find(r=>r.querySelector('.it-service-card'))||rows[0];
    if(!row)return;
    const card=document.createElement('div');
    card.id='remoteSupportCardV752';
    card.className='col-md-4';
    const staff=isRemoteStaffV752();
    const u=currentUserV752();
    const phone=String(u.phone||'').replace(/\D/g,'');
    const staffUrl='/remote.html?v=7058&mode=staff'+(phone?('&phone='+encodeURIComponent(phone)):'');
    card.innerHTML=`<div class="card h-100 it-service-card">
      <div class="card-body p-4 d-flex flex-column">
        <div class="remote-entry-icon mb-3"><i class="bi bi-life-preserver"></i></div>
        <h6 class="fw-bold">ช่วยเหลือผ่าน AnyDesk</h6>
        <p class="text-muted small flex-grow-1">${staff?'คิวเจ้าหน้าที่สำหรับรับงาน AnyDesk คัดลอก ID บันทึกผล และปิดงานจากระบบกลาง':'ขอให้ IT ช่วยเหลือแบบเร็วผ่าน AnyDesk ผู้ใช้กรอกปัญหาและ AnyDesk ID เท่านั้น'}</p>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-primary btn-sm fw-bold" onclick="openRemoteSupportHubV752()"><i class="bi bi-box-arrow-up-right"></i> ${staff?'เปิดคอนโซล':'ขอความช่วยเหลือ'}</button>
          ${staff?`<a class="btn btn-outline-secondary btn-sm fw-bold" href="${staffUrl}" target="_blank" rel="noopener"><i class="bi bi-shield-check"></i> Staff</a>`:''}
        </div>
      </div>
    </div>`;
    row.appendChild(card);
  }
  function boot(){installRemoteSupportCardV752();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  const obs=new MutationObserver(()=>{clearTimeout(window.__haosV752RemoteEntryTimer);window.__haosV752RemoteEntryTimer=setTimeout(installRemoteSupportCardV752,120);});
  try{obs.observe(document.body,{childList:true,subtree:true});}catch(e){}
  setInterval(installRemoteSupportCardV752,1800);
  console.info('HAOS '+PATCH+' loaded');
})();
