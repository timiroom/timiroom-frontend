/* ══════════════════════════════════════════════════════════
   Align-it — Chat-Based Project Creation
   POST /api/v1/orchestration/generate (multipart/form-data)
   ══════════════════════════════════════════════════════════ */

const API_URL = 'http://localhost:8080/api/v1/orchestration/generate';

// ── State ────────────────────────────────────────────────
const formData = {
  projectName: '',
  projectDescription: '',
  platform: 'WEB',
  techStack: [],
  problemDefinition: {
    currentPainPoint: '',
    currentSolution: '',
    idealState: '',
    businessImpact: '',
    motivation: '',
    competitorGap: '',
  },
  targetUsers: [],
  featureDefinition: {
    commonFeatures: [],
    customFeatures: [],
  },
};

const attachedPdfs = [];
let waitingForText = null;
let stepsDone = 0;
let projects = [];
let currentProject = null;
let pipelineResult = null;

// ── DOM refs ─────────────────────────────────────────────
const messagesEl = document.getElementById('messages');
const chatInputEl = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const progressBar = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');
const progressFraction = document.getElementById('progressFraction');
const progressWrap = document.getElementById('progressWrap');
const topbarTitle = document.getElementById('topbarTitle');
const topbarStatus = document.getElementById('topbarStatus');
const sidebarProjects = document.getElementById('sidebarProjects');
const panelBody = document.getElementById('panelBody');
const panelCommit = document.getElementById('panelCommit');
const attachedFilesEl = document.getElementById('attachedFiles');

// ── Utility ──────────────────────────────────────────────
function scrollDown() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function setProgress(done, total = 5, label = '') {
  progressWrap.style.display = 'block';
  const pct = Math.round((done / total) * 100);
  progressBar.style.width = pct + '%';
  progressFraction.textContent = `${done}/${total}`;
  if (label) progressLabel.textContent = label;
  topbarStatus.textContent = `${pct}%`;
}

// ── Message builders ─────────────────────────────────────
function addMsg(role, content, widget) {
  const row = document.createElement('div');
  row.className = 'msg-row ' + role;

  const av = document.createElement('div');
  av.className = 'msg-avatar' + (role === 'agent' ? ' agent' : '');
  av.textContent = role === 'agent' ? 'AI' : '나';

  const body = document.createElement('div');
  body.className = 'msg-body';

  if (content) {
    const bub = document.createElement('div');
    bub.className = 'bubble ' + role;
    bub.innerHTML = content.replace(/\n/g, '<br>');
    body.appendChild(bub);
  }
  if (widget) body.appendChild(widget);

  row.appendChild(av);
  row.appendChild(body);
  messagesEl.appendChild(row);
  scrollDown();
  return body;
}

function showTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'typing-wrap';
  wrap.id = 'typingIndicator';
  const av = document.createElement('div');
  av.className = 'msg-avatar agent';
  av.textContent = 'AI';
  const dots = document.createElement('div');
  dots.className = 'typing-dots';
  dots.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  wrap.appendChild(av);
  wrap.appendChild(dots);
  messagesEl.appendChild(wrap);
  scrollDown();
}

function removeTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

function agentSay(text, widget, delay = 620) {
  return new Promise(resolve => {
    showTyping();
    setTimeout(() => {
      removeTyping();
      addMsg('agent', text, widget);
      resolve();
    }, delay);
  });
}

// ── Widget builders ──────────────────────────────────────
function makeChoices(options, onSelect) {
  const wrap = document.createElement('div');
  wrap.className = 'choices';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.textContent = typeof opt === 'string' ? opt : opt.label;
    btn.onclick = () => {
      wrap.querySelectorAll('.choice').forEach(b => { b.disabled = true; });
      btn.classList.add('selected');
      onSelect(typeof opt === 'string' ? opt : opt.value, btn.textContent);
    };
    wrap.appendChild(btn);
  });
  return wrap;
}

function makeTagPicker(tags, onConfirm) {
  const selected = new Set();
  const wrap = document.createElement('div');
  wrap.className = 'tag-picker';

  const grid = document.createElement('div');
  grid.className = 'tag-grid';
  tags.forEach(t => {
    const chip = document.createElement('div');
    chip.className = 'tag-chip';
    chip.textContent = t;
    chip.onclick = () => {
      chip.classList.toggle('on');
      chip.classList.contains('on') ? selected.add(t) : selected.delete(t);
    };
    grid.appendChild(chip);
  });

  const btn = document.createElement('button');
  btn.className = 'confirm-btn';
  btn.textContent = '선택 완료';
  btn.onclick = () => {
    grid.querySelectorAll('.tag-chip').forEach(c => c.style.pointerEvents = 'none');
    btn.disabled = true;
    onConfirm([...selected]);
  };

  wrap.appendChild(grid);
  wrap.appendChild(btn);
  return wrap;
}

