
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

function matches(obj){
  if(!searchTerm) return true;
  const needle=normalizeSearch(searchTerm);
  const haystack=normalizeSearch([
    obj.question,
    obj.title,
    obj.plainTitle,
    obj.shortAnswer,
    obj.answer,
    obj.summary,
    obj.whyItMatters,
    ...(obj.searchAliases || [])
  ].filter(Boolean).join(" "));
  return haystack.includes(needle) || needle.split(" ").every(word=>haystack.includes(word));
}

function findSearchGuide(term){
  const normalized=normalizeSearch(term);
  const guides=appData.searchGuides || {};
  for(const [key,guide] of Object.entries(guides)){
    const normalizedKey=normalizeSearch(key);
    if(normalized.includes(normalizedKey) || normalizedKey.includes(normalized)){
      return guide;
    }
  }
  return null;
}

function renderSearch(){
  const box=$("#searchResults");
  const guideBox=$("#searchGuide");
  if(!searchTerm){
    box.hidden=true;
    guideBox.innerHTML="";
    $("#questionGrid").innerHTML="";
    $("#searchTopicGrid").innerHTML="";
    return;
  }

  const guide=findSearchGuide(searchTerm);
  const qs=appData.questions.filter(matches);
  const ts=appData.topics.filter(matches);
  box.hidden=false;

  if(guide){
    guideBox.innerHTML=`
      <section class="search-guide-card">
        <p class="eyebrow">Plain-language search</p>
        <h3>${esc(guide.title)}</h3>
        <p>${esc(guide.answer)}</p>
      </section>`;
  }else{
    guideBox.innerHTML="";
  }

  const guideQuestions=guide ? appData.questions.filter(q=>guide.questionIds.includes(q.id)) : [];
  const guideTopics=guide ? appData.topics.filter(t=>guide.topicIds.includes(t.id)) : [];
  const finalQuestions=[...new Map([...guideQuestions,...qs].map(x=>[x.id,x])).values()];
  const finalTopics=[...new Map([...guideTopics,...ts].map(x=>[x.id,x])).values()];

  $("#questionGrid").innerHTML=finalQuestions.map(q=>`
    <button class="question-card" data-search-question="${esc(q.id)}">
      <h3>${esc(q.question)}</h3>
      <p>${esc(q.shortAnswer)}</p>
      <span class="card-arrow">Read the answer →</span>
    </button>`).join("");

  $("#searchTopicGrid").innerHTML=finalTopics.map(topicCard).join("");

  if(!finalQuestions.length && !finalTopics.length){
    $("#questionGrid").innerHTML=`<div class="empty-state"><h3>No matching results</h3><p>Try another word.</p></div>`;
  }

  document.querySelectorAll("[data-search-question]").forEach(b=>
    b.addEventListener("click",()=>go(`question/${b.dataset.searchQuestion}`))
  );
  document.querySelectorAll("[data-topic]").forEach(b=>
    b.addEventListener("click",()=>go(`topic/${b.dataset.topic}`))
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

    <div class="evidence-pair">
      <div class="evidence-box fact-box">
        <strong>Documented fact</strong>
        <p>${esc(q.fact)}</p>
      </div>
      <div class="evidence-box interpretation-box">
        <strong>Supported interpretation</strong>
        <p>${esc(q.interpretation)}</p>
      </div>
    </div>

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

    <section class="topic-proof-section">
      <div class="section-title-row">
        <div>
          <p class="eyebrow">How we explain the evidence</p>
          <h2>Fact and interpretation</h2>
        </div>
        <p>These stay separate so residents can see exactly what the records say and what the pattern may mean.</p>
      </div>
      <div class="evidence-pair evidence-pair-featured">
        <div class="evidence-box fact-box">
          <span class="proof-label">F</span>
          <strong>Documented fact</strong>
          <p>${esc(t.fact)}</p>
        </div>
        <div class="evidence-box interpretation-box">
          <span class="proof-label">I</span>
          <strong>Supported interpretation</strong>
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
