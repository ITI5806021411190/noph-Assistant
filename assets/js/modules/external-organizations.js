// Extracted from index.html: haos-v70-60-external-orgs-script
(function(){
  const PATCH='v70.60-external-orgs';
  if(window.__HAOS_V760_EXTERNAL_ORGS__)return;
  window.__HAOS_V760_EXTERNAL_ORGS__=true;
  const $=id=>document.getElementById(id);
  const qa=(sel,root=document)=>Array.from((root||document).querySelectorAll(sel));
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const phone=v=>String(v??'').replace(/\D/g,'');
  function userObj(){try{if(typeof window.currentUser==='function')return window.currentUser()||{};}catch(e){}try{return window.user||user||{};}catch(e){return window.user||{};}}
  function actorPhoneV760(){const u=userObj();return phone(u.phone||u.userPhone||u.mobile||u.tel||u.username||$('loginPhone')?.value||'');}
  function roleOf(){const u=userObj();return clean(u.accountRole||u.role||u.effectiveRole||u.profileRole||'User');}
  function isSuper(){return /^super\s*admin$/i.test(roleOf())||actorPhoneV760()==='0868246621';}
  function isAdmin(){return /^(admin|super\s*admin)$/i.test(roleOf())||isSuper();}
  function canManageExternalOrgsV760(){return isSuper()||!!window.haosExternalOrganizationsCanManageV760;}
  function gas(fn,args){if(typeof window.gasRunPromise_==='function')return window.gasRunPromise_(fn,args||[]);return new Promise((resolve,reject)=>{try{google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[fn].apply(google.script.run,args||[]);}catch(e){reject(e);}});}
  function orgValue(org){const name=clean(org?.name||org?.value||'');return /^หน่วยงานภายนอก\s*:/i.test(name)?name:`หน่วยงานภายนอก: ${name}`;}

  window.haosExternalOrganizationsV760=[];
  window.haosExternalOrganizationsCanManageV760=false;

  function syncExternalOrgOptionsV760(){
    const active=(window.haosExternalOrganizationsV760||[]).filter(o=>o&&o.active!==false&&clean(o.name||o.value));
    const selects=['regDepartment','addUDept','profDept','profileDeptV729','fpDeptV748','fpDeptV727','adminUserDeptV748'].map($).filter(Boolean);
    selects.forEach(sel=>{
      const current=sel.value;
      qa('option[data-external-org-v760="1"]',sel).forEach(o=>o.remove());
      if(active.length){
        const divider=document.createElement('option');
        divider.disabled=true;
        divider.dataset.externalOrgV760='1';
        divider.textContent='--- หน่วยงานภายนอก ---';
        sel.appendChild(divider);
      }
      active.forEach(org=>{
        const value=orgValue(org);
        if(!value)return;
        if(qa('option',sel).some(o=>clean(o.value)===value))return;
        const opt=document.createElement('option');
        opt.value=value;
        opt.textContent=value;
        opt.dataset.externalOrgV760='1';
        sel.appendChild(opt);
      });
      if(current && qa('option',sel).some(o=>o.value===current))sel.value=current;
    });
    try{if(typeof window.renderAdminUsersV750==='function'&&$('userManageTable'))window.renderAdminUsersV750();}catch(e){}
  }

  function renderExternalOrgPanelV760(){
    const box=$('haosExternalOrgListV760');
    if(!box)return;
    const list=window.haosExternalOrganizationsV760||[];
    const can=canManageExternalOrgsV760();
    if($('haosExternalOrgAddBtnV760'))$('haosExternalOrgAddBtnV760').disabled=!can;
    if(!list.length){
      box.innerHTML='<div class="text-muted small p-2">ยังไม่มีหน่วยงานภายนอก กด “เพิ่มหน่วยงานภายนอก” เพื่อเปิดให้ผู้ใช้งานภายนอกเลือกตอนสมัครสมาชิก</div>';
      return;
    }
    box.innerHTML=list.map(org=>{
      const active=org.active!==false;
      const status=active?'<span class="haos-v760-external-badge active"><i class="bi bi-check-circle"></i> เปิดใช้งาน</span>':'<span class="haos-v760-external-badge inactive"><i class="bi bi-pause-circle"></i> ปิดใช้งาน</span>';
      const action=can?`<button class="btn btn-sm ${active?'btn-outline-warning':'btn-outline-success'}" onclick="setExternalOrganizationActiveUiV760('${esc(org.id)}',${active?'false':'true'})"><i class="bi ${active?'bi-pause-circle':'bi-play-circle'}"></i> ${active?'ปิดใช้งาน':'เปิดใช้งาน'}</button>`:'';
      return `<div class="haos-v760-external-item ${active?'':'inactive'}">
        <div>
          <b><i class="bi bi-building-add"></i> ${esc(orgValue(org))}</b>
          <div class="small text-muted">${esc(org.note||org.contact||'ไม่มีข้อมูลเพิ่มเติม')}</div>
        </div>
        <div class="d-flex align-items-center gap-2 flex-wrap">${status}${action}</div>
      </div>`;
    }).join('');
  }

  function installExternalOrgPanelV760(){
    const body=document.querySelector('#userManageModal .modal-body');
    if(!body||$('haosExternalOrgPanelV760'))return;
    const first=body.querySelector('.card.mb-4')||body.firstElementChild;
    const html=`<div id="haosExternalOrgPanelV760" class="card haos-v760-external-card">
      <div class="card-body">
        <div class="haos-v760-external-head">
          <div>
            <div class="haos-v760-external-title"><i class="bi bi-building-add text-primary"></i> หน่วยงานภายนอกสำหรับสมัครใช้งาน</div>
            <div class="haos-v760-external-sub">Super Admin เพิ่มชื่อหน่วยงานภายนอกก่อน ผู้สมัครภายนอกจึงจะเลือกหน่วยงานนั้นในหน้าสมัครสมาชิกได้</div>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <button id="haosExternalOrgReloadBtnV760" type="button" class="btn btn-outline-primary btn-sm fw-bold" onclick="loadExternalOrganizationsV760(true)"><i class="bi bi-arrow-clockwise"></i> โหลดใหม่</button>
            <button id="haosExternalOrgAddBtnV760" type="button" class="btn btn-success btn-sm fw-bold" onclick="openExternalOrganizationEditorV760()"><i class="bi bi-plus-circle"></i> เพิ่มหน่วยงานภายนอก</button>
          </div>
        </div>
        <div id="haosExternalOrgListV760" class="haos-v760-external-list"><div class="text-muted small p-2">กำลังโหลดหน่วยงานภายนอก...</div></div>
      </div>
    </div>`;
    if(first)first.insertAdjacentHTML('afterend',html);else body.insertAdjacentHTML('afterbegin',html);
    renderExternalOrgPanelV760();
  }

  window.loadExternalOrganizationsV760=async function(forAdmin){
    try{
      const actor=forAdmin?actorPhoneV760():'';
      const res=await gas('getExternalOrganizationsV760',[actor]);
      if(!res||!res.success)throw new Error(res?.message||'โหลดหน่วยงานภายนอกไม่สำเร็จ');
      window.haosExternalOrganizationsV760=res.data||[];
      window.haosExternalOrganizationsCanManageV760=!!res.canManage||isSuper();
      syncExternalOrgOptionsV760();
      renderExternalOrgPanelV760();
      return res;
    }catch(e){
      const box=$('haosExternalOrgListV760');
      if(box)box.innerHTML=`<div class="text-danger small p-2">${esc(e.message||String(e))}</div>`;
      return {success:false,message:e.message||String(e)};
    }
  };

  function ensureExternalOrgInlineFormV760(){
    const panel=$('haosExternalOrgPanelV760');
    if(!panel)return null;
    let form=$('haosExternalOrgFormV760');
    if(!form){
      const head=panel.querySelector('.haos-v760-external-head');
      const html=`<div id="haosExternalOrgFormV760" class="haos-v760-external-form d-none">
        <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-2">
          <div>
            <div class="fw-bold text-success"><i class="bi bi-building-add"></i> เพิ่มหน่วยงานภายนอก</div>
            <div class="small text-muted">เพิ่มเฉพาะชื่อหน่วยงานที่อนุญาตให้เจ้าหน้าที่ภายนอกเลือกตอนสมัคร ข้อมูลสมัครใช้งานยังใช้แบบเดียวกับเจ้าหน้าที่ภายใน</div>
          </div>
        </div>
        <div class="row g-2">
          <div class="col-md-5">
            <label class="small fw-bold mb-1">ชื่อหน่วยงานภายนอก *</label>
            <input id="extOrgNameV760" class="form-control" autocomplete="off" placeholder="เช่น รพ.สต.บ้าน..., เทศบาล..., โรงเรียน...">
          </div>
          <div class="col-md-7">
            <label class="small fw-bold mb-1">ข้อมูลเพิ่มเติม</label>
            <input id="extOrgNoteV760" class="form-control" autocomplete="off" placeholder="เช่น ผู้ประสานงาน เบอร์โทร หรือหมายเหตุสั้น ๆ">
          </div>
        </div>
        <div class="haos-v760-external-form-actions">
          <button type="button" class="btn btn-outline-secondary fw-bold" onclick="cancelExternalOrganizationFormV760()"><i class="bi bi-x-circle"></i> ยกเลิก</button>
          <button id="haosExternalOrgSaveBtnV760" type="button" class="btn btn-success fw-bold" onclick="saveExternalOrganizationInlineV760()"><i class="bi bi-check-circle"></i> บันทึกหน่วยงาน</button>
        </div>
      </div>`;
      if(head)head.insertAdjacentHTML('afterend',html);else panel.querySelector('.card-body')?.insertAdjacentHTML('afterbegin',html);
      form=$('haosExternalOrgFormV760');
    }
    return form;
  }

  window.cancelExternalOrganizationFormV760=function(){
    const form=$('haosExternalOrgFormV760');
    if(form)form.classList.add('d-none');
    if($('extOrgNameV760'))$('extOrgNameV760').value='';
    if($('extOrgNoteV760'))$('extOrgNoteV760').value='';
  };

  window.openExternalOrganizationEditorV760=function(){
    if(!canManageExternalOrgsV760())return Swal.fire('ไม่มีสิทธิ์','อนุญาตเฉพาะ Super Admin เพิ่มหน่วยงานภายนอก','warning');
    const form=ensureExternalOrgInlineFormV760();
    if(!form)return Swal.fire('ไม่พบพื้นที่ตั้งค่า','กรุณาปิดและเปิดหน้าจัดการผู้ใช้งานระบบใหม่อีกครั้ง','warning');
    form.classList.remove('d-none');
    form.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>$('extOrgNameV760')?.focus(),120);
  };

  window.saveExternalOrganizationInlineV760=async function(){
    if(!canManageExternalOrgsV760())return Swal.fire('ไม่มีสิทธิ์','อนุญาตเฉพาะ Super Admin','warning');
    const name=clean($('extOrgNameV760')?.value||'');
    const note=clean($('extOrgNoteV760')?.value||'');
    if(!name){
      $('extOrgNameV760')?.focus();
      return Swal.fire('ข้อมูลยังไม่ครบ','กรุณาระบุชื่อหน่วยงานภายนอก','warning');
    }
    const btn=$('haosExternalOrgSaveBtnV760');
    if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner-border spinner-border-sm me-1"></span> กำลังบันทึก...';}
    try{
      const res=await gas('saveExternalOrganizationV760',[actorPhoneV760(),{name,contact:'',note,active:true}]);
      if(!res||!res.success)throw new Error(res?.message||'บันทึกไม่สำเร็จ');
      window.haosExternalOrganizationsV760=res.data||[];
      window.haosExternalOrganizationsCanManageV760=true;
      syncExternalOrgOptionsV760();
      renderExternalOrgPanelV760();
      cancelExternalOrganizationFormV760();
      Swal.fire({icon:'success',title:'บันทึกแล้ว',text:'ผู้สมัครภายนอกสามารถเลือกหน่วยงานนี้ตอนสมัครสมาชิกได้แล้ว',timer:1500,showConfirmButton:false});
    }catch(e){
      Swal.fire('ผิดพลาด',e.message||String(e),'error');
    }finally{
      if(btn){btn.disabled=false;btn.innerHTML='<i class="bi bi-check-circle"></i> บันทึกหน่วยงาน';}
    }
  };

  window.setExternalOrganizationActiveUiV760=async function(id,nextActive){
    if(!canManageExternalOrgsV760())return Swal.fire('ไม่มีสิทธิ์','อนุญาตเฉพาะ Super Admin','warning');
    const org=(window.haosExternalOrganizationsV760||[]).find(o=>String(o.id)===String(id));
    const ok=await Swal.fire({title:nextActive?'เปิดใช้งานหน่วยงานนี้?':'ปิดใช้งานหน่วยงานนี้?',text:org?orgValue(org):'',icon:'question',showCancelButton:true,confirmButtonText:nextActive?'เปิดใช้งาน':'ปิดใช้งาน',cancelButtonText:'ยกเลิก'});
    if(!ok.isConfirmed)return;
    Swal.fire({title:'กำลังบันทึก...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
    try{
      const res=await gas('setExternalOrganizationActiveV760',[actorPhoneV760(),id,!!nextActive]);
      if(!res||!res.success)throw new Error(res?.message||'บันทึกไม่สำเร็จ');
      window.haosExternalOrganizationsV760=res.data||[];
      syncExternalOrgOptionsV760();
      renderExternalOrgPanelV760();
      Swal.fire({icon:'success',title:'บันทึกแล้ว',text:res.message,timer:1200,showConfirmButton:false});
    }catch(e){Swal.fire('ผิดพลาด',e.message||String(e),'error');}
  };

  const prevOpenUserManagementV760=window.openUserManagement;
  window.openUserManagement=function(){
    const r=prevOpenUserManagementV760?prevOpenUserManagementV760.apply(this,arguments):undefined;
    setTimeout(()=>{installExternalOrgPanelV760();loadExternalOrganizationsV760(true);},280);
    return r;
  };

  const prevOpenProfileEditorV760=window.openUserProfileEditorV729;
  if(typeof prevOpenProfileEditorV760==='function'){
    window.openUserProfileEditorV729=function(){
      const r=prevOpenProfileEditorV760.apply(this,arguments);
      setTimeout(syncExternalOrgOptionsV760,220);
      setTimeout(syncExternalOrgOptionsV760,650);
      return r;
    };
  }

  const prevShowSectionV760=window.showSection;
  if(typeof prevShowSectionV760==='function'){
    window.showSection=function(id){
      const r=prevShowSectionV760.apply(this,arguments);
      if(String(id)==='registerSection')setTimeout(()=>loadExternalOrganizationsV760(false),120);
      return r;
    };
  }

  function bootV760(){
    loadExternalOrganizationsV760(isAdmin());
    if($('userManageModal'))installExternalOrgPanelV760();
    syncExternalOrgOptionsV760();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootV760,{once:true});else bootV760();
  setInterval(syncExternalOrgOptionsV760,2200);
  console.info('HAOS '+PATCH+' loaded');
})();