function makeUploadWidget(onDone) {
  const wrap = document.createElement('div');
  wrap.className = 'upload-widget';

  const zone = document.createElement('div');
  zone.className = 'upload-zone';
  zone.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.4">
      <path d="M11 14V6m0 0L8 9m3-3 3 3M5 18h12a2 2 0 002-2v-6a2 2 0 00-.586-1.414l-3-3A2 2 0 0013 5H5a2 2 0 00-2 2v9a2 2 0 002 2z"/>
    </svg>
    <div class="upload-zone-text">PDF 드래그 또는 클릭</div>
    <div class="upload-zone-sub">최대 5개 · 각 20MB</div>`;
  zone.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.multiple = true;
    input.onchange = e => addFilesToWidget(e.target.files, fileList);
    input.click();
  };
  zone.ondragover = e => { e.preventDefault(); zone.style.borderColor = 'var(--text-1)'; };
  zone.ondragleave = () => { zone.style.borderColor = ''; };
  zone.ondrop = e => {
    e.preventDefault();
    zone.style.borderColor = '';
    addFilesToWidget(e.dataTransfer.files, fileList);
  };

  const fileList = document.createElement('div');
  fileList.style.cssText = 'display:flex;flex-direction:column;gap:5px;';

  const actions = document.createElement('div');
  actions.className = 'upload-actions';

  const doneBtn = document.createElement('button');
  doneBtn.className = 'confirm-btn';
  doneBtn.textContent = '업로드 완료';
  doneBtn.onclick = () => {
    zone.style.pointerEvents = 'none';
    doneBtn.disabled = true;
    skipLink.style.display = 'none';
    onDone();
  };

  const skipLink = document.createElement('span');
  skipLink.className = 'skip-link';
  skipLink.textContent = '건너뛰기';
  skipLink.onclick = () => {
    zone.style.pointerEvents = 'none';
    doneBtn.disabled = true;
    skipLink.style.display = 'none';
    onDone();
  };

  actions.appendChild(doneBtn);
  actions.appendChild(skipLink);

  wrap.appendChild(zone);
  wrap.appendChild(fileList);
  wrap.appendChild(actions);
  return wrap;
}

function addFilesToWidget(files, container) {
  Array.from(files).forEach(f => {
    if (attachedPdfs.length >= 5) return;
    attachedPdfs.push(f);
    const pill = document.createElement('div');
    pill.className = 'file-pill';
    pill.innerHTML = `<span class="file-pill-icon">PDF</span> ${f.name}`;
    container.appendChild(pill);
  });
}

function makePersonaWidget(onDone) {
  const wrap = document.createElement('div');
  wrap.className = 'persona-widget';
  const cards = [];
  let cardNum = 0;

  function addCard() {
    cardNum++;
    const n = cardNum;
    const card = document.createElement('div');
    card.className = 'persona-card';
    card.innerHTML = `
      <div class="persona-card-header">
        <span class="persona-card-title">타겟유저 #${n}</span>
        ${n > 1 ? '<span class="persona-remove">×</span>' : ''}
      </div>
      <div class="persona-field">
        <div class="persona-field-label">주요 사용자</div>
        <input data-key="persona" placeholder="예: 20대 경영학과 대학생" />
      </div>
      <div class="persona-field">
        <div class="persona-field-label">주로 쓰는 환경</div>
        <input data-key="env" placeholder="예: 사무실 PC, 스프린트 회의 중" />
      </div>
      <div class="persona-field">
        <div class="persona-field-label">가장 큰 불편함</div>
        <input data-key="pain" placeholder="예: 회의 후 내용 복기가 어려움" />
      </div>`;
    if (n > 1) {
      card.querySelector('.persona-remove').onclick = () => {
        card.remove();
        cards.splice(cards.indexOf(card), 1);
      };
    }
    cards.push(card);
    wrap.insertBefore(card, addMore);
  }

  const addMore = document.createElement('div');
  addMore.className = 'add-more';
  addMore.innerHTML = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> 유저 추가';
  addMore.onclick = () => addCard();

  const btn = document.createElement('button');
  btn.className = 'confirm-btn';
  btn.textContent = '완료';
  btn.onclick = () => {
    formData.targetUsers = cards.map(c => ({
      persona: c.querySelector('[data-key=persona]').value,
      usageEnvironment: c.querySelector('[data-key=env]').value,
      biggestPainPoint: c.querySelector('[data-key=pain]').value,
    })).filter(u => u.persona.trim());
    wrap.querySelectorAll('input').forEach(i => i.disabled = true);
    addMore.style.display = 'none';
    btn.disabled = true;
    onDone();
  };

  wrap.appendChild(addMore);
  wrap.appendChild(btn);
  addCard();
  return wrap;
}

function makeFeatureWidget(onDone) {
  const commonList = ['소셜로그인','회원가입/탈퇴','알림','검색','관리자 페이지','마이 페이지','파일 업로드','결제'];
  const selectedCommon = new Set();
  const customCards = [];
  let cardNum = 0;

  const wrap = document.createElement('div');
  wrap.className = 'feature-widget';

  // Common features
  const commonLabel = document.createElement('div');
  commonLabel.className = 'feature-section-label';
  commonLabel.textContent = '공통 기능';
  wrap.appendChild(commonLabel);

  const grid = document.createElement('div');
  grid.className = 'common-grid';
  commonList.forEach(name => {
    const chip = document.createElement('div');
    chip.className = 'common-chip';
    chip.textContent = name;
    chip.onclick = () => {
      chip.classList.toggle('on');
      chip.classList.contains('on') ? selectedCommon.add(name) : selectedCommon.delete(name);
    };
    grid.appendChild(chip);
  });
  wrap.appendChild(grid);

  const div1 = document.createElement('div');
  div1.className = 'divider';
  wrap.appendChild(div1);

  // Custom features
  const customLabel = document.createElement('div');
  customLabel.className = 'feature-section-label';
  customLabel.textContent = '커스텀 기능 (MoSCoW)';
  wrap.appendChild(customLabel);

  const customWrap = document.createElement('div');
  customWrap.className = 'custom-features';
  wrap.appendChild(customWrap);

  function addCustom() {
    cardNum++;
    const id = cardNum;
    const card = document.createElement('div');
    card.className = 'feature-card';
    card.innerHTML = `
      <div class="feature-card-header">
        <span class="feature-card-num">function #${id}</span>
        <span class="feature-remove">×</span>
      </div>
      <div class="moscow-row">
        <div class="moscow-chip on" data-p="MUST">Must</div>
        <div class="moscow-chip" data-p="SHOULD">Should</div>
        <div class="moscow-chip" data-p="COULD">Could</div>
        <div class="moscow-chip" data-p="WONT">Won't</div>
      </div>
      <input class="feature-input" placeholder="기능 이름 (예: 회의록 자동 생성)" />
      <textarea class="feature-textarea" rows="2" placeholder="기능 설명 + 필요한 기술 스택 등"></textarea>`;

    card.querySelector('.feature-remove').onclick = () => {
      card.remove();
      customCards.splice(customCards.indexOf(card), 1);
    };
    card.querySelectorAll('.moscow-chip').forEach(chip => {
      chip.onclick = () => {
        card.querySelectorAll('.moscow-chip').forEach(c => c.classList.remove('on'));
        chip.classList.add('on');
      };
    });

    customCards.push(card);
    customWrap.appendChild(card);
  }

  const addMore = document.createElement('div');
  addMore.className = 'add-more';
  addMore.innerHTML = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> 기능 추가';
  addMore.onclick = addCustom;
  wrap.appendChild(addMore);
  addCustom();

  const btn = document.createElement('button');
  btn.className = 'confirm-btn';
  btn.textContent = '프로젝트 생성';
  btn.style.marginTop = '4px';
  btn.onclick = () => {
    formData.featureDefinition.commonFeatures = commonList.map(name => ({
      featureName: name,
      selected: selectedCommon.has(name),
      description: '',
    }));
    formData.featureDefinition.customFeatures = customCards.map(c => {
      const active = c.querySelector('.moscow-chip.on');
      return {
        priority: active ? active.dataset.p : 'MUST',
        featureName: c.querySelector('.feature-input').value,
        description: c.querySelector('.feature-textarea').value,
      };
    }).filter(f => f.featureName.trim());

    grid.querySelectorAll('.common-chip').forEach(c => c.style.pointerEvents = 'none');
    addMore.style.display = 'none';
    btn.disabled = true;
    onDone();
  };
  wrap.appendChild(btn);
  return wrap;
}

// ── Panel (right) ────────────────────────────────────────
function updatePanel() {
  panelBody.innerHTML = '';

  function section(key, val) {
    const s = document.createElement('div');
    s.className = 'panel-section';
    const k = document.createElement('div');
    k.className = 'panel-key';
    k.textContent = key;
    const v = document.createElement('div');
    v.className = 'panel-val';
    v.textContent = val;
    s.appendChild(k);
    s.appendChild(v);
    panelBody.appendChild(s);
  }

  function divider() {
    const d = document.createElement('div');
    d.className = 'panel-divider';
    panelBody.appendChild(d);
  }

  if (formData.projectName) section('프로젝트', formData.projectName);
  if (formData.projectDescription) section('설명', formData.projectDescription);
  if (formData.platform) section('플랫폼', formData.platform);

  if (formData.techStack.length) {
    const s = document.createElement('div');
    s.className = 'panel-section';
    const k = document.createElement('div');
    k.className = 'panel-key';
    k.textContent = '기술 스택';
    s.appendChild(k);
    const tags = document.createElement('div');
    formData.techStack.forEach(t => {
      const tag = document.createElement('span');
      tag.className = 'panel-tag';
      tag.textContent = t;
      tags.appendChild(tag);
    });
    s.appendChild(tags);
    panelBody.appendChild(s);
  }

  if (formData.problemDefinition.currentPainPoint) {
    divider();
    section('핵심 문제', formData.problemDefinition.currentPainPoint);
  }
  if (formData.problemDefinition.idealState) {
    section('이상적인 상태', formData.problemDefinition.idealState);
  }

  if (formData.targetUsers.length) {
    divider();
    formData.targetUsers.forEach((u, i) => {
      section(`타겟유저 #${i + 1}`, u.persona);
    });
  }

  const must = [
    ...formData.featureDefinition.commonFeatures.filter(f => f.selected).map(f => f.featureName),
    ...formData.featureDefinition.customFeatures.filter(f => f.priority === 'MUST').map(f => f.featureName),
  ];
  if (must.length) {
    divider();
    section('MVP (Must)', must.join(', '));
  }
}

