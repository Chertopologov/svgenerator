// Простая логика формы, превью и экспорта
const templateButtons = document.querySelectorAll('.tmpl-btn');
const resumePreview = document.getElementById('resumePreview');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const addEducationBtn = document.getElementById('addEducation');
const educationList = document.getElementById('educationList');
const addExperienceBtn = document.getElementById('addExperience');
const experienceList = document.getElementById('experienceList');
const addSocialBtn = document.getElementById('addSocial');
const socials = document.getElementById('socials');
const exportPdf = document.getElementById('exportPdf');
const exportDoc = document.getElementById('exportDoc');
const scrollUp = document.getElementById('scrollUp');
const scrollDown = document.getElementById('scrollDown');

// Template selection
templateButtons.forEach(b=>b.addEventListener('click', ()=>{
  templateButtons.forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  const tmpl = b.dataset.tmpl;
  resumePreview.className = 'resume-preview ' + tmpl;
  debouncedRender();
}));

// Photo preview
photoInput.addEventListener('change', e=>{
  const f = e.target.files[0];
  if(!f) return;
  const url = URL.createObjectURL(f);
  photoPreview.src = url;
  debouncedRender();
});

// debounce helper to avoid excessive renders while typing
function debounce(fn, wait){
  let t;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(()=>fn.apply(this,args), wait);
  }
}

const debouncedRender = debounce(renderPreview, 250);

// live-update: listen to all input changes inside the form and re-render
const resumeForm = document.getElementById('resumeForm');
if(resumeForm){
  resumeForm.addEventListener('input', ()=>{
    debouncedRender();
  });
}

// Dynamic lists
function makeEducationEntry(){
  const row = document.createElement('div');
  row.className = 'edu-row';
  row.innerHTML = `
    <input class="edu-school" placeholder="Учебное заведение">
    <div class="two-cols">
      <input type="month" class="edu-from" placeholder="с">
      <input type="month" class="edu-to" placeholder="по">
    </div>
    <button class="small remove">удалить</button>
  `;
  row.querySelector('.remove').addEventListener('click', ()=>row.remove());
  return row;
}

function makeExperienceEntry(){
  const row = document.createElement('div');
  row.className = 'exp-row';
  row.innerHTML = `
    <input class="exp-company" placeholder="Место работы">
    <input class="exp-position" placeholder="Должность">
    <div class="two-cols">
      <input type="month" class="exp-from" placeholder="с">
      <input type="month" class="exp-to" placeholder="по">
    </div>
    <button class="small remove">удалить</button>
  `;
  row.querySelector('.remove').addEventListener('click', ()=>row.remove());
  return row;
}

addEducationBtn.addEventListener('click', e=>{e.preventDefault();educationList.appendChild(makeEducationEntry());});
addExperienceBtn.addEventListener('click', e=>{e.preventDefault();experienceList.appendChild(makeExperienceEntry());});
addSocialBtn.addEventListener('click', e=>{e.preventDefault();
  const div = document.createElement('div');
  div.className = 'social-item';
  div.innerHTML = `<input placeholder="Социальная сеть или ссылка"><button class=\"small remove\">x</button>`;
  div.querySelector('.remove').addEventListener('click', ()=>div.remove());
  socials.appendChild(div);
  debouncedRender();
});

// initial one entry
educationList.appendChild(makeEducationEntry());
experienceList.appendChild(makeExperienceEntry());

