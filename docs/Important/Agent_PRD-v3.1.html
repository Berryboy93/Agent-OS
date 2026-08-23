<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Agent-OS — PRD v3.1.0</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:       #060810;
  --bg2:      #0c111f;
  --bg3:      #111827;
  --bg4:      #1a2236;
  --border:   #1a2640;
  --border2:  #243050;
  --neon:     #00F5FF;
  --acid:     #a3e635;
  --purple:   #a78bfa;
  --pink:     #f472b6;
  --amber:    #fbbf24;
  --red:      #f87171;
  --green:    #4ade80;
  --blue:     #60a5fa;
  --text:     #cbd5e1;
  --text2:    #94a3b8;
  --text3:    #475569;
  --head:     #f1f5f9;
}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:'Outfit',sans-serif;font-size:15px;line-height:1.75;min-height:100vh;overflow-x:hidden}

/* SCANLINE OVERLAY */
body::before{
  content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,245,255,.012) 2px,rgba(0,245,255,.012) 4px);
}

/* NOISE TEXTURE */
body::after{
  content:'';position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.4;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.08'/%3E%3C/svg%3E");
}

/* LAYOUT */
.wrapper{display:flex;min-height:100vh;position:relative;z-index:1}

/* SIDEBAR */
.sidebar{
  width:260px;min-width:260px;height:100vh;position:sticky;top:0;
  border-right:1px solid var(--border);background:rgba(6,8,16,.97);
  display:flex;flex-direction:column;overflow:hidden;
}
.sidebar-head{
  padding:28px 24px 16px;border-bottom:1px solid var(--border);
  flex-shrink:0;
}
.brand{
  font-family:'Syne',sans-serif;font-weight:800;font-size:13px;letter-spacing:.2em;
  text-transform:uppercase;color:var(--neon);margin-bottom:4px;
}
.brand-sub{font-size:10px;color:var(--text3);letter-spacing:.15em;text-transform:uppercase;font-family:'JetBrains Mono',monospace}
.status-pill{
  display:inline-flex;align-items:center;gap:5px;margin-top:10px;
  padding:3px 10px;border-radius:20px;font-size:10px;font-family:'JetBrains Mono',monospace;
  letter-spacing:.08em;border:1px solid rgba(163,230,53,.25);color:var(--acid);background:rgba(163,230,53,.07);
}
.status-dot{width:6px;height:6px;border-radius:50%;background:var(--acid);animation:pulse 2s ease infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.nav{flex:1;overflow-y:auto;padding:12px 0}
.nav::-webkit-scrollbar{width:3px}
.nav::-webkit-scrollbar-track{background:transparent}
.nav::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
.nav-section{padding:6px 0}
.nav-label{
  font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--text3);
  padding:4px 24px;font-family:'JetBrains Mono',monospace;
}
.nav-item{
  display:flex;align-items:center;gap:8px;padding:4px 24px 4px 20px;
  text-decoration:none;color:var(--text3);font-size:12px;
  border-left:2px solid transparent;transition:all .15s ease;
  line-height:1.4;
}
.nav-item:hover{color:var(--text);border-left-color:var(--border2);background:rgba(255,255,255,.03)}
.nav-item.active{color:var(--neon);border-left-color:var(--neon);background:rgba(0,245,255,.04)}
.nav-num{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3);min-width:18px;opacity:.6}

/* MAIN */
.main{flex:1;max-width:880px;padding:0 56px 120px 64px;overflow:auto}

/* DOCUMENT HEADER */
.doc-header{
  padding:80px 0 64px;border-bottom:1px solid var(--border);margin-bottom:60px;
  position:relative;
}
.doc-header::before{
  content:'AGENT-OS';position:absolute;top:20px;right:-20px;
  font-family:'Syne',sans-serif;font-weight:800;font-size:110px;
  color:rgba(0,245,255,.025);letter-spacing:-.05em;pointer-events:none;line-height:1;
  user-select:none;
}
.doc-eyebrow{
  font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;
  text-transform:uppercase;color:var(--neon);margin-bottom:16px;opacity:.8;
}
.doc-title{
  font-family:'Syne',sans-serif;font-weight:800;font-size:48px;
  color:var(--head);line-height:1.1;margin-bottom:8px;letter-spacing:-.02em;
}
.doc-title span{color:var(--neon)}
.doc-subtitle{font-size:17px;color:var(--text2);margin-bottom:32px;font-weight:300}
.doc-meta{
  display:flex;gap:32px;flex-wrap:wrap;padding:20px 0;
  border-top:1px solid var(--border);margin-top:24px;
}
.doc-meta-item{display:flex;flex-direction:column;gap:3px}
.doc-meta-label{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--text3)}
.doc-meta-val{font-size:13px;color:var(--text);font-family:'JetBrains Mono',monospace}

/* CHANGE TABLE */
.changes-table{margin:16px 0}

/* SECTION */
section{margin-bottom:72px}
.section-head{
  display:flex;align-items:baseline;gap:14px;margin-bottom:28px;padding-bottom:14px;
  border-bottom:1px solid var(--border);
}
.section-num{
  font-family:'Syne',sans-serif;font-weight:800;font-size:36px;
  color:rgba(0,245,255,.15);line-height:1;flex-shrink:0;
}
.section-title{
  font-family:'Syne',sans-serif;font-weight:700;font-size:22px;
  color:var(--head);letter-spacing:-.01em;
}
.section-badge{
  font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.12em;
  text-transform:uppercase;padding:3px 10px;border-radius:20px;
  margin-left:8px;flex-shrink:0;
}
.badge-resolved{border:1px solid rgba(74,222,128,.3);color:var(--green);background:rgba(74,222,128,.07)}
.badge-new{border:1px solid rgba(251,191,36,.3);color:var(--amber);background:rgba(251,191,36,.07)}
.badge-locked{border:1px solid rgba(0,245,255,.3);color:var(--neon);background:rgba(0,245,255,.07)}
.badge-corrected{border:1px solid rgba(167,139,250,.3);color:var(--purple);background:rgba(167,139,250,.07)}

h2{
  font-family:'Syne',sans-serif;font-weight:700;font-size:17px;
  color:var(--head);margin:36px 0 12px;letter-spacing:-.01em;
}
h3{
  font-family:'Syne',sans-serif;font-weight:600;font-size:14px;
  color:var(--neon);margin:24px 0 10px;letter-spacing:.04em;text-transform:uppercase;
  font-size:11px;
}
p{margin-bottom:14px;color:var(--text)}
strong{color:var(--head);font-weight:600}

/* BLOCKQUOTE */
blockquote{
  margin:24px 0;padding:20px 24px;
  border-left:3px solid var(--neon);background:rgba(0,245,255,.03);
  border-radius:0 8px 8px 0;
  font-style:italic;color:var(--text2);
}
blockquote strong{color:var(--neon);font-style:normal;display:block;margin-bottom:6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-family:'JetBrains Mono',monospace}

/* TABLE */
.tbl-wrap{overflow-x:auto;margin:20px 0;border-radius:8px;border:1px solid var(--border)}
table{width:100%;border-collapse:collapse;font-size:13px}
thead tr{background:var(--bg3)}
th{
  padding:10px 16px;text-align:left;font-family:'JetBrains Mono',monospace;
  font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--text3);
  font-weight:400;border-bottom:1px solid var(--border);
}
td{
  padding:9px 16px;border-bottom:1px solid rgba(26,38,64,.6);color:var(--text);
  vertical-align:top;
}
tr:last-child td{border-bottom:none}
tr:nth-child(even){background:rgba(26,38,64,.2)}
td code,th code{
  font-family:'JetBrains Mono',monospace;font-size:11px;
  background:rgba(0,245,255,.08);padding:1px 5px;border-radius:4px;color:var(--neon);
}

/* STATUS LABELS in tables */
.s-v1{color:var(--green)}
.s-rm{color:var(--text3)}
.s-pk{color:var(--red)}
.s-al{color:var(--amber)}
.s-ip{color:var(--blue)}

/* CODE */
pre{
  background:var(--bg3);border:1px solid var(--border);border-radius:8px;
  padding:20px 24px;overflow-x:auto;margin:20px 0;
  font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.65;color:#c9d1d9;
  position:relative;
}
pre::before{
  content:attr(data-lang);position:absolute;top:10px;right:14px;
  font-size:9px;color:var(--text3);letter-spacing:.12em;text-transform:uppercase;
}
code{
  font-family:'JetBrains Mono',monospace;font-size:12px;
  background:rgba(0,245,255,.07);padding:1px 6px;border-radius:4px;color:var(--neon);
}
pre code{background:none;padding:0;color:inherit}

/* KEYWORDS in code */
.kw{color:#ff79c6}.ty{color:#8be9fd}.st{color:#f1fa8c}.cm{color:#6272a4;font-style:italic}.nu{color:#bd93f9}

/* DIVIDER */
hr{border:none;border-top:1px solid var(--border);margin:48px 0}

/* CALLOUT BOXES */
.callout{
  margin:24px 0;padding:16px 20px;border-radius:8px;
  display:flex;align-items:flex-start;gap:14px;
}
.callout-info{background:rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.2)}
.callout-warn{background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2)}
.callout-danger{background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.2)}
.callout-success{background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.2)}
.callout-icon{font-size:16px;line-height:1;flex-shrink:0;margin-top:2px}
.callout-body{font-size:13px;line-height:1.6}
.callout-title{font-weight:600;margin-bottom:4px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase}

/* PILL GRID */
.pill-grid{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
.pill{
  padding:5px 14px;border-radius:20px;font-family:'JetBrains Mono',monospace;
  font-size:11px;border:1px solid;
}

/* UI SPEC COMPONENTS */
.ui-component{
  margin:24px 0;border:1px solid var(--border);border-radius:10px;overflow:hidden;
}
.ui-component-head{
  background:var(--bg3);padding:12px 20px;display:flex;align-items:center;gap:10px;
  border-bottom:1px solid var(--border);
}
.ui-component-title{font-family:'Syne',sans-serif;font-weight:700;font-size:13px;color:var(--head)}
.ui-component-tag{
  font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;
  text-transform:uppercase;padding:2px 8px;border-radius:20px;
  background:rgba(0,245,255,.1);color:var(--neon);border:1px solid rgba(0,245,255,.2);
}
.ui-component-body{padding:20px}

/* DASHBOARD MOCKUP */
.dash-frame{
  background:var(--bg2);border:1px solid var(--border);border-radius:10px;
  overflow:hidden;margin:20px 0;
}
.dash-titlebar{
  background:var(--bg3);padding:10px 16px;display:flex;align-items:center;gap:8px;
  border-bottom:1px solid var(--border);
}
.dash-dot{width:10px;height:10px;border-radius:50%}
.dash-dot.red{background:#ff5f56}
.dash-dot.yellow{background:#febc2e}
.dash-dot.green{background:#27c93f}
.dash-url{
  flex:1;background:var(--bg4);padding:3px 12px;border-radius:5px;
  font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text3);
  text-align:center;margin:0 8px;
}
.dash-content{padding:20px;display:grid;gap:16px}
.dash-statgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.dash-stat{
  background:var(--bg4);border:1px solid var(--border);border-radius:8px;
  padding:14px;position:relative;overflow:hidden;
}
.dash-stat::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;border-radius:2px;
}
.dash-stat.neon::before{background:var(--neon)}
.dash-stat.acid::before{background:var(--acid)}
.dash-stat.purple::before{background:var(--purple)}
.dash-stat.amber::before{background:var(--amber)}
.dash-stat-val{font-family:'Syne',sans-serif;font-weight:800;font-size:26px;color:var(--head);margin:8px 0 2px}
.dash-stat-label{font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase}
.dash-stat-delta{font-size:11px;margin-top:4px}
.delta-up{color:var(--green)}
.delta-dn{color:var(--red)}

.dash-row{display:grid;grid-template-columns:1.4fr 1fr;gap:16px}
.dash-panel{background:var(--bg4);border:1px solid var(--border);border-radius:8px;padding:16px}
.dash-panel-head{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text3);letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}
.live-dot{width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block;animation:pulse 1.5s ease infinite}

.event-item{
  display:flex;align-items:flex-start;gap:10px;padding:6px 0;
  border-bottom:1px solid rgba(26,38,64,.4);font-size:11px;
}
.event-item:last-child{border-bottom:none}
.event-type{
  font-family:'JetBrains Mono',monospace;font-size:9px;padding:2px 7px;
  border-radius:20px;flex-shrink:0;white-space:nowrap;
}
.et-complete{background:rgba(74,222,128,.12);color:var(--green);border:1px solid rgba(74,222,128,.2)}
.et-running{background:rgba(0,245,255,.1);color:var(--neon);border:1px solid rgba(0,245,255,.2)}
.et-tool{background:rgba(167,139,250,.1);color:var(--purple);border:1px solid rgba(167,139,250,.2)}
.et-wait{background:rgba(251,191,36,.1);color:var(--amber);border:1px solid rgba(251,191,36,.2)}
.et-fail{background:rgba(248,113,113,.1);color:var(--red);border:1px solid rgba(248,113,113,.2)}
.event-text{color:var(--text2);line-height:1.4}
.event-time{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3);flex-shrink:0}

.agent-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.agent-cell{
  background:var(--bg3);border:1px solid var(--border);border-radius:6px;
  padding:10px;display:flex;flex-direction:column;gap:4px;
}
.agent-name{font-size:11px;color:var(--text);font-weight:500}
.agent-status{display:flex;align-items:center;gap:5px;font-family:'JetBrains Mono',monospace;font-size:9px}
.agent-status .dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.dot-green{background:var(--green)}
.dot-amber{background:var(--amber)}
.dot-red{background:var(--red)}

/* PIPELINE GANTT */
.gantt{margin:16px 0;background:var(--bg4);border:1px solid var(--border);border-radius:8px;overflow:hidden}
.gantt-row{display:flex;align-items:center;border-bottom:1px solid var(--border);min-height:36px}
.gantt-row:last-child{border-bottom:none}
.gantt-label{
  width:160px;min-width:160px;padding:8px 14px;
  font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text2);
  border-right:1px solid var(--border);
}
.gantt-track{flex:1;padding:6px 8px;display:flex;align-items:center}
.gantt-bar{
  height:20px;border-radius:4px;display:flex;align-items:center;justify-content:center;
  font-family:'JetBrains Mono',monospace;font-size:9px;color:white;font-weight:500;
  letter-spacing:.05em;
}

/* DESIGN TOKENS DISPLAY */
.token-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:16px 0}
.token-row{
  display:flex;align-items:center;gap:12px;
  background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:10px 14px;
}
.token-swatch{width:32px;height:32px;border-radius:6px;flex-shrink:0}
.token-info{}
.token-name{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--neon)}
.token-val{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3);margin-top:2px}

.color-row{display:flex;gap:0;border-radius:6px;overflow:hidden;margin:10px 0;height:36px}
.color-stop{flex:1;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:8px}

/* COMPONENT SPEC */
.spec-row{
  display:flex;align-items:flex-start;gap:20px;padding:12px 0;
  border-bottom:1px solid var(--border);
}
.spec-row:last-child{border-bottom:none}
.spec-prop{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--neon);min-width:140px;flex-shrink:0}
.spec-val{font-size:13px;color:var(--text2);line-height:1.5}