// ── Sidebar ──────────────────────────────────────────────
function renderSidebar() {
  sidebarProjects.innerHTML = '';
  projects.forEach(p => {
    const item = document.createElement('div');
    item.className = 'sidebar-project-item' + (p === currentProject ? ' active' : '');
    item.innerHTML = `<div class="proj-name">${p.name}</div><div class="proj-meta">${p.status}</div>`;
    sidebarProjects.appendChild(item);
  });
}

// ── Problem questions flow ───────────────────────────────
const problemQs = [
  { key: 'currentPainPoint', q: '지금 어떤 불편함이 있나요?', ph: '예: 회의록 정리에 시간이 너무 많이 걸림', required: true },
  { key: 'currentSolution', q: '현재 그 문제를 어떻게 해결하고 있나요?', ph: '예: 노션에 수동으로 작성 중', required: true },
  { key: 'idealState', q: '서비스가 완성되면 어떤 모습이길 바라나요?', ph: '예: 회의 후 자동으로 요약본이 생성', required: true },
  { key: 'businessImpact', q: '문제로 인한 손실이 있나요? (건너뛰기 가능)', ph: '예: 주당 평균 3시간 낭비', required: false },
  { key: 'motivation', q: '이 서비스를 만들게 된 계기는요? (건너뛰기 가능)', ph: '예: 스프린트 회의 복기 비용 절감', required: false },
  { key: 'competitorGap', q: '비슷한 서비스 대비 개선하고 싶은 점은요? (건너뛰기 가능)', ph: '예: 한국어 인식률이 낮고 Jira 연동이 없음', required: false },
];
let problemIdx = 0;

