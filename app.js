let reports=[], position=null, miniMap, fullMap, boundaryData=null, boundaryLoad=null;
window.countyBoundariesLoaded=false;
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const state={token:sessionStorage.getItem('bw_token'),user:JSON.parse(sessionStorage.getItem('bw_user')||'null'),officers:[]};
const regionalOffices=['KeNHA Head Office','KeNHA Kisumu Regional Office','KeNHA Busia Regional Office','Other KeNHA Regional Office'];
function populateOfficeOptions(select,selectedOffice=''){
  select.replaceChildren(new Option('Select office',''),...regionalOffices.map(office=>new Option(office,office)));
  if(selectedOffice&&!regionalOffices.includes(selectedOffice))select.add(new Option(`${selectedOffice} (existing)`,selectedOffice));
  select.value=selectedOffice;
}
populateOfficeOptions($('#enrolOffice'));
const api=async(path,options={})=>{const headers={...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...(state.token?{Authorization:`Bearer ${state.token}`}:{})};const res=await fetch(`/api${path}`,{...options,headers:{...headers,...options.headers}});const data=await res.json().catch(()=>({message:'Unexpected server response.'}));if(!res.ok)throw new Error(data.message||'Request failed.');return data;};
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),4500)}
function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function formatKenyaTime(value){const date=value?new Date(value):new Date();if(Number.isNaN(date.getTime()))return 'time unavailable';return new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',dateStyle:'medium',timeStyle:'short'}).format(date);}
function getGreeting(){const hour=Number(new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',hour:'numeric',hourCycle:'h23'}).formatToParts(new Date()).find(part=>part.type==='hour').value);return hour>=5&&hour<12?'Good morning':hour>=12&&hour<17?'Good afternoon':'Good evening';}
function statusClass(s){return s.replace(' ','-')} function displayDate(value){return formatKenyaTime(value);}
function switchView(id){if(id==='dashboard'&&!state.token)id='staffLogin';$$('.view').forEach(x=>x.classList.remove('active'));$('#'+id).classList.add('active');$$('.nav-link').forEach(x=>x.classList.toggle('active',x.dataset.view===id));if(id==='dashboard'){const firstName=state.user?.name?.split(' ')[0]||'staff member';$('#dashTitle').textContent=`${getGreeting()}, ${firstName}.`;renderDashboard().then(()=>setTimeout(initMaps,80)).catch(handleAuthError);}}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));$('#backCitizen').onclick=()=>{if($('#home'))switchView('home');else window.location.assign('/')};
if($('#reportForm')){
  $('#locateBtn').onclick=()=>{if(!navigator.geolocation){toast('Location is not supported by this browser.');return}$('#locationLabel').textContent='Finding location…';navigator.geolocation.getCurrentPosition(p=>{position={lat:p.coords.latitude,lng:p.coords.longitude};$('#locationLabel').textContent='Location captured';$('#locationNote').textContent=`GPS captured: ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;},()=>{position={lat:-0.1022,lng:34.7617};$('#locationLabel').textContent='Sample location used';$('#locationNote').textContent='Location permission unavailable — a Kisumu corridor sample location is selected.';},{enableHighAccuracy:true,timeout:8000})};
  $('#photo').onchange=e=>$('#photoLabel').textContent=e.target.files[0]?e.target.files[0].name.slice(0,16)+' ✓':'Add photo';
  $('#contactConsent').onchange=e=>{const fields=$('#contactFields');fields.hidden=!e.target.checked;$('#contactEmail').required=e.target.checked&&!$('#contactPhone').value;$('#contactPhone').required=e.target.checked&&!$('#contactEmail').value;};
  $('#reportForm').onsubmit=async e=>{e.preventDefault();if(!position){toast('Please capture your location before sending the report.');return}const submitButton=$('#reportForm button[type="submit"]');const originalLabel=submitButton.innerHTML;submitButton.disabled=true;submitButton.textContent='Sending report…';const form=new FormData();['category','severity','description','roadName','landmark','contactEmail','contactPhone'].forEach(k=>form.append(k,$('#'+k).value));form.append('contactConsent',$('#contactConsent').checked);form.append('latitude',position.lat);form.append('longitude',position.lng);if($('#photo').files[0])form.append('photo',$('#photo').files[0]);try{const {report}=await api('/reports',{method:'POST',body:form});$('#reportForm').reset();$('#contactFields').hidden=true;position=null;$('#locationLabel').textContent='Use my location';$('#photoLabel').textContent='Add photo';$('#locationNote').textContent=`Report ${report.reference} was routed to ${report.office}. Keep this reference to track updates.`;toast(`Report sent successfully. Reference: ${report.reference}`);}catch(error){$('#locationNote').textContent=`Report could not be sent: ${error.message}`;toast(error.message);}finally{submitButton.disabled=false;submitButton.innerHTML=originalLabel;}};
}
if($('#trackForm'))$('#trackForm').onsubmit=async e=>{e.preventDefault();const target=$('#trackResult'),reference=$('#trackingId').value.trim().toUpperCase();if(!reference)return;try{const {report:r}=await api(`/reports/track/${encodeURIComponent(reference)}`);target.innerHTML=`<article class="track-card"><span class="status ${statusClass(r.status)}">${r.status}</span><h2>${escapeHtml(r.reference)} · ${escapeHtml(r.category)}</h2><p>${escapeHtml(r.description||'No further details provided.')}</p><p><strong>Road:</strong> ${escapeHtml(r.roadName||'Not specified')}<br><strong>Routed to:</strong> ${escapeHtml(r.office)}</p><small>Submitted ${displayDate(r.createdAt)} · ${r.repairPhotoCount} repair photo(s) attached</small></article>`;}catch(error){target.innerHTML=`<article class="track-card"><strong>Report unavailable</strong><p>${escapeHtml(error.message)}</p></article>`;}};
function setStaffControls(){const isAdmin=state.user?.role==='admin';const isOfficer=state.user?.role==='officer';const canViewContracts=['admin','coordinator','officer'].includes(state.user?.role);$('#enrollmentNav').hidden=!isAdmin;$('#managementNav').hidden=!isAdmin;$('#managementRecordsNav').hidden=!canViewContracts;$('#managementRecordsNav').textContent=isOfficer?'▣ Regional contracts':'▣ Contractors & payments';$('#managementRecordsDescription').textContent=isOfficer?'View contractors and award work from reports routed to your regional office.':'Manage contractors, procurements and payment approvals.';$('#addContractorBtn').hidden=isOfficer;$('#addPaymentBtn').hidden=isOfficer;$('#addProcurementBtn').hidden=isOfficer;$('#paymentPanel').hidden=isOfficer;}
function setStaffIdentity(user){const name=user?.name?.trim()||'Staff member';$('#staffName').textContent=name;$('#staffRole').textContent=user?.role||'Authenticated staff';$('#staffOffice').textContent=user?.office||'KERRA STAFF PORTAL';$('#staffAvatar').textContent=name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();}
if($('#loginForm'))$('#loginForm').onsubmit=async e=>{e.preventDefault();$('#loginError').textContent='';try{const data=await api('/auth/login',{method:'POST',body:JSON.stringify({email:$('#loginEmail').value,password:$('#loginPassword').value})});state.token=data.token;state.user=data.user;sessionStorage.setItem('bw_token',data.token);sessionStorage.setItem('bw_user',JSON.stringify(data.user));setStaffIdentity(data.user);setStaffControls();switchView('dashboard');}catch(error){$('#loginError').textContent=error.message;}};
function row(r,full=false){const icon=r.category==='Pothole'?'◉':'△',assignee=r.assignedTo?.name||(state.user?.role==='officer'?'Regional office queue':'Unassigned');const update=`<select class="status-update" data-report-id="${r.id}" aria-label="Update ${escapeHtml(r.reference)}"><option ${r.status==='New'?'selected':''}>New</option><option ${r.status==='In progress'?'selected':''}>In progress</option><option ${r.status==='Resolved'?'selected':''}>Resolved</option></select>`;const assignment=['admin','coordinator'].includes(state.user?.role)?`<select class="assignment-update" data-report-id="${r.id}" aria-label="Assign ${escapeHtml(r.reference)}"><option value="">Unassigned</option>${state.officers.map(o=>`<option value="${o._id}" ${r.assignedTo?.id===o._id?'selected':''}>${escapeHtml(o.name)}</option>`).join('')}</select>`:'';const photoButton=r.reporterPhotoUrl?`<button class="text-button" data-action="citizen-photo" data-report-id="${r.id}">View citizen photo</button> `:'';const deleteButton=state.user?.role==='admin'?` <button class="text-button delete-report-button" data-action="delete" data-report-id="${r.id}" aria-label="Delete report ${escapeHtml(r.reference)}">Delete report</button>`:'';const awardButton=state.user?.role==='officer'&&r.status!=='Resolved'?` <button class="text-button" data-action="award-contract" data-report-id="${r.id}">Award contractor</button>`:'';return full?`<div class="full-report"><span class="report-icon">${icon}</span><div class="report-info"><strong>${escapeHtml(r.category)}</strong><small>${escapeHtml(r.reference)} · ${escapeHtml(r.office)} · ${displayDate(r.createdAt)}</small><span class="audit-note">${escapeHtml(r.severity)} priority · ${escapeHtml(assignee)} · ${r.comments} comment(s)</span></div><span class="severity">${photoButton}${r.repairPhotoCount?`🔧 ${r.repairPhotoCount} repair photo(s)`:''}<br><button class="text-button" data-action="timeline" data-report-id="${r.id}">View timeline</button> <button class="text-button" data-action="comment" data-report-id="${r.id}">Add comment</button> <button class="text-button" data-action="repair" data-report-id="${r.id}">Add repair proof</button>${awardButton}${deleteButton}</span><span class="status ${statusClass(r.status)}">${r.status}</span>${update}${assignment}</div>`:`<div class="report-row"><span class="report-icon">${icon}</span><div class="report-info"><strong>${escapeHtml(r.category)} <small>· ${escapeHtml(r.reference)}</small></strong><small>${escapeHtml(r.office)} · ${displayDate(r.createdAt)}</small></div><span class="status ${statusClass(r.status)}">${r.status}</span></div>`}
async function renderDashboard(){const [reportData,staffData]=await Promise.all([api('/reports'),api('/staff/officers')]);reports=reportData.reports;state.officers=staffData.officers;const count=s=>reports.filter(r=>r.status===s).length;$('#newMetric').textContent=count('New');$('#progressMetric').textContent=count('In progress');$('#resolvedMetric').textContent=count('Resolved');$('#reportCount').textContent=reports.length;$('#attentionList').innerHTML=reports.filter(r=>r.status==='New').slice(0,4).map(r=>row(r)).join('')||'<p>No reports awaiting review.</p>';renderReports();}
function renderReports(){
  const s=$('#statusFilter').value,c=$('#categoryFilter').value;
  const items=reports.filter(r=>(s==='All'||r.status===s)&&(c==='All'||r.category===c));
  $('#reportsList').innerHTML=items.map(r=>row(r,true)).join('')||'<p>No reports match these filters.</p>';
  items.forEach((report,index)=>{
    const severity=$('#reportsList').children[index]?.querySelector('.severity');
    if(!severity)return;
    if(!severity.querySelector('[data-action="citizen-photo"]')){
      const citizenPhotoButton=document.createElement('button');
      citizenPhotoButton.type='button';
      citizenPhotoButton.className='text-button';
      citizenPhotoButton.textContent='View citizen photo';
      citizenPhotoButton.dataset.action='citizen-photo';
      citizenPhotoButton.dataset.reportId=report.id;
      citizenPhotoButton.addEventListener('click',()=>{
        if(report.reporterPhotoUrl)showPhoto(report.reporterPhotoUrl,`Citizen photo · ${report.reference}`);
        else toast('No citizen photo was attached to this report.');
      });
      severity.insertBefore(citizenPhotoButton,severity.firstChild);
      severity.insertBefore(document.createTextNode(' '),citizenPhotoButton.nextSibling);
    }
    if(report.repairPhotoUrls?.length){
      const repairPhotoButton=document.createElement('button');
      repairPhotoButton.type='button';
      repairPhotoButton.className='text-button';
      repairPhotoButton.textContent=`View repair photos (${report.repairPhotoUrls.length})`;
      repairPhotoButton.addEventListener('click',()=>showPhotos(report.repairPhotoUrls,`Repair photos · ${report.reference}`));
      severity.insertBefore(repairPhotoButton,severity.querySelector('br'));
      severity.insertBefore(document.createTextNode(' '),repairPhotoButton);
    }
  });
}
$('#reportsList').addEventListener('change',e=>{if(e.target.matches('.status-update'))window.updateStatus(e.target.dataset.reportId,e.target.value);if(e.target.matches('.assignment-update'))window.assignOfficer(e.target.dataset.reportId,e.target.value);});
$('#reportsList').addEventListener('click',e=>{const button=e.target.closest('button[data-action]');if(!button)return;const id=button.dataset.reportId;if(button.dataset.action==='timeline')window.showTimeline(id);if(button.dataset.action==='comment')window.addComment(id);if(button.dataset.action==='repair')window.addRepairPhoto(id);if(button.dataset.action==='delete')window.deleteReport(id);if(button.dataset.action==='award-contract')window.awardContract(id);if(button.dataset.action==='citizen-photo'){const report=reports.find(item=>item.id===id);if(report?.reporterPhotoUrl)showPhoto(report.reporterPhotoUrl,`Citizen photo · ${report.reference}`);}});
window.deleteReport=async id=>{const report=reports.find(item=>item.id===id);if(!report||state.user?.role!=='admin')return;if(!confirm(`Permanently delete report ${report.reference}? Its report details, comments and audit history will be removed. This cannot be undone.`))return;try{const {message}=await api(`/reports/${id}`,{method:'DELETE'});await renderDashboard();initMaps();toast(message);}catch(error){toast(error.message);}};
window.updateStatus=async(id,status)=>{try{await api(`/reports/${id}`,{method:'PATCH',body:JSON.stringify({status})});toast(`Report marked ${status}. The update is saved and audited.`);await renderDashboard();initMaps();}catch(error){toast(error.message);}};$('#statusFilter').onchange=renderReports;$('#categoryFilter').onchange=renderReports;
window.assignOfficer=async(id,assignedTo)=>{try{await api(`/reports/${id}`,{method:'PATCH',body:JSON.stringify({assignedTo})});toast('Officer assignment saved and recorded in the audit trail.');await renderDashboard();}catch(error){toast(error.message);}};
window.awardContract=async id=>{
  if(state.user?.role!=='officer'){toast('Only regional officers can award work from routed reports.');return;}
  const report=reports.find(item=>item.id===id);
  if(!report){toast('Report unavailable. Refresh the reports list and try again.');return;}
  try{
    const data=await api('/management');
    managementData=data;
    const contractors=data.contractors.filter(contractor=>contractor.status==='Active');
    if(!contractors.length){toast('No active contractors are registered to your regional office.');return;}
    $('#procurementForm').reset();
    $('#procurementFormError').textContent='';
    $('#procurementModalTitle').textContent=`Award work · ${report.reference}`;
    $('#procurementReportId').value=report.id;
    $('#procurementAwardContext').textContent=`Report ${report.reference} was automatically routed to ${report.office}. The award will be linked to this report.`;
    $('#procurementOffice').value=report.office;
    $('#procurementOffice').readOnly=true;
    $('#procurementTitle').value=`Road defect repair · ${report.reference}`;
    $('#procurementContractor').innerHTML='<option value="">Select contractor</option>'+contractors.map(contractor=>`<option value="${contractor._id}">${escapeHtml(contractor.name)}${contractor.companyName?' — '+escapeHtml(contractor.companyName):''}</option>`).join('');
    $('#procurementContractor').required=true;
    $('#procurementAwarded').required=true;
    $('#procurementAwarded').min='0.01';
    openManagementModal('procurementModal');
    $('#procurementContractor').focus();
  }catch(error){toast(error.message);}
};
let commentReportId=null;
async function submitComment(id,body){try{await api(`/reports/${id}/comments`,{method:'POST',body:JSON.stringify({body})});}catch(error){if($('#commentError'))$('#commentError').textContent=error.message;else toast(error.message);return;}if($('#commentModal'))$('#commentModal').hidden=true;toast('Comment saved to the report audit.');try{await renderDashboard();}catch(error){toast(error.message);}}
window.addComment=id=>{commentReportId=id;const report=reports.find(item=>item.id===id);if(!$('#commentModal')){const body=window.prompt('Add a staff-only report comment:');if(body?.trim())submitComment(id,body.trim());return;}$('#addCommentForm').reset();$('#commentError').textContent='';$('#commentTitle').textContent=`Add comment · ${report?.reference||'report'}`;$('#commentModal').hidden=false;$('#commentBody').focus();};
if($('#addCommentForm'))$('#addCommentForm').onsubmit=async e=>{e.preventDefault();const body=$('#commentBody').value.trim();if(!commentReportId||!body)return;const button=$('#saveComment');button.disabled=true;$('#commentError').textContent='';await submitComment(commentReportId,body);button.disabled=false;};
if($('#closeComment'))$('#closeComment').onclick=()=>{$('#commentModal').hidden=true;};
if($('#commentModal'))$('#commentModal').onclick=e=>{if(e.target===$('#commentModal'))$('#commentModal').hidden=true;};
window.addRepairPhoto=id=>{const picker=document.createElement('input');picker.type='file';picker.accept='image/jpeg,image/png,image/webp';picker.onchange=async()=>{if(!picker.files[0])return;const data=new FormData();data.append('photos',picker.files[0]);try{await api(`/reports/${id}/repair-photos`,{method:'POST',body:data});toast('Repair evidence saved securely.');await renderDashboard();}catch(error){toast(error.message);}};picker.click();};
window.showTimeline=async id=>{try{const data=await api(`/reports/${id}/timeline`);$('#timelineTitle').textContent=`${data.reference} timeline`;$('#timelineMeta').textContent=`${data.category} · ${data.county} · Current status: ${data.status}`;$('#timelineList').innerHTML=data.events.length?data.events.map(event=>`<article class="timeline-event"><h3>${escapeHtml(event.type.replaceAll('_',' '))}</h3><p>${escapeHtml(event.detail||'No additional detail.')} · ${escapeHtml(event.actor)}</p><time>${displayDate(event.at)}</time></article>`).join(''):'<p>No timeline entries yet.</p>';$('#timelineModal').hidden=false;}catch(error){toast(error.message);}};
$('#closeTimeline').onclick=()=>$('#timelineModal').hidden=true;$('#timelineModal').onclick=e=>{if(e.target===$('#timelineModal'))$('#timelineModal').hidden=true};
function showPhoto(url,title){showPhotos([url],title);}
function showPhotos(urls,title){const gallery=$('#evidenceGallery');gallery.replaceChildren(...urls.map((url,index)=>{const image=document.createElement('img');image.src=url;image.alt=`${title} ${index+1}`;return image;}));$('#photoTitle').textContent=title;$('#photoModal').hidden=false;}
$('#closePhoto').onclick=()=>{$('#photoModal').hidden=true;$('#evidenceGallery').replaceChildren();};$('#photoModal').onclick=e=>{if(e.target===$('#photoModal'))$('#closePhoto').click()};
$$('.side-nav[data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));$$('[data-tab-jump]').forEach(b=>b.onclick=()=>showTab(b.dataset.tabJump));function showTab(tab){if(['enrollment','management'].includes(tab)&&state.user?.role!=='admin'){toast('Only administrators can manage staff.');return;}if(tab==='managementRecords'&&!['admin','coordinator','officer'].includes(state.user?.role)){toast('Only regional officers and coordinators can access regional contractor records.');return;}$$('.side-nav[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$$('.dash-tab').forEach(x=>x.classList.remove('active'));$('#'+tab+'Tab').classList.add('active');$('#dashTitle').textContent=tab==='overview'?`${getGreeting()}, ${state.user?.name?.split(' ')[0]||'staff member'}.`:tab==='reports'?'Report management':tab==='enrollment'?'Staff enrollment':tab==='management'?'Staff management':tab==='managementRecords'?'Contractor & procurement management':'Regional visibility';$('#dashSubtitle').textContent=tab==='enrollment'?'Create authorised KeNHA staff accounts.':tab==='management'?'Deactivate accounts safely or update staff access.':tab==='managementRecords'?state.user?.role==='officer'?'Contractors and procurements for your regional office.':'Track contractors, procurements and payment approvals.':tab==='overview'?'Here’s what needs attention across your region.':tab==='reports'?'Review and update road defects.':'See the geographic distribution of reports.';if(tab==='management')loadStaff();if(tab==='managementRecords')loadManagementRecords();setTimeout(initMaps,80)}
$('#signOutBtn').onclick=()=>{sessionStorage.removeItem('bw_token');sessionStorage.removeItem('bw_user');state.token=null;state.user=null;state.officers=[];$('#loginForm')?.reset();if($('#staffLogin'))switchView('staffLogin');else window.location.replace('/login');toast('You have signed out.');};
$('#enrollmentForm').onsubmit=async e=>{e.preventDefault();$('#enrolResult').textContent='';try{const {user}=await api('/staff/users',{method:'POST',body:JSON.stringify({name:$('#enrolName').value,email:$('#enrolEmail').value,office:$('#enrolOffice').value,role:$('#enrolRole').value,password:$('#enrolPassword').value})});$('#enrollmentForm').reset();$('#enrolResult').textContent=`Account created for ${user.name} (${user.role}).`;toast('Staff account created.');}catch(error){$('#enrolResult').textContent=error.message;}};
let managedStaff=[];
async function loadStaff(){
  try{
    const {users}=await api('/staff/users');
    managedStaff=users.filter(user=>user.role!=='contractor');
    $('#staffList').innerHTML=managedStaff.map(user=>`<div class="report-row"><span class="report-icon">${user.active?'✓':'—'}</span><div class="report-info"><strong>${escapeHtml(user.name)} <small>· ${escapeHtml(user.role)}</small></strong><small>${escapeHtml(user.email)} · ${escapeHtml(user.office)}</small></div><span class="status ${user.active?'Resolved':'New'}">${user.active?'Active':'Deactivated'}</span><button class="text-button" data-staff-action="toggle" data-staff-id="${user._id}">${user.active?'Deactivate':'Reactivate'}</button><button class="text-button" data-staff-action="edit" data-staff-id="${user._id}">Edit account</button></div>`).join('')||'<p>No staff accounts found.</p>';
  }catch(error){toast(error.message);}
}
$('#staffList').addEventListener('click',async e=>{
  const button=e.target.closest('button[data-staff-action]');
  if(!button)return;
  const user=managedStaff.find(item=>item._id===button.dataset.staffId);
  if(!user)return;
  if(button.dataset.staffAction==='edit'){
    $('#staffEditForm').dataset.staffId=user._id;
    $('#staffEditName').textContent=`${user.name} · ${user.email}`;
    $('#staffEditRole').value=user.role;
    populateOfficeOptions($('#staffEditOffice'),user.office);
    $('#staffEditPassword').value='';
    $('#staffEditError').textContent='';
    openManagementModal('staffEditModal');
    $('#staffEditRole').focus();
    return;
  }
  if(button.dataset.staffAction==='toggle'){
    button.disabled=true;
    try{
      await api(`/staff/users/${user._id}`,{method:'PATCH',body:JSON.stringify({active:!user.active})});
      toast(`Account ${user.active?'deactivated':'reactivated'}.`);
      await loadStaff();
    }catch(error){toast(error.message);}
    finally{button.disabled=false;}
  }
});
$('#staffEditForm').onsubmit=async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const button=$('#saveStaffEdit');
  const changes={role:$('#staffEditRole').value,office:$('#staffEditOffice').value.trim()};
  if($('#staffEditPassword').value)changes.password=$('#staffEditPassword').value;
  $('#staffEditError').textContent='';
  button.disabled=true;
  try{
    await api(`/staff/users/${form.dataset.staffId}`,{method:'PATCH',body:JSON.stringify(changes)});
    closeManagementModal('staffEditModal');
    toast('Staff account updated.');
    await loadStaff();
  }catch(error){$('#staffEditError').textContent=error.message;}
  finally{button.disabled=false;}
};
function drawBoundaries(map){if(map._bwBoundaries)return;if(!boundaryLoad)boundaryLoad=fetch('/api/reports/boundaries').then(res=>{if(!res.ok)throw new Error(`HTTP Error Status: ${res.status}`);return res.json();}).then(geojsonData=>{boundaryData=geojsonData;window.countyBoundariesLoaded=true;return geojsonData;}).catch(err=>{console.error('Error fetching county maps:',err);return null;});boundaryLoad.then(geojsonData=>{if(!geojsonData||map._bwBoundaries)return;map._bwBoundaries=L.geoJSON(geojsonData,{style:{color:'#0066cc',weight:2,fillOpacity:0.05}}).addTo(map);});}
function createMapLayers(){return L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{attribution:'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://viewfinderpanoramas.org/">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',subdomains:'abc',maxZoom:17});}
function initMaps(){if(!document.getElementById('miniMap')&&!document.getElementById('fullMap'))return;if(!window.L)return;const kenyaBounds=L.latLngBounds([[-4.8,33.0],[5.3,41.9]]);const options={center:[0.4,37.9],zoom:6,zoomControl:false,maxBounds:kenyaBounds,maxBoundsViscosity:1,minZoom:5};if(!miniMap)miniMap=L.map('miniMap',options).fitBounds(kenyaBounds);if(!fullMap)fullMap=L.map('fullMap',options).fitBounds(kenyaBounds);[miniMap,fullMap].forEach(map=>{if(!map._bwTiles){map._bwTiles=createMapLayers().addTo(map);}drawBoundaries(map);map.eachLayer(l=>{if(l instanceof L.CircleMarker)map.removeLayer(l)});reports.forEach(r=>{if(!r.location||typeof r.location.lat!=='number'||typeof r.location.lng!=='number')return;L.circleMarker([r.location.lat,r.location.lng],{radius:8,color:'#fff',weight:2,fillColor:r.severity==='Critical'?'#d64c3b':r.status==='In progress'?'#4f83b9':'#e58032',fillOpacity:1}).addTo(map).bindPopup(`<b>${escapeHtml(r.category)}</b><br>${escapeHtml(r.reference)}<br>${escapeHtml(r.office)}<br><em>${escapeHtml(r.status)}</em>`);});map.invalidateSize()})}
function handleAuthError(error){if(/session|Authentication|expired/i.test(error.message)){sessionStorage.clear();state.token=null;state.user=null;toast('Your staff session has ended. Please sign in again.');if($('#staffLogin'))switchView('staffLogin');else window.location.replace('/login');}else toast(error.message)}
if(state.user){setStaffIdentity(state.user);setStaffControls();}
let managementData={contractors:[],procurements:[],payments:[]};
const kes=value=>new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:0}).format(Number(value)||0);
async function loadManagementRecords(){
  try{
    managementData=await api('/management');
    const activeContractors=managementData.contractors.filter(c=>c.status==='Active').length;
    const activeProcurements=managementData.procurements.filter(p=>['Tendering','Awarded','In progress'].includes(p.status)).length;
    const pendingPayments=managementData.payments.filter(p=>['Pending','Approved'].includes(p.status)).reduce((sum,p)=>sum+Number(p.amount||0),0);
    $('#contractorMetric').textContent=activeContractors;
    $('#procurementMetric').textContent=activeProcurements;
    $('#paymentMetric').textContent=kes(pendingPayments);
    $('#contractorsList').innerHTML=managementData.contractors.map(c=>`<div class="report-row"><span class="report-icon">${c.status==='Active'?'C':'-'}</span><div class="report-info"><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.companyName||'Independent contractor')} · ${escapeHtml(c.office)}</small></div><span class="status ${c.status==='Active'?'Resolved':c.status==='Blacklisted'?'New':'In-progress'}">${escapeHtml(c.status)}</span>${!c.userId&&c.status==='Active'?`<button class="text-button" data-enable-contractor="${c._id}">Enable portal login</button>`:'<small class="photo-chip">'+(c.userId?'Portal enabled':'Portal unavailable')+'</small>'}</div>`).join('')||'<p>No contractors recorded.</p>';
    $('#procurementsList').innerHTML=managementData.procurements.map(p=>`<div class="report-row"><span class="report-icon">P</span><div class="report-info"><strong>${escapeHtml(p.reference)} · ${escapeHtml(p.title)}</strong><small>${escapeHtml(p.contractor?.name||'No contractor awarded')} · ${escapeHtml(p.office)}</small></div><span class="status ${statusClass(p.status)}">${escapeHtml(p.status)}</span></div>`).join('')||'<p>No procurement records.</p>';
    $('#paymentsList').innerHTML=managementData.payments.map(p=>`<div class="full-report"><span class="report-icon">K</span><div class="report-info"><strong>${escapeHtml(p.reference)} · ${kes(p.amount)}</strong><small>${escapeHtml(p.contractor?.name||'Unknown contractor')} · ${escapeHtml(p.invoiceNumber||'No invoice')}</small></div><span class="severity">${escapeHtml(p.procurement?.reference||'No procurement')}</span><span class="status ${p.status==='Paid'?'Resolved':p.status==='Rejected'?'New':'In-progress'}">${escapeHtml(p.status)}</span><button class="text-button" data-payment-status="${p._id}">Update status</button></div>`).join('')||'<p>No payment records.</p>';
  }catch(error){toast(error.message);}
}
const canManageFinancialRecords=()=>['admin','coordinator'].includes(state.user?.role);
const openManagementModal=(id)=>{const modal=$('#'+id);if(modal)modal.hidden=false;};
const closeManagementModal=(id)=>{const modal=$('#'+id);if(modal)modal.hidden=true;};
$$('[data-close-management-modal]').forEach(button=>button.onclick=()=>closeManagementModal(button.dataset.closeManagementModal));
$$('.modal[id$="Modal"]').forEach(modal=>modal.onclick=e=>{if(e.target===modal)modal.hidden=true});
if($('#addContractorBtn')) $('#addContractorBtn').onclick=()=>{
  if(!canManageFinancialRecords()){toast('Only administrators and coordinators can add contractors.');return;}
  editingContractorId=null;$('#contractorForm').reset();$('#contractorFormError').textContent='';$('#contractorModalTitle').textContent='Add contractor';$('#createContractorLogin').checked=false;$('#contractorPasswordGroup').hidden=true;$('#contractorPassword').required=false;$('#contractorOffice').value=state.user.office||'KeNHA Kisumu Regional Office';openManagementModal('contractorModal');$('#contractorName').focus();
};
if($('#addProcurementBtn')) $('#addProcurementBtn').onclick=()=>{
  if(!canManageFinancialRecords()){toast('Only administrators and coordinators can add procurements.');return;}
  $('#procurementForm').reset();$('#procurementFormError').textContent='';$('#procurementModalTitle').textContent='Add procurement';$('#procurementReportId').value='';$('#procurementAwardContext').textContent='';$('#procurementOffice').readOnly=false;$('#procurementContractor').required=false;$('#procurementAwarded').required=false;$('#procurementAwarded').min='0';$('#procurementOffice').value=state.user.office||'KeNHA Kisumu Regional Office';
  $('#procurementContractor').innerHTML='<option value="">Not awarded yet</option>'+managementData.contractors.map(c=>`<option value="${c._id}">${escapeHtml(c.name)}${c.companyName?' — '+escapeHtml(c.companyName):''}</option>`).join('');
  openManagementModal('procurementModal');$('#procurementTitle').focus();
};
if($('#addPaymentBtn')) $('#addPaymentBtn').onclick=()=>{
  if(!canManageFinancialRecords()){toast('Only administrators and coordinators can record payments.');return;}
  if(!managementData.procurements.length||!managementData.contractors.length){toast('Add a contractor and procurement before recording a payment.');return;}
  $('#paymentForm').reset();$('#paymentFormError').textContent='';
  $('#paymentProcurement').innerHTML='<option value="">Select procurement</option>'+managementData.procurements.map(p=>`<option value="${p._id}">${escapeHtml(p.reference)} — ${escapeHtml(p.title)}</option>`).join('');
  $('#paymentContractor').innerHTML='<option value="">Select contractor</option>'+managementData.contractors.map(c=>`<option value="${c._id}">${escapeHtml(c.name)}${c.companyName?' — '+escapeHtml(c.companyName):''}</option>`).join('');
  openManagementModal('paymentModal');$('#paymentProcurement').focus();
};
if($('#createContractorLogin')) $('#createContractorLogin').onchange=e=>{$('#contractorPasswordGroup').hidden=!e.target.checked;if(e.target.checked)$('#contractorPassword').required=true;else{$('#contractorPassword').required=false;$('#contractorPassword').value='';}};
let editingContractorId=null;
if($('#contractorsList')) $('#contractorsList').addEventListener('click',e=>{
  const button=e.target.closest('[data-enable-contractor]');if(!button)return;
  const contractor=managementData.contractors.find(item=>item._id===button.dataset.enableContractor);if(!contractor)return;
  editingContractorId=contractor._id;$('#contractorForm').reset();$('#contractorFormError').textContent='';
  $('#contractorModalTitle').textContent=`Enable portal · ${contractor.name}`;
  $('#contractorName').value=contractor.name;$('#contractorCompany').value=contractor.companyName||'';
  $('#contractorRegistration').value=contractor.registrationNumber||'';$('#contractorEmail').value=contractor.email||'';
  $('#contractorPhone').value=contractor.phone||'';$('#contractorOffice').value=contractor.office;
  $('#contractorSpecialties').value=(contractor.specialties||[]).join(', ');
  $('#createContractorLogin').checked=true;$('#contractorPasswordGroup').hidden=false;$('#contractorPassword').required=true;
  openManagementModal('contractorModal');$('#contractorPassword').focus();
});
if($('#contractorForm')) $('#contractorForm').onsubmit=async e=>{
  e.preventDefault();$('#contractorFormError').textContent='';
  const createLogin=$('#createContractorLogin').checked;
  const password=$('#contractorPassword').value;
  if(createLogin&&(!$('#contractorEmail').value.trim()||password.length<12)){toast('Add an email and a 12-character password to create the contractor login.');return;}
  const payload={name:$('#contractorName').value.trim(),companyName:$('#contractorCompany').value.trim(),registrationNumber:$('#contractorRegistration').value.trim(),email:$('#contractorEmail').value.trim(),phone:$('#contractorPhone').value.trim(),office:$('#contractorOffice').value.trim(),createLogin,password,specialties:$('#contractorSpecialties').value.split(',').map(v=>v.trim()).filter(Boolean)};
  try{
    if(editingContractorId){await api(`/management/contractors/${editingContractorId}`,{method:'PATCH',body:JSON.stringify(payload)});editingContractorId=null;toast('Contractor portal login enabled.');}
    else{await api('/management/contractors',{method:'POST',body:JSON.stringify(payload)});toast('Contractor added.');}
    closeManagementModal('contractorModal');await loadManagementRecords();
  }catch(error){$('#contractorFormError').textContent=error.message;}
};
if($('#procurementForm')) $('#procurementForm').onsubmit=async e=>{
  e.preventDefault();$('#procurementFormError').textContent='';
  const reportId=$('#procurementReportId').value;
  const awarding=state.user?.role==='officer';
  const payload={title:$('#procurementTitle').value.trim(),reference:$('#procurementReference').value.trim(),office:$('#procurementOffice').value.trim(),category:$('#procurementCategory').value,contractor:$('#procurementContractor').value||null,estimatedAmount:$('#procurementEstimated').value,awardedAmount:$('#procurementAwarded').value,startDate:$('#procurementStart').value||undefined,endDate:$('#procurementEnd').value||undefined,notes:$('#procurementNotes').value.trim(),status:awarding?'Awarded':'Draft',...(reportId?{reportId}:{})};
  try{await api('/management/procurements',{method:'POST',body:JSON.stringify(payload)});closeManagementModal('procurementModal');toast(awarding?'Contract awarded and linked to the report.':'Procurement record created.');await loadManagementRecords();}catch(error){$('#procurementFormError').textContent=error.message;}
};
if($('#paymentForm')) $('#paymentForm').onsubmit=async e=>{
  e.preventDefault();$('#paymentFormError').textContent='';
  const payload={procurement:$('#paymentProcurement').value,contractor:$('#paymentContractor').value,invoiceNumber:$('#paymentInvoice').value.trim(),amount:$('#paymentAmount').value,method:$('#paymentMethod').value,status:$('#paymentStatus').value,dueDate:$('#paymentDue').value||undefined,notes:$('#paymentNotes').value.trim()};
  try{await api('/management/payments',{method:'POST',body:JSON.stringify(payload)});closeManagementModal('paymentModal');toast('Payment record created.');await loadManagementRecords();}catch(error){$('#paymentFormError').textContent=error.message;}
};
if($('#paymentsList')) $('#paymentsList').addEventListener('click',async e=>{
  const button=e.target.closest('[data-payment-status]'); if(!button)return;
  if(!['admin','coordinator'].includes(state.user?.role)){toast('Only administrators and coordinators can update payments.');return;}
  const payment=managementData.payments.find(item=>item._id===button.dataset.paymentStatus);if(!payment)return;
  $('#paymentStatusForm').dataset.paymentId=payment._id;
  $('#paymentStatusReference').textContent=`${payment.reference} · ${kes(payment.amount)} · Current status: ${payment.status}`;
  $('#paymentStatusValue').value=payment.status;
  $('#paymentStatusError').textContent='';
  openManagementModal('paymentStatusModal');
  $('#paymentStatusValue').focus();
});
if($('#paymentStatusForm')) $('#paymentStatusForm').onsubmit=async e=>{
  e.preventDefault();
  const id=e.currentTarget.dataset.paymentId;
  if(!id)return;
  const submitButton=$('#savePaymentStatus');
  submitButton.disabled=true;
  $('#paymentStatusError').textContent='';
  try{
    const status=$('#paymentStatusValue').value;
    await api(`/management/payments/${id}`,{method:'PATCH',body:JSON.stringify({status})});
    closeManagementModal('paymentStatusModal');
    toast(`Payment marked ${status}.`);
    await loadManagementRecords();
  }catch(error){$('#paymentStatusError').textContent=error.message;}
  finally{submitButton.disabled=false;}
};
if($('#paymentProcurement')) $('#paymentProcurement').onchange=()=>{
  const procurement=managementData.procurements.find(item=>item._id===$('#paymentProcurement').value);
  if(procurement?.contractor?.id||procurement?.contractor?._id)$('#paymentContractor').value=procurement.contractor.id||procurement.contractor._id;
};