/* INTERACTION PATTERN */
.flow-steps{margin:20px 0;position:relative;padding-left:28px}
.flow-steps::before{content:'';position:absolute;left:8px;top:8px;bottom:8px;width:1px;background:var(--border)}
.flow-step{position:relative;margin-bottom:16px}
.flow-step::before{
  content:attr(data-n);position:absolute;left:-28px;width:18px;height:18px;
  background:var(--bg3);border:1px solid var(--border2);border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--neon);
  text-align:center;line-height:18px;
}
.flow-step-title{font-weight:600;color:var(--head);font-size:13px;margin-bottom:4px}
.flow-step-body{font-size:12px;color:var(--text2);line-height:1.5}

/* KEYBOARD SHORTCUT */
kbd{
  display:inline-flex;align-items:center;background:var(--bg3);border:1px solid var(--border2);
  border-radius:4px;padding:2px 7px;font-family:'JetBrains Mono',monospace;font-size:11px;
  color:var(--text);box-shadow:0 1px 0 var(--border2);
}

/* WIREFRAME ANNOTATIONS */
.wireframe{
  background:var(--bg2);border:1px solid var(--border);border-radius:10px;
  padding:20px;margin:20px 0;position:relative;
}
.wireframe-label{
  position:absolute;top:-10px;left:20px;
  background:var(--bg);padding:0 8px;
  font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--neon);
  letter-spacing:.12em;text-transform:uppercase;
}

/* CHECKLIST */
.checklist{list-style:none;margin:12px 0}
.checklist li{
  display:flex;align-items:flex-start;gap:10px;padding:5px 0;
  font-size:13px;color:var(--text2);
}
.checklist li::before{
  content:'';width:14px;height:14px;border:1px solid var(--border2);border-radius:3px;
  flex-shrink:0;margin-top:3px;
}

/* ANIMATION SPEC */
.anim-row{
  display:flex;align-items:center;gap:16px;padding:10px 0;
  border-bottom:1px solid var(--border);font-size:12px;
}
.anim-row:last-child{border-bottom:none}
.anim-name{font-family:'JetBrains Mono',monospace;color:var(--neon);min-width:180px;font-size:11px}
.anim-val{color:var(--text2);flex:1}

/* ACCESSIBILITY */
.a11y-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}
.a11y-card{background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:14px}
.a11y-card-title{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}

/* OPEN DECISION */
.od-item{
  background:var(--bg2);border:1px solid var(--border);border-radius:8px;
  padding:16px 20px;margin:12px 0;
}
.od-header{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.od-id{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--neon);font-weight:700}
.od-status-open{color:var(--amber);font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em}
.od-status-res{color:var(--green);font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em}
.od-question{font-size:13px;color:var(--head);margin-bottom:8px}
.od-options{font-size:12px;color:var(--text2)}

/* MILESTONE */
.milestone{border:1px solid var(--border);border-radius:10px;margin:20px 0;overflow:hidden}
.milestone-head{
  background:var(--bg3);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;
  border-bottom:1px solid var(--border);
}
.milestone-id{font-family:'Syne',sans-serif;font-weight:800;font-size:16px;color:var(--head)}
.milestone-weeks{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--neon);letter-spacing:.1em}
.milestone-body{padding:16px 20px}
.milestone-goal{font-size:13px;color:var(--text2);margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)}

/* FOOTER */
.doc-footer{
  margin-top:80px;padding:40px 0;border-top:1px solid var(--border);
  text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;
  color:var(--text3);letter-spacing:.1em;
}

/* SCROLLBAR */
.main::-webkit-scrollbar{display:none}
</style>
</head>
<body>
<div class="wrapper">

<!-- SIDEBAR -->
<aside class="sidebar">
  <div class="sidebar-head">
    <div class="brand">Agent-OS</div>
    <div class="brand-sub">Agi-Suite Platform</div>
    <div class="status-pill"><span class="status-dot"></span>PRD v3.1.0 · AUTHORITATIVE</div>
  </div>
  <nav class="nav">
    <div class="nav-section">
      <div class="nav-label">Foundation</div>
      <a class="nav-item" href="#s1"><span class="nav-num">01</span>Vision &amp; Strategy</a>
      <a class="nav-item" href="#s2"><span class="nav-num">02</span>Product Philosophy</a>
      <a class="nav-item" href="#s3"><span class="nav-num">03</span>Problem Statement</a>
      <a class="nav-item" href="#s4"><span class="nav-num">04</span>Core Principles</a>
      <a class="nav-item" href="#s5"><span class="nav-num">05</span>Package Structure</a>
    </div>
    <div class="nav-section">
      <div class="nav-label">Architecture</div>
      <a class="nav-item" href="#s6"><span class="nav-num">06</span>Provider Abstraction</a>
      <a class="nav-item" href="#s11"><span class="nav-num">11</span>System Architecture</a>
      <a class="nav-item" href="#s12"><span class="nav-num">12</span>Runtime Architecture</a>
      <a class="nav-item" href="#s13"><span class="nav-num">13</span>Execution Model</a>
      <a class="nav-item" href="#s14"><span class="nav-num">14</span>Agent Architecture</a>
      <a class="nav-item" href="#s15"><span class="nav-num">15</span>Tool System</a>
      <a class="nav-item" href="#s16"><span class="nav-num">16</span>Pipeline Engine</a>
    </div>
    <div class="nav-section">
      <div class="nav-label">Runtime Systems</div>
      <a class="nav-item" href="#s17"><span class="nav-num">17</span>Memory System</a>
      <a class="nav-item" href="#s18"><span class="nav-num">18</span>Durable Execution</a>
      <a class="nav-item" href="#s19"><span class="nav-num">19</span>Streaming</a>
      <a class="nav-item" href="#s20"><span class="nav-num">20</span>Event Architecture</a>
      <a class="nav-item" href="#s21"><span class="nav-num">21</span>Secret Redaction</a>
      <a class="nav-item" href="#s22"><span class="nav-num">22</span>Token Governance</a>
      <a class="nav-item" href="#s24"><span class="nav-num">24</span>Runtime Scheduler</a>
    </div>
    <div class="nav-section">
      <div class="nav-label">Interfaces</div>
      <a class="nav-item" href="#s25"><span class="nav-num">25</span>CLI Specification</a>
      <a class="nav-item active" href="#s26"><span class="nav-num">26</span>Dashboard &amp; UI ★</a>
      <a class="nav-item" href="#s30"><span class="nav-num">30</span>Approval Queue</a>
    </div>
    <div class="nav-section">
      <div class="nav-label">Infrastructure</div>
      <a class="nav-item" href="#s27"><span class="nav-num">27</span>Deployment</a>
      <a class="nav-item" href="#s28"><span class="nav-num">28</span>Backup &amp; Recovery</a>
      <a class="nav-item" href="#s29"><span class="nav-num">29</span>Security</a>
      <a class="nav-item" href="#s31"><span class="nav-num">31</span>Data Models</a>
      <a class="nav-item" href="#s32"><span class="nav-num">32</span>Database</a>
      <a class="nav-item" href="#s33"><span class="nav-num">33</span>Telemetry</a>
    </div>
    <div class="nav-section">
      <div class="nav-label">Engineering</div>
      <a class="nav-item" href="#s36"><span class="nav-num">36</span>Fault Tolerance</a>
      <a class="nav-item" href="#s37"><span class="nav-num">37</span>Performance</a>
      <a class="nav-item" href="#s39"><span class="nav-num">39</span>Testing</a>
      <a class="nav-item" href="#s41"><span class="nav-num">41</span>Eng. Standards</a>
      <a class="nav-item" href="#s44"><span class="nav-num">44</span>Audit Standards</a>
    </div>
    <div class="nav-section">
      <div class="nav-label">Governance</div>
      <a class="nav-item" href="#s45"><span class="nav-num">45</span>Open Decisions</a>
      <a class="nav-item" href="#s46"><span class="nav-num">46</span>Roadmap</a>
      <a class="nav-item" href="#s47"><span class="nav-num">47</span>Milestones</a>
      <a class="nav-item" href="#s48"><span class="nav-num">48</span>Risks</a>
      <a class="nav-item" href="#s49"><span class="nav-num">49</span>Success Metrics</a>
      <a class="nav-item" href="#s50"><span class="nav-num">50</span>Final Principles</a>
    </div>
  </nav>
</aside>

<!-- MAIN CONTENT -->
<main class="main">

<!-- DOCUMENT HEADER -->
<header class="doc-header">
  <div class="doc-eyebrow">Product Requirements Document</div>
  <h1 class="doc-title">Agent<span>-OS</span></h1>
  <p class="doc-subtitle">The Foundational Runtime Operating System for AI-Native Software</p>
  <div class="doc-meta">
    <div class="doc-meta-item"><span class="doc-meta-label">Version</span><span class="doc-meta-val">3.1.0</span></div>
    <div class="doc-meta-item"><span class="doc-meta-label">Status</span><span class="doc-meta-val" style="color:var(--acid)">AUTHORITATIVE DRAFT</span></div>
    <div class="doc-meta-item"><span class="doc-meta-label">Date</span><span class="doc-meta-val">2026-05-24</span></div>
    <div class="doc-meta-item"><span class="doc-meta-label">Author</span><span class="doc-meta-val">Cloud</span></div>
    <div class="doc-meta-item"><span class="doc-meta-label">Project Family</span><span class="doc-meta-val">Agi-Suite Monorepo</span></div>
    <div class="doc-meta-item"><span class="doc-meta-label">Classification</span><span class="doc-meta-val">Internal Platform Infra</span></div>
  </div>
</header>

<!-- CHANGES FROM v2 -->
<section>
  <div class="section-head">
    <div class="section-num">Δ</div>
    <div class="section-title">Changes from v2.0.0 → v3.1.0</div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Change</th><th>Section</th><th>Action</th></tr></thead>
      <tbody>
        <tr><td>Hybrid runtime architecture resolved</td><td>§11, §12</td><td><span class="s-v1">RESOLVED</span> — Node.js + Worker Threads + BullMQ + Redis</td></tr>
        <tr><td>Kubernetes removed from v1 targets</td><td>§27</td><td>Moved to ROADMAP v2</td></tr>
        <tr><td>Streaming transport standard resolved</td><td>§19</td><td><span class="s-v1">RESOLVED</span> — SSE + HTTP chunked; gRPC = ROADMAP</td></tr>
        <tr><td>WAITING state fully specified</td><td>§13, §18</td><td>Full suspend/resume/timeout semantics</td></tr>
        <tr><td>Memory system backends specified</td><td>§17</td><td>All five tiers with storage + TTL</td></tr>
        <tr><td>Token governance enforcement added</td><td>§22</td><td>Hard enforcement, BUDGET_EXCEEDED error type</td></tr>
        <tr><td>Secret redaction pipeline specified</td><td>§21, §29</td><td>Five-stage redaction pipeline</td></tr>
        <tr><td>Dashboard UI Design System added</td><td>§26</td><td><span class="s-v1">NEW in v3.1</span> — Full design system, component library, interaction spec</td></tr>
        <tr><td>OpenTelemetry standard adopted</td><td>§33</td><td>Replaces ad-hoc telemetry</td></tr>
        <tr><td>Backup/recovery section added</td><td>§28</td><td>Railway backup tier, RPO, recovery procedure</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §1 VISION -->
<section id="s1">
  <div class="section-head">
    <div class="section-num">01</div>
    <div class="section-title">Vision &amp; Strategic Positioning</div>
  </div>
  <blockquote>
    <strong>Vision Statement</strong>
    Agent-OS is the foundational runtime operating system for AI-native software systems. Where traditional operating systems manage processes, memory, filesystems, networking, scheduling, and permissions — Agent-OS manages agents, orchestration graphs, prompts, tools, context, execution state, inference routing, telemetry, deployments, and runtime governance.
  </blockquote>
  <blockquote>
    <strong>Core Principle</strong>
    Deterministic Infrastructure Over Autonomous Behavior — Reliability beats novelty. Replayability beats magic. Auditability beats abstraction. Governance beats flexibility. Recoverability beats raw speed. Explicit systems beat hidden state.
  </blockquote>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Phase</th><th>Objective</th></tr></thead>
      <tbody>
        <tr><td><strong>v1</strong> · IMPLEMENTED</td><td>Stable, typed, production-capable local orchestration runtime</td></tr>
        <tr><td><strong>v2</strong> · ROADMAP</td><td>Distributed execution, advanced memory, horizontal scaling, Kubernetes</td></tr>
        <tr><td><strong>v3</strong> · PARKING</td><td>Autonomous runtime optimization, self-healing orchestration, marketplace</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §2 PHILOSOPHY -->
<section id="s2">
  <div class="section-head">
    <div class="section-num">02</div>
    <div class="section-title">Product Philosophy</div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Principle</th><th>Specification</th></tr></thead>
      <tbody>
        <tr><td><strong>Code-First Architecture</strong></td><td>All agents, tools, pipelines, deployments, and runtime config are TypeScript modules. Visual builders are v2 ROADMAP abstractions, not the foundation.</td></tr>
        <tr><td><strong>Strong Typing Everywhere</strong></td><td><code>strict: true</code> throughout. No runtime <code>any</code>. No untyped events. No schema ambiguity. Maximizes compile-time guarantees.</td></tr>
        <tr><td><strong>Provider Independence</strong></td><td>No architecture decision couples the platform to any specific provider. All inference routes through the normalized adapter layer.</td></tr>
        <tr><td><strong>Observable by Default</strong></td><td>Every meaningful runtime event is traceable, replayable, queryable, inspectable, timestamped, and correlated. Invisible execution is forbidden.</td></tr>
        <tr><td><strong>Deterministic Infrastructure</strong></td><td>Agent systems are probabilistic. Infrastructure must not be. Runtime behavior remains deterministic even when model outputs are not.</td></tr>
        <tr><td><strong>Infrastructure Before Abstraction</strong></td><td>Operational stability before feature breadth. Strong primitives before convenience layers. Explicit orchestration before magic automation.</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §3 PROBLEM -->
<section id="s3">
  <div class="section-head">
    <div class="section-num">03</div>
    <div class="section-title">Problem Statement</div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Problem</th><th>Impact</th></tr></thead>
      <tbody>
        <tr><td>Provider lock-in</td><td>Vendor dependence, migration cost</td></tr>
        <tr><td>Weak observability</td><td>Impossible debugging</td></tr>
        <tr><td>Prompt sprawl</td><td>Unmaintainable systems</td></tr>
        <tr><td>Untyped orchestration</td><td>Runtime instability</td></tr>
        <tr><td>Lack of deployment standards</td><td>Fragile infrastructure</td></tr>
        <tr><td>Ad-hoc memory systems</td><td>State inconsistency</td></tr>
        <tr><td>Poor concurrency controls</td><td>Resource exhaustion</td></tr>
        <tr><td>No lifecycle management</td><td>Operational chaos</td></tr>
        <tr><td>No reproducibility</td><td>Non-debuggable execution</td></tr>
        <tr><td>Weak governance</td><td>Unsafe production operation</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §4 PRINCIPLES (collapsed for brevity) -->
<section id="s4">
  <div class="section-head">
    <div class="section-num">04</div>
    <div class="section-title">Core Product Principles</div>
  </div>
  <div class="pill-grid">
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">Infrastructure before abstraction</span>
    <span class="pill" style="border-color:rgba(163,230,53,.3);color:var(--acid)">Typed systems before convenience</span>
    <span class="pill" style="border-color:rgba(167,139,250,.3);color:var(--purple)">Explicit orchestration before magic</span>
    <span class="pill" style="border-color:rgba(96,165,250,.3);color:var(--blue)">Runtime transparency first</span>
    <span class="pill" style="border-color:rgba(74,222,128,.3);color:var(--green)">Operational stability first</span>
    <span class="pill" style="border-color:rgba(251,191,36,.3);color:var(--amber)">Extensibility before rigidity</span>
    <span class="pill" style="border-color:rgba(248,113,113,.3);color:var(--red)">Production-grade by default</span>
    <span class="pill" style="border-color:rgba(244,114,182,.3);color:var(--pink)">Explicit over implicit; safe over clever</span>
  </div>