async function askProblem() {
  if (problemIdx >= problemQs.length) {
    setProgress(3, 5, '레퍼런스');
    await agentSay('문제 정의 완료!\n\n참고할 레퍼런스 문서가 있다면 PDF로 올려주세요.\n기획서, API 스펙, ERD 등 모두 좋아요.');
    addMsg('agent', null, makeUploadWidget(async () => {
      setProgress(4, 5, '타겟유저');
      await agentSay('레퍼런스 업로드 완료!\n\n주요 타겟 유저를 알려주세요.\n여러 명도 추가할 수 있어요.');
      addMsg('agent', null, makePersonaWidget(async () => {
        updatePanel();
        setProgress(4, 5, '기능정의');
        await agentSay('타겟유저 정의 완료!\n\n마지막으로 어떤 기능들이 필요한지 알려주세요.\n공통 기능을 고르고, 추가 기능은 MoSCoW 우선순위로 입력해요.');
        addMsg('agent', null, makeFeatureWidget(async () => {
          updatePanel();
          setProgress(5, 5, '생성 중');
          await agentSay('모든 정보 입력 완료! 파이프라인을 실행할게요 🚀', null, 400);
          await submitToAPI();
        }));
      }));
    }));
    return;
  }

  const q = problemQs[problemIdx];
  await agentSay(q.q);
  chatInputEl.placeholder = q.ph;
  waitingForText = async val => {
    formData.problemDefinition[q.key] = val;
    updatePanel();
    problemIdx++;
    await askProblem();
  };
}

// ── Submit to API ────────────────────────────────────────
async function submitToAPI() {
  topbarStatus.textContent = '생성 중...';

  try {
    const fd = new FormData();
    fd.append('request', JSON.stringify(formData));
    attachedPdfs.forEach(f => fd.append('files', f));

    const res = await fetch(API_URL, { method: 'POST', body: fd });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }

    const json = await res.json();
    pipelineResult = json.data;
    topbarStatus.textContent = '완료';

    await agentSay('생성이 완료됐어요! 상단 탭에서 PRD, API 명세, ERD를 확인하세요 🎉');

    // Show tabs
    document.getElementById('topbarTabs').style.display = 'flex';
    panelCommit.style.display = 'flex';

    // Activate PRD tab by default
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab[data-tab="prd"]').classList.add('active');
    showTabContent('prd');

    // Add to sidebar
    const proj = { name: formData.projectName, status: 'PRD · API · ERD 생성됨' };
    currentProject = proj;
    projects.unshift(proj);
    renderSidebar();

    // Show commit history
    const commitItem = document.createElement('div');
    commitItem.className = 'commit-item';
    commitItem.innerHTML = `
      <div class="commit-msg">initial</div>
      <div class="commit-sub">${formData.projectName} PRD</div>
      <div class="commit-meta"><span>방금 전</span><span>v1</span></div>`;
    panelBody.appendChild(document.createElement('div')).className = 'panel-divider';
    panelBody.appendChild(commitItem);

  } catch (err) {
    topbarStatus.textContent = '오류';
    await agentSay(`API 요청 중 오류가 발생했어요.\n\n${err.message}\n\n백엔드 서버가 실행 중인지 확인해주세요.`);
    console.error('[Align-it] API error:', err);
  }
}