function renderPreview(){
  const name = document.getElementById('fullName').value || 'Ф.И.О.';
  const dob = document.getElementById('dob').value;
  const citizenship = document.getElementById('citizenship').value;
  const city = document.getElementById('city').value;
  const phone = document.getElementById('phone').value;
  const email = document.getElementById('email').value;
  const skills = document.getElementById('skills').value;
  const about = document.getElementById('about').value;

  // socials
  const socialNodes = Array.from(document.querySelectorAll('#socials .social-item input'));
  const socialVals = socialNodes.map(n=>n.value).filter(Boolean);

  // education
  const eds = Array.from(document.querySelectorAll('.edu-row')).map(row=>({
    school: row.querySelector('.edu-school').value,
    from: row.querySelector('.edu-from').value,
    to: row.querySelector('.edu-to').value
  })).filter(e=>e.school || e.from || e.to);

  // experience
  const exps = Array.from(document.querySelectorAll('.exp-row')).map(row=>({
    company: row.querySelector('.exp-company').value,
    position: row.querySelector('.exp-position').value,
    from: row.querySelector('.exp-from').value,
    to: row.querySelector('.exp-to').value
  })).filter(e=>e.company || e.position || e.from || e.to);

  const photoHtml = photoPreview.src ? `<div class="photo"><img src="${photoPreview.src}" style="width:100%;height:100%;object-fit:cover;border-radius:6px"></div>` : '';

  // build HTML - simple but structured
  let html = '';
  html += `<div class="header">${photoHtml}<div class="head-info"><h1>${escapeHtml(name)}</h1><div class="muted">${escapeHtml(city)} ${dob? '• '+escapeHtml(dob):''}</div><div class="muted">${escapeHtml(citizenship)}</div></div></div>`;

  html += `<hr>`;

  html += `<section class="contact"><strong>Контакты</strong><div>${escapeHtml(phone||'')}</div><div>${escapeHtml(email||'')}</div>`;
  socialVals.forEach(s=>{ html += `<div>${escapeHtml(s)}</div>` });
  html += `</section>`;

  html += `<section class="education"><h3>Образование</h3>`;
  if(eds.length===0) html += `<div class="muted">—</div>`;
  eds.forEach(e=>{
    html += `<div class="edu-item"><strong>${escapeHtml(e.school||'')}</strong><div class="muted">${formatRange(e.from,e.to)}</div></div>`;
  })
  html += `</section>`;

  html += `<section class="experience"><h3>Опыт работы</h3>`;
  if(exps.length===0) html += `<div class="muted">—</div>`;
  exps.forEach(e=>{
    html += `<div class="exp-item"><strong>${escapeHtml(e.position||'')}${e.position && e.company ? ' — ' : ''}${escapeHtml(e.company||'')}</strong><div class="muted">${formatRange(e.from,e.to)}</div></div>`;
  })
  html += `</section>`;

  html += `<section class="skills"><h3>Навыки</h3><div>${nl2br(escapeHtml(skills))}</div></section>`;
  html += `<section class="about"><h3>О себе</h3><div>${nl2br(escapeHtml(about))}</div></section>`;

  resumePreview.innerHTML = html;
}

function nl2br(s){ return s.replace(/\n/g,'<br>') }
function formatRange(f,t){ if(!f && !t) return ''; if(f && t) return f+' — '+t; if(f) return 'c '+f; return 'по '+t }
function escapeHtml(str){ if(!str) return ''; return (str+'').replace(/[&<>\"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }


// export to PDF using html2pdf
exportPdf.addEventListener('click', e=>{
  e.preventDefault();
  renderPreview();
  // guard: make sure html2pdf is loaded
  if(typeof window.html2pdf !== 'function' && typeof window.html2pdf !== 'object'){
    alert('Библиотека для экспорта в PDF не загружена. Проверьте подключение к интернету или откройте файл через локальный сервер.');
    return;
  }
  try{
    const opt = { margin:0.4, filename: 'resume.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(resumePreview).save();
  }catch(err){
    console.error('html2pdf error', err);
    alert('Не удалось сгенерировать PDF: '+(err && err.message ? err.message : 'ошибка'));
  }
});

// export to .doc (simple HTML wrapper) — Word accepts HTML saved as .doc
exportDoc.addEventListener('click', e=>{
  e.preventDefault();
  // live preview already updated on input; ensure latest
  renderPreview();
  // clone preview and remove all class/style attributes to produce minimal, style-free HTML
  const clone = resumePreview.cloneNode(true);
  function stripAttrs(node){
    if(node.nodeType===1){ // element
      node.removeAttribute('class');
      node.removeAttribute('style');
      // remove any other attributes like data-*
      const attrs = Array.from(node.attributes).map(a=>a.name).filter(n=>n!=='src' && n!=='href' && n!=='alt' && n!=='title' && n!=='srcset');
      attrs.forEach(a=>node.removeAttribute(a));
    }
    node.childNodes.forEach(child=>stripAttrs(child));
  }
  stripAttrs(clone);
  const header = `<!doctype html><html><head><meta charset="utf-8"></head><body>`;
  const footer = `</body></html>`;
  const html = header + clone.innerHTML + footer;
  const blob = new Blob([html], {type: 'application/msword'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'resume.doc'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// scroll controls for preview
scrollUp.addEventListener('click', ()=>{ resumePreview.scrollBy({top:-300,behavior:'smooth'}) });
scrollDown.addEventListener('click', ()=>{ resumePreview.scrollBy({top:300,behavior:'smooth'}) });

// initial render
renderPreview();
