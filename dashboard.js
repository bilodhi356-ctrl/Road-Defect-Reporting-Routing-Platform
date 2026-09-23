const token=localStorage.getItem('staffToken')||sessionStorage.getItem('bw_token');
const user=JSON.parse(sessionStorage.getItem('bw_user')||'null');
const safe=value=>String(value||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
if(!token)window.location.replace('/login');
else{
  if(user?.name)document.querySelector('#welcome').textContent=`Staff portal · ${user.name}`;
  document.querySelector('#signOut').onclick=()=>{localStorage.removeItem('staffToken');sessionStorage.removeItem('bw_token');sessionStorage.removeItem('bw_user');window.location.replace('/login')};
  (async()=>{try{const r=await fetch('/api/reports',{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to load reports.');document.querySelector('#message').textContent=d.reports.length?'':'No reports are currently assigned to your office.';document.querySelector('#reports').innerHTML=d.reports.map(x=>`<article class="report-row"><div class="report-info"><strong>${safe(x.category)}</strong><small>${safe(x.reference)} · ${safe(x.roadName||'Road not specified')}</small></div><span class="status ${x.status.replace(' ','-')}">${safe(x.status)}</span></article>`).join('')}catch(e){document.querySelector('#message').textContent=e.message}})();
}