// ── Boot sequence ────────────────────────────────────────
async function boot() {
  await agentSay('안녕하세요! 새 프로젝트를 만들어드릴게요 👋', null, 280);
  await agentSay(
    '몇 가지 질문을 통해\nPRD, DB 스키마, API 스펙을 자동으로 생성해드릴게요.',
    null, 800
  );
  await agentSay('먼저 프로젝트 이름을 알려주세요.', null, 600);

  chatInputEl.placeholder = '예: Align-it';
  waitingForText = async val => {
    formData.projectName = val;
    topbarTitle.textContent = val;
    currentProject = { name: val, status: '진행 중' };
    projects.unshift(currentProject);
    renderSidebar();
    setProgress(1, 5, '기본 정보');

    await agentSay(`"${val}" 이군요!\n한 줄로 어떤 서비스인지 설명해주세요.`);
    chatInputEl.placeholder = '예: 회의록 자동화 서비스';
    waitingForText = async desc => {
      formData.projectDescription = desc;
      updatePanel();
      setProgress(1, 5, '플랫폼');

      await agentSay('어떤 플랫폼으로 만들 예정인가요?');
      addMsg('agent', null, makeChoices(
        [{ label: '웹', value: 'WEB' }, { label: '앱', value: 'APP' }, { label: '웹앱', value: 'WEB_APP' }],
        async (val, label) => {
          formData.platform = val;
          addMsg('user', label);
          updatePanel();
          setProgress(1, 5, '기술 스택');

          await agentSay('어떤 기술 스택을 사용할 예정인가요?\n없으면 건너뛰어도 돼요.');
          addMsg('agent', null, makeTagPicker(
            ['React', 'Vue', 'Next.js', 'Spring Boot', 'Node.js', 'Django', 'FastAPI', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'AWS', 'Docker', 'Kotlin', 'Flutter'],
            async selected => {
              formData.techStack = selected;
              addMsg('user', selected.length ? selected.join(', ') : '미정');
              updatePanel();
              setProgress(2, 5, '문제정의');

              await agentSay('이제 만들려는 서비스의 문제를 같이 정의해볼게요.\n몇 가지 질문을 드릴게요 🙂');
              problemIdx = 0;
              await askProblem();
            }
          ));
        }
      ));
    };
  };
}

// ── User input ───────────────────────────────────────────
function handleSend() {
  const val = chatInputEl.value.trim();
  if (!val) return;
  chatInputEl.value = '';
  chatInputEl.style.height = 'auto';
  chatInputEl.placeholder = '메시지를 입력하세요...';
  addMsg('user', val);

  if (waitingForText) {
    const fn = waitingForText;
    waitingForText = null;
    fn(val);
  }
}

sendBtn.addEventListener('click', handleSend);
chatInputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});
chatInputEl.addEventListener('input', () => {
  chatInputEl.style.height = 'auto';
  chatInputEl.style.height = Math.min(chatInputEl.scrollHeight, 120) + 'px';
});

// ── File attach (input bar) ──────────────────────────────
document.getElementById('fileInput').addEventListener('change', e => {
  Array.from(e.target.files).forEach(f => {
    if (attachedPdfs.length >= 5) return;
    attachedPdfs.push(f);
    const pill = document.createElement('div');
    pill.className = 'file-pill';
    pill.innerHTML = `<span class="file-pill-icon">PDF</span> ${f.name} <span class="file-x" data-name="${f.name}">×</span>`;
    pill.querySelector('.file-x').onclick = () => {
      const idx = attachedPdfs.findIndex(p => p.name === f.name);
      if (idx > -1) attachedPdfs.splice(idx, 1);
      pill.remove();
    };
    attachedFilesEl.appendChild(pill);
  });
  e.target.value = '';
});

// ── Commit button ────────────────────────────────────────
document.getElementById('commitBtn').addEventListener('click', () => {
  const summary = document.getElementById('commitSummary').value.trim();
  if (!summary) return;
  const desc = document.getElementById('commitDesc').value.trim();

  const item = document.createElement('div');
  item.className = 'commit-item';
  item.innerHTML = `
    <div class="commit-msg">${summary}</div>
    ${desc ? `<div class="commit-sub">${desc}</div>` : ''}
    <div class="commit-meta"><span>방금 전</span><span>v${panelBody.querySelectorAll('.commit-item').length + 1}</span></div>`;
  panelBody.appendChild(item);

  document.getElementById('commitSummary').value = '';
  document.getElementById('commitDesc').value = '';
  panelBody.scrollTop = panelBody.scrollHeight;
});

// ── New project btn ──────────────────────────────────────
document.getElementById('newProjectBtn').addEventListener('click', () => {
  location.reload();
});

// ── Tab switching ────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    if (pipelineResult) showTabContent(tab.dataset.tab);
  });
});

// ── Result rendering ─────────────────────────────────────
function showTabContent(tabName) {
  document.getElementById('messages').style.display = 'none';
  const tc = document.getElementById('tabContent');
  tc.style.display = 'block';
  tc.innerHTML = '';
  if (!pipelineResult) return;
  const d = pipelineResult;
  const map = {
    prd:     () => renderPrd(tc, d.prdDocument),
    feature: () => renderFeature(tc, d.featureList, d.prdDocument),
    api:     () => renderApiSpec(tc, d.apiSpec),
    erd:     () => renderErd(tc, d.dbSchema),
    qa:      () => renderQa(tc, d.prdDocument),
  };
  (map[tabName] || (() => {}))();
}

function mkDiv(cls) {
  const d = document.createElement('div');
  d.className = cls;
  return d;
}

function mkSection(title) {
  const s = mkDiv('rs');
  const h = document.createElement('h3');
  h.className = 'rs-title';
  h.textContent = title;
  s.appendChild(h);
  return s;
}

function mkTable(headers, rows) {
  const wrap = mkDiv('table-wrap');
  const t = document.createElement('table');
  t.className = 'result-table';
  const thead = t.createTHead();
  const tr = thead.insertRow();
  headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; tr.appendChild(th); });
  const tbody = t.createTBody();
  rows.forEach(row => {
    const r = tbody.insertRow();
    row.forEach(cell => { const td = r.insertCell(); td.textContent = cell || '-'; });
  });
  wrap.appendChild(t);
  return wrap;
}