</section>

<!-- §5 PACKAGE STRUCTURE -->
<section id="s5">
  <div class="section-head">
    <div class="section-num">05</div>
    <div class="section-title">Package Structure</div>
  </div>
  <pre data-lang="filesystem">~/Agi-Suite/
└── packages/
    └── agent-os/
        └── packages/
            ├── core/           [v1] Base types, errors, adapter interface, Tool, AgentEvent
            ├── sdk/            [v1] defineAgent, defineTool, definePipeline, AgentContext
            ├── runtime/        [v1] AgentRunner, execution engine, state management
            ├── scheduler/      [v1] BullMQ integration, durable job orchestration
            ├── events/         [v1] EventStore, append-only log, replay engine
            ├── memory/         [v1] Execution + Session memory; Agent/Pipeline = v1; Vector = ROADMAP
            ├── adapters/
            │   ├── anthropic/  [v1] claude-sonnet-4-20250514 — reference adapter
            │   ├── openai/     [v1] gpt-4o + baseURL override (Azure, Groq, Together)
            │   └── local/      [v1] Ollama / OpenAI-compatible local endpoints
            ├── cli/            [v1] agos binary
            ├── deploy/         [v1] Local + Railway + Docker targets
            ├── dashboard/      [v1] React monitoring UI — see §26 for full spec
            ├── telemetry/      [v1] OpenTelemetry traces + metrics
            ├── governance/     [v2 ROADMAP] RBAC, policy engine, approval orchestration
            └── plugins/        [v2 ROADMAP] Plugin loader, worker sandboxing
        └── apps/
            └── dashboard-server/ [v1] Express + SSE server</pre>
  <p>Package dependency rule: <code>core ← sdk ← runtime ← scheduler</code>. No circular dependencies. <code>governance</code> and <code>plugins</code> packages must not be created until v2 milestone planning.</p>
</section>

<!-- §6 PROVIDER ABSTRACTION -->
<section id="s6">
  <div class="section-head">
    <div class="section-num">06</div>
    <div class="section-title">Provider Abstraction Layer<span class="section-badge badge-locked">Design Locked</span></div>
  </div>
  <p>The adapter registry is <strong>instance-based</strong>, passed to <code>AgentRunner</code> at construction. No global module-level singleton — resolves the conflict with §41's "no hidden global state" principle and ensures test isolation.</p>
  <pre data-lang="typescript"><span class="cm">// Correct pattern — instance injection, not global registration</span>
<span class="kw">const</span> runner = <span class="kw">new</span> <span class="ty">AgentRunner</span>({
  adapters: {
    anthropic: <span class="kw">new</span> <span class="ty">AnthropicAdapter</span>({ apiKey: env.ANTHROPIC_API_KEY }),
    openai:    <span class="kw">new</span> <span class="ty">OpenAIAdapter</span>({ apiKey: env.OPENAI_API_KEY }),
    local:     <span class="kw">new</span> <span class="ty">LocalAdapter</span>({ baseUrl: <span class="st">'http://localhost:11434'</span> }),
  },
  defaultAdapter: <span class="st">'anthropic'</span>,
});</pre>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Adapter</th><th>Default Model</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td><code>AnthropicAdapter</code></td><td><code>claude-sonnet-4-20250514</code></td><td>Reference implementation</td></tr>
        <tr><td><code>OpenAIAdapter</code></td><td><code>gpt-4o</code></td><td>Supports <code>baseURL</code> override for Azure, Groq, Together</td></tr>
        <tr><td><code>LocalAdapter</code></td><td>(configurable)</td><td>Targets OpenAI-compatible endpoints; default <code>http://localhost:11434</code></td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §11 SYSTEM ARCHITECTURE -->
<section id="s11">
  <div class="section-head">
    <div class="section-num">11</div>
    <div class="section-title">System Architecture</div>
  </div>
  <pre data-lang="diagram">┌────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│   CLI          Dashboard        SDK Consumers       APIs   │
└──────────────────────┬─────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────┐
│                    Execution Layer                          │
│   AgentRunner    PipelineEngine    Scheduler    EventBus   │
└──────────────────────┬─────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────┐
│                    Provider Layer                           │
│   AnthropicAdapter  OpenAIAdapter  LocalAdapter            │
└──────────────────────┬─────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────┐
│                    Storage Layer                            │
│   PostgreSQL   Redis (BullMQ + Session)   EventStore       │
└────────────────────────────────────────────────────────────┘</pre>
</section>

<!-- §12 RUNTIME -->
<section id="s12">
  <div class="section-head">
    <div class="section-num">12</div>
    <div class="section-title">Runtime Architecture<span class="section-badge badge-resolved">Resolved</span></div>
  </div>
  <p>The v1 runtime is <strong>Node.js + Worker Threads + BullMQ + Redis</strong>. Each agent execution runs inside a worker thread for CPU isolation. BullMQ provides durable job queuing over Redis with job persistence across restarts.</p>
</section>

<!-- §13 EXECUTION MODEL -->
<section id="s13">
  <div class="section-head">
    <div class="section-num">13</div>
    <div class="section-title">Execution Model</div>
  </div>
  <pre data-lang="state-machine">CREATED
  ↓
QUEUED          ← BullMQ job enqueued
  ↓
SCHEDULED       ← Worker thread assigned
  ↓
RUNNING         ← Handler executing
  ↓
WAITING_APPROVAL  ← ApprovalStep; worker released; BullMQ job suspended  [v1]
WAITING_DELAY     ← DelayStep; BullMQ delayed job                        [v1]
WAITING_EVENT     ← EventWaitStep; event subscription active             [v2 ROADMAP]
  ↓
RESUMING        ← Worker re-assigned, checkpoint restored
  ↓
COMPLETED | FAILED | CANCELLED | TIMEOUT</pre>
</section>

<!-- §14 AGENT ARCHITECTURE -->
<section id="s14">
  <div class="section-head">
    <div class="section-num">14</div>
    <div class="section-title">Agent Architecture</div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Category</th><th>Description</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Stateless</td><td>Pure request/response</td><td class="s-v1">v1</td></tr>
        <tr><td>Stateful</td><td>Maintains scoped execution memory</td><td class="s-v1">v1</td></tr>
        <tr><td>Supervisory</td><td>Coordinates sub-agents</td><td class="s-v1">v1</td></tr>
        <tr><td>Reactive</td><td>Responds to event subscriptions</td><td class="s-rm">v2 ROADMAP</td></tr>
        <tr><td>Long-Lived</td><td>Persists across execution sessions</td><td class="s-rm">v2 ROADMAP</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §15 TOOL SYSTEM -->
<section id="s15">
  <div class="section-head">
    <div class="section-num">15</div>
    <div class="section-title">Tool System</div>
  </div>
  <pre data-lang="typescript"><span class="kw">interface</span> <span class="ty">ToolDefinition</span>&lt;TInput, TOutput&gt; {
  name:         <span class="kw">string</span>;
  description:  <span class="kw">string</span>;
  inputSchema:  <span class="ty">ZodSchema</span>&lt;TInput&gt;;
  outputSchema: <span class="ty">ZodSchema</span>&lt;TOutput&gt;;
  sideEffects:  <span class="ty">SideEffect</span>[];   <span class="cm">// ['network','filesystem','process','human']</span>
  idempotent:   <span class="kw">boolean</span>;         <span class="cm">// Drives replay behavior</span>
  timeoutMs?:   <span class="kw">number</span>;
  retryPolicy?: <span class="ty">RetryPolicy</span>;
}

<span class="kw">type</span> <span class="ty">SideEffect</span> = <span class="st">'network'</span> | <span class="st">'filesystem'</span> | <span class="st">'process'</span> | <span class="st">'database'</span> | <span class="st">'human'</span>;</pre>
</section>

<!-- §16 PIPELINE ENGINE -->
<section id="s16">
  <div class="section-head">
    <div class="section-num">16</div>
    <div class="section-title">Pipeline &amp; Orchestration Engine</div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Step</th><th>Description</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td><code>AgentStep</code></td><td>Execute a single agent</td><td class="s-v1">v1</td></tr>
        <tr><td><code>ParallelStep</code></td><td>Fan-out concurrent execution, await all</td><td class="s-v1">v1</td></tr>
        <tr><td><code>ConditionalStep</code></td><td>Branch on predicate over prior results</td><td class="s-v1">v1</td></tr>
        <tr><td><code>LoopStep</code></td><td>Repeat with max iterations + time budget</td><td class="s-v1">v1</td></tr>
        <tr><td><code>TransformStep</code></td><td>Pure function — reshape data between steps</td><td class="s-v1">v1</td></tr>
        <tr><td><code>HandoffStep</code></td><td>Pass context from one agent to another</td><td class="s-v1">v1</td></tr>
        <tr><td><code>DelayStep</code></td><td>BullMQ delayed job; durable across restarts</td><td class="s-v1">v1</td></tr>
        <tr><td><code>ApprovalStep</code></td><td>Suspend for human approval via API/dashboard</td><td class="s-v1">v1</td></tr>
        <tr><td><code>EventWaitStep</code></td><td>Suspend pending external event subscription</td><td class="s-rm">v2 ROADMAP</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §17–22 RUNTIME SYSTEMS (condensed) -->
<section id="s17">
  <div class="section-head">
    <div class="section-num">17</div>
    <div class="section-title">Memory System Specification<span class="section-badge badge-resolved">Resolved</span></div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Memory Type</th><th>Backend</th><th>Persistence</th><th>TTL</th><th>v1/v2</th></tr></thead>
      <tbody>
        <tr><td>Execution</td><td>In-process <code>Map</code></td><td>No</td><td>Execution lifetime</td><td class="s-v1">v1</td></tr>
        <tr><td>Session</td><td>Redis</td><td>Optional</td><td>24h configurable</td><td class="s-v1">v1</td></tr>
        <tr><td>Agent</td><td>PostgreSQL</td><td>Yes</td><td>Infinite</td><td class="s-v1">v1</td></tr>
        <tr><td>Pipeline</td><td>PostgreSQL</td><td>Yes</td><td>Infinite</td><td class="s-v1">v1</td></tr>
        <tr><td>Persistent / Vector</td><td>PostgreSQL + pgvector</td><td>Yes</td><td>Infinite</td><td class="s-rm">v2 ROADMAP</td></tr>
      </tbody>
    </table>
  </div>
</section>

<section id="s18">
  <div class="section-head">
    <div class="section-num">18</div>
    <div class="section-title">Durable Execution Framework<span class="section-badge badge-resolved">Resolved</span></div>
  </div>
  <p>Checkpoints are written to PostgreSQL at every committed step boundary. Step completion is a <strong>four-phase commit</strong>: Write AgentEvent → Persist Checkpoint → Commit AgentState → ACK BullMQ. On process restart, the runtime scans for <code>RUNNING</code>/<code>RESUMING</code> rows, loads the last valid checkpoint, and resumes from last committed step boundary.</p>
</section>

<section id="s19">
  <div class="section-head">
    <div class="section-num">19</div>
    <div class="section-title">Streaming Infrastructure<span class="section-badge badge-resolved">Resolved</span></div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Use Case</th><th>Transport</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Dashboard live event updates</td><td>SSE</td><td class="s-v1">v1</td></tr>
        <tr><td>LLM token streaming to clients</td><td>HTTP chunked response</td><td class="s-v1">v1</td></tr>
        <tr><td>Internal event fan-out</td><td>Redis pub/sub</td><td class="s-v1">v1</td></tr>
        <tr><td>Distributed runtime mesh</td><td>gRPC</td><td class="s-rm">ROADMAP v2</td></tr>
        <tr><td>Interactive bidirectional</td><td>WebSocket</td><td class="s-rm">ROADMAP v2</td></tr>
      </tbody>
    </table>
  </div>
</section>

<section id="s20">
  <div class="section-head">
    <div class="section-num">20</div>
    <div class="section-title">Event Architecture</div>
  </div>
  <p>The event system follows <strong>append-only semantics</strong>. Events are never updated or deleted. Redaction replaces sensitive values in-place with <code>[REDACTED]</code> markers. Event ordering guaranteed per <code>runId</code> via monotonic sequence column. Replay supported via paginated API.</p>
</section>

<section id="s21">
  <div class="section-head">
    <div class="section-num">21</div>
    <div class="section-title">Secret Redaction Pipeline<span class="section-badge badge-new">New</span></div>
  </div>
  <p>Every event's <code>data</code> field passes through a five-stage redaction pipeline before persistence. Redaction is synchronous and blocking — events are never written without passing all stages.</p>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Stage</th><th>Mechanism</th><th>Examples Caught</th></tr></thead>
      <tbody>
        <tr><td>1. Pattern Scanner</td><td>Regex block-list</td><td><code>sk-ant-*</code>, <code>sk-*</code>, <code>Bearer .*</code>, <code>ghp_*</code>, <code>AKIA*</code></td></tr>
        <tr><td>2. Schema-Annotated Scrubber</td><td>Zod <code>.sensitive()</code> field marker</td><td>API keys, passwords declared at tool definition</td></tr>
        <tr><td>3. Credential Detector</td><td>Entropy + heuristic scoring</td><td>High-entropy strings resembling API keys</td></tr>
        <tr><td>4. PII Detection</td><td>Structural patterns</td><td>Email addresses, credit card numbers (Luhn), phone numbers</td></tr>
        <tr><td>5. Audit Sanitizer</td><td>Final diff; log redaction count</td><td>Confirms all flagged values replaced with <code>[REDACTED:type]</code></td></tr>
      </tbody>
    </table>
  </div>
</section>

<section id="s22">
  <div class="section-head">
    <div class="section-num">22</div>
    <div class="section-title">Token Governance System<span class="section-badge badge-new">New</span></div>
  </div>
  <pre data-lang="typescript"><span class="kw">interface</span> <span class="ty">TokenBudgetPolicy</span> {
  maxInputTokens:    <span class="kw">number</span>;
  maxOutputTokens:   <span class="kw">number</span>;
  maxTotalTokens:    <span class="kw">number</span>;
  warningThreshold:  <span class="kw">number</span>;    <span class="cm">// Fraction (0–1); emits budget.warning at this utilization</span>
  hardStop:          <span class="kw">boolean</span>;    <span class="cm">// If true: halt execution on exceed. If false: warn only.</span>
}</pre>
  <div class="callout callout-danger">
    <div class="callout-icon">⚠</div>
    <div class="callout-body"><div class="callout-title">Hard Enforcement</div>Executions that exceed their token budget are terminated with a <code>BUDGET_EXCEEDED</code> error. Deployments without a defined budget policy are rejected. There is no way to disable budget enforcement in production.</div>
  </div>
</section>

<!-- §24 SCHEDULER -->
<section id="s24">
  <div class="section-head">
    <div class="section-num">24</div>
    <div class="section-title">Runtime Scheduler</div>
  </div>
  <pre data-lang="queues">agent-os:executions   # Standard agent/pipeline execution jobs
agent-os:delayed      # DelayStep and deferred executions
agent-os:approvals    # Approval wait queue; unblocked by ApprovalAPI
agent-os:replay       # Replay jobs (background, lower priority)
agent-os:cleanup      # Expired checkpoint / state cleanup</pre>
</section>

