
let appData;
let activeFilter = "All";
let searchTerm = "";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const statusClass = s => `status-${s.toLowerCase().replace(/\s+/g,"-")}`;
const displayStatus = s => s === "Ongoing" ? "Still needs attention" : s;

async function init(){
  const response = await fetch("data.json");
  appData = await response.json();
  renderHeroQuestions();
  renderOverviewTimeline();
  renderAuditYears();
  renderTopics();
  bind();
  handleRoute();
}

function bind(){
  $("#searchInput").addEventListener("input", e => {
    searchTerm=e.target.value.trim().toLowerCase();
    renderSearch();
  });

  $("#clearSearch").addEventListener("click",()=>{
    $("#searchInput").value="";
    searchTerm="";
    renderSearch();
    $("#searchInput").focus();
  });

  document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{
    activeFilter=b.dataset.filter;
    document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));
    renderTopics();
  }));

  $("#aboutButton").addEventListener("click",()=>$("#aboutDialog").showModal());
  $("#footerAbout").addEventListener("click",()=>$("#aboutDialog").showModal());
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>b.closest("dialog").close()));
  document.querySelectorAll("dialog").forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close()}));

  window.addEventListener("hashchange", handleRoute);
}

function go(route){
  location.hash = route;
}

function showHome(){
  $("#homeView").hidden = false;
  $("#pageView").hidden = true;
  document.title = "Lincoln Audit Explorer";
  window.scrollTo({top:0, behavior:"instant"});
}