function mkCard(parent) {
  const c = mkDiv('rc');
  parent.appendChild(c);
  return c;
}

function mkBadge(text, cls) {
  const b = document.createElement('span');
  b.className = 'badge ' + cls;
  b.textContent = text;
  return b;
}

function mkCardHeader(title, badgeText, badgeCls) {
  const h = mkDiv('rc-header');
  const t = document.createElement('span');
  t.className = 'rc-title';
  t.textContent = title;
  h.appendChild(t);
  if (badgeText) h.appendChild(mkBadge(badgeText, badgeCls || 'badge-neutral'));
  return h;
}

// ── PRD ──────────────────────────────────────────────────
function renderPrd(container, prd) {
  if (!prd || !Object.keys(prd).length) {
    container.innerHTML = '<p class="empty-msg">PRD 데이터가 없습니다.</p>';
    return;
  }

  if (prd.projectOverview) {
    const s = mkSection('프로젝트 개요');
    const p = document.createElement('p');
    p.className = 'rs-overview';
    p.textContent = prd.projectOverview;
    s.appendChild(p);
    container.appendChild(s);
  }

  if (prd.background) {
    const s = mkSection('배경');
    const p = document.createElement('p');
    p.className = 'rs-text';
    p.textContent = prd.background;
    s.appendChild(p);
    container.appendChild(s);
  }

  if (prd.goals?.length) {
    const s = mkSection('목표');
    const ul = document.createElement('ul');
    ul.className = 'rs-list';
    prd.goals.forEach(g => { const li = document.createElement('li'); li.textContent = g; ul.appendChild(li); });
    s.appendChild(ul);
    container.appendChild(s);
  }

  if (prd.kpi?.length) {
    const s = mkSection('KPI');
    s.appendChild(mkTable(
      ['지표', '목표', '측정 방법', '주기'],
      prd.kpi.map(k => [k.metric, k.target, k.measurementMethod, k.frequency])
    ));
    container.appendChild(s);
  }

  if (prd.marketData?.competitors?.length) {
    const s = mkSection('경쟁사 분석');
    s.appendChild(mkTable(
      ['서비스', '매출', '강점 요약', '약점 요약'],
      prd.marketData.competitors.map(c => [
        c.name, c.revenue,
        (c.feature || '').substring(0, 60) + ((c.feature || '').length > 60 ? '…' : ''),
        (c.weakness || '').substring(0, 60) + ((c.weakness || '').length > 60 ? '…' : ''),
      ])
    ));
    container.appendChild(s);
  }

  if (prd.userPersonas?.length) {
    const s = mkSection('사용자 페르소나');
    const grid = mkDiv('rc-grid');
    prd.userPersonas.forEach(p => {
      const c = mkDiv('rc');
      c.appendChild(mkCardHeader(p.name, `${p.age || ''} · ${p.job || ''}`, 'badge-neutral'));
      [['기술 수준', p.techLevel], ['목표', p.goal], ['불편함', p.painPoint]].forEach(([k, v]) => {
        if (!v) return;
        const kv = mkDiv('rc-kv');
        const key = document.createElement('span'); key.className = 'kv-key'; key.textContent = k;
        const val = document.createElement('span'); val.textContent = v;
        kv.appendChild(key); kv.appendChild(val);
        c.appendChild(kv);
      });
      grid.appendChild(c);
    });
    s.appendChild(grid);
    container.appendChild(s);
  }

  if (prd.coreFeatures?.length) {
    const s = mkSection('핵심 기능');
    prd.coreFeatures.forEach(f => {
      const c = mkCard(s);
      const priorityCls = { P0: 'badge-red', P1: 'badge-blue', P2: 'badge-neutral' }[f.priority] || 'badge-neutral';
      c.appendChild(mkCardHeader(f.name, f.priority, priorityCls));
      if (f.description) {
        const p = document.createElement('p'); p.className = 'rc-text'; p.textContent = f.description; c.appendChild(p);
      }
      if (f.requirements?.length) {
        const ul = document.createElement('ul'); ul.className = 'req-list';
        f.requirements.forEach(r => { const li = document.createElement('li'); li.textContent = r; ul.appendChild(li); });
        c.appendChild(ul);
      }
    });
    container.appendChild(s);
  }

  if (prd.techStack && Object.keys(prd.techStack).length) {
    const s = mkSection('기술 스택');
    const grid = mkDiv('kv-grid');
    Object.entries(prd.techStack).forEach(([k, v]) => {
      const row = mkDiv('kv-row');
      const key = document.createElement('span'); key.className = 'kv-key'; key.textContent = k;
      const val = document.createElement('span'); val.className = 'kv-val'; val.textContent = v;
      row.appendChild(key); row.appendChild(val);
      grid.appendChild(row);
    });
    s.appendChild(grid);
    container.appendChild(s);
  }

  if (prd.userFlow?.length) {
    const s = mkSection('사용자 플로우');
    const ol = document.createElement('ol'); ol.className = 'rs-list rs-ol';
    prd.userFlow.forEach(step => { const li = document.createElement('li'); li.textContent = step; ol.appendChild(li); });
    s.appendChild(ol);
    container.appendChild(s);
  }

  if (prd.releaseSchedule?.length) {
    const s = mkSection('릴리즈 일정');
    s.appendChild(mkTable(
      ['기간', '마일스톤', '담당팀', '산출물'],
      prd.releaseSchedule.map(r => [r.date, r.milestone, r.team, (r.deliverables || []).join(', ')])
    ));
    container.appendChild(s);
  }

  if (prd.risks?.length) {
    const s = mkSection('리스크');
    prd.risks.forEach(r => {
      const c = mkCard(s);
      const impactCls = { '상': 'badge-red', '중': 'badge-amber', '하': 'badge-neutral' }[r.impact] || 'badge-neutral';
      c.appendChild(mkCardHeader(r.title, `영향: ${r.impact || '-'}`, impactCls));
      if (r.description) {
        const p = document.createElement('p'); p.className = 'rc-text'; p.textContent = r.description; c.appendChild(p);
      }
      if (r.strategy) {
        const kv = mkDiv('rc-kv');
        const key = document.createElement('span'); key.className = 'kv-key'; key.textContent = '대응 전략';
        const val = document.createElement('span'); val.textContent = r.strategy;
        kv.appendChild(key); kv.appendChild(val);
        c.appendChild(kv);
      }
    });
    container.appendChild(s);
  }

  if (prd.successMetrics?.length) {
    const s = mkSection('성공 지표');
    s.appendChild(mkTable(
      ['지표', '목표', '도구', '주기', '담당'],
      prd.successMetrics.map(m => [m.metric, m.target, m.measurementTool, m.frequency, m.owner])
    ));
    container.appendChild(s);
  }
}