<!-- §25 CLI -->
<section id="s25">
  <div class="section-head">
    <div class="section-num">25</div>
    <div class="section-title">CLI Specification</div>
  </div>
  <p>Binary: <code>agos</code> (alias: <code>agent-os</code>)</p>
  <pre data-lang="bash"><span class="cm"># Scaffolding</span>
agos init [project-name]
agos new agent &lt;name&gt; | pipeline &lt;name&gt; | adapter &lt;name&gt;

<span class="cm"># Execution</span>
agos run agent &lt;agentId&gt;     [--input &lt;json|file&gt;]
agos run pipeline &lt;id&gt;       [--input &lt;json|file&gt;]

<span class="cm"># Observability</span>
agos logs [agentId] [--tail] [--runId &lt;id&gt;] [--since &lt;duration&gt;]
agos inspect run &lt;runId&gt;
agos trace &lt;runId&gt;
agos replay run &lt;runId&gt;      [--mock-all | --allow-side-effects | --force-live | --dry-run]
agos export events            [--runId] [--from] [--to] [--format json|csv]
agos benchmark agent &lt;id&gt;    [--iterations 10] [--input &lt;file&gt;]

<span class="cm"># Deployment</span>
agos deploy agent &lt;id&gt;       [--target local|railway|docker] [--dry-run]
agos rollback &lt;deploymentId&gt; [--dry-run]

<span class="cm"># Health</span>
agos doctor                   <span class="cm"># Full environment validation — exit 1 on failures</span>
agos dashboard                <span class="cm"># Open monitoring dashboard in browser</span>
agos validate config</pre>
</section>

<!-- ============================================================
     §26 DASHBOARD & OBSERVABILITY — DRAMATICALLY EXPANDED
     ============================================================ -->
<section id="s26">
  <div class="section-head">
    <div class="section-num">26</div>
    <div class="section-title">Dashboard &amp; Observability — UI Specification<span class="section-badge badge-new">v3.1 Expanded</span></div>
  </div>

  <div class="callout callout-info">
    <div class="callout-icon">★</div>
    <div class="callout-body"><div class="callout-title">Section Scope</div>This section was substantially expanded in v3.1. It now includes the full design system, component library, view specifications, interaction patterns, animation spec, accessibility requirements, and responsive behavior for the Agent-OS monitoring dashboard. All specifications here are normative for the v1 implementation.</div>
  </div>

  <!-- 26.1 Technology Stack -->
  <h2>26.1 Technology Stack</h2>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Layer</th><th>Technology</th><th>Rationale</th></tr></thead>
      <tbody>
        <tr><td>Framework</td><td>React 18 + TypeScript (<code>strict: true</code>)</td><td>Component model, concurrent features, type safety parity with SDK</td></tr>
        <tr><td>Styling</td><td>Tailwind CSS v3 + CSS custom properties</td><td>Utility-first with design token bridge</td></tr>
        <tr><td>Charts</td><td><code>recharts</code></td><td>Composable, typed, tree-shakeable</td></tr>
        <tr><td>Pipeline Viz</td><td>TBD — see OD-04</td><td>Custom recharts or react-flow</td></tr>
        <tr><td>Live Updates</td><td>Browser <code>EventSource</code> (SSE)</td><td>Native reconnect, <code>Last-Event-ID</code> support</td></tr>
        <tr><td>Data Fetching</td><td><code>@tanstack/react-query</code></td><td>Caching, background refetch, stale-while-revalidate</td></tr>
        <tr><td>Routing</td><td>React Router v6</td><td>Nested routes, lazy loading</td></tr>
        <tr><td>State</td><td>React context + <code>useReducer</code></td><td>No external state library; complexity doesn't warrant it</td></tr>
        <tr><td>Server</td><td>Express 4 + <code>express-sse</code></td><td>Minimal footprint; SSE fan-out built on Redis pub/sub</td></tr>
        <tr><td>Build</td><td>Vite</td><td>Fast HMR; esbuild bundler (pinned ≤ 0.25.12)</td></tr>
      </tbody>
    </table>
  </div>

  <!-- 26.2 DESIGN SYSTEM -->
  <h2>26.2 Design System Specification</h2>

  <h3>26.2.1 Color Tokens</h3>
  <p>The dashboard ships a single dark theme. All tokens are CSS custom properties on <code>:root</code>. A light theme is v2 ROADMAP.</p>
  <div class="token-grid">
    <div class="token-row"><div class="token-swatch" style="background:#060810;border:1px solid #1a2640"></div><div class="token-info"><div class="token-name">--color-bg</div><div class="token-val">#060810 — Page background</div></div></div>
    <div class="token-row"><div class="token-swatch" style="background:#0c111f"></div><div class="token-info"><div class="token-name">--color-surface</div><div class="token-val">#0c111f — Panel backgrounds</div></div></div>
    <div class="token-row"><div class="token-swatch" style="background:#111827"></div><div class="token-info"><div class="token-name">--color-surface-raised</div><div class="token-val">#111827 — Elevated components</div></div></div>
    <div class="token-row"><div class="token-swatch" style="background:#1a2236"></div><div class="token-info"><div class="token-name">--color-surface-overlay</div><div class="token-val">#1a2236 — Modals, tooltips</div></div></div>
    <div class="token-row"><div class="token-swatch" style="background:#1a2640"></div><div class="token-info"><div class="token-name">--color-border</div><div class="token-val">#1a2640 — Default borders</div></div></div>
    <div class="token-row"><div class="token-swatch" style="background:#243050"></div><div class="token-info"><div class="token-name">--color-border-emphasis</div><div class="token-val">#243050 — Hover, active borders</div></div></div>
    <div class="token-row"><div class="token-swatch" style="background:#00F5FF"></div><div class="token-info"><div class="token-name">--color-accent-neon</div><div class="token-val">#00F5FF — Primary accent (NEON)</div></div></div>
    <div class="token-row"><div class="token-swatch" style="background:#a3e635"></div><div class="token-info"><div class="token-name">--color-accent-acid</div><div class="token-val">#a3e635 — Secondary accent (ACID)</div></div></div>
    <div class="token-row"><div class="token-swatch" style="background:#4ade80"></div><div class="token-info"><div class="token-name">--color-status-success</div><div class="token-val">#4ade80 — Running, completed</div></div></div>
    <div class="token-row"><div class="token-swatch" style="background:#fbbf24"></div><div class="token-info"><div class="token-name">--color-status-warning</div><div class="token-val">#fbbf24 — Waiting, degraded</div></div></div>
    <div class="token-row"><div class="token-swatch" style="background:#f87171"></div><div class="token-info"><div class="token-name">--color-status-error</div><div class="token-val">#f87171 — Failed, budget exceeded</div></div></div>
    <div class="token-row"><div class="token-swatch" style="background:#a78bfa"></div><div class="token-info"><div class="token-name">--color-status-info</div><div class="token-val">#a78bfa — Neutral info, approvals</div></div></div>
  </div>

  <h3>26.2.2 Typography Scale</h3>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Token</th><th>Font</th><th>Size</th><th>Weight</th><th>Usage</th></tr></thead>
      <tbody>
        <tr><td><code>--text-display</code></td><td>Syne</td><td>28px</td><td>800</td><td>Page titles, empty states</td></tr>
        <tr><td><code>--text-heading</code></td><td>Syne</td><td>18px</td><td>700</td><td>Section headings, run ID</td></tr>
        <tr><td><code>--text-subheading</code></td><td>Syne</td><td>14px</td><td>600</td><td>Panel labels, column headers</td></tr>
        <tr><td><code>--text-body</code></td><td>Outfit</td><td>14px</td><td>400</td><td>Body copy, descriptions</td></tr>
        <tr><td><code>--text-label</code></td><td>JetBrains Mono</td><td>11px</td><td>400</td><td>Metric labels, timestamps, event types</td></tr>
        <tr><td><code>--text-micro</code></td><td>JetBrains Mono</td><td>9px</td><td>400</td><td>UUIDs, counts, technical metadata</td></tr>
        <tr><td><code>--text-code</code></td><td>JetBrains Mono</td><td>12px</td><td>400–500</td><td>JSON values, log lines, CLI output</td></tr>
      </tbody>
    </table>
  </div>

  <h3>26.2.3 Spacing System</h3>
  <p>The dashboard uses a base-4 spacing scale: <code>4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80px</code>. Component internal padding is always a multiple of 4. Page margins are 24px on all breakpoints ≥ 1024px. Panel gap is 16px. Grid gap within panels is 12px.</p>

  <h3>26.2.4 Border Radius Scale</h3>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Token</th><th>Value</th><th>Usage</th></tr></thead>
      <tbody>
        <tr><td><code>--radius-sm</code></td><td>4px</td><td>Badges, pills, input fields, status indicators</td></tr>
        <tr><td><code>--radius-md</code></td><td>8px</td><td>Cards, panels, buttons, code blocks</td></tr>
        <tr><td><code>--radius-lg</code></td><td>12px</td><td>Modals, large panels, sidebar sections</td></tr>
        <tr><td><code>--radius-full</code></td><td>9999px</td><td>Pill badges, avatars, toggle switches</td></tr>
      </tbody>
    </table>
  </div>

  <h3>26.2.5 Elevation (z-index) Scale</h3>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Token</th><th>z-index</th><th>Elements</th></tr></thead>
      <tbody>
        <tr><td><code>--z-base</code></td><td>0</td><td>Page content, panels</td></tr>
        <tr><td><code>--z-sticky</code></td><td>10</td><td>Sticky table headers, timeline ruler</td></tr>
        <tr><td><code>--z-sidebar</code></td><td>20</td><td>Nav sidebar, drawer</td></tr>
        <tr><td><code>--z-dropdown</code></td><td>30</td><td>Context menus, select dropdowns</td></tr>
        <tr><td><code>--z-tooltip</code></td><td>40</td><td>Tooltips, popovers</td></tr>
        <tr><td><code>--z-toast</code></td><td>50</td><td>Toast notifications</td></tr>
        <tr><td><code>--z-modal</code></td><td>60</td><td>Modal overlays</td></tr>
      </tbody>
    </table>
  </div>

  <!-- 26.3 LAYOUT SYSTEM -->
  <h2>26.3 Layout System</h2>
  <pre data-lang="layout">┌─────────────────────────────────────────────────────────────────┐
