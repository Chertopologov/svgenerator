const $ = (id) => document.getElementById(id);

// ---------------- Helpers ----------------
function escapeHtml(str) {
  if (!str) return '';
  return (str + '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );
}

function normalizeUrl(url){
  const v = (url || '').trim();
  if(!v) return '';
  if (!/^https?:\/\//i.test(v)) return 'https://' + v;
  return v;
}

function formatMonth(v){
  if(!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y,m] = s.split('-');
    return `${m}.${y}`;
  }
  if (/^\d{2}\.\d{4}$/.test(s)) return s;
  return s;
}

function splitSkills(text){
  const raw = (text || '').trim();
  if (!raw) return [];
  let parts = raw.split(/\n+/).flatMap(line => line.split(/[;,]+/));
  parts = parts.flatMap(p => p.split(/(?:^|\s)[•●]\s*/g));

  const seen = new Set();
  const out = [];
  for (const p of parts.map(s => s.trim()).filter(Boolean)) {
    const key = p.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out.slice(0, 80);
}

function dataUrlToUint8Array(dataUrl){
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ---------------- Steps ----------------
const step1 = $('step1');
const step2 = $('step2');

const toPreviewBtn = $('toPreview');
const backToEditBtn = $('backToEdit');
const goStep1Btn = $('goStep1');
const goStep2Btn = $('goStep2');

function canGoToPreview() {
  const name = ($('fullName')?.value || '').trim();
  const phone = ($('phone')?.value || '').trim();
  const email = ($('email')?.value || '').trim();
  return !!(name || phone || email);
}

function syncPreviewButton() {
  const ok = canGoToPreview();
  if (toPreviewBtn) toPreviewBtn.disabled = !ok;
  if (goStep2Btn) goStep2Btn.disabled = !ok;
}

function showStep(n){
  if (n === 2 && !canGoToPreview()) return;

  if (n === 1) {
    step1.classList.remove('hidden');
    step2.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    step2.classList.remove('hidden');
    step1.classList.add('hidden');
    renderPreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

toPreviewBtn?.addEventListener('click', () => showStep(2));
backToEditBtn?.addEventListener('click', () => showStep(1));
goStep1Btn?.addEventListener('click', () => showStep(1));
goStep2Btn?.addEventListener('click', () => showStep(2));

// ---------------- DOM ----------------
const form = $('resumeForm');

const templateButtons = document.querySelectorAll('.tmpl-btn');
const resumePreview = $('resumePreview');

const photoInput = $('photoInput');
const photoPreview = $('photoPreview');
const photoHint = $('photoHint');

const addEducationBtn = $('addEducation');
const educationList = $('educationList');

const addExperienceBtn = $('addExperience');
const experienceList = $('experienceList');

const addCourseBtn = $('addCourse');
const coursesList = $('coursesList');

const addSocialBtn = $('addSocial');
const socials = $('socials');

const exportPdf = $('exportPdf');
const exportDocx = $('exportDocx');
const printBtn = $('printBtn');
const clearFormBtn = $('clearForm');

const scrollUp = $('scrollUp');
const scrollDown = $('scrollDown');

// ---------------- Debounce ----------------
let _t = null;
function debouncedRender() {
  clearTimeout(_t);
  _t = setTimeout(() => {
    syncPreviewButton();
    renderPreview();
  }, 120);
}

// ---------------- Flatpickr month picker (safe) ----------------
function getMonthSelectPlugin() {
  return (
    window.monthSelectPlugin ||
    window.MonthSelectPlugin ||
    (window.flatpickr && window.flatpickr.plugins && window.flatpickr.plugins.monthSelect) ||
    null
  );
}

function initMonthPicker(input){
  if (!input) return;
  if (input._flatpickr) return;

  try {
    if (!window.flatpickr) return;
    if (window.flatpickr.l10ns && window.flatpickr.l10ns.ru) {
      window.flatpickr.localize(window.flatpickr.l10ns.ru);
    }
    const pluginFactory = getMonthSelectPlugin();
    if (pluginFactory) {
      window.flatpickr(input, {
        plugins: [
          pluginFactory({ shorthand: true, dateFormat: "m.Y", altFormat: "m.Y" })
        ],
        allowInput: true,
      });
    }
  } catch (err) {
    console.warn('Month picker init failed:', err);
  }
}

// ---------------- Dynamic rows ----------------
function makeEducationEntry() {
  const row = document.createElement('div');
  row.className = 'edu-row';
  row.innerHTML = `
    <input class="edu-school" placeholder="Учебное заведение">
    <div class="two-cols">
      <input type="text" class="edu-from" placeholder="Начало (ММ.ГГГГ)" inputmode="numeric">
      <input type="text" class="edu-to" placeholder="Окончание (ММ.ГГГГ)" inputmode="numeric">
    </div>
    <button class="btn btn-ghost btn-sm remove" type="button">Удалить</button>
  `;

  initMonthPicker(row.querySelector('.edu-from'));
  initMonthPicker(row.querySelector('.edu-to'));

  row.querySelector('.remove').addEventListener('click', () => {
    row.remove();
    debouncedRender();
  });

  row.addEventListener('input', debouncedRender);
  return row;
}

function makeExperienceEntry() {
  const row = document.createElement('div');
  row.className = 'exp-row';
  row.innerHTML = `
    <input class="exp-company" placeholder="Место работы">
    <input class="exp-role" placeholder="Должность">
    <textarea class="exp-desc" placeholder="Обязанности (по желанию)"></textarea>
    <button class="btn btn-ghost btn-sm remove" type="button">Удалить</button>
  `;
  row.querySelector('.remove').addEventListener('click', () => {
    row.remove();
    debouncedRender();
  });
  row.addEventListener('input', debouncedRender);
  return row;
}

function makeCourseEntry() {
  const row = document.createElement('div');
  row.className = 'course-row';
  row.innerHTML = `
    <input class="course-title" placeholder="Название курса/тренинга">
    <div class="two-cols">
      <input type="text" class="course-org" placeholder="Организация (необязательно)">
      <input type="number" class="course-year" placeholder="Год" min="1950" max="2100">
    </div>
    <button class="btn btn-ghost btn-sm remove" type="button">Удалить</button>
  `;
  row.querySelector('.remove').addEventListener('click', () => {
    row.remove();
    debouncedRender();
  });
  row.addEventListener('input', debouncedRender);
  return row;
}

function makeSocialEntry() {
  const row = document.createElement('div');
  row.className = "soc-row";
  row.innerHTML = `
    <input class="soc-title" placeholder="Название (например: LinkedIn)">
    <input class="soc-link" placeholder="Ссылка">
    <button class="btn btn-ghost btn-sm remove" type="button">Удалить</button>
  `;
  row.querySelector('.remove').addEventListener('click', () => {
    row.remove();
    debouncedRender();
  });
  row.addEventListener('input', debouncedRender);
  return row;
}

addEducationBtn?.addEventListener('click', () => {
  educationList.appendChild(makeEducationEntry());
  debouncedRender();
});

addExperienceBtn?.addEventListener('click', () => {
  experienceList.appendChild(makeExperienceEntry());
  debouncedRender();
});

addCourseBtn?.addEventListener('click', () => {
  coursesList.appendChild(makeCourseEntry());
  debouncedRender();
});

addSocialBtn?.addEventListener('click', () => {
  socials.appendChild(makeSocialEntry());
  debouncedRender();
});

// Initial entries
educationList?.appendChild(makeEducationEntry());
experienceList?.appendChild(makeExperienceEntry());

// ---------------- Template selection ----------------
templateButtons.forEach(b => b.addEventListener('click', () => {
  templateButtons.forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  resumePreview.className = 'resume-preview ' + b.dataset.tmpl;
  debouncedRender();
}));

// ---------------- Photo upload ----------------
photoInput?.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    photoPreview.src = e.target.result;
    photoPreview.style.display = 'block';
    photoPreview.dataset.hasPhoto = '1';
    if (photoHint) photoHint.style.display = 'none';
    debouncedRender();
  };
  reader.readAsDataURL(file);
});

// ---------------- Data collection ----------------
function collectData() {
  const data = {
    // Basic
    name: ($('fullName')?.value || '').trim(),
    position: ($('position')?.value || '').trim(),
    employment: ($('employment')?.value || '').trim(),
    schedule: ($('schedule')?.value || '').trim(),
    businessTrips: ($('businessTrips')?.value || '').trim(),
    salary: ($('salary')?.value || '').trim(),

    phone: ($('phone')?.value || '').trim(),
    email: ($('email')?.value || '').trim(),

    // Personal
    city: ($('city')?.value || '').trim(),
    relocation: ($('relocation')?.value || '').trim(),
    citizenship: ($('citizenship')?.value || '').trim(),
    dob: ($('dob')?.value || '').trim(),
    gender: ($('gender')?.value || '').trim(),
    maritalStatus: ($('maritalStatus')?.value || '').trim(),
    children: ($('children')?.value || '').trim(),
    educationLevel: ($('educationLevel')?.value || '').trim(),

    // Skills blocks
    skills: ($('skills')?.value || ''),
    languages: ($('languages')?.value || '').trim(),
    computerSkills: ($('computerSkills')?.value || '').trim(),

    // Additional
    driverLicense: ($('driverLicense')?.value || '').trim(),
    recommendations: ($('recommendations')?.value || '').trim(),
    hobbies: ($('hobbies')?.value || '').trim(),
    personalQualities: ($('personalQualities')?.value || '').trim(),

    about: ($('about')?.value || '').trim(),
  };

  const edu = [...document.querySelectorAll('.edu-row')].map(row => ({
    school: (row.querySelector('.edu-school')?.value || '').trim(),
    from: (row.querySelector('.edu-from')?.value || '').trim(),
    to: (row.querySelector('.edu-to')?.value || '').trim(),
  })).filter(e => e.school);

  const exp = [...document.querySelectorAll('.exp-row')].map(row => ({
    company: (row.querySelector('.exp-company')?.value || '').trim(),
    role: (row.querySelector('.exp-role')?.value || '').trim(),
    desc: (row.querySelector('.exp-desc')?.value || '').trim(),
  })).filter(e => e.company || e.role);

  const courses = [...document.querySelectorAll('.course-row')].map(row => ({
    title: (row.querySelector('.course-title')?.value || '').trim(),
    org: (row.querySelector('.course-org')?.value || '').trim(),
    year: (row.querySelector('.course-year')?.value || '').trim(),
  })).filter(c => c.title);

  const soc = [...document.querySelectorAll('.soc-row')].map(row => ({
    title: (row.querySelector('.soc-title')?.value || '').trim(),
    link: (row.querySelector('.soc-link')?.value || '').trim(),
  })).filter(s => s.title || s.link);

  const hasPhoto = photoPreview?.dataset?.hasPhoto === '1';
  const photoSrc = hasPhoto ? photoPreview.getAttribute('src') : '';

  const skillsList = splitSkills(data.skills);

  return { data, edu, exp, courses, soc, hasPhoto, photoSrc, skillsList };
}

// ---------------- Render preview ----------------
function renderPreview() {
  if (!resumePreview) return;

  const { data, edu, exp, courses, soc, hasPhoto, photoSrc, skillsList } = collectData();

  const displayName = data.name || 'Ф.И.О.';
  const displayRole = data.position ? `<div class="role">${escapeHtml(data.position)}</div>` : '';

  const metaLines = [];

  // Like SimpleDoc header conditions, but minimal
  if (data.employment) metaLines.push(`<div class="meta-line"><strong>Занятость:</strong> ${escapeHtml(data.employment)}</div>`);
  if (data.schedule) metaLines.push(`<div class="meta-line"><strong>График:</strong> ${escapeHtml(data.schedule)}</div>`);
  if (data.businessTrips) metaLines.push(`<div class="meta-line"><strong>Командировки:</strong> ${escapeHtml(data.businessTrips)}</div>`);
  if (data.salary) metaLines.push(`<div class="meta-line"><strong>Зарплата:</strong> ${escapeHtml(data.salary)}</div>`);

  if (data.phone || data.email) {
    metaLines.push(`
      <div class="meta-line">
        <strong>Контакты:</strong>
        <div class="meta-sub">
          ${data.phone ? `<div>Телефон: ${escapeHtml(data.phone)}</div>` : ''}
          ${data.email ? `<div>Email: ${escapeHtml(data.email)}</div>` : ''}
        </div>
      </div>
    `);
  }

  // Personal info block (only if any present)
  const personalPairs = [];
  if (data.citizenship) personalPairs.push(`<div class="meta-line"><strong>Гражданство:</strong> ${escapeHtml(data.citizenship)}</div>`);
  if (data.city) personalPairs.push(`<div class="meta-line"><strong>Место жительства:</strong> ${escapeHtml(data.city)}</div>`);
  if (data.relocation) personalPairs.push(`<div class="meta-line"><strong>Переезд:</strong> ${escapeHtml(data.relocation)}</div>`);
  if (data.educationLevel) personalPairs.push(`<div class="meta-line"><strong>Образование:</strong> ${escapeHtml(data.educationLevel)}</div>`);
  if (data.dob) personalPairs.push(`<div class="meta-line"><strong>Дата рождения:</strong> ${escapeHtml(data.dob)}</div>`);
  if (data.gender) personalPairs.push(`<div class="meta-line"><strong>Пол:</strong> ${escapeHtml(data.gender)}</div>`);
  if (data.maritalStatus) personalPairs.push(`<div class="meta-line"><strong>Семейное положение:</strong> ${escapeHtml(data.maritalStatus)}</div>`);
  if (data.children) personalPairs.push(`<div class="meta-line"><strong>Дети:</strong> ${escapeHtml(data.children)}</div>`);

  const personalSection = personalPairs.length
    ? `<h2>Личная информация</h2><div class="meta">${personalPairs.join('')}</div>`
    : '';

  const eduSection = edu.length ? `
    <h2>Образование</h2>
    ${edu.map(e => {
      const dates = [formatMonth(e.from), formatMonth(e.to)].filter(Boolean).join(' — ');
      return `<p><strong>${escapeHtml(e.school)}</strong>${dates ? `<br><span class="meta-line">${escapeHtml(dates)}</span>` : ''}</p>`;
    }).join('')}
  ` : '';

  const expSection = exp.length ? `
    <h2>Опыт работы</h2>
    ${exp.map(e => {
      const title = [e.company, e.role].filter(Boolean).join(' — ');
      const desc = e.desc ? `<p>${escapeHtml(e.desc).replace(/\n/g,'<br>')}</p>` : '';
      return `<p><strong>${escapeHtml(title)}</strong></p>${desc}`;
    }).join('')}
  ` : '';

  const coursesSection = courses.length ? `
    <h2>Курсы и тренинги</h2>
    ${courses.map(c => {
      const tail = [c.org, c.year].filter(Boolean).join(' · ');
      return `<p><strong>${escapeHtml(c.title)}</strong>${tail ? `<br><span class="meta-line">${escapeHtml(tail)}</span>` : ''}</p>`;
    }).join('')}
  ` : '';

  const languagesSection = data.languages ? `
    <h2>Иностранные языки</h2>
    <p>${escapeHtml(data.languages).replace(/\n/g,'<br>')}</p>
  ` : '';

  const computerSection = data.computerSkills ? `
    <h2>Компьютерные навыки</h2>
    <p>${escapeHtml(data.computerSkills).replace(/\n/g,'<br>')}</p>
  ` : '';

  const skillsSection = skillsList.length ? `
    <h2>Профессиональные навыки</h2>
    <ul>${skillsList.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
  ` : '';

  const aboutSection = data.about ? `
    <h2>О себе</h2>
    <p>${escapeHtml(data.about).replace(/\n/g,'<br>')}</p>
  ` : '';

  const additionalPairs = [];
  if (data.driverLicense) additionalPairs.push(`<p><strong>Права:</strong> ${escapeHtml(data.driverLicense)}</p>`);
  if (data.recommendations) additionalPairs.push(`<p><strong>Рекомендации:</strong><br>${escapeHtml(data.recommendations).replace(/\n/g,'<br>')}</p>`);
  if (data.hobbies) additionalPairs.push(`<p><strong>Свободное время:</strong><br>${escapeHtml(data.hobbies).replace(/\n/g,'<br>')}</p>`);
  if (data.personalQualities) additionalPairs.push(`<p><strong>Личные качества:</strong><br>${escapeHtml(data.personalQualities).replace(/\n/g,'<br>')}</p>`);

  const additionalSection = additionalPairs.length ? `
    <h2>Дополнительная информация</h2>
    ${additionalPairs.join('')}
  ` : '';

  const socSection = soc.length ? `
    <h2>Соцсети</h2>
    ${soc.map(s => {
      const title = s.title ? escapeHtml(s.title) : 'Ссылка';
      const href = s.link ? escapeHtml(normalizeUrl(s.link)) : '';
      const txt = s.link ? escapeHtml(s.link) : '';
      return `<p><strong>${title}:</strong> ${href ? `<a href="${href}" target="_blank" rel="noopener">${txt || href}</a>` : (txt || '')}</p>`;
    }).join('')}
  ` : '';

  resumePreview.innerHTML = `
    <div class="sheet">
      <div class="header">
        ${hasPhoto ? `<div class="photo"><img src="${photoSrc}" alt="Фото"></div>` : ''}
        <div>
          <h1>${escapeHtml(displayName)}</h1>
          ${displayRole}
          ${metaLines.length ? `<div class="meta">${metaLines.join('')}</div>` : ''}
        </div>
      </div>

    ${personalSection}
    ${expSection}
    ${skillsSection}
    ${eduSection}
    ${coursesSection}
    ${languagesSection}
    ${computerSection}
    ${aboutSection}
    ${additionalSection}
    ${socSection}
    </div>
  `;
}

// ---------------- Listeners ----------------
form?.addEventListener('input', debouncedRender);

// Scroll
scrollUp?.addEventListener('click', () => resumePreview.scrollBy({ top: -220, behavior: 'smooth' }));
scrollDown?.addEventListener('click', () => resumePreview.scrollBy({ top: 220, behavior: 'smooth' }));

// Print
printBtn?.addEventListener('click', () => {
  renderPreview();
  window.print();
});

// ---------------- Export PDF (contrast safe) ----------------
exportPdf?.addEventListener('click', async (e) => {
  e.preventDefault();
  renderPreview();

  if (typeof window.html2pdf === "undefined") {
    alert("Библиотека html2pdf не загружена.");
    return;
  }

  const sheet = resumePreview.querySelector('.sheet');
  if (!sheet) return alert("Не найден лист резюме для экспорта.");

  const sheetClone = sheet.cloneNode(true);
  sheetClone.style.color = '#0b1220';
  sheetClone.style.background = '#ffffff';

  const wrapper = document.createElement('div');
  wrapper.className = resumePreview.className;
  wrapper.style.background = '#ffffff';
  wrapper.style.padding = '0';
  wrapper.style.overflow = 'visible';
  wrapper.appendChild(sheetClone);

  const off = document.createElement('div');
  off.style.position = 'fixed';
  off.style.left = '-10000px';
  off.style.top = '0';
  off.style.width = '794px';
  off.style.background = '#fff';
  off.appendChild(wrapper);
  document.body.appendChild(off);

  const opt = {
    margin: 10,
    filename: 'resume.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  };

  try {
    await html2pdf().set(opt).from(wrapper).save();
  } finally {
    off.remove();
  }
});

// ---------------- Export DOCX ----------------
exportDocx?.addEventListener('click', async (e) => {
  e.preventDefault();
  renderPreview();

  if (!window.docx || !window.saveAs) {
    alert("DOCX или FileSaver не загружены. Проверь подключение скриптов.");
    return;
  }

  const { data, edu, exp, courses, soc, hasPhoto, photoSrc, skillsList } = collectData();
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } = window.docx;

  const children = [];

  if (hasPhoto && photoSrc) {
    try {
      const imgBytes = dataUrlToUint8Array(photoSrc);
      children.push(new Paragraph({
        children: [new ImageRun({ data: imgBytes, transformation: { width: 120, height: 120 } })],
        spacing: { after: 160 }
      }));
    } catch (_) {}
  }

  // Title
  children.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.LEFT,
    children: [new TextRun({ text: (data.name || 'Ф.И.О.'), bold: true })],
    spacing: { after: 120 }
  }));

  if (data.position) {
    children.push(new Paragraph({ children: [new TextRun({ text: data.position })], spacing: { after: 120 } }));
  }

  // Top meta (only filled)
  const topLines = [];
  if (data.employment) topLines.push(`Занятость: ${data.employment}`);
  if (data.schedule) topLines.push(`График: ${data.schedule}`);
  if (data.businessTrips) topLines.push(`Командировки: ${data.businessTrips}`);
  if (data.salary) topLines.push(`Зарплата: ${data.salary}`);

  for (const line of topLines) {
    children.push(new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 60 } }));
  }

  if (data.phone || data.email) {
    children.push(new Paragraph({ children: [new TextRun({ text: `Контакты:`, bold: true })], spacing: { after: 60 } }));
    if (data.phone) children.push(new Paragraph({ children: [new TextRun({ text: `Телефон: ${data.phone}` })], spacing: { after: 60 } }));
    if (data.email) children.push(new Paragraph({ children: [new TextRun({ text: `Email: ${data.email}` })], spacing: { after: 80 } }));
  }

  // Personal info
  const personalLines = [];
  if (data.citizenship) personalLines.push(`Гражданство: ${data.citizenship}`);
  if (data.city) personalLines.push(`Место жительства: ${data.city}`);
  if (data.relocation) personalLines.push(`Переезд: ${data.relocation}`);
  if (data.educationLevel) personalLines.push(`Образование: ${data.educationLevel}`);
  if (data.dob) personalLines.push(`Дата рождения: ${data.dob}`);
  if (data.gender) personalLines.push(`Пол: ${data.gender}`);
  if (data.maritalStatus) personalLines.push(`Семейное положение: ${data.maritalStatus}`);
  if (data.children) personalLines.push(`Дети: ${data.children}`);

  if (personalLines.length) {
    children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Личная информация", bold: true })],
      spacing: { before: 120, after: 80 }
    }));
    for (const line of personalLines) {
      children.push(new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 60 } }));
    }
  }

  if (exp.length) {
    children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Опыт работы", bold: true })],
      spacing: { before: 120, after: 80 }
    }));
    for (const e of exp) {
      const title = [e.company, e.role].filter(Boolean).join(' — ');
      children.push(new Paragraph({ children: [new TextRun({ text: title, bold: true })], spacing: { after: 60 } }));
      if (e.desc) {
        for (const line of e.desc.split(/\n+/).filter(Boolean)) {
          children.push(new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 40 } }));
        }
      }
      children.push(new Paragraph({ text: "", spacing: { after: 60 } }));
    }
  }

  if (edu.length) {
    children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Образование", bold: true })],
      spacing: { before: 120, after: 80 }
    }));
    for (const e of edu) {
      const dates = [formatMonth(e.from), formatMonth(e.to)].filter(Boolean).join(' — ');
      children.push(new Paragraph({ children: [new TextRun({ text: e.school, bold: true })], spacing: { after: 40 } }));
      if (dates) children.push(new Paragraph({ children: [new TextRun({ text: dates })], spacing: { after: 60 } }));
      else children.push(new Paragraph({ text: "", spacing: { after: 60 } }));
    }
  }

  if (courses.length) {
    children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Курсы и тренинги", bold: true })],
      spacing: { before: 120, after: 80 }
    }));
    for (const c of courses) {
      const tail = [c.org, c.year].filter(Boolean).join(' · ');
      children.push(new Paragraph({ children: [new TextRun({ text: c.title, bold: true })], spacing: { after: 40 } }));
      if (tail) children.push(new Paragraph({ children: [new TextRun({ text: tail })], spacing: { after: 60 } }));
      else children.push(new Paragraph({ text: "", spacing: { after: 60 } }));
    }
  }

  if (data.languages) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Иностранные языки", bold: true })],
      spacing: { before: 120, after: 80 }
    }));
    for (const line of data.languages.split(/\n+/).filter(Boolean)) {
      children.push(new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 40 } }));
    }
  }

  if (data.computerSkills) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Компьютерные навыки", bold: true })],
      spacing: { before: 120, after: 80 }
    }));
    for (const line of data.computerSkills.split(/\n+/).filter(Boolean)) {
      children.push(new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 40 } }));
    }
  }

  if (skillsList.length) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Профессиональные навыки", bold: true })],
      spacing: { before: 120, after: 80 }
    }));
    for (const s of skillsList) {
      children.push(new Paragraph({ text: s, bullet: { level: 0 }, spacing: { after: 30 } }));
    }
  }

  if (data.about) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "О себе", bold: true })],
      spacing: { before: 120, after: 80 }
    }));
    for (const line of data.about.split(/\n+/).filter(Boolean)) {
      children.push(new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 40 } }));
    }
  }

  const additionalLines = [];
  if (data.driverLicense) additionalLines.push(`Права: ${data.driverLicense}`);
  if (data.recommendations) additionalLines.push(`Рекомендации: ${data.recommendations}`);
  if (data.hobbies) additionalLines.push(`Свободное время: ${data.hobbies}`);
  if (data.personalQualities) additionalLines.push(`Личные качества: ${data.personalQualities}`);

  if (additionalLines.length) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Дополнительная информация", bold: true })],
      spacing: { before: 120, after: 80 }
    }));
    for (const line of additionalLines) {
      children.push(new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 50 } }));
    }
  }

  if (soc.length) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Соцсети", bold: true })],
      spacing: { before: 120, after: 80 }
    }));
    for (const s of soc) {
      const title = (s.title || "Ссылка").trim();
      const link = (s.link || "").trim();
      children.push(new Paragraph({
        children: [new TextRun({ text: `${title}: `, bold: true }), new TextRun({ text: link })],
        spacing: { after: 50 }
      }));
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  window.saveAs(blob, "resume.docx");
});

// ---------------- Clear form ----------------
function resetDynamicLists() {
  educationList.innerHTML = '';
  experienceList.innerHTML = '';
  coursesList.innerHTML = '';
  socials.innerHTML = '';
  educationList.appendChild(makeEducationEntry());
  experienceList.appendChild(makeExperienceEntry());
}

function resetPhoto() {
  const inp = $('photoInput');
  const img = $('photoPreview');
  const hint = $('photoHint');
  inp.value = '';
  img.removeAttribute('src');
  img.style.display = 'none';
  delete img.dataset.hasPhoto;
  hint.style.display = 'flex';
}

clearFormBtn?.addEventListener('click', () => {
  form.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.type === 'file') return;
    el.value = '';
  });
  resetDynamicLists();
  resetPhoto();
  debouncedRender();
});

// ---------------- Init ----------------
syncPreviewButton();
renderPreview();
showStep(1);
