// Extracted from index.html: haos-v70-59-remote-minutes-schedule-polish-script
(function(){
  const PATCH='v70.59-remote-minutes-schedule-polish';
  if(window.__HAOS_V759_REMOTE_MINUTES_SCHEDULE__)return;
  window.__HAOS_V759_REMOTE_MINUTES_SCHEDULE__=true;
  const $=id=>document.getElementById(id);
  const qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const cleanPhone=v=>String(v||'').replace(/'/g,'').replace(/\D/g,'').trim();
  const getUser=()=>{try{return window.user||user||{};}catch(e){return window.user||{};}};
  const userKey=()=>cleanPhone(getUser().phone)||'anon';
  const inProgress='อยู่ระหว่างการดำเนินการ';

  function applyScheduleDefaultStatusV759(){
    const status=$('unifiedScheduleStatusV702');
    let changed=false;
    if(status){
      status.title='ค่าเริ่มต้นแสดงเฉพาะงานที่อยู่ระหว่างการดำเนินการ ถ้าตารางว่างไม่ได้แปลว่างานหาย ให้กดแสดงตัวกรองแล้วเปลี่ยนสถานะเป็นทั้งหมด';
      if(!status.dataset.v759Defaulted && !status.value){
        status.value=inProgress;
        status.dataset.v759Defaulted='1';
        changed=true;
      }
    }
    const sort=$('unifiedScheduleSortV702');
    if(sort && !sort.value) sort.value='upcoming';
    return changed;
  }
  function decorateScheduleLegendV759(){
    const scope=$('unifiedScheduleScopeV702');
    const legend=$('haosScheduleLegendV739');
    if(!scope||!legend)return;
    [['.my','my','ส่วนตัว'],['.dept','dept','กลุ่มงาน']].forEach(([sel,val,label])=>{
      const el=legend.querySelector(sel);
      if(!el)return;
      el.classList.add('haos-v759-scope-click');
      el.setAttribute('role','button');
      el.setAttribute('tabindex','0');
      el.title='กดเพื่อแสดงเฉพาะงาน'+label;
      el.classList.toggle('active',scope.value===val);
      if(!el.dataset.v759Hook){
        el.dataset.v759Hook='1';
        const run=()=>{scope.value=scope.value===val?'':val;window.haosSchedulePageV739=1;renderUnifiedScheduleV702();};
        el.addEventListener('click',run);
        el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();run();}});
      }
    });
  }
  function decorateScheduleEmptyV759(){
    const status=$('unifiedScheduleStatusV702')?.value||'';
    const listBox=$('unifiedScheduleListV702');
    if(!listBox||status!==inProgress)return;
    const empty=listBox.querySelector('tbody td[colspan]');
    if(empty && /ไม่พบรายการ/.test(empty.textContent||'')){
      empty.innerHTML='<div class="haos-v759-empty-note"><i class="bi bi-info-circle"></i> ตอนนี้ระบบแสดงเฉพาะงานสถานะ “อยู่ระหว่างการดำเนินการ” ถ้าต้องการดูงานทั้งหมด ให้กด “แสดงตัวกรอง” แล้วเปลี่ยนสถานะเป็น “ทั้งหมด”</div>';
    }
  }
  const prevRenderScheduleV759=window.renderUnifiedScheduleV702;
  window.renderUnifiedScheduleV702=function(){
    const first=prevRenderScheduleV759?prevRenderScheduleV759.apply(this,arguments):undefined;
    if(applyScheduleDefaultStatusV759() && prevRenderScheduleV759) prevRenderScheduleV759.apply(this,arguments);
    decorateScheduleLegendV759();
    decorateScheduleEmptyV759();
    return first;
  };
  window.resetUnifiedScheduleFiltersV702=function(){
    ['unifiedScheduleSearchV702','unifiedScheduleScopeV702','unifiedSchedulePeriodV702','unifiedSchedulePriorityV706','unifiedScheduleTagV706'].forEach(id=>{const el=$(id);if(el)el.value='';});
    if($('unifiedScheduleStatusV702')){$('unifiedScheduleStatusV702').value=inProgress;$('unifiedScheduleStatusV702').dataset.v759Defaulted='1';}
    if($('unifiedScheduleSortV702'))$('unifiedScheduleSortV702').value='upcoming';
    window.haosSchedulePageV739=1;
    renderUnifiedScheduleV702();
  };

  function itPrefKeyV759(){return 'haos_it_hub_pref_v737_'+userKey();}
  function readPrefsV759(){try{return JSON.parse(localStorage.getItem(itPrefKeyV759())||'{}');}catch(e){return {};}}
  function savePrefsV759(p){try{localStorage.setItem(itPrefKeyV759(),JSON.stringify(p||{}));}catch(e){}}
  function cleanModuleIdV759(text){return String(text||'module').trim().toLowerCase().replace(/\s+/g,'_').replace(/[^\w\u0E00-\u0E7F-]/g,'').slice(0,80)||'module';}
  function moduleCardsV759(){
    const pane=$('itservices-pane');
    const row=pane?.querySelector(':scope > .row.g-3.mb-4')||pane?.querySelector('.row.g-3.mb-4')||pane?.querySelector('.row.g-3');
    if(!row)return [];
    const seen=new Set();
    return Array.from(row.children).filter(el=>el.querySelector('.it-service-card,.card.h-100')).map((el,i)=>{
      const title=(el.querySelector('h6')?.textContent||el.dataset.moduleId||('โมดูล '+(i+1))).trim();
      const key=cleanModuleIdV759(title);
      if(seen.has(key))return null;
      seen.add(key);
      el.dataset.moduleId=el.dataset.moduleId||key;
      return {id:el.dataset.moduleId,title,el};
    }).filter(Boolean);
  }
  function applyITHubLayoutV759(){
    const cards=moduleCardsV759(); if(!cards.length)return;
    const pref=readPrefsV759(), order=pref.order||cards.map(c=>c.id), pins=pref.pins||{}, hidden=pref.hidden||{};
    const row=cards[0].el.parentElement;
    cards.sort((a,b)=>(pins[b.id]?1:0)-(pins[a.id]?1:0)||(order.indexOf(a.id)<0?999:order.indexOf(a.id))-(order.indexOf(b.id)<0?999:order.indexOf(b.id)));
    cards.forEach(c=>{c.el.classList.toggle('d-none',!!hidden[c.id]);c.el.querySelector('.it-service-card,.card.h-100')?.classList.toggle('haos-v737-pinned-card',!!pins[c.id]);row.appendChild(c.el);});
  }
  window.openITHubCustomizeV737=function(){
    const cards=moduleCardsV759(), pref=readPrefsV759();
    const cardIds=cards.map(c=>c.id);
    window.haosItOrderTempV759=(pref.order&&pref.order.length?pref.order:cardIds).filter(id=>cardIds.includes(id)).concat(cardIds.filter(id=>!(pref.order||[]).includes(id)));
    window.haosItPinsTempV759=Object.assign({},pref.pins||{});
    window.haosItHiddenTempV759=Object.assign({},pref.hidden||{});
    const render=()=>{
      const map=Object.fromEntries(cards.map(c=>[c.id,c]));
      const html='<div class="haos-v737-custom-list">'+window.haosItOrderTempV759.map((id,i)=>{const hid=!!window.haosItHiddenTempV759[id],pin=!!window.haosItPinsTempV759[id];return `<div class="haos-v746-custom-row ${hid?'hidden':''}"><div><b><i class="bi ${pin?'bi-star-fill text-warning':(hid?'bi-eye-slash text-muted':'bi-grid-3x3-gap text-primary')}"></i> ${esc(map[id]?.title||id)}</b><div class="small text-muted">${hid?'ซ่อนอยู่':'แสดงอยู่'}${pin?' • ปักหมุด':''}</div></div><div class="tools"><button class="btn btn-sm btn-outline-secondary" onclick="moveITHubModuleV759(${i},-1)"><i class="bi bi-arrow-up"></i></button><button class="btn btn-sm btn-outline-secondary" onclick="moveITHubModuleV759(${i},1)"><i class="bi bi-arrow-down"></i></button><button class="btn btn-sm ${pin?'btn-warning':'btn-outline-warning'}" onclick="pinITHubModuleTempV759('${esc(id)}')"><i class="bi bi-star"></i></button><button class="btn btn-sm ${hid?'btn-outline-success':'btn-outline-danger'}" onclick="hideITHubModuleTempV759('${esc(id)}')"><i class="bi ${hid?'bi-eye':'bi-eye-slash'}"></i></button></div></div>`;}).join('')+'</div>';
      const box=$('itCustomizeListV759'); if(box)box.innerHTML=html; return html;
    };
    window.moveITHubModuleV759=(i,dir)=>{const a=window.haosItOrderTempV759,j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];render();};
    window.pinITHubModuleTempV759=id=>{window.haosItPinsTempV759[id]=!window.haosItPinsTempV759[id];render();};
    window.hideITHubModuleTempV759=id=>{window.haosItHiddenTempV759[id]=!window.haosItHiddenTempV759[id];render();};
    Swal.fire({title:'จัดเรียง IT Services Hub',width:860,html:'<div id="itCustomizeListV759">'+render()+'</div><div class="small text-muted mt-2 text-start">ระบบตัดรายการโมดูลซ้ำอัตโนมัติ โดยเฉพาะหน้าจอแท็บเล็ตที่ Bootstrap อาจ render ซ้ำจาก patch เก่า</div>',showCancelButton:true,confirmButtonText:'บันทึก',cancelButtonText:'ยกเลิก'}).then(r=>{if(!r.isConfirmed)return;savePrefsV759({order:window.haosItOrderTempV759,pins:window.haosItPinsTempV759,hidden:window.haosItHiddenTempV759});applyITHubLayoutV759();});
  };

  const minState={page:1,pageSize:20,filtersOpen:false,q:'',date:'',owner:''};
  const canEditMinute=item=>{const u=getUser();const role=String(u.role||'');return role==='Super Admin'||role==='Admin'||cleanPhone(item.recorderPhone)===cleanPhone(u.phone);};
  function minutesText(item){
    return [`รายงานการประชุม: ${item.title||'-'}`,`วันที่: ${item.date||'-'}`,`สถานที่: ${item.location||'-'}`,`ประธาน: ${item.chairman||'-'}`,`ผู้จด: ${item.recorderName||'-'}`,`กลุ่มงาน: ${item.department||'-'}`,'','ผู้เข้าร่วม:',item.attendees||'-','','วาระ/สาระสำคัญ:',item.agenda||'-','','สรุปผล/มติ/ข้อสั่งการ:',item.conclusion||'-',item.docUrl?'\nGoogle Doc: '+item.docUrl:'',item.pdfUrl?'PDF: '+item.pdfUrl:''].filter(Boolean).join('\n');
  }
  function installMinutesToolbarV759(){
    const panel=$('itMinutesPanel'); if(!panel)return;
    const head=panel.querySelector('.card-header .d-flex.gap-2');
    if(head&&!$('itMinutesFilterToggleV759'))head.insertAdjacentHTML('afterbegin','<button id="itMinutesFilterToggleV759" class="btn btn-sm btn-outline-primary" onclick="toggleItMinutesFiltersV759()"><i class="bi bi-funnel"></i> ตัวกรอง</button>');
    const body=panel.querySelector('.card-body');
    if(body&&!$('itMinutesFilterBoxV759'))body.insertAdjacentHTML('afterbegin',`<div id="itMinutesFilterBoxV759" class="haos-v759-min-filter">
      <div class="row g-2 align-items-end">
        <div class="col-md-5"><label class="small fw-bold">ค้นหา</label><input id="itMinutesSearchV759" class="form-control" placeholder="หัวข้อ สถานที่ วาระ มติ..." oninput="filterItMinutesV759()"></div>
        <div class="col-md-3"><label class="small fw-bold">วันที่</label><input id="itMinutesDateV759" type="date" class="form-control" onchange="filterItMinutesV759()"></div>
        <div class="col-md-3"><label class="small fw-bold">ผู้จด/กลุ่มงาน</label><input id="itMinutesOwnerV759" class="form-control" placeholder="ชื่อหรือกลุ่มงาน" oninput="filterItMinutesV759()"></div>
        <div class="col-md-1 d-grid"><button class="btn btn-outline-secondary" onclick="resetItMinutesFiltersV759()"><i class="bi bi-arrow-counterclockwise"></i></button></div>
      </div>
    </div>`);
  }
  window.toggleItMinutesFiltersV759=()=>{minState.filtersOpen=!minState.filtersOpen;$('itMinutesFilterBoxV759')?.classList.toggle('show',minState.filtersOpen);};
  window.filterItMinutesV759=()=>{minState.q=String($('itMinutesSearchV759')?.value||'').toLowerCase().trim();minState.date=$('itMinutesDateV759')?.value||'';minState.owner=String($('itMinutesOwnerV759')?.value||'').toLowerCase().trim();minState.page=1;renderItMinutes();};
  window.resetItMinutesFiltersV759=()=>{['itMinutesSearchV759','itMinutesDateV759','itMinutesOwnerV759'].forEach(id=>{const el=$(id);if(el)el.value='';});minState.q='';minState.date='';minState.owner='';minState.page=1;renderItMinutes();};
  function filteredMinutes(){
    let list=(typeof itMinutesGlobal!=='undefined'?itMinutesGlobal:[])||[];
    return list.filter(x=>(!minState.q||String([x.title,x.location,x.chairman,x.attendees,x.agenda,x.conclusion].join(' ')).toLowerCase().includes(minState.q))&&(!minState.date||String(x.date||'')===minState.date)&&(!minState.owner||String([x.recorderName,x.department].join(' ')).toLowerCase().includes(minState.owner)));
  }
  function minutesPager(total){
    const pages=Math.max(1,Math.ceil(total/minState.pageSize)); if(minState.page>pages)minState.page=pages;
    if(total<=minState.pageSize)return '';
    return `<div class="haos-v759-min-pager"><span>แสดง ${((minState.page-1)*minState.pageSize)+1}-${Math.min(total,minState.page*minState.pageSize)} จาก ${total} รายการ</span><button class="btn btn-sm btn-outline-primary" ${minState.page<=1?'disabled':''} onclick="setItMinutesPageV759(${minState.page-1})"><i class="bi bi-chevron-left"></i></button><span>หน้า ${minState.page}/${pages}</span><button class="btn btn-sm btn-outline-primary" ${minState.page>=pages?'disabled':''} onclick="setItMinutesPageV759(${minState.page+1})"><i class="bi bi-chevron-right"></i></button></div>`;
  }
  window.setItMinutesPageV759=p=>{minState.page=Number(p)||1;renderItMinutes();};
  window.renderItMinutes=function(){
    installMinutesToolbarV759();
    const body=$('itMinutesTableBody'); if(!body)return;
    const data=filteredMinutes();
    if(!data.length){body.innerHTML='<tr><td colspan="5" class="text-center py-4 text-muted">ยังไม่มีรายงานการประชุมตามตัวกรอง</td></tr>';return;}
    const start=(minState.page-1)*minState.pageSize, page=data.slice(start,start+minState.pageSize);
    body.innerHTML=page.map(item=>{
      const docs=`${item.docUrl?`<a class="btn btn-sm btn-outline-primary" target="_blank" href="${esc(item.docUrl)}"><i class="bi bi-file-earmark-word"></i> Doc</a>`:''} ${item.pdfUrl?`<a class="btn btn-sm btn-outline-danger" target="_blank" href="${esc(item.pdfUrl)}"><i class="bi bi-file-pdf"></i> PDF</a>`:''}`;
      return `<tr><td class="ps-4"><div class="fw-bold">${esc(item.title||'-')}</div><small class="text-muted">${esc((item.agenda||'').slice(0,120))}</small></td><td>${esc(item.date||'-')}<br><small class="text-muted">${esc(item.location||'-')}</small></td><td>${esc(item.recorderName||'-')}<br><small class="text-muted">${esc(item.department||'')}</small></td><td>${docs||'<span class="text-muted">-</span>'}</td><td class="pe-4"><div class="haos-v759-min-actions"><button class="btn btn-sm btn-outline-primary" onclick="openItMinutesDetail('${esc(item.id)}')"><i class="bi bi-eye"></i></button>${canEditMinute(item)?`<button class="btn btn-sm btn-outline-warning text-dark" onclick="editItMinutesV759('${esc(item.id)}')"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" onclick="deleteItMinutes('${esc(item.id)}')"><i class="bi bi-trash"></i></button>`:''}</div></td></tr>`;
    }).join('')+`<tr><td colspan="5">${minutesPager(data.length)}</td></tr>`;
  };
  window.openItMinutesDetail=function(id){
    const item=((typeof itMinutesGlobal!=='undefined'?itMinutesGlobal:[])||[]).find(x=>String(x.id)===String(id));
    if(!item)return Swal.fire('ไม่พบข้อมูล','กรุณาโหลดข้อมูลใหม่','warning');
    Swal.fire({title:'รายละเอียดรายงานการประชุม',width:900,showConfirmButton:false,showCloseButton:true,html:`<div class="haos-v759-min-detail" id="itMinutesDetailCaptureV759"><div class="hero"><h5 class="fw-bold mb-1">${esc(item.title||'รายงานการประชุม')}</h5><div>${esc(item.date||'-')} · ${esc(item.location||'-')}</div></div><div class="row g-2 mb-2"><div class="col-md-6"><b>ประธาน:</b> ${esc(item.chairman||'-')}</div><div class="col-md-6"><b>ผู้จด:</b> ${esc(item.recorderName||'-')} · ${esc(item.department||'')}</div></div><b>ผู้เข้าร่วม</b><div class="box">${esc(item.attendees||'-')}</div><b>วาระ/สาระสำคัญ</b><div class="box">${esc(item.agenda||'-')}</div><b>สรุปผล/มติ/ข้อสั่งการ</b><div class="box">${esc(item.conclusion||'-')}</div></div><div class="haos-v759-min-toolbar"><button class="btn btn-outline-dark" onclick="printItMinutesDetailV759()"><i class="bi bi-printer"></i> พิมพ์</button><button class="btn btn-outline-success" onclick="copyItMinutesTextV759('${esc(id)}')"><i class="bi bi-clipboard"></i> คัดลอกข้อความ</button><button class="btn btn-outline-info" onclick="downloadItMinutesImageV759()"><i class="bi bi-image"></i> โหลดรูปภาพ</button><button class="btn btn-outline-secondary" onclick="showItMinutesQrV759('${esc(id)}')"><i class="bi bi-qr-code"></i> สร้าง QR Code</button>${item.docUrl?`<a class="btn btn-outline-primary" target="_blank" href="${esc(item.docUrl)}"><i class="bi bi-file-earmark-word"></i> เปิด Google Docs</a>`:''}${item.pdfUrl?`<a class="btn btn-outline-danger" target="_blank" href="${esc(item.pdfUrl)}"><i class="bi bi-file-pdf"></i> เปิด PDF</a>`:''}</div>`});
  };
  window.editItMinutesV759=function(id){
    const item=((typeof itMinutesGlobal!=='undefined'?itMinutesGlobal:[])||[]).find(x=>String(x.id)===String(id));
    if(!item)return Swal.fire('ไม่พบข้อมูล','กรุณาโหลดข้อมูลใหม่','warning');
    openItMinutesCreate(Object.assign({},item,{minutesId:item.id}), 'กำลังแก้ไขรายงานเดิม ระบบจะสร้าง Google Doc/PDF ฉบับอัปเดตใหม่');
  };
  const oldOpenCreate=window.openItMinutesCreate;
  window.openItMinutesCreate=function(prefill,note){
    prefill=prefill||{};
    if(!prefill.minutesId && oldOpenCreate)return oldOpenCreate.apply(this,arguments);
    const val=k=>esc(prefill[k]||'');
    Swal.fire({title:'แก้ไขรายงานการประชุม',width:900,html:`<div class="text-start"><div class="alert alert-info small">${esc(note||'แก้ไขข้อมูลรายงานการประชุม')}</div><div class="mb-2"><label class="small fw-bold">หัวข้อการประชุม</label><input id="itmTitleEditV759" class="form-control" value="${val('title')}"></div><div class="row g-2 mb-2"><div class="col-md-6"><label class="small fw-bold">วันที่</label><input id="itmDateEditV759" type="date" class="form-control" value="${val('date')}"></div><div class="col-md-6"><label class="small fw-bold">สถานที่</label><input id="itmLocationEditV759" class="form-control" value="${val('location')}"></div></div><div class="mb-2"><label class="small fw-bold">ประธาน</label><input id="itmChairmanEditV759" class="form-control" value="${val('chairman')}"></div><div class="mb-2"><label class="small fw-bold">ผู้เข้าร่วม</label><textarea id="itmAttendeesEditV759" class="form-control" rows="2">${val('attendees')}</textarea></div><div class="mb-2"><label class="small fw-bold">วาระ/สาระสำคัญ</label><textarea id="itmAgendaEditV759" class="form-control" rows="5">${val('agenda')}</textarea></div><div class="mb-2"><label class="small fw-bold">สรุปผล/มติ/ข้อสั่งการ</label><textarea id="itmConclusionEditV759" class="form-control" rows="4">${val('conclusion')}</textarea></div></div>`,showCancelButton:true,confirmButtonText:'บันทึกการแก้ไข',cancelButtonText:'ยกเลิก',preConfirm:()=>{const payload={minutesId:prefill.minutesId,title:$('itmTitleEditV759').value.trim(),date:$('itmDateEditV759').value,location:$('itmLocationEditV759').value.trim(),chairman:$('itmChairmanEditV759').value.trim(),attendees:$('itmAttendeesEditV759').value.trim(),agenda:$('itmAgendaEditV759').value.trim(),conclusion:$('itmConclusionEditV759').value.trim(),recorderPhone:prefill.recorderPhone||getUser().phone,recorderName:prefill.recorderName||getUser().fullName,department:prefill.department||getUser().department,relatedScheduleId:prefill.relatedScheduleId||'',audioFileUrl:prefill.audioFileUrl||''};if(!payload.title){Swal.showValidationMessage('กรุณาระบุหัวข้อการประชุม');return false;}return payload;}}).then(async r=>{if(!r.isConfirmed)return;Swal.fire({title:'กำลังบันทึกการแก้ไข...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});try{const res=await gasRunPromise_('updateMeetingMinutesV759',[r.value,getUser().phone]);if(!res||!res.success)throw new Error(res?.message||'แก้ไขไม่สำเร็จ');Swal.fire({icon:'success',title:'แก้ไขรายงานแล้ว',html:`${res.docUrl?`<a class="btn btn-outline-primary m-1" target="_blank" href="${esc(res.docUrl)}">เปิด Google Doc</a>`:''}${res.pdfUrl?`<a class="btn btn-outline-danger m-1" target="_blank" href="${esc(res.pdfUrl)}">เปิด PDF</a>`:''}`});loadItMinutes();}catch(e){Swal.fire('ผิดพลาด',e.message||String(e),'error');}});
  };
  window.copyItMinutesTextV759=async id=>{const item=((typeof itMinutesGlobal!=='undefined'?itMinutesGlobal:[])||[]).find(x=>String(x.id)===String(id));if(!item)return;try{await navigator.clipboard.writeText(minutesText(item));Swal.fire({icon:'success',title:'คัดลอกข้อความแล้ว',timer:900,showConfirmButton:false});}catch(e){Swal.fire('คัดลอกไม่ได้',minutesText(item),'warning');}};
  window.printItMinutesDetailV759=()=>{const el=$('itMinutesDetailCaptureV759');if(!el)return;const w=window.open('','_blank');w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Meeting Minutes</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"><style>body{font-family:Prompt,Arial,sans-serif;padding:24px}.hero{background:#2563eb;color:#fff;border-radius:16px;padding:16px}.box{white-space:pre-wrap;border:1px solid #cbd5e1;border-radius:12px;padding:12px;margin-bottom:10px}</style></head><body>'+el.innerHTML+'</body></html>');w.document.close();setTimeout(()=>w.print(),350);};
  window.downloadItMinutesImageV759=async()=>{const el=$('itMinutesDetailCaptureV759');if(!el||typeof html2canvas==='undefined')return Swal.fire('ไม่พร้อมใช้งาน','ไม่พบเครื่องมือสร้างรูปภาพ','warning');const canvas=await html2canvas(el,{scale:2,backgroundColor:'#ffffff',useCORS:true});const a=document.createElement('a');a.download='meeting_minutes_'+Date.now()+'.png';a.href=canvas.toDataURL('image/png');a.click();};
  window.downloadItMinutesQrV759=async()=>{const box=$('itMinutesQrV759');if(!box)return Swal.fire('ยังไม่มี QR Code','กรุณาเปิด QR Code ก่อน','warning');let canvas=box.querySelector('canvas');const img=box.querySelector('img');if(!canvas&&img){if(!img.complete)await new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;});canvas=document.createElement('canvas');canvas.width=img.naturalWidth||220;canvas.height=img.naturalHeight||220;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);}if(!canvas)return Swal.fire('ดาวน์โหลดไม่ได้','ไม่พบรูป QR Code สำหรับดาวน์โหลด','warning');const a=document.createElement('a');a.download='meeting_minutes_qr_'+Date.now()+'.png';a.href=canvas.toDataURL('image/png');a.click();};
  window.showItMinutesQrV759=id=>{const item=((typeof itMinutesGlobal!=='undefined'?itMinutesGlobal:[])||[]).find(x=>String(x.id)===String(id));const url=item?.docUrl||item?.pdfUrl||'';if(!url)return Swal.fire('ยังไม่มีลิงก์เอกสาร','','warning');window.__itMinutesQrUrlV759=url;Swal.fire({title:'QR Code รายงานการประชุม',html:`<div class="small text-break mb-2">${esc(url)}</div><div id="itMinutesQrV759" class="d-flex justify-content-center"></div><div class="d-flex flex-wrap gap-2 justify-content-center mt-3"><button class="btn btn-outline-success" onclick="navigator.clipboard.writeText(window.__itMinutesQrUrlV759||'')"><i class="bi bi-link-45deg"></i> คัดลอกลิงก์</button><button class="btn btn-outline-primary" onclick="downloadItMinutesQrV759()"><i class="bi bi-download"></i> ดาวน์โหลด QR Code</button></div>`,didOpen:()=>{const box=$('itMinutesQrV759');if(box&&window.QRCode)new QRCode(box,{text:url,width:220,height:220});}});};

  function bootV759(){applyScheduleDefaultStatusV759();decorateScheduleLegendV759();decorateScheduleEmptyV759();applyITHubLayoutV759();installMinutesToolbarV759();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootV759,{once:true});else bootV759();
  setTimeout(()=>{try{renderUnifiedScheduleV702();}catch(e){}bootV759();},1000);
  setInterval(bootV759,1600);
  console.info('HAOS '+PATCH+' loaded');
})();