│ Topbar  (56px, sticky)  — Breadcrumb · Live indicator · Auth    │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                   │
│  Sidebar     │  Main Content Area                                │
│  (220px)     │  (max-width 1280px, auto margins)                 │
│              │                                                   │
│  — Overview  │  ┌ Stat Grid ──────────────────────────────────┐ │
│  — Agents    │  │  [Active Runs]  [Success Rate]  [Tokens]     │ │
│  — Pipelines │  └─────────────────────────────────────────────┘ │
│  — Deploy    │                                                   │
│  — Approvals │  ┌ Primary Panel ──┐  ┌ Secondary Panel ────────┐│
│  — Settings  │  │  (flex: 1.4)    │  │  (flex: 1)              ││
│              │  │                 │  │                          ││
│              │  └─────────────────┘  └─────────────────────────┘│
│              │                                                   │
└──────────────┴───────────────────────────────────────────────────┘</pre>

  <!-- 26.4 COMPONENT LIBRARY -->
  <h2>26.4 Component Library</h2>

  <!-- StatusPill -->
  <div class="ui-component">
    <div class="ui-component-head">
      <div class="ui-component-title">StatusPill</div>
      <div class="ui-component-tag">packages/dashboard/components/StatusPill.tsx</div>
    </div>
    <div class="ui-component-body">
      <p>Renders a compact, color-coded execution status badge. Used in run history tables, agent health grids, and the approval queue.</p>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Status</th><th>Color Token</th><th>Icon</th><th>Pulse</th></tr></thead>
          <tbody>
            <tr><td><span style="color:var(--green);font-family:'JetBrains Mono',monospace;font-size:11px">● RUNNING</span></td><td><code>--color-status-success</code></td><td>Spinner (3 arcs, 1s linear)</td><td>Yes</td></tr>
            <tr><td><span style="color:var(--neon);font-family:'JetBrains Mono',monospace;font-size:11px">● RESUMING</span></td><td><code>--color-accent-neon</code></td><td>Play icon</td><td>Yes</td></tr>
            <tr><td><span style="color:var(--amber);font-family:'JetBrains Mono',monospace;font-size:11px">⊙ WAITING</span></td><td><code>--color-status-warning</code></td><td>Clock icon</td><td>Slow pulse</td></tr>
            <tr><td><span style="color:var(--green);font-family:'JetBrains Mono',monospace;font-size:11px">✓ COMPLETED</span></td><td><code>--color-status-success</code></td><td>Check icon</td><td>No</td></tr>
            <tr><td><span style="color:var(--red);font-family:'JetBrains Mono',monospace;font-size:11px">✕ FAILED</span></td><td><code>--color-status-error</code></td><td>X icon</td><td>No</td></tr>
            <tr><td><span style="color:var(--text3);font-family:'JetBrains Mono',monospace;font-size:11px">— CANCELLED</span></td><td><code>--color-text-muted</code></td><td>Slash icon</td><td>No</td></tr>
            <tr><td><span style="color:var(--purple);font-family:'JetBrains Mono',monospace;font-size:11px">◌ QUEUED</span></td><td><code>--color-status-info</code></td><td>Dots icon</td><td>No</td></tr>
          </tbody>
        </table>
      </div>
      <pre data-lang="tsx"><span class="kw">interface</span> <span class="ty">StatusPillProps</span> {
  status:    <span class="ty">ExecutionStatus</span>;
  size?:     <span class="st">'sm'</span> | <span class="st">'md'</span>;      <span class="cm">// default 'sm'</span>
  showLabel?:<span class="kw">boolean</span>;           <span class="cm">// default true</span>
}</pre>
    </div>
  </div>

  <!-- LiveEventFeed -->
  <div class="ui-component">
    <div class="ui-component-head">
      <div class="ui-component-title">LiveEventFeed</div>
      <div class="ui-component-tag">packages/dashboard/components/LiveEventFeed.tsx</div>
    </div>
    <div class="ui-component-body">
      <p>Real-time scrolling feed of <code>AgentEvent</code> objects received over SSE. The most recent event appears at the top with a brief slide-in animation. Events older than 5 minutes are faded to 60% opacity.</p>
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:14px;margin:12px 0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text3)">
          <span>LIVE EVENTS</span>
          <span style="display:flex;align-items:center;gap:5px"><span class="live-dot"></span>STREAMING</span>
        </div>
        <div class="event-item">
          <span class="event-type et-complete">execution.completed</span>
          <span class="event-text">research-agent · run_8f4k2 finished in 12.3s</span>
          <span class="event-time">14:23:01</span>
        </div>
        <div class="event-item">
          <span class="event-type et-tool">tool.returned</span>
          <span class="event-text">web_search → 8 results for "machine learning trends"</span>
          <span class="event-time">14:22:55</span>
        </div>
        <div class="event-item">
          <span class="event-type et-running">step.started</span>
          <span class="event-text">content-pipeline · drafting (parallel) · write + seo</span>
          <span class="event-time">14:22:49</span>
        </div>
        <div class="event-item">
          <span class="event-type et-wait">approval.required</span>
          <span class="event-text">final-approval · expires in 71h 58m · awaiting reviewer</span>
          <span class="event-time">14:21:30</span>
        </div>
        <div class="event-item" style="opacity:.5">
          <span class="event-type et-fail">budget.warning</span>
          <span class="event-text">writer-agent · 78% of 50k token budget consumed</span>
          <span class="event-time">14:19:12</span>
        </div>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>executionId</code></td><td><code>string | undefined</code></td><td>—</td><td>Filter to a single run; if undefined shows all live events</td></tr>
            <tr><td><code>maxItems</code></td><td><code>number</code></td><td>50</td><td>Maximum events retained in memory; oldest pruned on overflow</td></tr>
            <tr><td><code>filterTypes</code></td><td><code>AgentEventType[]</code></td><td>all</td><td>Subset of event types to display</td></tr>
            <tr><td><code>paused</code></td><td><code>boolean</code></td><td>false</td><td>When true, SSE messages are buffered but not rendered</td></tr>
          </tbody>
        </table>
      </div>
      <p>SSE reconnect is handled automatically by <code>EventSource</code>. On reconnect, the last known <code>sequenceNumber</code> is sent via <code>Last-Event-ID</code> header. The server replays missed events from that sequence. Gap detection is performed client-side: if received <code>sequenceNumber !== lastSeen + 1</code>, a <code>GAP_DETECTED</code> synthetic event is inserted into the feed and a background refetch of the full event log is triggered.</p>
    </div>
  </div>

  <!-- ExecutionTimeline -->
  <div class="ui-component">
    <div class="ui-component-head">
      <div class="ui-component-title">ExecutionTimeline</div>
      <div class="ui-component-tag">packages/dashboard/components/ExecutionTimeline.tsx</div>
    </div>
    <div class="ui-component-body">
      <p>Renders a horizontal timeline of events for a single run. Each event type is represented as a dot or span on a time axis. Hovering an event shows a tooltip with full <code>AgentEvent</code> details including <code>data</code> payload and token usage. Clicking opens a detail drawer.</p>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Element</th><th>Visual</th><th>Behavior</th></tr></thead>
          <tbody>
            <tr><td>LLM call span</td><td>Filled bar, <code>--color-accent-neon</code>, opacity per duration</td><td>Width proportional to wall time; tooltip shows tokens in/out</td></tr>
            <tr><td>Tool call span</td><td>Filled bar, <code>--color-status-info</code></td><td>Labeled with tool name; color variant for failed calls</td></tr>
            <tr><td>Step boundary</td><td>Vertical dashed line, label above</td><td>Marks <code>pipeline.step.completed</code> events</td></tr>
            <tr><td>WAITING span</td><td>Striped bar, <code>--color-status-warning</code></td><td>Stretches across the wait duration; collapses if &gt;2× average step</td></tr>
            <tr><td>Error event</td><td>Red diamond marker</td><td>Click expands error detail with stack trace (redacted)</td></tr>
            <tr><td>Budget warning</td><td>Amber triangle on axis</td><td>Shows token consumption at time of warning</td></tr>
          </tbody>
        </table>
      </div>
      <p>The timeline ruler is sticky — it scrolls horizontally with the content but remains visible. The current timestamp (for live runs) advances in real-time via <code>requestAnimationFrame</code>. Completed runs show a static ruler.</p>
    </div>
  </div>

  <!-- TokenBudgetMeter -->
  <div class="ui-component">
    <div class="ui-component-head">
      <div class="ui-component-title">TokenBudgetMeter</div>
      <div class="ui-component-tag">packages/dashboard/components/TokenBudgetMeter.tsx</div>
    </div>
    <div class="ui-component-body">
      <p>Compact meter showing real-time token consumption against the configured budget. Updates via SSE on every <code>message.sent</code> and <code>message.received</code> event.</p>
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:16px;margin:12px 0">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text3)">
          <span>TOKEN BUDGET</span>
          <span style="color:var(--amber)">38,420 / 50,000 (77%)</span>
        </div>
        <div style="height:6px;background:var(--bg4);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:77%;background:linear-gradient(90deg,var(--neon),var(--amber));border-radius:3px"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">
          <span>↑ 18,200 input</span>
          <span>↓ 20,220 output</span>
          <span style="color:var(--red)">⚠ 23% remaining</span>
        </div>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Threshold</th><th>Track Color</th><th>Behavior</th></tr></thead>
          <tbody>
            <tr><td>0–60%</td><td><code>--color-accent-neon</code></td><td>Default state; no alert</td></tr>
            <tr><td>60–80%</td><td>Gradient neon → amber</td><td>No alert; subtle color shift</td></tr>
            <tr><td>80–99%</td><td><code>--color-status-warning</code></td><td>Toast notification at 80%; meter pulses</td></tr>
            <tr><td>100%</td><td><code>--color-status-error</code></td><td>Execution terminated; meter fills red; error banner shown</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ApprovalCard -->
  <div class="ui-component">
    <div class="ui-component-head">
      <div class="ui-component-title">ApprovalCard</div>
      <div class="ui-component-tag">packages/dashboard/components/ApprovalCard.tsx</div>
    </div>
    <div class="ui-component-body">
      <p>Renders a single pending approval request with context, countdown timer, and Approve/Reject actions. Requires <code>Authorization: Bearer $DASHBOARD_SECRET</code> on resolution API calls.</p>
      <div style="background:var(--bg3);border:1px solid rgba(251,191,36,.3);border-radius:8px;padding:16px;margin:12px 0">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;color:var(--head)">Review before publish</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text3);margin-top:3px">content-pipeline · final-approval · run_9g3m1</div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--amber);display:flex;align-items:center;gap:5px">
            <span>⏱</span> 71h 44m remaining
          </div>
        </div>
        <div style="background:var(--bg4);border:1px solid var(--border);border-radius:6px;padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text2);margin-bottom:12px">
          pipeline_run: run_9g3m1<br/>step: final-approval<br/>content_score: 0.87<br/>word_count: 1240<br/>seo_score: 0.91
        </div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <button style="flex:1;padding:8px;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.3);border-radius:6px;color:var(--green);font-family:'JetBrains Mono',monospace;font-size:11px;cursor:pointer;letter-spacing:.08em">✓ APPROVE</button>
          <button style="flex:1;padding:8px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);border-radius:6px;color:var(--red);font-family:'JetBrains Mono',monospace;font-size:11px;cursor:pointer;letter-spacing:.08em">✕ REJECT</button>
        </div>
        <input placeholder="Audit note (required for rejection, optional for approval)..." style="width:100%;background:var(--bg4);border:1px solid var(--border);border-radius:6px;padding:8px 12px;font-size:12px;color:var(--text);font-family:'Outfit',sans-serif"/>
      </div>
      <p>The countdown timer updates every minute via <code>setInterval</code>. When expiry is &lt;4h, the counter text turns amber; &lt;1h turns red and the card border pulses. On expiry, the card transitions to <code>EXPIRED</code> status with no action buttons.</p>
      <p>Approval resolution calls <code>POST /api/approvals/:id/resolve</code> with body <code>{ decision: 'APPROVED'|'REJECTED', note: string }</code>. On success, the card is replaced with a resolution summary. On API failure, a toast error is shown and the card remains interactive — no optimistic update.</p>
    </div>
  </div>

  <!-- PipelineGantt -->
  <div class="ui-component">
    <div class="ui-component-head">
      <div class="ui-component-title">PipelineGanttChart</div>
      <div class="ui-component-tag">packages/dashboard/components/PipelineGanttChart.tsx</div>
    </div>
    <div class="ui-component-body">
      <p>Horizontal Gantt view of a pipeline run, showing parallel step fan-out and completion timing.</p>
      <div class="gantt">
        <div class="gantt-row" style="background:var(--bg3)">
          <div class="gantt-label" style="color:var(--text3);font-size:9px;letter-spacing:.12em">STEP</div>
          <div class="gantt-track" style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3);padding:6px 8px">
            <span style="position:relative;left:0%">0s</span>
            <span style="position:absolute;left:calc(8px + 25%)">3s</span>
            <span style="position:absolute;left:calc(8px + 50%)">6s</span>
            <span style="position:absolute;left:calc(8px + 75%)">9s</span>
          </div>
        </div>
        <div class="gantt-row">
          <div class="gantt-label">research</div>
          <div class="gantt-track"><div class="gantt-bar" style="width:33%;background:var(--neon);color:#000">12.3s</div></div>
        </div>
        <div class="gantt-row">
          <div class="gantt-label" style="color:var(--text3);font-size:9px">↳ write (parallel)</div>
          <div class="gantt-track" style="padding-left:calc(8px + 33%)"><div class="gantt-bar" style="width:30%;background:var(--purple);color:#fff">8.9s</div></div>
        </div>
        <div class="gantt-row">
          <div class="gantt-label" style="color:var(--text3);font-size:9px">↳ seo (parallel)</div>
          <div class="gantt-track" style="padding-left:calc(8px + 33%)"><div class="gantt-bar" style="width:18%;background:var(--purple);color:#fff">5.4s</div></div>
        </div>
        <div class="gantt-row">
          <div class="gantt-label">quality-gate</div>
          <div class="gantt-track" style="padding-left:calc(8px + 63%)"><div class="gantt-bar" style="width:10%;background:var(--blue);color:#fff">2.1s</div></div>
        </div>
        <div class="gantt-row">
          <div class="gantt-label">final-approval</div>
          <div class="gantt-track" style="padding-left:calc(8px + 73%)"><div class="gantt-bar" style="width:27%;background:linear-gradient(90deg,var(--amber),transparent);color:var(--head);font-size:8px">WAITING ⏱</div></div>
        </div>
      </div>
    </div>
  </div>

  <!-- AgentHealthGrid -->
  <div class="ui-component">
    <div class="ui-component-head">
      <div class="ui-component-title">AgentHealthGrid</div>
      <div class="ui-component-tag">packages/dashboard/components/AgentHealthGrid.tsx</div>
    </div>
    <div class="ui-component-body">
      <p>Compact grid view of all registered agents with real-time health status. Status is derived from the most recent 10 runs: all success = green, any failure = yellow (≤2 failures) or red (&gt;2). An agent with no runs in 24h shows as gray (IDLE).</p>
      <div class="agent-grid" style="margin:12px 0">
        <div class="agent-cell">
          <div class="agent-name">research-agent</div>
          <div class="agent-status"><div class="dot dot-green"></div><span style="color:var(--green)">healthy</span></div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">42 runs · 100% success</div>
        </div>
        <div class="agent-cell">
          <div class="agent-name">writer-agent</div>
          <div class="agent-status"><div class="dot dot-amber"></div><span style="color:var(--amber)">degraded</span></div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">18 runs · 89% success</div>
        </div>
        <div class="agent-cell">
          <div class="agent-name">seo-agent</div>
          <div class="agent-status"><div class="dot dot-green"></div><span style="color:var(--green)">healthy</span></div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">18 runs · 100% success</div>
        </div>
        <div class="agent-cell">
          <div class="agent-name">publish-agent</div>
          <div class="agent-status"><div class="dot" style="background:var(--text3)"></div><span style="color:var(--text3)">idle</span></div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">0 runs today</div>
        </div>
        <div class="agent-cell">
          <div class="agent-name">editor-agent</div>
          <div class="agent-status"><div class="dot dot-red"></div><span style="color:var(--red)">unhealthy</span></div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">5 runs · 60% success</div>
        </div>
      </div>
    </div>
  </div>

  <!-- DeploymentCard -->
  <div class="ui-component">
    <div class="ui-component-head">
      <div class="ui-component-title">DeploymentCard</div>
      <div class="ui-component-tag">packages/dashboard/components/DeploymentCard.tsx</div>
    </div>
    <div class="ui-component-body">
      <p>Shows a single deployment record with version, target, health status, and rollback action. The rollback button calls <code>POST /api/deployments/:id/rollback</code> with a confirmation dialog. <strong>Rollback is code-only</strong> — schema migrations are not reversed.</p>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Field</th><th>Display</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td>Version</td><td>Semver badge</td><td>Links to registry entry</td></tr>
            <tr><td>Target</td><td>Pill — local/railway/docker</td><td>Color-coded by environment</td></tr>
            <tr><td>Status</td><td>StatusPill variant</td><td>ACTIVE = green; INACTIVE = gray; FAILED = red; ROLLING_BACK = amber pulse</td></tr>
            <tr><td>Health probe</td><td>Last probe timestamp + status code</td><td>Refreshes every 30s for ACTIVE deployments</td></tr>
            <tr><td>Image digest</td><td>Truncated SHA, full on hover</td><td>Monospace, copy to clipboard</td></tr>
            <tr><td>Rollback button</td><td>Secondary button</td><td>Disabled if no prior INACTIVE deployment; requires confirmation dialog</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- SkeletonLoader -->
  <div class="ui-component">
    <div class="ui-component-head">
      <div class="ui-component-title">SkeletonLoader</div>
      <div class="ui-component-tag">packages/dashboard/components/SkeletonLoader.tsx</div>
    </div>
    <div class="ui-component-body">
      <p>Shimmer skeleton replaces every data-dependent component during initial load. Skeleton dimensions match the eventual component exactly — no layout shift on data arrival. The shimmer animation uses <code>background-size: 200% 100%</code> with a linear gradient sweep on a 1.2s loop. The animation is disabled under <code>prefers-reduced-motion</code> — static gray block shown instead.</p>
    </div>
  </div>

  <!-- ToastSystem -->
  <div class="ui-component">
    <div class="ui-component-head">
      <div class="ui-component-title">ToastNotificationSystem</div>
      <div class="ui-component-tag">packages/dashboard/components/Toast.tsx</div>
    </div>
    <div class="ui-component-body">
      <p>Toasts are rendered in a fixed portal anchored to the bottom-right corner at z-index <code>--z-toast</code>. Each toast slides in from the right and auto-dismisses after the configured timeout.</p>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Type</th><th>Trigger</th><th>Duration</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>Success</td><td>Approval resolved, deployment succeeded</td><td>4s</td><td>None</td></tr>
            <tr><td>Warning</td><td>Token budget ≥80%, approval expiry &lt;4h</td><td>8s</td><td>"View" link</td></tr>
            <tr><td>Error</td><td>API call failed, SSE disconnected</td><td>Persistent</td><td>"Dismiss" + "Retry"</td></tr>
            <tr><td>Info</td><td>Pipeline started, agent queued</td><td>3s</td><td>None</td></tr>
          </tbody>
        </table>
      </div>
      <p>Toasts stack vertically with 8px gap. Maximum 3 toasts visible simultaneously — oldest is dismissed to make room. Screen readers receive <code>aria-live="polite"</code> announcements for success/info toasts and <code>aria-live="assertive"</code> for errors.</p>
    </div>
  </div>

  <!-- 26.5 VIEW SPECIFICATIONS -->
  <h2>26.5 View Specifications</h2>

  <!-- Overview Dashboard mockup -->
  <h3>26.5.1 Overview Dashboard</h3>
  <div class="dash-frame">
    <div class="dash-titlebar">
      <div class="dash-dot red"></div><div class="dash-dot yellow"></div><div class="dash-dot green"></div>
      <div class="dash-url">localhost:4000 — Agent-OS Dashboard</div>
    </div>
    <div class="dash-content">
      <div class="dash-statgrid">
        <div class="dash-stat neon">
          <div class="dash-stat-label">Active Runs</div>
          <div class="dash-stat-val" style="color:var(--neon)">12</div>
          <div class="dash-stat-delta delta-up">↑ 4 from 1h ago</div>
        </div>
        <div class="dash-stat acid">
          <div class="dash-stat-label">Success Rate (24h)</div>
          <div class="dash-stat-val" style="color:var(--acid)">94.2%</div>
          <div class="dash-stat-delta delta-up">↑ 2.1pp vs yesterday</div>
        </div>
        <div class="dash-stat purple">
          <div class="dash-stat-label">Tokens Used (24h)</div>
          <div class="dash-stat-val" style="color:var(--purple)">2.4M</div>
          <div class="dash-stat-delta delta-dn">↓ 12% vs yesterday</div>
        </div>
        <div class="dash-stat amber">
          <div class="dash-stat-label">Pending Approvals</div>
          <div class="dash-stat-val" style="color:var(--amber)">3</div>
          <div class="dash-stat-delta" style="color:var(--amber)">⚠ 1 expiring &lt;4h</div>
        </div>
      </div>
      <div class="dash-row">
        <div class="dash-panel">
          <div class="dash-panel-head"><span>LIVE EVENTS</span><span style="display:flex;align-items:center;gap:5px"><span class="live-dot"></span>STREAMING</span></div>
          <div class="event-item"><span class="event-type et-complete">execution.completed</span><span class="event-text">research-agent · run_8f4k2</span><span class="event-time">just now</span></div>
          <div class="event-item"><span class="event-type et-tool">tool.returned</span><span class="event-text">web_search → 8 results</span><span class="event-time">6s</span></div>
          <div class="event-item"><span class="event-type et-running">step.started</span><span class="event-text">content-pipeline · drafting</span><span class="event-time">12s</span></div>
          <div class="event-item"><span class="event-type et-wait">approval.required</span><span class="event-text">final-approval · 71h left</span><span class="event-time">1m</span></div>
        </div>
        <div class="dash-panel">
          <div class="dash-panel-head">AGENT HEALTH</div>
          <div class="agent-grid">
            <div class="agent-cell"><div class="agent-name" style="font-size:10px">research-agent</div><div class="agent-status"><div class="dot dot-green"></div><span style="color:var(--green);font-size:9px">healthy</span></div></div>
            <div class="agent-cell"><div class="agent-name" style="font-size:10px">writer-agent</div><div class="agent-status"><div class="dot dot-amber"></div><span style="color:var(--amber);font-size:9px">degraded</span></div></div>
            <div class="agent-cell"><div class="agent-name" style="font-size:10px">seo-agent</div><div class="agent-status"><div class="dot dot-green"></div><span style="color:var(--green);font-size:9px">healthy</span></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <h3>26.5.2 Agent Detail View</h3>
  <p>Layout: breadcrumb header (Agents → <em>agent-id</em>) → Summary bar (agent version, last run, success rate) → tabbed content.</p>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Tab</th><th>Content</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>Runs</td><td>Paginated table of <code>AgentRun</code> records with StatusPill, duration, tokens, input preview</td><td>Default sort: <code>startedAt DESC</code>; filterable by status and date range</td></tr>
        <tr><td>Timeline</td><td>Selected run's <code>ExecutionTimeline</code> with all events</td><td>Run selector dropdown at top; defaults to most recent run</td></tr>
        <tr><td>Performance</td><td>Token usage histogram (recharts), p50/p95/p99 latency, error rate over time</td><td>Time range selector: 1h / 6h / 24h / 7d</td></tr>
        <tr><td>Budget</td><td>Budget utilization per run, budget policy display, cumulative burn chart</td><td>Warns if any run exceeded 90% of budget</td></tr>
        <tr><td>Memory</td><td>Agent memory key-value browser (read-only)</td><td>Shows current PostgreSQL agent state keys</td></tr>
      </tbody>
    </table>
  </div>

  <h3>26.5.3 Pipeline Detail View</h3>
  <p>Layout: breadcrumb → Pipeline structure (static, from registry definition) → Run selector → Gantt chart for selected run → Checkpoint history panel.</p>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Panel</th><th>Content</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>Static structure (OD-04)</td><td>Graph visualization of pipeline step topology</td><td>Either custom recharts or react-flow — see OD-04</td></tr>
        <tr><td>Gantt chart</td><td><code>PipelineGanttChart</code> for selected run</td><td>Live updates during active runs via SSE</td></tr>
        <tr><td>Step results</td><td>Accordion of step outputs per run, keyed by <code>stepId</code></td><td>Output values displayed as formatted JSON; sensitive fields masked</td></tr>
        <tr><td>Checkpoints</td><td>Table of <code>ExecutionCheckpoint</code> records — stepId, timestamp, memory snapshot size</td><td>Snapshot content viewable in drawer (read-only)</td></tr>
        <tr><td>Parallel timing</td><td>Fan-out visualization showing parallel branch start/end times</td><td>Highlights the critical path (longest branch)</td></tr>
      </tbody>
    </table>
  </div>

  <h3>26.5.4 Deployments View</h3>
  <p>Layout: active deployment summary → deployment history table → diff drawer (on row click).</p>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Column</th><th>Display</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>Agent/Pipeline</td><td>Registry ID + version</td><td>Links to Agent or Pipeline detail view</td></tr>
        <tr><td>Target</td><td>Pill badge — local/railway/docker</td><td>Railway pill has a cloud icon; docker has a whale icon</td></tr>
        <tr><td>Status</td><td>StatusPill (ACTIVE/INACTIVE/FAILED/ROLLING_BACK)</td><td>—</td></tr>
        <tr><td>Deployed at</td><td>Relative timestamp (hover for absolute)</td><td>—</td></tr>
        <tr><td>Deployed by</td><td>Identity string</td><td>From env-derived identifier; not editable</td></tr>
        <tr><td>Health probe</td><td>Green/red dot + last checked timestamp</td><td>Only populated for Railway and Docker ACTIVE deployments</td></tr>
        <tr><td>Actions</td><td>Rollback button (disabled for inactive)</td><td>Opens confirmation modal with one-sentence summary of what rollback does and what it does NOT do (schema)</td></tr>
      </tbody>
    </table>
  </div>

  <h3>26.5.5 Approvals Queue View</h3>
  <p>Layout: counts bar (pending / approved today / rejected today / expired today) → card list of pending approvals → resolved table below the fold.</p>
  <p>Pending approvals are sorted by expiry time ascending — most urgent at top. The counts bar auto-updates via SSE on every <code>approval.*</code> event. An empty state is shown when no approvals are pending: "No pending approvals — your pipeline is running smoothly."</p>
  <p>Resolved approvals table shows the full history with resolution notes. Filterable by decision (APPROVED/REJECTED/EXPIRED) and date range.</p>

  <!-- 26.6 INTERACTION PATTERNS -->
  <h2>26.6 Interaction Patterns</h2>

  <h3>26.6.1 SSE Connection Lifecycle</h3>
  <div class="flow-steps">
    <div class="flow-step" data-n="1">
      <div class="flow-step-title">Connect</div>
      <div class="flow-step-body">Browser opens <code>EventSource('GET /events')</code>. Server verifies <code>Authorization</code> header on the HTTP upgrade request. Returns 401 if missing/invalid — <code>EventSource</code> does NOT retry on 401, so an error banner is shown.</div>
    </div>
    <div class="flow-step" data-n="2">
      <div class="flow-step-title">Stream</div>
      <div class="flow-step-body">Server pushes all <code>AgentEvent</code> objects from Redis pub/sub. Each event includes an <code>id</code> field (the monotonic <code>sequenceNumber</code>) consumed by <code>Last-Event-ID</code> on reconnect.</div>
    </div>
    <div class="flow-step" data-n="3">
      <div class="flow-step-title">Reconnect</div>
      <div class="flow-step-body">Browser <code>EventSource</code> reconnects automatically after 3s. Server receives <code>Last-Event-ID</code> and replays events from that sequence number from the PostgreSQL event store.</div>
    </div>
    <div class="flow-step" data-n="4">
      <div class="flow-step-title">Gap Detection</div>
      <div class="flow-step-body">Client checks <code>sequenceNumber</code> continuity. On gap, inserts a synthetic <code>GAP_DETECTED</code> entry into the feed and triggers a full background refetch of the run's event log. Gap items render in amber with a warning icon.</div>
    </div>
    <div class="flow-step" data-n="5">
      <div class="flow-step-title">Backpressure</div>
      <div class="flow-step-body">The dashboard server buffers up to 1,000 events per client connection. On overflow, the oldest events are dropped. A <code>BUFFER_OVERFLOW</code> event is injected as a synthetic message — the dashboard shows a yellow banner: "Some events were skipped — refresh to see the full log."</div>
    </div>
  </div>

  <h3>26.6.2 Keyboard Shortcuts</h3>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Shortcut</th><th>Action</th><th>Context</th></tr></thead>
      <tbody>
        <tr><td><kbd>G</kbd> <kbd>O</kbd></td><td>Go to Overview</td><td>Global</td></tr>
        <tr><td><kbd>G</kbd> <kbd>A</kbd></td><td>Go to Agents</td><td>Global</td></tr>
        <tr><td><kbd>G</kbd> <kbd>P</kbd></td><td>Go to Pipelines</td><td>Global</td></tr>
        <tr><td><kbd>G</kbd> <kbd>D</kbd></td><td>Go to Deployments</td><td>Global</td></tr>
        <tr><td><kbd>G</kbd> <kbd>Q</kbd></td><td>Go to Approvals Queue</td><td>Global</td></tr>
        <tr><td><kbd>R</kbd></td><td>Refresh current view (refetch, not SSE)</td><td>Global</td></tr>
        <tr><td><kbd>F</kbd></td><td>Focus search / filter bar</td><td>Table views</td></tr>
        <tr><td><kbd>Enter</kbd></td><td>Open selected row detail</td><td>Table views</td></tr>
        <tr><td><kbd>Esc</kbd></td><td>Close drawer / modal</td><td>Drawers, modals</td></tr>
        <tr><td><kbd>Shift</kbd> <kbd>A</kbd></td><td>Approve focused approval (requires confirmation)</td><td>Approval Queue</td></tr>
      </tbody>
    </table>
  </div>

  <h3>26.6.3 Data Export</h3>
  <p>All table views have an Export button (top-right) that calls the corresponding API endpoint with the current filter state and downloads a JSON or CSV file. Exports include all fields, not just visible columns. Large exports (&gt;10,000 rows) are paginated in the background — a progress toast is shown during download.</p>

  <!-- 26.7 ANIMATION SPEC -->
  <h2>26.7 Animation Specification</h2>
  <div class="callout callout-info">
    <div class="callout-icon">✦</div>
    <div class="callout-body"><div class="callout-title">Reduced Motion</div>All animations must be wrapped in <code>@media (prefers-reduced-motion: no-preference)</code>. Under reduced-motion, state changes are instant — no transitions. The live pulse dot is always static under reduced motion. This is a non-negotiable accessibility requirement.</div>
  </div>
  <div style="margin:16px 0">
    <div class="anim-row"><div class="anim-name">Page route transition</div><div class="anim-val">Fade in 150ms ease-out; no slide (prevents disorientation on re-navigation)</div></div>
    <div class="anim-row"><div class="anim-name">Panel data arrival</div><div class="anim-val">Opacity 0→1 over 200ms ease-out after skeleton removal</div></div>
    <div class="anim-row"><div class="anim-name">New SSE event insertion</div><div class="anim-val">Slide from right 180px → 0 over 200ms ease-out; opacity 0→1</div></div>
    <div class="anim-row"><div class="anim-name">Status pill live pulse</div><div class="anim-val">Opacity 1→0.4→1 over 2s ease-in-out; infinite. Running states only.</div></div>
    <div class="anim-row"><div class="anim-name">Skeleton shimmer</div><div class="anim-val">Background-position 200%→-200% over 1.2s linear; infinite</div></div>
    <div class="anim-row"><div class="anim-name">Toast slide-in</div><div class="anim-val">Transform translateX(120px)→0, opacity 0→1 over 250ms ease-out</div></div>
    <div class="anim-row"><div class="anim-name">Toast slide-out</div><div class="anim-val">Transform translateX(0)→120px, opacity 1→0 over 200ms ease-in</div></div>
    <div class="anim-row"><div class="anim-name">Token meter fill</div><div class="anim-val">Width transition 400ms ease-out on every update event</div></div>
    <div class="anim-row"><div class="anim-name">Modal open</div><div class="anim-val">Overlay opacity 0→0.6 over 200ms; modal scale 0.96→1.0 + opacity 0→1 over 200ms</div></div>
    <div class="anim-row"><div class="anim-name">Approval expiry warning</div><div class="anim-val">Card border opacity 0.3→1→0.3 over 3s; activates at &lt;1h remaining</div></div>
    <div class="anim-row"><div class="anim-name">Gantt bar draw-in</div><div class="anim-val">Width 0→final over 600ms ease-out; staggered 80ms per step row</div></div>
  </div>

  <!-- 26.8 ACCESSIBILITY -->
  <h2>26.8 Accessibility Requirements</h2>
  <div class="a11y-grid">
    <div class="a11y-card">
      <div class="a11y-card-title">Color Contrast</div>
      <p style="font-size:12px;color:var(--text2)">All text meets WCAG 2.1 AA: minimum 4.5:1 for body text, 3:1 for large text. Status colors are never used as the <em>only</em> differentiator — each status also uses a distinct icon and text label.</p>
    </div>
    <div class="a11y-card">
      <div class="a11y-card-title">Keyboard Navigation</div>
      <p style="font-size:12px;color:var(--text2)">All interactive elements are reachable by Tab. Focus ring is visible (2px solid <code>--color-accent-neon</code> offset 2px). Modal focus is trapped. Escape closes any overlay. Arrow keys navigate within table rows and dropdown menus.</p>
    </div>
    <div class="a11y-card">
      <div class="a11y-card-title">Screen Reader Support</div>
      <p style="font-size:12px;color:var(--text2)">Live event feed uses <code>role="log" aria-live="polite" aria-atomic="false"</code>. Status changes announce via <code>aria-live="polite"</code>. Approval cards use <code>role="region"</code> with descriptive labels. Tables have proper <code>scope</code> on headers.</p>
    </div>
    <div class="a11y-card">
      <div class="a11y-card-title">Semantic HTML</div>
      <p style="font-size:12px;color:var(--text2)">Navigation uses <code>&lt;nav&gt;</code>. Main content uses <code>&lt;main&gt;</code>. Sections use <code>&lt;section aria-labelledby="..."&gt;</code>. Buttons are <code>&lt;button type="button"&gt;</code>, never <code>&lt;div onClick&gt;</code>. Icons have <code>aria-hidden="true"</code>; icon-only buttons have <code>aria-label</code>.</p>
    </div>
    <div class="a11y-card">
      <div class="a11y-card-title">Toast Announcements</div>
      <p style="font-size:12px;color:var(--text2)">Toast container uses <code>aria-live="polite"</code> for info/success, <code>aria-live="assertive"</code> for errors. Each toast is announced with its full text content. Dismiss button has <code>aria-label="Dismiss notification"</code>.</p>
    </div>
    <div class="a11y-card">
      <div class="a11y-card-title">Chart Accessibility</div>
      <p style="font-size:12px;color:var(--text2)">All recharts instances include a hidden accessible table rendering the same data for screen readers. Chart containers have <code>role="img"</code> with descriptive <code>aria-label</code> summarizing the key metric and trend. Data is not conveyed by color alone.</p>
    </div>
  </div>

  <!-- 26.9 RESPONSIVE BEHAVIOR -->
  <h2>26.9 Responsive Behavior</h2>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Breakpoint</th><th>Layout Change</th></tr></thead>
      <tbody>
        <tr><td>&lt;768px (mobile)</td><td>Sidebar collapses to hamburger menu drawer. Stat grid becomes 2-col. Row panels stack vertically. Dashboard is informational only — approval actions deferred to desktop for accuracy. Toast position moves to top-center.</td></tr>
        <tr><td>768–1024px (tablet)</td><td>Sidebar narrows to icon-only mode (220px → 56px). Labels appear on hover. Gantt chart gains horizontal scroll. Token meter moves to run detail header.</td></tr>
        <tr><td>≥1024px (desktop)</td><td>Full layout as specified. Side-by-side panels. Full sidebar. All features enabled.</td></tr>
        <tr><td>≥1440px (wide)</td><td>Main content max-width 1280px. Sidebar width unchanged. Extra whitespace in main area used for additional panel columns (3-col stat grid becomes 4-col).</td></tr>
      </tbody>
    </table>
  </div>

  <!-- 26.10 DASHBOARD SERVER API -->
  <h2>26.10 Dashboard Server API</h2>
  <pre data-lang="http">GET  /api/agents                       List registered agents
