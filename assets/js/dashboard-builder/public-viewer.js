(function () {
  'use strict';
  const VERSION='v70.137-dashboard-interactive-copilot';
  const $=id=>document.getElementById(id);
  const esc=value=>window.HAOSDashboardRenderer.esc(value);
  const state={token:'',project:null,rows:[],schema:[],public:{},filters:[],crossFilters:[]};

  function gas(fn,...args){return new Promise((resolve,reject)=>google.script.run.withSuccessHandler(resolve).withFailureHandler(error=>reject(error instanceof Error?error:new Error(String(error&&error.message||error))))[fn](...args));}
  function formatDate(value){if(!value)return '';const date=new Date(value);return Number.isNaN(date.getTime())?String(value):new Intl.DateTimeFormat('th-TH',{dateStyle:'long',timeStyle:'short',hourCycle:'h23'}).format(date);}
  function show(id){['dbPublicLoading','dbPublicGate','dbPublicError','dbPublicViewer'].forEach(name=>$(name).classList.toggle('db-hidden',name!==id));}
  function tokenFromLocation(){const match=location.pathname.match(/\/dashboard\/public\/([^/?#]+)/);if(match)return decodeURIComponent(match[1]);return new URLSearchParams(location.search).get('token')||'';}
  function fail(title,message){$('dbPublicErrorTitle').textContent=title;$('dbPublicErrorMessage').textContent=String(message||'กรุณาตรวจสอบลิงก์แล้วลองใหม่');show('dbPublicError');}
  function notify(icon,title,text){return window.Swal?Swal.fire({icon,title,text,confirmButtonText:'ตกลง'}):Promise.resolve(alert(`${title}\n${text||''}`));}

  function renderFilters(){
    const configs=(state.project.config&&state.project.config.filters)||[];state.filters=[];
    $('dbPublicViewerFilters').innerHTML=configs.map((filter,index)=>{
      const values=Array.from(new Set(state.rows.map(row=>String(row[filter.field]??'')).filter(Boolean))).slice(0,200);let control=`<input class="db-input" data-public-filter="${index}" data-filter-type="${esc(filter.type||'search')}" aria-label="${esc(filter.title||filter.field)}">`;
      if(filter.type==='dropdown'||filter.type==='multi')control=`<select class="db-select" ${filter.type==='multi'?'multiple':''} data-public-filter="${index}" data-filter-type="${esc(filter.type)}"><option value="">ทั้งหมด</option>${values.map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('')}</select>`;
      if(filter.type==='date')control=`<div style="display:flex;gap:5px"><input type="date" class="db-input" data-public-filter="${index}" data-filter-type="date" data-date-from><input type="date" class="db-input" data-public-filter="${index}" data-filter-type="date" data-date-to></div>`;
      if(filter.type==='number')control=`<div style="display:flex;gap:5px"><input type="number" class="db-input" placeholder="ต่ำสุด" data-public-filter="${index}" data-filter-type="number" data-number-min><input type="number" class="db-input" placeholder="สูงสุด" data-public-filter="${index}" data-filter-type="number" data-number-max></div>`;
      return `<label class="db-field"><span>${esc(filter.title||filter.field)}</span>${control}</label>`;
    }).join('');
  }
  function currentFilters(){
    const configs=(state.project.config&&state.project.config.filters)||[];
    return configs.map((config,index)=>{const inputs=Array.from(document.querySelectorAll(`[data-public-filter="${index}"]`));let value=inputs[0]?inputs[0].value:'';if(config.type==='multi'&&inputs[0])value=Array.from(inputs[0].selectedOptions).map(option=>option.value).filter(Boolean);if(config.type==='date')value={from:(inputs.find(input=>input.hasAttribute('data-date-from'))||{}).value||'',to:(inputs.find(input=>input.hasAttribute('data-date-to'))||{}).value||''};if(config.type==='number')value={min:(inputs.find(input=>input.hasAttribute('data-number-min'))||{}).value||'',max:(inputs.find(input=>input.hasAttribute('data-number-max'))||{}).value||''};return {field:config.field,type:config.type,value};});
  }
  function allFilters(){return currentFilters().concat(state.crossFilters);}
  function renderInteractions(){const bar=$('dbPublicViewerInteractions');bar.classList.toggle('db-hidden',!state.crossFilters.length);bar.innerHTML=state.crossFilters.length?`<strong><i class="bi bi-funnel-fill"></i> กรองจากกราฟ</strong>${state.crossFilters.map((filter,index)=>`<button class="db-interaction-chip" type="button" data-public-cross-remove="${index}">${esc(filter.field)}: ${esc(filter.value)} <i class="bi bi-x"></i></button>`).join('')}<button class="db-btn" type="button" data-public-cross-clear><i class="bi bi-arrow-counterclockwise"></i> ล้าง</button>`:'';}
  function toggleCrossFilter(detail){if(!detail||!detail.field)return;const index=state.crossFilters.findIndex(filter=>filter.field===detail.field);if(index>=0&&String(state.crossFilters[index].value)===String(detail.value))state.crossFilters.splice(index,1);else{const next={field:detail.field,type:'dropdown',value:String(detail.value)};if(index>=0)state.crossFilters[index]=next;else state.crossFilters.push(next);}draw();}
  function draw(){renderInteractions();const interaction=state.project.config&&state.project.config.interaction||{};HAOSDashboardRenderer.render($('dbPublicViewerCanvas'),state.project,state.rows,{filters:allFilters(),interactive:{crossFilter:interaction.crossFilter!==false,drilldown:false},onChartFilter:toggleCrossFilter});}
  function renderDashboard(result){
    state.project=result.project||{};state.rows=result.rows||[];state.schema=result.schema||[];state.public=result.public||{};
    document.title=`${state.project.title||'Public Dashboard'} | Health Assistant OS`;$('dbPublicViewerTitle').textContent=state.project.title||'Public Dashboard';$('dbPublicViewerDescription').textContent=state.project.description||'ไม่มีคำอธิบาย';
    const meta=[];if(state.project.department)meta.push(`<span><i class="bi bi-building"></i> ${esc(state.project.department)}</span>`);meta.push(`<span><i class="bi bi-table"></i> ${state.rows.length.toLocaleString('th-TH')} รายการ</span>`);if(state.public.expiresAt)meta.push(`<span><i class="bi bi-hourglass-split"></i> เปิดได้ถึง ${esc(formatDate(state.public.expiresAt))}</span>`);$('dbPublicViewerMeta').innerHTML=meta.join('');
    $('dbPublicExport').classList.toggle('db-hidden',!state.public.allowExport);renderFilters();draw();show('dbPublicViewer');
  }
  async function openDashboard(pin){
    $('dbPublicPinSubmit').disabled=true;
    try{const result=await gas('openDashboardPublicV7134',state.token,pin||'');if(!result||!result.success)throw new Error(result&&result.message||'เปิด Dashboard ไม่สำเร็จ');renderDashboard(result);}
    catch(error){if(/PIN/.test(error.message)){show('dbPublicGate');$('dbPublicPinInput').value='';$('dbPublicPinInput').focus();notify('error','PIN ไม่ถูกต้อง',error.message);}else fail('เปิด Dashboard ไม่สำเร็จ',error.message);}
    finally{$('dbPublicPinSubmit').disabled=false;}
  }
  async function boot(){
    state.token=tokenFromLocation();if(!state.token){fail('ลิงก์ไม่สมบูรณ์','ไม่พบรหัส Public Dashboard ในลิงก์นี้');return;}
    try{const result=await gas('getDashboardPublicBootstrapV7134',state.token);if(!result||!result.success)throw new Error(result&&result.message||'ตรวจสอบลิงก์ไม่สำเร็จ');const info=result.public||{};$('dbPublicGateTitle').textContent=info.title||'Dashboard นี้ป้องกันด้วย PIN';if(info.requiresPin){show('dbPublicGate');$('dbPublicPinInput').focus();}else await openDashboard('');}
    catch(error){fail('ลิงก์นี้ไม่พร้อมใช้งาน',error.message);}
  }

  $('dbPublicPinForm').addEventListener('submit',event=>{event.preventDefault();const pin=$('dbPublicPinInput').value.replace(/\D/g,'');if(!/^\d{4,8}$/.test(pin)){notify('warning','กรุณากรอก PIN','PIN ต้องเป็นตัวเลข 4–8 หลัก');return;}openDashboard(pin);});
  $('dbPublicPinInput').addEventListener('input',event=>{event.target.value=event.target.value.replace(/\D/g,'').slice(0,8);});
  $('dbPublicViewerCopy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);notify('success','คัดลอกลิงก์แล้ว','');}catch(_error){notify('warning','คัดลอกอัตโนมัติไม่สำเร็จ','กรุณาคัดลอกจากแถบที่อยู่ของเบราว์เซอร์');}});
  $('dbPublicExport').addEventListener('click',()=>{if(!state.public.allowExport)return;const rows=HAOSDashboardRenderer.filteredRows(state.rows,allFilters());const fields=state.schema.map(column=>column.name);HAOSDashboardRenderer.downloadCsv(rows,fields,state.project.title||'public-dashboard');});
  document.addEventListener('click',event=>{const remove=event.target.closest('[data-public-cross-remove]');if(remove){state.crossFilters.splice(Number(remove.dataset.publicCrossRemove),1);draw();return;}if(event.target.closest('[data-public-cross-clear]')){state.crossFilters=[];draw();}});
  $('dbPublicViewerFilters').addEventListener('haos:dashboard-reset-interactions',()=>{if(state.crossFilters.length){state.crossFilters=[];draw();}});
  document.addEventListener('change',event=>{if(event.target.dataset.publicFilter!=null)draw();});
  document.addEventListener('input',event=>{if(event.target.dataset.publicFilter==null)return;clearTimeout(state.filterTimer);state.filterTimer=setTimeout(draw,180);});
  boot();console.info(`HAOS ${VERSION} public viewer loaded`);
})();
