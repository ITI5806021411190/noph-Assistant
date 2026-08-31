(function () {
  'use strict';
  const VERSION='v70.132-dashboard-builder-entry';
  if(window.__HAOS_DASHBOARD_BUILDER_ENTRY__)return;
  window.__HAOS_DASHBOARD_BUILDER_ENTRY__=true;

  function currentUser(){try{if(typeof window.currentUser==='function')return window.currentUser()||{};}catch(e){}try{return window.user||user||{};}catch(e){return window.user||{};}}
  function phone(){return String(currentUser().phone||'').replace(/\D/g,'');}
  function showError(message){if(window.Swal)Swal.fire('เปิด Dashboard Builder ไม่สำเร็จ',message,'error');else alert(message);}
  window.openDashboardBuilderV7132=function(){
    const userPhone=phone();
    if(!userPhone){showError('ไม่พบเบอร์โทรจากบัญชีที่เข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่');return;}
    const target=window.open('about:blank','_blank');
    if(target){target.opener=null;target.document.write('<title>Dashboard Builder</title><p style="font-family:sans-serif;padding:30px">กำลังตรวจสอบสิทธิ์...</p>');}
    google.script.run.withSuccessHandler(result=>{
      if(!result||!result.success){if(target)target.close();showError(result&&result.message||'ไม่สามารถสร้าง session');return;}
      const url='/it-services/dashboard-builder?session='+encodeURIComponent(result.session);
      if(target)target.location.replace(url);else location.href=url;
    }).withFailureHandler(error=>{if(target)target.close();showError(error&&error.message||String(error));}).createDashboardBuilderSessionV7132(userPhone);
  };

  function install(){
    const pane=document.getElementById('itservices-pane');
    if(!pane||document.getElementById('dashboardBuilderCardV7132'))return;
    const rows=Array.from(pane.querySelectorAll('.row.g-3.mb-4,.row.g-3'));
    const row=rows.find(item=>item.querySelector('.it-service-card'))||rows[0];
    if(!row)return;
    const col=document.createElement('div');col.id='dashboardBuilderCardV7132';col.className='col-md-4';
    col.innerHTML='<div class="card h-100 it-service-card"><div class="card-body p-4 d-flex flex-column"><div class="mb-3 d-inline-flex align-items-center justify-content-center" style="width:48px;height:48px;border-radius:8px;background:#e8f3ff;color:#1677ff;font-size:24px"><i class="bi bi-grid-1x2-fill"></i></div><h6 class="fw-bold">Dashboard Builder</h6><p class="text-muted small flex-grow-1">สร้าง Dashboard จากข้อมูล HAOS, Excel, CSV หรือ Google Sheets ได้ด้วยตนเอง</p><button class="btn btn-primary btn-sm fw-bold align-self-start" type="button" onclick="openDashboardBuilderV7132()"><i class="bi bi-box-arrow-up-right"></i> เปิด Dashboard Builder</button></div></div>';
    row.appendChild(col);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  const observer=new MutationObserver(()=>{clearTimeout(window.__haosDashboardBuilderTimer);window.__haosDashboardBuilderTimer=setTimeout(install,120);});
  try{observer.observe(document.body,{childList:true,subtree:true});}catch(e){}
  setInterval(install,2000);
  console.info('HAOS '+VERSION+' loaded');
})();