GET  /api/agents/:id/runs              Run history (paginated)
GET  /api/runs/:runId                  Single run detail
GET  /api/runs/:runId/events           Events (cursor-paginated)
GET  /api/runs/:runId/checkpoints      Checkpoint history
GET  /api/pipelines                    List pipelines
GET  /api/pipelines/:id/runs           Pipeline run history
GET  /api/deployments                  Deployment history
POST /api/deployments/:id/rollback     Trigger rollback  [auth required]
GET  /api/approvals                    Pending approval requests
GET  /api/approvals/history            Resolved approval history
POST /api/approvals/:id/resolve        Approve or reject  [auth required]
GET  /api/metrics/overview             Summary metrics (active runs, success rate, token burn)
GET  /events                           SSE stream of live AgentEvents  [auth optional — see §29.2]</pre>
  <p>All write endpoints require <code>Authorization: Bearer $DASHBOARD_SECRET</code>. The SSE endpoint may optionally require auth — configurable via <code>agent-os.config.ts</code> <code>dashboard.requireAuthOnStream</code> flag (default: <code>true</code>).</p>

  <!-- 26.11 ERROR STATES -->
  <h2>26.11 Error States &amp; Empty States</h2>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>State</th><th>Trigger</th><th>UI Treatment</th></tr></thead>
      <tbody>
        <tr><td>API Error</td><td>Non-2xx from any dashboard API</td><td>Inline error banner within the panel; retry button; error code and message shown</td></tr>
        <tr><td>SSE Disconnected</td><td>EventSource <code>error</code> event after 3 failed reconnects</td><td>Red status bar at top of page: "Live updates paused — reconnecting…"; manual refresh button</td></tr>
        <tr><td>Empty runs</td><td>No <code>AgentRun</code> records for agent</td><td>"No runs yet — run <code>agos run agent &lt;id&gt;</code> to get started" with CLI snippet</td></tr>
        <tr><td>Empty approvals</td><td>No PENDING <code>ApprovalRequest</code> records</td><td>Centered icon + "No pending approvals — pipelines are flowing." with acid-green accent</td></tr>
        <tr><td>No deployments</td><td>No <code>Deployment</code> records</td><td>"Deploy your first agent with <code>agos deploy agent &lt;id&gt; --target railway</code>"</td></tr>
        <tr><td>Auth failure</td><td>401 on write endpoints</td><td>Modal overlay: "Dashboard secret required" with masked input field; stored in <code>sessionStorage</code></td></tr>
        <tr><td>Rollback blocked</td><td>No prior INACTIVE deployment</td><td>Rollback button disabled with tooltip: "No prior deployment to roll back to"</td></tr>
      </tbody>
    </table>
  </div>

  <!-- 26.12 SECURITY POSTURE -->
  <h2>26.12 Dashboard Security Posture</h2>
  <div class="callout callout-danger">
    <div class="callout-icon">⚠</div>
    <div class="callout-body">
      <div class="callout-title">Auth Boundary</div>
      The dashboard is an internal operations tool. It is NOT designed for public-facing exposure. Production deployments MUST put it behind a VPN, private network, or authenticated reverse proxy. The <code>DASHBOARD_SECRET</code> bearer token is a secondary control, not the primary security perimeter.
    </div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Surface</th><th>Control</th></tr></thead>
      <tbody>
        <tr><td>All write endpoints (<code>POST</code>)</td><td>Bearer token required; constant-time comparison; 401 on mismatch</td></tr>
        <tr><td>SSE stream</td><td>Configurable auth requirement; defaults to required</td></tr>
        <tr><td>Secret field display</td><td>All secret-annotated fields in approval payloads are rendered as <code>••••••••</code>; raw value never sent to browser</td></tr>
        <tr><td>CORS</td><td>Configured to dashboard origin only; no wildcard</td></tr>
        <tr><td>CSP</td><td>Strict CSP header; no <code>unsafe-inline</code> scripts; no <code>unsafe-eval</code></td></tr>
        <tr><td>WebSocket auth (future)</td><td>Identity derived from JWT only — see §44.4 (W-01 finding)</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §27 DEPLOYMENT -->