function handleRoute(){
  const route = location.hash.replace(/^#\/?/, "");
  if(!route){
    showHome();
    return;
  }

  const [type,id] = route.split("/");
  if(type === "question") return renderQuestionPage(id);
  if(type === "topic") return renderTopicPage(id);
  if(type === "audit") return renderAuditPage(id);
  if(type === "evidence") return renderEvidencePage(id);
  showHome();
}

function renderHeroQuestions(){
  $("#heroQuestionGrid").innerHTML = appData.questions.slice(0,6).map(q=>`
    <button class="hero-question-card" data-question="${esc(q.id)}">
      <strong>${esc(q.question)}</strong>
      <span>${esc(q.shortAnswer)}</span>
      <span class="hero-card-cta">Explore this question <span aria-hidden="true">→</span></span>
    </button>`).join("");

  document.querySelectorAll("[data-question]").forEach(b=>
    b.addEventListener("click",()=>go(`question/${b.dataset.question}`))
  );
}

function renderAuditYears(){
  $("#auditYearGrid").innerHTML=appData.audits.map((a,i)=>`
    <button class="audit-year-card" data-audit="${esc(a.id)}">
      <span class="audit-year-number">${String(i+1).padStart(2,"0")}</span>
      <span class="audit-year-date">${esc(a.years)} Audit</span>
      <h3>${esc(a.theme)}</h3>
      <p>${esc(a.cardSummary)}</p>
      <span class="audit-year-cta">Explore this audit <span aria-hidden="true">→</span></span>
    </button>`).join("");

  document.querySelectorAll("[data-audit]").forEach(b=>
    b.addEventListener("click",()=>go(`audit/${b.dataset.audit}`))
  );
}

function renderOverviewTimeline(){
  $("#auditOverviewTimeline").innerHTML = appData.auditOverview.map((x,i)=>`
    <article class="overview-step">
      <div class="timeline-dot tone-${esc(x.tone)}">${i+1}</div>
      <div>
        <strong>${esc(x.year)}</strong>
        <h3>${esc(x.status)}</h3>
        <p>${esc(x.summary)}</p>
      </div>
    </article>`).join("");

  $("#documentedUpdatesOverview").innerHTML = appData.documentedUpdatesOverview.map(x=>`
    <article class="documented-update-card">
      <span class="documented-update-year">${esc(x.year)}</span>
      <div>
        <h3>${esc(x.status)}</h3>
        <p>${esc(x.summary)}</p>
      </div>
    </article>`).join("");
}

function renderTopics(){
  const items=appData.topics.filter(t=>activeFilter==="All"||t.status===activeFilter);
  $("#topicGrid").innerHTML=items.map(topicCard).join("");
  $("#emptyState").hidden=!!items.length;

  document.querySelectorAll("[data-topic]").forEach(b=>
    b.addEventListener("click",()=>go(`topic/${b.dataset.topic}`))
  );
}

function topicCard(t){
  return `<button class="topic-card" data-topic="${esc(t.id)}">
    <div class="topic-top">
      <span class="status ${statusClass(t.status)}">${esc(displayStatus(t.status))}</span>
      <span class="risk-line">${esc(t.risk)} risk</span>
    </div>
    <div class="topic-title-row">
      <span class="topic-icon" aria-hidden="true">${esc(t.icon || "📌")}</span>
      <h3>${esc(t.plainTitle)}</h3>
    </div>
    <p>${esc(t.summary)}</p>
    <span class="card-arrow">Explore this topic →</span>
  </button>`;
}

function normalizeSearch(value){
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g,"")
    .replace(/[^a-z0-9\s]/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function searchableText(obj){
  return normalizeSearch([
    obj.question,
    obj.title,
    obj.plainTitle,
    obj.shortAnswer,
    obj.answer,
    obj.summary,
    obj.whyItMatters,
    obj.fact,
    obj.interpretation,
    ...(obj.searchAliases || [])
  ].filter(Boolean).join(" "));
}

function searchScore(obj, term){
  const needle=normalizeSearch(term);
  if(!needle) return 0;

  const words=needle.split(" ").filter(Boolean);
  const question=normalizeSearch(obj.question || obj.plainTitle || obj.title || "");
  const aliases=(obj.searchAliases || []).map(normalizeSearch);
  const text=searchableText(obj);

  let score=0;

  if(question===needle) score+=120;
  if(question.includes(needle)) score+=70;
  if(aliases.some(a=>a===needle)) score+=100;
  if(aliases.some(a=>a.includes(needle) || needle.includes(a))) score+=65;
  if(text.includes(needle)) score+=45;

  words.forEach(word=>{
    if(question.includes(word)) score+=14;
    if(aliases.some(a=>a.includes(word))) score+=12;
    if(text.includes(word)) score+=5;
  });

  if(words.every(word=>text.includes(word))) score+=20;
  return score;
}

function findSearchGuide(term){
  const normalized=normalizeSearch(term);
  const guides=appData.searchGuides || {};
  let best=null;
  let bestScore=0;

  for(const [key,guide] of Object.entries(guides)){
    const normalizedKey=normalizeSearch(key);
    let score=0;
    if(normalized===normalizedKey) score=120;
    else if(normalized.includes(normalizedKey)) score=90;
    else if(normalizedKey.includes(normalized)) score=60;

    if(score>bestScore){
      best={key,guide};
      bestScore=score;
    }
  }
  return best;
}

function dedupeById(items){
  return [...new Map(items.map(x=>[x.id,x])).values()];
}

function renderSearch(){
  const box=$("#searchResults");
  const guideBox=$("#searchGuide");
  const questionBox=$("#questionGrid");
  const topicBox=$("#searchTopicGrid");

  if(!searchTerm){
    box.hidden=true;
    guideBox.innerHTML="";
    questionBox.innerHTML="";
    topicBox.innerHTML="";
    return;
  }

  const guideMatch=findSearchGuide(searchTerm);
  const rankedQuestions=appData.questions
    .map(q=>({item:q,score:searchScore(q,searchTerm)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score);

  const rankedTopics=appData.topics
    .map(t=>({item:t,score:searchScore(t,searchTerm)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score);

  const guide=guideMatch?.guide || null;
  const guideQuestions=guide
    ? appData.questions.filter(q=>(guide.questionIds || []).includes(q.id))
    : [];
  const guideTopics=guide
    ? appData.topics.filter(t=>(guide.topicIds || []).includes(t.id))
    : [];

  const bestQuestion=guideQuestions[0] || rankedQuestions[0]?.item || null;
  const bestTopic=!bestQuestion ? (guideTopics[0] || rankedTopics[0]?.item || null) : null;

  box.hidden=false;

  if(guide){
    guideBox.innerHTML=`
      <section class="search-answer-panel">
        <p class="search-answer-label">Best answer</p>
        <h2>${esc(guide.title)}</h2>
        <p class="search-answer-text">${esc(guide.answer)}</p>
        ${bestQuestion ? `
          <button class="search-primary-action" data-search-question="${esc(bestQuestion.id)}">
            Read the full answer <span aria-hidden="true">→</span>
          </button>` : ""}
      </section>`;
  }else if(bestQuestion){
    guideBox.innerHTML=`
      <section class="search-answer-panel">
        <p class="search-answer-label">Best answer</p>
        <h2>${esc(bestQuestion.question)}</h2>
        <p class="search-answer-text">${esc(bestQuestion.shortAnswer || bestQuestion.answer)}</p>
        <button class="search-primary-action" data-search-question="${esc(bestQuestion.id)}">
          Read the full answer <span aria-hidden="true">→</span>
        </button>
      </section>`;
  }else if(bestTopic){
    guideBox.innerHTML=`
      <section class="search-answer-panel">
        <p class="search-answer-label">Closest topic</p>
        <h2>${esc(bestTopic.plainTitle)}</h2>
        <p class="search-answer-text">${esc(bestTopic.summary)}</p>
        <button class="search-primary-action" data-search-topic="${esc(bestTopic.id)}">
          Explore this topic <span aria-hidden="true">→</span>
        </button>
      </section>`;
  }else{
    guideBox.innerHTML=`
      <section class="search-answer-panel search-no-answer">
        <p class="search-answer-label">No clear answer yet</p>
        <h2>Try asking in a different way.</h2>
        <p class="search-answer-text">Try words such as <strong>missing money</strong>, <strong>fraud</strong>, <strong>utility bills</strong>, <strong>taxes</strong>, or <strong>did the City improve?</strong></p>
      </section>`;
  }

  const relatedQuestions=dedupeById([
    ...guideQuestions,
    ...rankedQuestions.map(x=>x.item)
  ]).filter(q=>q.id!==bestQuestion?.id).slice(0,4);

  const relatedTopics=dedupeById([
    ...guideTopics,
    ...rankedTopics.map(x=>x.item)
  ]).filter(t=>t.id!==bestTopic?.id).slice(0,4);

  questionBox.innerHTML=relatedQuestions.length ? `
    <div class="search-related-heading">
      <h3>Related questions</h3>
      <p>These may help you explore the issue further.</p>
    </div>
    <div class="search-related-list">
      ${relatedQuestions.map(q=>`
        <button class="search-related-item" data-search-question="${esc(q.id)}">
          <span>
            <strong>${esc(q.question)}</strong>
            <small>${esc(q.shortAnswer)}</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>`).join("")}
    </div>` : "";

  topicBox.innerHTML=relatedTopics.length ? `
    <div class="search-related-heading">
      <h3>Related topics</h3>
      <p>Explore the audit issues connected to your question.</p>
    </div>
    <div class="search-related-list">
      ${relatedTopics.map(t=>`
        <button class="search-related-item" data-search-topic="${esc(t.id)}">
          <span>
            <strong>${esc(t.plainTitle)}</strong>
            <small>${esc(t.summary)}</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>`).join("")}
    </div>` : "";

  document.querySelectorAll("[data-search-question]").forEach(b=>
    b.addEventListener("click",()=>go(`question/${b.dataset.searchQuestion}`))
  );
  document.querySelectorAll("[data-search-topic]").forEach(b=>
    b.addEventListener("click",()=>go(`topic/${b.dataset.searchTopic}`))
  );
}

function pageShell({eyebrow,title,lead,body}){
  $("#homeView").hidden = true;
  $("#pageView").hidden = false;
  $("#pageView").innerHTML = `
    <div class="page-shell">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="#/">Home</a>
        <span aria-hidden="true">›</span>
        <span>${esc(eyebrow)}</span>
      </nav>
      <header class="article-hero">
        <p class="eyebrow">${esc(eyebrow)}</p>
        <h1>${esc(title)}</h1>
        <p class="article-lead">${esc(lead)}</p>
      </header>
      <div class="article-body">${body}</div>
    </div>`;
  document.title = `${title} | Lincoln Audit Explorer`;
  window.scrollTo({top:0, behavior:"instant"});
  bindPageLinks();
}

function renderQuestionPage(id){
  const q=appData.questions.find(x=>x.id===id);
  if(!q) return showHome();

  const linked=appData.topics.filter(t=>q.topicIds.includes(t.id));
  const related=appData.questions.filter(x=>x.id!==q.id && x.topicIds.some(t=>q.topicIds.includes(t))).slice(0,4);

  const body = `

    <section class="answer-section">
      <h2>What the audits show</h2>
      <p>${esc(q.answer)}</p>
    </section>

    <section class="evidence-comparison">
      <div class="evidence-comparison-heading">
        <h2>What the audit found</h2>
      </div>
      <div class="evidence-comparison-grid">
        <div class="evidence-comparison-cell fact-cell">
          <span class="comparison-label">The audit documented</span>
          <p>${esc(q.fact)}</p>
        </div>
        <div class="evidence-comparison-cell explanation-cell">
          <span class="comparison-label">In plain language</span>
          <p>${esc(q.interpretation)}</p>
        </div>
      </div>
    </section>

    ${q.residentContext?.concern ? `
      <section class="answer-section resident-context-card concern-card">
        <h2>Should this concern residents?</h2>
        <p>${esc(q.residentContext.concern)}</p>
      </section>` : ""}

    ${q.residentContext?.meaning ? `
      <section class="answer-section resident-context-card meaning-card">
        <h2>How could this affect residents?</h2>
        <p>${esc(q.residentContext.meaning)}</p>
      </section>` : ""}

    ${q.residentContext?.money ? `
      <section class="answer-section city-money-card">
        <p class="eyebrow">Helpful background</p>
        <h2>Where does this money come from?</h2>
        <p>${esc(q.residentContext.money)}</p>
      </section>` : ""}

    <section class="answer-section">
      <h2>Explore the related topics</h2>
      <div class="topic-grid">
        ${linked.map(t=>`
          <button class="topic-card" data-page-topic="${esc(t.id)}">
            <div class="topic-title-row">
              <span class="topic-icon" aria-hidden="true">${esc(t.icon || "📌")}</span>
              <h3>${esc(t.plainTitle)}</h3>
            </div>
            <p>${esc(t.summary)}</p>
            <span class="card-arrow">View topic →</span>
          </button>`).join("")}
      </div>
    </section>

    <section class="answer-section related-section">
      <h2>People also ask</h2>
      <div class="related-links">
        ${related.map(x=>`<button data-page-question="${esc(x.id)}">${esc(x.question)} <span>→</span></button>`).join("")}
      </div>
    </section>

    <div class="public-records-note"><strong>Want to verify this yourself?</strong><p>The related topic pages list the supporting public evidence. Residents can also review original audit reports, council packets, approved minutes, financial records, ordinances, and meeting videos through the City of Lincoln’s public website.</p></div>
  `;

  pageShell({
    eyebrow:"Resident question",
    title:q.question,
    lead:q.shortAnswer,
    body
  });
}

function renderAuditPage(id){
  const a=appData.audits.find(x=>x.id===id);
  if(!a) return showHome();

  const currentIndex=appData.audits.findIndex(x=>x.id===id);
  const previous=currentIndex>0 ? appData.audits[currentIndex-1] : null;
  const next=currentIndex<appData.audits.length-1 ? appData.audits[currentIndex+1] : null;

  const body=`
    <section class="audit-page-snapshot">
      <div class="audit-snapshot-main">
        <span class="audit-snapshot-label">In one sentence</span>
        <p>${esc(a.oneSentence)}</p>
      </div>
      <div class="audit-snapshot-count">
        <strong>${esc(a.findingCount)}</strong>
        <span>problems reported</span>
      </div>
    </section>

    <section class="answer-section">
      <h2>What did the auditors say overall?</h2>
      <p>${esc(a.opinionPlain)}</p>
    </section>

    <section class="answer-section audit-why-card">
      <h2>Why did this matter?</h2>
      <p>${esc(a.whyItMattered)}</p>
    </section>

    <section class="answer-section">
      <h2>What did the auditors find?</h2>
      <ul class="audit-key-points">
        ${a.keyPoints.map(x=>`<li>${esc(x)}</li>`).join("")}
      </ul>
    </section>

    <section class="answer-section audit-next-card">
      <h2>What happened after this audit?</h2>
      <p>${esc(a.whatChangedNext)}</p>
    </section>

    <section class="answer-section audit-leadership-section">
      <details class="leadership-details">
        <summary>
          <span>
            <strong>City leadership during this audit</strong>
          </span>
          <span class="details-arrow" aria-hidden="true">⌄</span>
        </summary>
        <div class="leadership-content">
          ${(a.leadership.periods || []).map(period=>`
            <article class="leadership-period">
              <h3>${esc(period.label)}</h3>
              <div class="leadership-grid">
                <div>
                  <span class="leadership-role">Mayor</span>
                  <strong>${esc(period.mayor)}</strong>
                </div>
                ${period.council.length ? `
                  <div>
                    <span class="leadership-role">City Council</span>
                    <ul>${period.council.map(name=>`<li>${esc(name)}</li>`).join("")}</ul>
                  </div>` : ""}
              </div>
              ${period.note ? `<p class="leadership-note">${esc(period.note)}</p>` : ""}
            </article>`).join("")}
        </div>
      </details>
    </section>

    <section class="answer-section related-section">
      <h2>Keep following the story</h2>
      <div class="audit-navigation">
        ${previous ? `<button data-page-audit="${esc(previous.id)}"><span>← Earlier audit</span><strong>${esc(previous.years)}</strong></button>` : ""}
        ${next ? `<button data-page-audit="${esc(next.id)}"><span>Next audit →</span><strong>${esc(next.years)}</strong></button>` : ""}
      </div>
    </section>

    <div class="public-records-note">
      <strong>About this summary</strong>
      <p>This page explains the audit in everyday language. It does not replace the original independent audit report.</p>
    </div>
  `;

  pageShell({
    eyebrow:"Audit year summary",
    title:`What happened in the ${a.years} audit?`,
    lead:a.theme,
    body
  });
}

function renderTopicPage(id){
  const t=appData.topics.find(x=>x.id===id);
  if(!t) return showHome();

  const relatedQuestions=appData.questions.filter(q=>q.topicIds.includes(t.id)).slice(0,4);

  const body = `
    <section class="topic-overview-card">
      <div class="topic-overview-icon" aria-hidden="true">${esc(t.icon || "📌")}</div>
      <div class="topic-overview-copy">
        <span class="status ${statusClass(t.status)}">${esc(displayStatus(t.status))}</span>
        <p>${esc(t.summary)}</p>
      </div>
      <div class="topic-risk-panel">
        <span>Risk level</span>
        <strong>${esc(t.risk)}</strong>
      </div>
    </section>

    <section class="topic-snapshot-grid">
      <article>
        <span class="snapshot-kicker">Why it matters</span>
        <h2>Why should residents care?</h2>
        <p>${esc(t.whyItMatters)}</p>
      </article>
      <article class="snapshot-improved">
        <span class="snapshot-kicker">Progress</span>
        <h2>What improved?</h2>
        <p>${esc(t.whatImproved)}</p>
      </article>
      <article class="snapshot-attention">
        <span class="snapshot-kicker">Watch next</span>
        <h2>What still needs attention?</h2>
        <p>${esc(t.whatRemains)}</p>
      </article>
    </section>

    ${t.residentContext?.meaning ? `
      <section class="answer-section city-money-card">
        <p class="eyebrow">Helpful background</p>
        <h2>Where does this money come from?</h2>
        <p>${esc(t.residentContext.meaning)}</p>
      </section>` : ""}

    <section class="topic-proof-section">
      <div class="section-title-row fact-interpretation-heading">
        <div>
          <p class="eyebrow">How we explain the evidence</p>
          <h2>What the audit found</h2>
        </div>
      </div>
      <div class="evidence-comparison-grid topic-evidence-comparison">
        <div class="evidence-comparison-cell fact-cell">
          <span class="comparison-label">The audit documented</span>
          <p>${esc(t.fact)}</p>
        </div>
        <div class="evidence-comparison-cell explanation-cell">
          <span class="comparison-label">In plain language</span>
          <p>${esc(t.interpretation)}</p>
        </div>
      </div>
    </section>

    <section class="topic-timeline-section">
      <div class="section-title-row">
        <div>
          <p class="eyebrow">Independent audit history</p>
          <h2>How did this issue change across the audits?</h2>
        </div>
        <p>This timeline includes completed independent audits only. The latest completed audit included here covers ${esc(t.latestCompletedAudit)}.</p>
      </div>
      <ol class="topic-timeline">
        ${t.auditTimeline.map((r,i)=>`
          <li>
            <div class="topic-timeline-marker">${i+1}</div>
            <div class="topic-timeline-year">${esc(r[0])}</div>
            <div class="topic-timeline-card">
              <strong>${esc(r[1])}</strong>
              <p>${esc(r[2])}</p>
            </div>
          </li>`).join("")}
      </ol>
    </section>

    <section class="post-audit-updates-section">
      <div class="section-title-row">
        <div>
          <p class="eyebrow">After the latest audit</p>
          <h2>What do later public records show?</h2>
        </div>
        <p>These updates come from public records. They are not new audit findings.</p>
      </div>
      <div class="post-audit-update-list">
        ${t.postAuditUpdates.map(u=>`
          <article class="post-audit-update ${u.title.startsWith("No separate") ? "update-not-linked" : ""}">
            <span class="post-audit-year">${esc(u.year)}</span>
            <div>
              <h3>${esc(u.title)}</h3>
              <p>${esc(u.detail)}</p>
            </div>
          </article>`).join("")}
      </div>
    </section>

    <section class="topic-evidence-section">
      <div class="section-title-row">
        <div>
          <p class="eyebrow">Trace the answer</p>
          <h2>Supporting public records</h2>
        </div>
        <p>Each item points to a record in the public records and identifies the public-record category used.</p>
      </div>
      <div class="evidence-card-grid">
        ${t.evidenceRecords.map((x,i)=>`
          <button class="evidence-source-card evidence-source-button" data-page-evidence="${esc(x.id)}">
            <span class="evidence-number">${String(i+1).padStart(2,"0")}</span>
            <span class="evidence-card-copy">
              <span class="evidence-type">${esc(x.publicType || "Public Record")}</span>
              <strong>${esc(x.publicTitle || x.label)}</strong>
              <span>${esc(x.publicDescription || "Public record supporting this topic.")}</span>
            </span>
            <span class="evidence-open" aria-hidden="true">→</span>
          </button>`).join("")}
      </div>
    </section>

    <section class="answer-section related-section topic-related-section">
      <div class="section-title-row">
        <div>
          <p class="eyebrow">Keep exploring</p>
          <h2>People also ask</h2>
        </div>
      </div>
      <div class="related-links">
        ${relatedQuestions.map(x=>`<button data-page-question="${esc(x.id)}">${esc(x.question)} <span>→</span></button>`).join("")}
      </div>
    </section>

    <div class="topic-footer-note">
      <strong>Evidence rule</strong>
      <p>The public records preserves the evidence references used by this page. Residents are encouraged to review the original public records as well.</p>
    </div>
  `;

  pageShell({
    eyebrow:"Audit topic",
    title:t.plainTitle,
    lead:t.title,
    body
  });
}
function findEvidenceRecord(id){
  for(const topic of appData.topics){
    const record=(topic.evidenceRecords || []).find(x=>x.id===id);
    if(record) return {record,topic};
  }
  return null;
}

function renderEvidencePage(id){
  const found=findEvidenceRecord(id);
  if(!found) return showHome();

  const {topic}=found;
  const relatedRecords=(topic.evidenceRecords || []);

  const auditRecords=relatedRecords.filter(r=>(r.publicType || "").includes("Audit"));
  const councilRecords=relatedRecords.filter(r=>(r.publicType || "").includes("Council"));
  const otherRecords=relatedRecords.filter(r=>!auditRecords.includes(r) && !councilRecords.includes(r));

  const recordCard = r => `
    <article class="public-record-card">
      <span class="public-record-icon" aria-hidden="true">${(r.publicType || "").includes("Council") ? "▣" : "▤"}</span>
      <div>
        <span class="evidence-type">${esc(r.publicType || "Public Record")}</span>
        <h3>${esc(r.publicTitle || r.label)}</h3>
        <p>${esc(r.publicDescription || "Public record supporting this topic.")}</p>
      </div>
    </article>`;

  const body=`
    <section class="public-records-intro">
      <p>These public records support the explanation on this page.</p>
    </section>

    ${auditRecords.length ? `
      <section class="public-records-group">
        <p class="eyebrow">Independent audit reports</p>
        <div class="public-record-list">
          ${auditRecords.map(recordCard).join("")}
        </div>
      </section>` : ""}

    ${councilRecords.length ? `
      <section class="public-records-group">
        <p class="eyebrow">City Council records</p>
        <div class="public-record-list">
          ${councilRecords.map(recordCard).join("")}
        </div>
      </section>` : ""}

    ${otherRecords.length ? `
      <section class="public-records-group">
        <p class="eyebrow">Other public records</p>
        <div class="public-record-list">
          ${otherRecords.map(recordCard).join("")}
        </div>
      </section>` : ""}

    <section class="public-records-verification">
      <p class="eyebrow">Review the originals</p>
      <h2>Want to review the public records yourself?</h2>
      <p>The records summarized by Lincoln Audit Explorer are publicly available through the City of Lincoln, including:</p>
      <ul>
        <li>Independent audit reports</li>
        <li>City Council agendas and meeting packets</li>
        <li>Approved meeting minutes</li>
        <li>Ordinances and resolutions</li>
        <li>Financial reports</li>
        <li>Video recordings of City Council meetings</li>
      </ul>
      <p>Lincoln Audit Explorer organizes and explains those records. It does not replace them.</p>
    </section>

    <button class="back-to-topic-button" data-page-topic="${esc(topic.id)}">← Return to this topic</button>

    <div class="topic-footer-note">
      <strong>Independent project</strong>
      <p>Lincoln Audit Explorer is not affiliated with, endorsed by, or approved by the City of Lincoln.</p>
    </div>
  `;

  pageShell({
    eyebrow:"Supporting public records",
    title:"Supporting Public Records",
    lead:topic.plainTitle,
    body
  });
}

function bindPageLinks(){
  document.querySelectorAll("[data-page-question]").forEach(b=>
    b.addEventListener("click",()=>go(`question/${b.dataset.pageQuestion}`))
  );
  document.querySelectorAll("[data-page-topic]").forEach(b=>
    b.addEventListener("click",()=>go(`topic/${b.dataset.pageTopic}`))
  );
  document.querySelectorAll("[data-page-audit]").forEach(b=>
    b.addEventListener("click",()=>go(`audit/${b.dataset.pageAudit}`))
  );
  document.querySelectorAll("[data-page-evidence]").forEach(b=>
    b.addEventListener("click",()=>go(`evidence/${b.dataset.pageEvidence}`))
  );
  const copyButton=$("#copyLocatorButton");
  if(copyButton){
    copyButton.addEventListener("click",async()=>{
      await navigator.clipboard.writeText(copyButton.dataset.copy);
      copyButton.textContent="Reference copied";
      setTimeout(()=>copyButton.textContent="Copy record reference",1600);
    });
  }
}

init().catch(err=>{
  document.body.innerHTML=`<main class="section"><h1>Lincoln Audit Explorer</h1><p>The app data could not load. Run this folder through a web server rather than opening index.html directly.</p><pre>${esc(err.message)}</pre></main>`;
});