// ── Feature ───────────────────────────────────────────────
function renderFeature(container, featureList, prd) {
  if (featureList?.length) {
    const s = mkSection('기능 목록');
    const wrap = mkDiv('tag-row');
    featureList.forEach(f => {
      const tag = document.createElement('span');
      tag.className = 'feature-tag';
      tag.textContent = f;
      wrap.appendChild(tag);
    });
    s.appendChild(wrap);
    container.appendChild(s);
  }

  if (prd?.mvpScope) {
    const m = prd.mvpScope;
    const s = mkSection('MVP 범위');
    const grid = mkDiv('mvp-grid');
    if (m.included?.length) {
      const col = mkDiv('mvp-col');
      const title = document.createElement('div'); title.className = 'mvp-col-title'; title.textContent = '포함';
      col.appendChild(title);
      m.included.forEach(i => { const t = mkBadge(i, 'badge-green'); col.appendChild(t); });
      grid.appendChild(col);
    }
    if (m.excluded?.length) {
      const col = mkDiv('mvp-col');
      const title = document.createElement('div'); title.className = 'mvp-col-title'; title.textContent = '제외';
      col.appendChild(title);
      m.excluded.forEach(i => { const t = mkBadge(i, 'badge-neutral'); col.appendChild(t); });
      grid.appendChild(col);
    }
    s.appendChild(grid);
    if (m.rationale) {
      const p = document.createElement('p'); p.className = 'rs-text'; p.style.marginTop = '10px'; p.textContent = m.rationale; s.appendChild(p);
    }
    container.appendChild(s);
  }

  if (prd?.fsd?.length) {
    const s = mkSection(`기능 명세 (FSD) — ${prd.fsd.length}개`);
    prd.fsd.forEach(f => {
      const c = mkCard(s);
      c.appendChild(mkCardHeader(f.id, f.category, 'badge-neutral'));
      if (f.description) {
        const p = document.createElement('p'); p.className = 'rc-text'; p.textContent = f.description; c.appendChild(p);
      }
      if (f.action) {
        const kv = mkDiv('rc-kv');
        const key = document.createElement('span'); key.className = 'kv-key'; key.textContent = 'Action';
        const val = document.createElement('span'); val.textContent = f.action;
        kv.appendChild(key); kv.appendChild(val);
        c.appendChild(kv);
      }
      if (f.acceptanceCriteria?.length) {
        const label = document.createElement('div'); label.className = 'ep-label'; label.textContent = '검수 기준'; c.appendChild(label);
        const ul = document.createElement('ul'); ul.className = 'req-list';
        f.acceptanceCriteria.forEach(a => { const li = document.createElement('li'); li.textContent = a; ul.appendChild(li); });
        c.appendChild(ul);
      }
    });
    container.appendChild(s);
  }
}