<section id="s27">
  <div class="section-head">
    <div class="section-num">27</div>
    <div class="section-title">Deployment Architecture<span class="section-badge badge-corrected">Corrected</span></div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Target</th><th>Purpose</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Local</td><td>Development process</td><td class="s-v1">v1</td></tr>
        <tr><td>Railway</td><td>Managed cloud (primary)</td><td class="s-v1">v1</td></tr>
        <tr><td>Docker</td><td>Containerized infra</td><td class="s-v1">v1</td></tr>
        <tr><td>Kubernetes</td><td>Distributed runtime</td><td class="s-rm">ROADMAP v2</td></tr>
        <tr><td>Edge Runtime</td><td>Lightweight execution</td><td class="s-pk">ROADMAP v3</td></tr>
      </tbody>
    </table>
  </div>
  <div class="callout callout-warn">
    <div class="callout-icon">⚑</div>
    <div class="callout-body"><div class="callout-title">Rollback Policy</div>The system does NOT claim fully atomic rollback. Schema rollback is permanently unsupported — migrations are forward-only and append-only. Code rollback only. Schema changes must be backward-compatible with the prior code version to enable safe rollback.</div>
  </div>
  <p><strong>Railway Deployment Flow (10 steps):</strong> Validate credentials → TSC 0 gate → npm audit → esbuild bundle (≤0.25.12) → Write Dockerfile → <code>railway up</code> → Poll <code>/health</code> (120s timeout) → Write ACTIVE Deployment record → Mark prior ACTIVE as INACTIVE → On failure: write FAILED record, do NOT auto-rollback.</p>
</section>

<!-- §28 BACKUP -->
<section id="s28">
  <div class="section-head">
    <div class="section-num">28</div>
    <div class="section-title">Backup &amp; Recovery<span class="section-badge badge-new">New</span></div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Parameter</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Backup frequency</td><td>Daily (Railway managed)</td></tr>
        <tr><td>Backup retention</td><td>7 days minimum</td></tr>
        <tr><td>RPO (Recovery Point Objective)</td><td>24 hours</td></tr>
        <tr><td>RTO (Recovery Time Objective)</td><td>2 hours</td></tr>
      </tbody>
    </table>
  </div>
  <p>Pre-migration backup is mandatory: <code>pg_dump</code> to timestamped file → store in Railway volume or external storage → verify dump success → <em>then</em> run <code>drizzle-kit migrate</code>.</p>
</section>

<!-- §29 SECURITY -->
<section id="s29">
  <div class="section-head">
    <div class="section-num">29</div>
    <div class="section-title">Security Architecture</div>
  </div>
  <div class="pill-grid">
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">Zero trust by default</span>
    <span class="pill" style="border-color:rgba(163,230,53,.3);color:var(--acid)">Least privilege execution</span>
    <span class="pill" style="border-color:rgba(167,139,250,.3);color:var(--purple)">Explicit capability declaration</span>
    <span class="pill" style="border-color:rgba(74,222,128,.3);color:var(--green)">Auditability everywhere</span>
    <span class="pill" style="border-color:rgba(248,113,113,.3);color:var(--red)">Secrets never in logs or events</span>
  </div>
  <p>CI pipeline MUST fail on: high-severity <code>npm audit</code> findings · secrets detected in committed files · <code>tsc --noEmit</code> failure · any security test failure · <code>SECURITY.md</code> absent from project root.</p>
</section>

<!-- §30 APPROVAL -->
<section id="s30">
  <div class="section-head">
    <div class="section-num">30</div>
    <div class="section-title">Approval Infrastructure<span class="section-badge badge-resolved">Resolved</span></div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Scenario</th><th>Default Timeout</th></tr></thead>
      <tbody>
        <tr><td>ApprovalStep (pipeline)</td><td>72 hours</td></tr>
        <tr><td>Deployment approval</td><td>24 hours</td></tr>
        <tr><td>Suspended execution retention</td><td>90 days then auto-CANCEL</td></tr>
      </tbody>
    </table>
  </div>
  <p>On expiry: status → <code>EXPIRED</code>; <code>approval.expired</code> event emitted; pipeline step fails with <code>APPROVAL_EXPIRED</code> error. Webhook notifier fires on new approval request. Built-in Slack/email integrations are ROADMAP v2.</p>
</section>

<!-- §31 DATA MODELS -->
<section id="s31">
  <div class="section-head">
    <div class="section-num">31</div>
    <div class="section-title">Data Models &amp; Schema</div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Table</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td><code>agent_runs</code></td><td>One row per agent invocation</td></tr>
        <tr><td><code>pipeline_runs</code></td><td>One row per pipeline execution</td></tr>
        <tr><td><code>agent_events</code></td><td>Append-only event log</td></tr>
        <tr><td><code>execution_checkpoints</code></td><td>Checkpoint snapshots per step boundary</td></tr>
        <tr><td><code>agent_state</code></td><td>Key-value, scoped by <code>(agentId, key)</code></td></tr>
        <tr><td><code>pipeline_state</code></td><td>Key-value, scoped by <code>(pipelineRunId, key)</code></td></tr>
        <tr><td><code>deployments</code></td><td>Versioned deployment history</td></tr>
        <tr><td><code>approval_requests</code></td><td>Approval lifecycle records</td></tr>
        <tr><td><code>registry_entries</code></td><td>Agent/pipeline registry manifest</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §32 DATABASE -->
<section id="s32">
  <div class="section-head">
    <div class="section-num">32</div>
    <div class="section-title">Database Architecture</div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Environment</th><th>Primary Store</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>Local Dev</td><td>SQLite</td><td>Zero-setup; parity via Drizzle ORM</td></tr>
        <tr><td>Production</td><td>PostgreSQL (Railway)</td><td>Primary production store</td></tr>
        <tr><td>Analytics</td><td>ROADMAP</td><td>Future OLAP layer</td></tr>
      </tbody>
    </table>
  </div>
  <p>All migrations via <code>drizzle-kit generate</code> + <code>drizzle-kit migrate</code>. No raw DDL in application code. <code>NOT NULL</code> columns added in two phases. No <code>DROP COLUMN</code> without deprecation cycle. All foreign keys indexed before migration applies.</p>
</section>

<!-- §33 TELEMETRY -->
<section id="s33">
  <div class="section-head">
    <div class="section-num">33</div>
    <div class="section-title">Logging &amp; Telemetry</div>
  </div>
  <p>OpenTelemetry standard. All instrumentation emits OTel spans. OTLP exporter configurable; dev defaults to console export. All logs structured JSON via <code>pino</code>. No <code>console.log</code> in library code. Correlation ID on every log line in execution context.</p>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Metric</th><th>Type</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>agent_os.execution.duration</code></td><td>Histogram</td><td>Wall time per execution</td></tr>
        <tr><td><code>agent_os.tokens.used</code></td><td>Counter</td><td>Input + output tokens</td></tr>
        <tr><td><code>agent_os.tool.calls</code></td><td>Counter</td><td>Per tool name</td></tr>
        <tr><td><code>agent_os.queue.depth</code></td><td>Gauge</td><td>BullMQ queue length per queue</td></tr>
        <tr><td><code>agent_os.worker.utilization</code></td><td>Gauge</td><td>Active workers / total workers</td></tr>
        <tr><td><code>agent_os.budget.exceeded</code></td><td>Counter</td><td>Budget exceeded events</td></tr>
        <tr><td><code>agent_os.approval.pending</code></td><td>Gauge</td><td>Pending approval requests</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §36 FAULT TOLERANCE -->
<section id="s36">
  <div class="section-head">
    <div class="section-num">36</div>
    <div class="section-title">Fault Tolerance &amp; Retry Systems</div>
  </div>
  <p>Default retry policy applies to <code>ADAPTER_ERROR</code> and <code>TOOL_ERROR</code>. Terminal errors (<code>BUDGET_EXCEEDED</code>, <code>CANCELLATION</code>, <code>VALIDATION_ERROR</code>) are never retried.</p>
  <p><strong>Circuit Breaker:</strong> Each adapter maintains a per-provider circuit breaker. After N consecutive failures within a window, the breaker opens and fails fast with <code>ADAPTER_CIRCUIT_OPEN</code>. Half-opens after configurable recovery window.</p>
  <p><strong>Fault Isolation:</strong> Tool failure → propagates to step (may retry). Step failure → propagates to pipeline run; other pipeline runs unaffected. Worker crash → affected runs marked FAILED; other workers continue; crashed run eligible for checkpoint recovery.</p>
</section>

<!-- §37 PERFORMANCE -->
<section id="s37">
  <div class="section-head">
    <div class="section-num">37</div>
    <div class="section-title">Performance Targets<span class="section-badge badge-corrected">Cold/Warm Split</span></div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Metric</th><th>Target</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>Warm execution overhead</td><td class="s-v1">&lt;100ms</td><td>Module cached; adapter initialized; worker warm</td></tr>
        <tr><td>Cold worker startup</td><td class="s-v1">&lt;2s</td><td>New worker thread spawn + module load</td></tr>
        <tr><td>Queue dispatch latency</td><td class="s-v1">&lt;50ms</td><td>BullMQ enqueue to worker pickup</td></tr>
        <tr><td>Event persistence latency</td><td class="s-v1">&lt;25ms</td><td>PostgreSQL write + ACK</td></tr>
        <tr><td>SSE stream delivery</td><td class="s-v1">&lt;100ms</td><td>Event emitted to client receive</td></tr>
        <tr><td>Dashboard page load</td><td class="s-v1">&lt;500ms</td><td>Initial render</td></tr>
        <tr><td>Resume from checkpoint</td><td class="s-v1">&lt;2s</td><td>Crash recovery path</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §39 TESTING -->
<section id="s39">
  <div class="section-head">
    <div class="section-num">39</div>
    <div class="section-title">Testing Strategy</div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Layer</th><th>Scope</th><th>Tools</th></tr></thead>
      <tbody>
        <tr><td>Unit</td><td>SDK primitives, adapters, type contracts</td><td>Vitest</td></tr>
        <tr><td>Integration</td><td>Pipeline execution, scheduler, checkpoints, retries</td><td>Vitest + test containers</td></tr>
        <tr><td>E2E</td><td>Full deploy flow, CLI commands, dashboard</td><td>Playwright + <code>agos</code> CLI</td></tr>
        <tr><td>Load</td><td>Runtime scalability (500 concurrent target)</td><td>k6 or artillery</td></tr>
        <tr><td>Chaos</td><td>Worker crash recovery, Redis failure, DB unavailable</td><td>Manual + tooling TBD</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §41 ENGINEERING STANDARDS -->
