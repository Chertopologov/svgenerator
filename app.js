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

// Expecting "m.Y" from flatpickr monthSelect
function formatMonth(v){
  const s = (v || '').trim();
  if (!s) return '';
  // already m.Y
  if (/^\d{1,2}\.\d{4}$/.test(s)) return s;
  // fallback YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y,m] = s.split('-');
    return `${m}.${y}`;
  }
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

// Convert multiline to UL if many lines
function toListOrParagraph(text) {
  const raw = (text || '').trim();
  if (!raw) return '';
  const lines = raw.split('\n').map(s => s.trim()).filter(Boolean);
  if (lines.length >= 2) {
    return `<ul>${lines.map(l => `<li>${escapeHtml(l.replace(/^[-•●]\s*/, ''))}</li>`).join('')}</ul>`;
  }
  return `<p class="blockline">${escapeHtml(raw)}</p>`;
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
    // превью реально видно только на шаге 2, но рендерим всегда — безопасно
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
        plugins: [ pluginFactory({ shorthand: true, dateFormat: "m.Y", altFormat: "m.Y" }) ],
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
      <input type="text" class="edu-faculty" placeholder="Факультет (необязательно)">
      <input type="text" class="edu-speciality" placeholder="Специальность (необязательно)">
    </div>
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
    <div class="two-cols">
      <input type="text" class="exp-from" placeholder="С (ММ.ГГГГ)" inputmode="numeric">
      <input type="text" class="exp-to" placeholder="По (ММ.ГГГГ или 'настоящее')" inputmode="numeric">
    </div>
    <input class="exp-company" placeholder="Организация / место работы">
    <input class="exp-role" placeholder="Должность">
    <textarea class="exp-desc" placeholder="Обязанности и достижения (каждый пункт с новой строки)"></textarea>
    <button class="btn btn-ghost btn-sm remove" type="button">Удалить</button>
  `;

  initMonthPicker(row.querySelector('.exp-from'));
  // для exp-to оставляем ввод свободным (можно "настоящее время")
  // но если хочешь тоже picker — раскомментируй:
  // initMonthPicker(row.querySelector('.exp-to'));

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
    name: ($('fullName')?.value || '').trim(),
    position: ($('position')?.value || '').trim(),
    employment: ($('employment')?.value || '').trim(),
    schedule: ($('schedule')?.value || '').trim(),
    businessTrips: ($('businessTrips')?.value || '').trim(),
    salary: ($('salary')?.value || '').trim(),

    phone: ($('phone')?.value || '').trim(),
    email: ($('email')?.value || '').trim(),

    city: ($('city')?.value || '').trim(),
    relocation: ($('relocation')?.value || '').trim(),
    citizenship: ($('citizenship')?.value || '').trim(),
    dob: ($('dob')?.value || '').trim(),
    gender: ($('gender')?.value || '').trim(),
    maritalStatus: ($('maritalStatus')?.value || '').trim(),
    children: ($('children')?.value || '').trim(),
    educationLevel: ($('educationLevel')?.value || '').trim(),

    skills: ($('skills')?.value || ''),
    languages: ($('languages')?.value || '').trim(),
    computerSkills: ($('computerSkills')?.value || '').trim(),

    driverLicense: ($('driverLicense')?.value || '').trim(),
    recommendations: ($('recommendations')?.value || '').trim(),
    hobbies: ($('hobbies')?.value || '').trim(),
    personalQualities: ($('personalQualities')?.value || '').trim(),
    about: ($('about')?.value || '').trim(),
  };

  const edu = [...document.querySelectorAll('.edu-row')].map(row => ({
    school: (row.querySelector('.edu-school')?.value || '').trim(),
    faculty: (row.querySelector('.edu-faculty')?.value || '').trim(),
    speciality: (row.querySelector('.edu-speciality')?.value || '').trim(),
    from: (row.querySelector('.edu-from')?.value || '').trim(),
    to: (row.querySelector('.edu-to')?.value || '').trim(),
  })).filter(e => e.school);

  const exp = [...document.querySelectorAll('.exp-row')].map(row => ({
    from: (row.querySelector('.exp-from')?.value || '').trim(),
    to: (row.querySelector('.exp-to')?.value || '').trim(),
    company: (row.querySelector('.exp-company')?.value || '').trim(),
    role: (row.querySelector('.exp-role')?.value || '').trim(),
    desc: (row.querySelector('.exp-desc')?.value || '').trim(),
  })).filter(e => e.company || e.role || e.desc || e.from || e.to);

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

  // HEADER: lines like screenshot
  const headerMeta = [
    data.employment ? `Занятость: ${data.employment}` : '',
    data.schedule ? `График работы: ${data.schedule}` : '',
    data.businessTrips ? `Готовность к командировкам: ${data.businessTrips}` : '',
    data.salary ? `Желаемая зарплата: ${data.salary}` : '',
    data.phone ? `Телефон: ${data.phone}` : '',
    data.email ? `Электронная почта: ${data.email}` : '',
  ].filter(Boolean);

  const headerMetaHtml = headerMeta.length
    ? `<div class="meta">${headerMeta.map(x => `<div class="meta-line">${escapeHtml(x)}</div>`).join('')}</div>`
    : '';

  // PERSONAL block
  const personalLines = [
    data.citizenship ? `Гражданство: ${data.citizenship}` : '',
    data.city ? `Место проживания: ${data.city}` : '',
    data.relocation ? `Переезд: ${data.relocation}` : '',
    data.educationLevel ? `Образование: ${data.educationLevel}` : '',
    data.dob ? `Дата рождения: ${data.dob}` : '',
    data.gender ? `Пол: ${data.gender}` : '',
    data.maritalStatus ? `Семейное положение: ${data.maritalStatus}` : '',
    data.children ? `Дети: ${data.children}` : '',
  ].filter(Boolean);

  const personalSection = personalLines.length
    ? `
      <div class="section">
        <h2>Личная информация</h2>
        ${personalLines.map(x => `<p class="blockline">${escapeHtml(x)}</p>`).join('')}
      </div>
    `
    : '';

  // EXPERIENCE with period
  const expSection = exp.length ? `
    <div class="section">
      <h2>Опыт работы</h2>
      ${exp.map(e => {
        const period = [formatMonth(e.from), (e.to || '')].filter(Boolean).join(' — ');
        const head = [e.role, e.company].filter(Boolean).join(', ');
        const desc = e.desc ? `
          <div class="blockline"><span class="label">Должностные обязанности и достижения:</span></div>
          ${toListOrParagraph(e.desc)}
        ` : '';
        return `
          ${period ? `<p class="blockline"><span class="label">Период работы:</span> ${escapeHtml(period)}</p>` : ''}
          ${head ? `<p class="blockline"><span class="label">Должность/организация:</span> ${escapeHtml(head)}</p>` : ''}
          ${desc}
        `;
      }).join('')}
    </div>
  ` : '';

  // SKILLS right after experience
  const skillsSection = skillsList.length ? `
    <div class="section">
      <h2>Профессиональные навыки</h2>
      <ul>${skillsList.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
    </div>
  ` : '';

  // EDUCATION with faculty + speciality
  const eduSection = edu.length ? `
    <div class="section">
      <h2>Образование</h2>
      ${edu.map(e => {
        const dates = [formatMonth(e.from), formatMonth(e.to)].filter(Boolean).join(' — ');
        return `
          <p class="blockline"><span class="label">Учебное заведение:</span> ${escapeHtml(e.school)}</p>
          ${e.faculty ? `<p class="blockline"><span class="label">Факультет:</span> ${escapeHtml(e.faculty)}</p>` : ''}
          ${e.speciality ? `<p class="blockline"><span class="label">Специальность:</span> ${escapeHtml(e.speciality)}</p>` : ''}
          ${dates ? `<p class="blockline"><span class="label">Период:</span> ${escapeHtml(dates)}</p>` : ''}
        `;
      }).join('')}
    </div>
  ` : '';

  const coursesSection = courses.length ? `
    <div class="section">
      <h2>Курсы и тренинги</h2>
      ${courses.map(c => {
        const tail = [c.org, c.year].filter(Boolean).join(' · ');
        return `
          <p class="blockline"><span class="label">Название курса:</span> ${escapeHtml(c.title)}</p>
          ${tail ? `<p class="blockline"><span class="label">Детали:</span> ${escapeHtml(tail)}</p>` : ''}
        `;
      }).join('')}
    </div>
  ` : '';

  const languagesSection = data.languages ? `
    <div class="section">
      <h2>Иностранные языки</h2>
      ${toListOrParagraph(data.languages)}
    </div>
  ` : '';

  const computerSection = data.computerSkills ? `
    <div class="section">
      <h2>Компьютерные навыки</h2>
      ${toListOrParagraph(data.computerSkills)}
    </div>
  ` : '';

  const additionalPairs = [];
  if (data.driverLicense) additionalPairs.push(`<p class="blockline"><span class="label">Водительские права:</span> ${escapeHtml(data.driverLicense)}</p>`);
  if (data.recommendations) additionalPairs.push(`<p class="blockline"><span class="label">Рекомендации:</span><br>${escapeHtml(data.recommendations).replace(/\n/g,'<br>')}</p>`);
  if (data.hobbies) additionalPairs.push(`<p class="blockline"><span class="label">Свободное время:</span><br>${escapeHtml(data.hobbies).replace(/\n/g,'<br>')}</p>`);
  if (data.personalQualities) additionalPairs.push(`<p class="blockline"><span class="label">Личные качества:</span><br>${escapeHtml(data.personalQualities).replace(/\n/g,'<br>')}</p>`);

  const additionalSection = additionalPairs.length ? `
    <div class="section">
      <h2>Дополнительная информация</h2>
      ${additionalPairs.join('')}
    </div>
  ` : '';

  const aboutSection = data.about ? `
    <div class="section">
      <h2>О себе</h2>
      ${toListOrParagraph(data.about)}
    </div>
  ` : '';

  const socSection = soc.length ? `
    <div class="section">
      <h2>Соцсети</h2>
      ${soc.map(s => {
        const title = s.title ? escapeHtml(s.title) : 'Ссылка';
        const href = s.link ? escapeHtml(normalizeUrl(s.link)) : '';
        const txt = s.link ? escapeHtml(s.link) : '';
        return `<p class="blockline"><strong>${title}:</strong> ${href ? `<a href="${href}" target="_blank" rel="noopener">${txt || href}</a>` : (txt || '')}</p>`;
      }).join('')}
    </div>
  ` : '';

  // Wrapper for templates — easy to add template-3 etc via CSS
  resumePreview.innerHTML = `
    <div class="sheet">
      <div class="header">
        ${hasPhoto ? `<div class="photo"><img src="${photoSrc}" alt="Фото"></div>` : `<div class="photo" aria-hidden="true"></div>`}
        <div>
          <h1>${escapeHtml(displayName)}</h1>
          ${displayRole}
          ${headerMetaHtml}
        </div>
      </div>

      ${personalSection}
      ${expSection}
      ${skillsSection}
      ${eduSection}
      ${coursesSection}
      ${languagesSection}
      ${computerSection}
      ${additionalSection}
      ${aboutSection}
      ${socSection}
    </div>
  `;
}

// ---------------- Listeners ----------------
form?.addEventListener('input', debouncedRender);

scrollUp?.addEventListener('click', () => resumePreview.scrollBy({ top: -220, behavior: 'smooth' }));
scrollDown?.addEventListener('click', () => resumePreview.scrollBy({ top: 220, behavior: 'smooth' }));

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

  children.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.LEFT,
    children: [new TextRun({ text: (data.name || 'Ф.И.О.'), bold: true })],
    spacing: { after: 120 }
  }));

  if (data.position) {
    children.push(new Paragraph({ children: [new TextRun({ text: data.position })], spacing: { after: 120 } }));
  }

  const topLines = [];
  if (data.employment) topLines.push(`Занятость: ${data.employment}`);
  if (data.schedule) topLines.push(`График работы: ${data.schedule}`);
  if (data.businessTrips) topLines.push(`Командировки: ${data.businessTrips}`);
  if (data.salary) topLines.push(`Желаемая зарплата: ${data.salary}`);
  if (data.phone) topLines.push(`Телефон: ${data.phone}`);
  if (data.email) topLines.push(`Электронная почта: ${data.email}`);

  for (const line of topLines) {
    children.push(new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 60 } }));
  }

  const personalLines = [];
  if (data.citizenship) personalLines.push(`Гражданство: ${data.citizenship}`);
  if (data.city) personalLines.push(`Место проживания: ${data.city}`);
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
      const period = [formatMonth(e.from), (e.to || '')].filter(Boolean).join(' — ');
      const head = [e.role, e.company].filter(Boolean).join(', ');

      if (period) children.push(new Paragraph({ children: [new TextRun({ text: `Период работы: ${period}` })], spacing: { after: 40 } }));
      if (head) children.push(new Paragraph({ children: [new TextRun({ text: `Должность/организация: ${head}` })], spacing: { after: 40 } }));

      if (e.desc) {
        const lines = e.desc.split(/\n+/).map(s => s.trim()).filter(Boolean);
        if (lines.length >= 2) {
          children.push(new Paragraph({ children: [new TextRun({ text: `Должностные обязанности и достижения:`, bold: true })], spacing: { after: 40 } }));
          for (const l of lines) children.push(new Paragraph({ text: l.replace(/^[-•●]\s*/, ''), bullet: { level: 0 }, spacing: { after: 20 } }));
        } else {
          children.push(new Paragraph({ children: [new TextRun({ text: e.desc })], spacing: { after: 40 } }));
        }
      }
      children.push(new Paragraph({ text: "", spacing: { after: 60 } }));
    }
  }

  if (skillsList.length) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Профессиональные навыки", bold: true })],
      spacing: { before: 120, after: 80 }
    }));
    for (const s of skillsList) {
      children.push(new Paragraph({ text: s, bullet: { level: 0 }, spacing: { after: 20 } }));
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
      children.push(new Paragraph({ children: [new TextRun({ text: `Учебное заведение: ${e.school}`, bold: true })], spacing: { after: 40 } }));
      if (e.faculty) children.push(new Paragraph({ children: [new TextRun({ text: `Факультет: ${e.faculty}` })], spacing: { after: 30 } }));
      if (e.speciality) children.push(new Paragraph({ children: [new TextRun({ text: `Специальность: ${e.speciality}` })], spacing: { after: 30 } }));
      if (dates) children.push(new Paragraph({ children: [new TextRun({ text: `Период: ${dates}` })], spacing: { after: 40 } }));
      children.push(new Paragraph({ text: "", spacing: { after: 40 } }));
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
      children.push(new Paragraph({ children: [new TextRun({ text: `Название курса: ${c.title}`, bold: true })], spacing: { after: 30 } }));
      if (tail) children.push(new Paragraph({ children: [new TextRun({ text: `Детали: ${tail}` })], spacing: { after: 40 } }));
    }
  }

  if (data.languages) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Иностранные языки", bold: true })],
      spacing: { before: 120, after: 80 }
    }));
    for (const line of data.languages.split(/\n+/).filter(Boolean)) {
      children.push(new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 30 } }));
    }
  }

  if (data.computerSkills) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Компьютерные навыки", bold: true })],
      spacing: { before: 120, after: 80 }
    }));
    for (const line of data.computerSkills.split(/\n+/).filter(Boolean)) {
      children.push(new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 30 } }));
    }
  }

  const additionalLines = [];
  if (data.driverLicense) additionalLines.push(`Водительские права: ${data.driverLicense}`);
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
      children.push(new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 40 } }));
    }
  }

  if (data.about) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "О себе", bold: true })],
      spacing: { before: 120, after: 80 }
    }));
    for (const line of data.about.split(/\n+/).filter(Boolean)) {
      children.push(new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 30 } }));
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
        spacing: { after: 40 }
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