// ── API Spec ──────────────────────────────────────────────
function renderApiSpec(container, apiSpec) {
  if (!apiSpec || !Object.keys(apiSpec).length) {
    container.innerHTML = '<p class="empty-msg">API 스펙 데이터가 없습니다.</p>';
    return;
  }

  if (apiSpec.authentication) {
    const s = mkSection('인증 방식');
    const p = document.createElement('p'); p.className = 'rs-text'; p.textContent = apiSpec.authentication;
    s.appendChild(p);
    container.appendChild(s);
  }

  if (apiSpec.endpoints?.length) {
    const s = mkSection(`엔드포인트 (${apiSpec.endpoints.length}개)`);
    apiSpec.endpoints.forEach(ep => {
      const c = mkCard(s);
      c.classList.add('endpoint-card');
      const method = (ep.method || 'GET').toUpperCase();
      const methodCls = { GET: 'badge-blue', POST: 'badge-green', PUT: 'badge-amber', PATCH: 'badge-amber', DELETE: 'badge-red' }[method] || 'badge-neutral';

      const header = mkDiv('rc-header');
      header.appendChild(mkBadge(method, 'badge method-badge ' + methodCls));
      const path = document.createElement('code'); path.className = 'endpoint-path'; path.textContent = ep.path || '';
      header.appendChild(path);
      c.appendChild(header);

      if (ep.description) {
        const p = document.createElement('p'); p.className = 'rc-text'; p.textContent = ep.description; c.appendChild(p);
      }

      if (ep.request) {
        const sec = mkDiv('ep-section');
        const lbl = document.createElement('div'); lbl.className = 'ep-label'; lbl.textContent = 'Request'; sec.appendChild(lbl);
        if (ep.request.headers && Object.keys(ep.request.headers).length) {
          const pre = document.createElement('pre'); pre.className = 'code-block';
          pre.textContent = 'Headers:\n' + Object.entries(ep.request.headers).map(([k, v]) => `  ${k}: ${v}`).join('\n');
          sec.appendChild(pre);
        }
        if (ep.request.body && Object.keys(ep.request.body).length) {
          const pre = document.createElement('pre'); pre.className = 'code-block';
          pre.textContent = 'Body:\n' + JSON.stringify(ep.request.body, null, 2);
          sec.appendChild(pre);
        }
        c.appendChild(sec);
      }

      if (ep.response) {
        const sec = mkDiv('ep-section');
        const lbl = document.createElement('div'); lbl.className = 'ep-label'; lbl.textContent = 'Response'; sec.appendChild(lbl);
        if (ep.response.success) {
          const pre = document.createElement('pre'); pre.className = 'code-block';
          pre.textContent = '200 OK:\n' + JSON.stringify(ep.response.success, null, 2);
          sec.appendChild(pre);
        }
        if (ep.response.error) {
          const p = document.createElement('p'); p.className = 'ep-error'; p.textContent = 'Error: ' + ep.response.error; sec.appendChild(p);
        }
        c.appendChild(sec);
      }
    });
    container.appendChild(s);
  }
}

// ── ERD ───────────────────────────────────────────────────
function renderErd(container, dbSchema) {
  if (!dbSchema || !Object.keys(dbSchema).length) {
    container.innerHTML = '<p class="empty-msg">DB 스키마 데이터가 없습니다.</p>';
    return;
  }

  if (dbSchema.relationships?.length) {
    const s = mkSection('테이블 관계');
    const ul = document.createElement('ul'); ul.className = 'rs-list';
    dbSchema.relationships.forEach(r => { const li = document.createElement('li'); li.textContent = r; ul.appendChild(li); });
    s.appendChild(ul);
    container.appendChild(s);
  }

  if (dbSchema.tables?.length) {
    const s = mkSection(`테이블 (${dbSchema.tables.length}개)`);
    dbSchema.tables.forEach(t => {
      const c = mkCard(s);
      c.appendChild(mkCardHeader(t.name, t.indexes?.length ? `인덱스 ${t.indexes.length}개` : '', 'badge-neutral'));
      if (t.columns?.length) {
        c.appendChild(mkTable(
          ['컬럼', '타입', '제약조건'],
          t.columns.map(col => [col.name, col.type, col.constraints])
        ));
      }
      if (t.indexes?.length) {
        const sec = mkDiv('ep-section');
        const lbl = document.createElement('div'); lbl.className = 'ep-label'; lbl.textContent = '인덱스'; sec.appendChild(lbl);
        const ul = document.createElement('ul'); ul.className = 'req-list';
        t.indexes.forEach(idx => { const li = document.createElement('li'); li.textContent = idx; ul.appendChild(li); });
        sec.appendChild(ul);
        c.appendChild(sec);
      }
    });
    container.appendChild(s);
  }
}

// ── QA ────────────────────────────────────────────────────
function renderQa(container, prd) {
  if (!prd) {
    container.innerHTML = '<p class="empty-msg">QA 데이터가 없습니다.</p>';
    return;
  }

  if (prd.fsd?.length) {
    const s = mkSection(`기능 명세 검수 기준 (FSD) — ${prd.fsd.length}개`);
    prd.fsd.forEach(f => {
      const c = mkCard(s);
      c.appendChild(mkCardHeader(f.id, f.category, 'badge-neutral'));
      if (f.description) {
        const p = document.createElement('p'); p.className = 'rc-text'; p.textContent = f.description; c.appendChild(p);
      }
      if (f.acceptanceCriteria?.length) {
        const label = document.createElement('div'); label.className = 'ep-label'; label.textContent = '검수 기준'; c.appendChild(label);
        const ul = document.createElement('ul'); ul.className = 'req-list';
        f.acceptanceCriteria.forEach(a => { const li = document.createElement('li'); li.textContent = a; ul.appendChild(li); });
        c.appendChild(ul);
      }
    });
    container.appendChild(s);
  }

  if (prd.successMetrics?.length) {
    const s = mkSection('성공 지표');
    s.appendChild(mkTable(
      ['지표', '목표', '도구', '주기', '담당'],
      prd.successMetrics.map(m => [m.metric, m.target, m.measurementTool, m.frequency, m.owner])
    ));
    container.appendChild(s);
  }
}

// ── Start ────────────────────────────────────────────────
boot();