<section id="s41">
  <div class="section-head">
    <div class="section-num">41</div>
    <div class="section-title">Engineering Standards</div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Standard</th><th>Rule</th></tr></thead>
      <tbody>
        <tr><td>TypeScript</td><td><code>strict: true</code>, <code>noUncheckedIndexedAccess: true</code></td></tr>
        <tr><td>No <code>any</code></td><td>Zero in production code; adapter boundary exceptions require justification comment</td></tr>
        <tr><td>No <code>ts-ignore</code></td><td>Forbidden in production code</td></tr>
        <tr><td>esbuild</td><td>Pinned ≤ 0.25.12 via <code>pnpm.overrides</code></td></tr>
        <tr><td>Error handling</td><td>All errors typed; no swallowed exceptions; no empty catch blocks</td></tr>
        <tr><td>Logging</td><td><code>pino</code> only; no <code>console.log</code> in library code</td></tr>
      </tbody>
    </table>
  </div>
  <h3>Feature Status Taxonomy</h3>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
      <tbody>
        <tr><td><span class="s-v1">IMPLEMENTED</span></td><td>Exists in production/runtime code, covered by tests</td></tr>
        <tr><td><span class="s-al">ALPHA</span></td><td>Functional but unstable; not production-safe</td></tr>
        <tr><td><span class="s-rm">ROADMAP</span></td><td>Planned for a future milestone; not implemented</td></tr>
        <tr><td><span class="s-pk">PARKING</span></td><td>Deferred indefinitely; no active plan</td></tr>
        <tr><td>DEPRECATED</td><td>Scheduled for removal; migration path documented</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §44 AUDIT STANDARDS -->
<section id="s44">
  <div class="section-head">
    <div class="section-num">44</div>
    <div class="section-title">Critical Architecture Standards (from Audit)</div>
  </div>
  <div class="callout callout-danger">
    <div class="callout-icon">🔒</div>
    <div class="callout-body"><div class="callout-title">W-01 · HIGH — Client Identity Override</div>Any component using WebSockets MUST validate identity from the JWT exclusively. Client-supplied identity fields are rejected. This finding applies to any future Agent-OS WebSocket features. Block before external beta.</div>
  </div>
  <p><code>SECURITY.md</code> absence fails <code>agos doctor</code> and CI. Any <code>REVISIT_BY</code> date that has passed automatically fails <code>agos doctor</code>. Quarterly manual review of all open findings required.</p>
</section>

<!-- §45 OPEN DECISIONS -->
<section id="s45">
  <div class="section-head">
    <div class="section-num">45</div>
    <div class="section-title">Open Decisions</div>
  </div>
  <div class="od-item">
    <div class="od-header"><span class="od-id">OD-01</span><span class="od-status-open">OPEN</span><span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">Owner: Cloud · Target: M1</span></div>
    <div class="od-question">Remote registry backend</div>
    <div class="od-options">(A) Railway-hosted API · (B) Git-tracked manifest · (C) None — local-only v1 (lean toward C for v1)</div>
  </div>
  <div class="od-item" style="border-color:rgba(74,222,128,.2)">
    <div class="od-header"><span class="od-id">OD-03</span><span class="od-status-res">RESOLVED</span></div>
    <div class="od-question">Dashboard auth beyond bearer token</div>
    <div class="od-options">→ Bearer token v1; OAuth/OIDC v2 ROADMAP</div>
  </div>
  <div class="od-item">
    <div class="od-header"><span class="od-id">OD-04</span><span class="od-status-open">OPEN</span><span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">Owner: Cloud · Target: M2</span></div>
    <div class="od-question">Pipeline graph visualization library</div>
    <div class="od-options">(A) Custom recharts · (B) react-flow — evaluation required at M2 start</div>
  </div>
  <div class="od-item">
    <div class="od-header"><span class="od-id">OD-11</span><span class="od-status-open">OPEN</span><span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">Owner: Cloud · Target: M1</span></div>
    <div class="od-question">LoopStep termination condition</div>
    <div class="od-options">(A) Max iterations only · (B) Max iterations + <code>timeBudgetMs</code> — lean toward B</div>
  </div>
  <div class="od-item">
    <div class="od-header"><span class="od-id">OD-12</span><span class="od-status-open">OPEN</span><span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">Dependent on OD-01</span></div>
    <div class="od-question">Remote registry sync protocol</div>
    <div class="od-options">(A) REST poll · (B) Webhook push · (C) Both</div>
  </div>
</section>

<!-- §46 ROADMAP -->
<section id="s46">
  <div class="section-head">
    <div class="section-num">46</div>
    <div class="section-title">Future Roadmap</div>
  </div>
  <h2>v2 Candidates · ROADMAP</h2>
  <div class="pill-grid">
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">Distributed scheduler</span>
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">Kubernetes operator</span>
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">Reactive agents</span>
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">Long-lived agents</span>
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">pgvector integration</span>
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">Plugin marketplace</span>
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">Visual pipeline editor</span>
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">EventWaitStep</span>
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">Slack + email notifs</span>
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">Remote registry API</span>
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">Advanced RBAC</span>
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">gRPC mesh transport</span>
  </div>
  <h2>v3 Candidates · PARKING</h2>
  <div class="pill-grid">
    <span class="pill" style="border-color:rgba(71,85,105,.5);color:var(--text3)">Edge runtime</span>
    <span class="pill" style="border-color:rgba(71,85,105,.5);color:var(--text3)">Autonomous optimization</span>
    <span class="pill" style="border-color:rgba(71,85,105,.5);color:var(--text3)">Adaptive scheduling</span>
    <span class="pill" style="border-color:rgba(71,85,105,.5);color:var(--text3)">Self-healing orchestration</span>
    <span class="pill" style="border-color:rgba(71,85,105,.5);color:var(--text3)">Hosted SaaS platform</span>
    <span class="pill" style="border-color:rgba(71,85,105,.5);color:var(--text3)">Registry federation</span>
  </div>
</section>

<!-- §47 MILESTONES -->
<section id="s47">
  <div class="section-head">
    <div class="section-num">47</div>
    <div class="section-title">Milestones</div>
  </div>

  <div class="milestone">
    <div class="milestone-head">
      <div class="milestone-id">M0 — Foundation Runtime</div>
      <div class="milestone-weeks">4 WEEKS</div>
    </div>
    <div class="milestone-body">
      <div class="milestone-goal"><strong>Goal:</strong> One agent executes end-to-end with full observability. Runtime scaffolds correctly inside Agi-Suite. Crash recovery works.</div>
      <ul class="checklist">
        <li>Create <code>packages/agent-os/</code> workspace; wire <code>pnpm-workspace.yaml</code></li>
        <li><code>@agent-os/core</code> — all types, <code>BaseAdapter</code>, <code>AgentError</code> union</li>
        <li>All three bundled adapters (anthropic, openai, local)</li>
        <li><code>@agent-os/events</code> — append-only EventStore, five-stage redaction pipeline</li>
        <li><code>@agent-os/scheduler</code> — BullMQ integration, queue definitions</li>
        <li><code>@agent-os/runtime</code> — <code>AgentRunner</code> with worker thread execution</li>
        <li>PostgreSQL Drizzle schema — all tables in §31.5; initial migration</li>
        <li><code>apps/dashboard-server</code> — Express + SSE event stream (live feed only)</li>
        <li><code>SECURITY.md</code> template in project root</li>
        <li>CI baseline — TSC, ESLint, <code>npm audit</code>, secret scan</li>
      </ul>
    </div>
  </div>

  <div class="milestone">
    <div class="milestone-head">
      <div class="milestone-id">M1 — Durable Pipelines + CLI Alpha</div>
      <div class="milestone-weeks">5 WEEKS</div>
    </div>
    <div class="milestone-body">
      <div class="milestone-goal"><strong>Goal:</strong> Pipelines survive restarts. Approvals work. Developer can <code>agos new agent → agos run → agos logs</code>.</div>
      <ul class="checklist">
        <li><code>@agent-os/sdk</code> — <code>defineAgent</code>, <code>defineTool</code>, <code>definePipeline</code>, full <code>AgentContext</code></li>
        <li><code>PipelineEngine</code> — all v1 step types; context propagation; failure semantics</li>
        <li>WAITING state: <code>ApprovalStep</code> + <code>DelayStep</code> — persist, release worker, BullMQ resume</li>
        <li><code>@agent-os/cli</code> (<code>agos</code>) — all commands in §25.1</li>
        <li>Approval API endpoints + dashboard Approvals Queue view</li>
        <li>Resolve OD-11 (LoopStep time budget)</li>
      </ul>
    </div>
  </div>

  <div class="milestone">
    <div class="milestone-head">
      <div class="milestone-id">M2 — Production Deployment + Observability</div>
      <div class="milestone-weeks">4 WEEKS</div>
    </div>
    <div class="milestone-body">
      <div class="milestone-goal"><strong>Goal:</strong> Railway deployment works. Rollback works. OpenTelemetry traces visible. Dashboard useful for debugging.</div>
      <ul class="checklist">
        <li><code>@agent-os/deploy</code> — Local, Railway, Docker targets; <code>--dry-run</code> flag</li>
        <li>Versioned <code>Deployment</code> records; rollback CLI + dashboard button</li>
        <li><code>@agent-os/telemetry</code> — OpenTelemetry integration; all trace boundaries in §33.2</li>
        <li>Dashboard — Deployment view + Approvals view + Agent/Pipeline detail views (§26.5)</li>
        <li>Resolve OD-04 (pipeline graph visualization)</li>
      </ul>
    </div>
  </div>

  <div class="milestone">
    <div class="milestone-head">
      <div class="milestone-id">M3 — Hardening + Production Readiness</div>
      <div class="milestone-weeks">3 WEEKS</div>
    </div>
    <div class="milestone-body">
      <div class="milestone-goal"><strong>Goal:</strong> System tested at scale, security-hardened, and documented. Ready for internal production use within Agi-Suite.</div>
      <ul class="checklist">
        <li>Load tests: 500 concurrent agents target (§38)</li>
        <li>Chaos tests: worker crash recovery, Redis unavailability, PostgreSQL failure modes</li>
        <li>Full security test suite</li>
        <li>E2E: scaffold → define agent → run → checkpoint → crash → resume → observe in dashboard</li>
        <li>JSDoc on all public SDK surfaces; README + Getting Started guide</li>
        <li>Performance profiling against §37 targets; fix regressions</li>
      </ul>
    </div>
  </div>
</section>

<!-- §48 RISKS -->
<section id="s48">
  <div class="section-head">
    <div class="section-num">48</div>
    <div class="section-title">Risks &amp; Constraints</div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Risk</th><th>Impact</th><th>Mitigation</th></tr></thead>
      <tbody>
        <tr><td>Provider API instability</td><td>Adapter maintenance burden</td><td>Versioned adapters; circuit breakers</td></tr>
        <tr><td>BullMQ/Redis operational complexity</td><td>Dev experience friction</td><td><code>agos doctor</code> validates Redis; SQLite-mode for local dev</td></tr>
        <tr><td>Worker thread serialization overhead</td><td>Checkpoint write latency</td><td>Profile at M3; optimize if &gt;25ms</td></tr>
        <tr><td>Streaming complexity</td><td>Orchestration instability</td><td>SSE reconnect + <code>Last-Event-ID</code> required; tested at M3</td></tr>
        <tr><td>Unbounded token usage</td><td>Infrastructure cost</td><td>Hard budget enforcement (§22); unlimited budget rejected at deploy</td></tr>
        <tr><td>Railway credential exposure</td><td>Security incident</td><td>Rotation protocol; secrets never in code or event store</td></tr>
        <tr><td>Failed production migration</td><td>Data loss / downtime</td><td>Pre-migration backup required; forward-only schema policy</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §49 SUCCESS METRICS -->
<section id="s49">
  <div class="section-head">
    <div class="section-num">49</div>
    <div class="section-title">Success Metrics</div>
  </div>
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Metric</th><th>Target</th><th>Measurement</th></tr></thead>
      <tbody>
        <tr><td>Time to first agent running locally</td><td class="s-v1">&lt;10 min</td><td>Measured from <code>agos init</code> to first <code>execution.completed</code> event</td></tr>
        <tr><td>Time to first Railway deployment</td><td class="s-v1">&lt;30 min</td><td>From configured credentials to health probe passing</td></tr>
        <tr><td>Deployment rollback success rate</td><td class="s-v1">100%</td><td>CI-validated; fails if rollback leaves health probe failing</td></tr>
        <tr><td>Checkpoint recovery rate</td><td class="s-v1">≥99.9%</td><td>Recoveries attempted vs. succeeded after crash simulation</td></tr>
        <tr><td>Event persistence reliability</td><td class="s-v1">≥99.99%</td><td>Events emitted vs. successfully persisted</td></tr>
        <tr><td>Trace completeness</td><td class="s-v1">100%</td><td>All executions have a root span — validated in integration tests</td></tr>
        <tr><td>Secret redaction coverage</td><td class="s-v1">Zero leaks</td><td>Zero API key patterns in event store — automated scan per integration test run</td></tr>
        <tr><td>TSC strict errors</td><td class="s-v1">0</td><td>CI gate — blocks merge</td></tr>
        <tr><td>Explicit <code>any</code> escapes</td><td class="s-v1">0</td><td>ESLint <code>no-explicit-any</code> — CI gate</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- §50 FINAL PRINCIPLES -->
<section id="s50">
  <div class="section-head">
    <div class="section-num">50</div>
    <div class="section-title">Final Technical Principles</div>
  </div>
  <div class="pill-grid" style="margin-bottom:24px">
    <span class="pill" style="border-color:rgba(0,245,255,.3);color:var(--neon)">Infrastructure-first</span>
    <span class="pill" style="border-color:rgba(163,230,53,.3);color:var(--acid)">Deterministic</span>
    <span class="pill" style="border-color:rgba(167,139,250,.3);color:var(--purple)">Typed</span>
    <span class="pill" style="border-color:rgba(74,222,128,.3);color:var(--green)">Observable</span>
    <span class="pill" style="border-color:rgba(96,165,250,.3);color:var(--blue)">Composable</span>
    <span class="pill" style="border-color:rgba(251,191,36,.3);color:var(--amber)">Provider-agnostic</span>
    <span class="pill" style="border-color:rgba(248,113,113,.3);color:var(--red)">Production-oriented</span>
    <span class="pill" style="border-color:rgba(244,114,182,.3);color:var(--pink)">Extensible</span>
  </div>
  <blockquote>
    <strong>Axiom</strong>
    The runtime favors: explicitness over magic · safety over convenience · composability over rigidity · introspection over opacity · architecture over hype.
    <br/><br/>
    Agent-OS is not a thin wrapper around LLM APIs. It is a runtime operating system for autonomous computation. The objective is to provide deterministic orchestration, operational governance, deployment infrastructure, observability, runtime guarantees, and scalable execution semantics for the next generation of AI-native software systems. That requires engineering discipline equal to modern cloud infrastructure platforms.
  </blockquote>

  <div class="doc-footer">
    <div>Agent-OS PRD v3.1.0 — Authoritative Draft</div>
    <div style="margin-top:8px;opacity:.5">All architecture decisions integrated · 12 Open Decisions resolved · 3 open · §26 UI Specification added in v3.1</div>
    <div style="margin-top:8px;opacity:.3">Agi-Suite Monorepo · ~/Agi-Suite · Author: Cloud · 2026-05-24</div>
  </div>
</section>

</main>
</div>

<script>
const items=document.querySelectorAll('.nav-item');
const sections=document.querySelectorAll('section[id]');
const obs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      items.forEach(i=>i.classList.remove('active'));
      const a=document.querySelector(`.nav-item[href="#${e.target.id}"]`);
      if(a){a.classList.add('active');a.scrollIntoView({block:'nearest'})}
    }
  });
},{rootMargin:'-20% 0px -70% 0px'});
sections.forEach(s=>obs.observe(s));
</script>
</body>
</html>
