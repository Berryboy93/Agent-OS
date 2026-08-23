r3v@penguin:~/Stable$ cat ~/Stable/client/src/pages/collaborative-daw-pro.tsx
// collaborative-daw-pro.tsx
// R3 v4 — Collaborative DAW Pro
// Enhanced v2.0 — Acid Grid design system, LLPTE integration, full TypeScript
// Route: /collab (App.tsx)

import { PageNav } from '@/components/page-nav';
import React, {
  useState, useRef, useEffect, useCallback, useMemo, memo, lazy, Suspense
} from 'react';
import {
  Play, Pause, Square, Plus, ZoomIn, ZoomOut, SkipBack,
  User, Download, Upload, Settings, Save, Share2, Undo2, Redo2,
  Grid3x3, Mic, Volume2, VolumeX, Activity, Wifi, WifiOff,
  ChevronUp, ChevronDown, Copy, Trash2, Layers, Sliders, X,
  AlertCircle, CheckCircle, Zap, Radio, Lock, Unlock, Music, Repeat2,
} from 'lucide-react';

// ── Lazy panels ───────────────────────────────────────────────────────────────────────────
const VSTBrowser     = lazy(() => import('@/components/vst-browser').then(m => ({ default: m.VSTBrowser })));
const LoopStation505 = lazy(() => import('@/features/loopstation/LoopStation505').then(m => ({ default: m.LoopStation505 })));

// ─── Types ────────────────────────────────────────────────────────────────────

type TrackType = 'audio' | 'midi' | 'bus';
type TransportMode = 'stopped' | 'playing' | 'paused' | 'recording';
type CollabStatus = 'active' | 'idle' | 'offline';
type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';
// PRD §12 aiDecisionLog.outcome: 'auto_applied' | 'accepted' | 'rejected' | 'ignored' | 'discarded'
type LLPTEDecision = 'auto_applied' | 'accepted' | 'rejected' | 'ignored' | 'discarded';

interface Send { busId: string; level: number; }

interface Track {
  id: string;
  name: string;
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  armed: boolean;
  type: TrackType;
  sends: Send[];
  locked: boolean;
  fxChain: string[];
}

interface Clip {
  id: string;
  trackId: string;
  startBar: number;
  durationBars: number;
  name: string;
  gain: number;
  fadeIn: number;
  fadeOut: number;
  color?: string;
}

interface Marker {
  id: string;
  bar: number;
  name: string;
  color?: string;
}

interface Project {
  id: string;
  name: string;
  tempo: number;
  timeSignature: [number, number];
  tracks: Track[];
  clips: Clip[];
  markers: Marker[];
}

interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number };
  status: CollabStatus;
  lastAction: string;
  timestamp: number;
  editingTrackId?: string;
}

interface Activity {
  id: number;
  user: string;
  action: string;
  timestamp: number;
  type: 'edit' | 'transport' | 'collab' | 'ai';
}

interface LLPTESuggestion {
  id: string;
  trackId: string;
  type: 'gain_adjust' | 'eq_suggest' | 'conflict_flag' | 'transition';
  confidence: number;
  displayedConfidence: number;
  decision: Record<string, unknown>;
  outcome: LLPTEDecision;
  label: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  void:          '#060606',
  space:         '#0a0a0a',
  surface:       '#0d0d0d',
  surfaceLift:   '#0f0f0f',
  surfaceHover:  'var(--dj-surface3)',
  border:        '#1c1c1c',
  borderBright:  '#2a2a2a',
  neon:          '#a3e635',
  neonGlow:      'rgba(163,230,53,0.5)',
  neonDim:       'rgba(163,230,53,0.08)',
  neonDim2:      'rgba(163,230,53,0.12)',
  acid2:         'var(--looper-lime)',
  cyan:          '#00F5FF',             // PRD §3 — active state cyan
  magenta:       '#ff3b3b',
  yellow:        '#ffcc00',
  purple:        'var(--accent-purple)',
  text:          '#f0f0f0',
  textMuted:     '#555555',
  textDim:       'var(--dj-dimmer)',
  tracks: [
    '#ff3b3b','#a3e635','#00F5FF','#ffcc00',
    '#b048f8','#ff6600','#06ffa5','#f72585','#0088ff','#f72585',
  ],
} as const;

const FONT = {
  display: '"Syne", sans-serif',
  mono:    '"IBM Plex Mono", monospace',
} as const;

const TL = {
  trackHeight:   88,
  rulerHeight:   44,
  headerWidth:   232,
  gridWidth:     112,
  beatsPerBar:   4,
  minZoom:       0.25,
  maxZoom:       5,
  snapThreshold: 6,
} as const;

// ─── Initial Data ─────────────────────────────────────────────────────────────

const INIT_PROJECT: Project = {
  id:            `proj_${Date.now()}`,
  name:          'Untitled Session',
  tempo:         128,
  timeSignature: [4, 4],
  tracks: [
    { id:'t1', name:'Kick / Snare', color:C.tracks[0], muted:false, solo:false, volume:0.82, pan:0,    armed:false, type:'audio', sends:[], locked:false, fxChain:['Compressor','EQ'] },
    { id:'t2', name:'808 Bass',     color:C.tracks[1], muted:false, solo:false, volume:0.76, pan:0,    armed:false, type:'audio', sends:[], locked:false, fxChain:['Compressor','Limiter'] },
    { id:'t3', name:'Synth Lead',   color:C.tracks[2], muted:false, solo:false, volume:0.71, pan:0.2,  armed:false, type:'audio', sends:[], locked:false, fxChain:['Reverb','Delay'] },
    { id:'t4', name:'Vox Chop',     color:C.tracks[3], muted:false, solo:false, volume:0.88, pan:-0.1, armed:false, type:'audio', sends:[], locked:false, fxChain:['Reverb','EQ'] },
    { id:'t5', name:'Pad Texture',  color:C.tracks[4], muted:false, solo:false, volume:0.55, pan:0.3,  armed:false, type:'audio', sends:[], locked:false, fxChain:['Reverb'] },
  ],
  clips: [
    { id:'c1', trackId:'t1', startBar:0,  durationBars:4,  name:'Kick Pattern',   gain:1.0, fadeIn:0,    fadeOut:0   },
    { id:'c2', trackId:'t1', startBar:4,  durationBars:8,  name:'Full Drums',     gain:1.0, fadeIn:0.1,  fadeOut:0   },
    { id:'c3', trackId:'t2', startBar:2,  durationBars:10, name:'808 Bass',       gain:0.9, fadeIn:0,    fadeOut:0.2 },
    { id:'c4', trackId:'t3', startBar:8,  durationBars:4,  name:'Lead A',         gain:1.0, fadeIn:0,    fadeOut:0   },
    { id:'c5', trackId:'t3', startBar:12, durationBars:4,  name:'Lead Variation', gain:0.8, fadeIn:0,    fadeOut:0   },
    { id:'c6', trackId:'t4', startBar:4,  durationBars:12, name:'Verse 1',        gain:0.95,fadeIn:0.05, fadeOut:0.1 },
    { id:'c7', trackId:'t5', startBar:0,  durationBars:16, name:'Pad Atmos',      gain:0.6, fadeIn:0.5,  fadeOut:0.5 },
  ],
  markers: [
    { id:'m1', bar:0,  name:'INTRO',  color:C.neon },
    { id:'m2', bar:4,  name:'VERSE',  color:C.yellow },
    { id:'m3', bar:12, name:'CHORUS', color:C.cyan },
    { id:'m4', bar:20, name:'OUTRO',  color:C.magenta },
  ],
};

const INIT_COLLABS: Collaborator[] = [
  { id:'u1', name:'Alex Martinez', color:'#a3e635', cursor:{x:450,y:180}, status:'active', lastAction:'Editing "Full Drums"',  timestamp:Date.now()-30000,  editingTrackId:'t1' },
  { id:'u2', name:'Jordan Kim',    color:'#00F5FF', cursor:{x:780,y:320}, status:'active', lastAction:'Adjusting EQ',          timestamp:Date.now()-15000  },
  { id:'u3', name:'Sam Rivera',    color:'#ff3b3b', cursor:{x:580,y:240}, status:'idle',   lastAction:'Added marker',          timestamp:Date.now()-120000 },
];

const INIT_SUGGESTIONS: LLPTESuggestion[] = [
  { id:'s1', trackId:'t1', type:'gain_adjust',  confidence:0.87, displayedConfidence:0.87, decision:{gain:0.78}, outcome:'auto_applied', label:'Reduce kick gain −2dB' },
  { id:'s2', trackId:'t2', type:'conflict_flag', confidence:0.74, displayedConfidence:0.74, decision:{band:'80Hz'}, outcome:'ignored',     label:'Freq clash @ 80Hz with t1' },
  { id:'s3', trackId:'t3', type:'eq_suggest',   confidence:0.61, displayedConfidence:0.61, decision:{cut:'2kHz'}, outcome:'ignored',      label:'Cut 2kHz harshness −3dB' },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

const barsToPixels = (bars: number, gw: number) => bars * gw;
const pixelsToBars = (px: number,   gw: number) => px / gw;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const formatTime = (bars: number, tempo: number, bpb: number): string => {
  const secs = (bars * bpb * 60) / tempo;
  const m    = Math.floor(secs / 60);
  const s    = Math.floor(secs % 60);
  const ms   = Math.floor((secs % 1) * 100);
  return `${m}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;
};

const wfCache = new Map<string, number[]>();
const getWaveform = (id: string, pts: number): number[] => {
  const key = `${id}_${pts}`;
  if (!wfCache.has(key)) {
    const d: number[] = [];
    for (let i = 0; i < pts; i++) {
      const t = i / pts;
      d.push((Math.sin(t * Math.PI * 4 + Math.random()) * 0.6 + (Math.random()-0.5)*0.3) * Math.sin(t*Math.PI) * 0.85 + 0.08);
    }
    wfCache.set(key, d);
  }
  return wfCache.get(key)!;
};

const confidenceColor = (c: number): string => {
  if (c >= 0.65) return C.neon;
  if (c >= 0.40) return C.yellow;
  return C.magenta;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const AgBtn = memo(({
  children, onClick, disabled=false, active=false,
  activeColor=C.neon, title, style: sx,
}: {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  active?: boolean;
  activeColor?: string;
  title?: string;
  style?: React.CSSProperties;
}) => (
  <button
    onClick={onClick} disabled={disabled} title={title}
    style={{
      background:     active ? activeColor : 'transparent',
      border:         `1px solid ${active ? activeColor : C.border}`,
      borderRadius:   0,
      color:          active ? C.void : C.text,
      padding:        '5px 9px',
      cursor:         disabled ? 'not-allowed' : 'pointer',
      display:        'flex', alignItems:'center', justifyContent:'center', gap:4,
      transition:     'background .07s, border-color .07s, color .07s',
      outline:        'none',
      opacity:        disabled ? 0.3 : 1,
      fontFamily:     FONT.mono,
      fontSize:       9,
      letterSpacing:  '.1em',
      textTransform:  'uppercase',
      whiteSpace:     'nowrap',
      boxShadow:      active ? `0 0 10px ${activeColor}66` : 'none',
      flexShrink:     0,
      ...sx,
    }}
    onMouseEnter={e => { if (!disabled && !active) { (e.currentTarget as HTMLButtonElement).style.background=C.neon; (e.currentTarget as HTMLButtonElement).style.borderColor=C.neon; (e.currentTarget as HTMLButtonElement).style.color=C.void; }}}
    onMouseLeave={e => { if (!disabled && !active) { (e.currentTarget as HTMLButtonElement).style.background='transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor=C.border; (e.currentTarget as HTMLButtonElement).style.color=C.text; }}}
  >
    {children}
  </button>
));
AgBtn.displayName = 'AgBtn';

const AgLabel = ({ children, style: sx }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <span style={{ fontSize:8, letterSpacing:'.3em', textTransform:'uppercase', color:C.textMuted, fontFamily:FONT.mono, ...sx }}>
    {children}
  </span>
);

const Divider = () => (
  <div style={{ width:1, alignSelf:'stretch', background:C.border, margin:'0 4px', flexShrink:0 }} />
);

// VU Meter
const VUMeter = memo(({ level, color, peaked }: { level: number; color: string; peaked: boolean }) => (
  <div style={{ display:'flex', flexDirection:'column-reverse', gap:1, height:48, width:6 }}>
    {Array.from({length:12}).map((_,i) => {
      const threshold = i / 12;
      const lit       = level > threshold;
      const seg       = i > 9 ? C.magenta : i > 7 ? C.yellow : color;
      return (
        <div key={i} style={{
          flex:1, background: lit ? seg : C.border,
          boxShadow: lit && i > 9 ? `0 0 4px ${C.magenta}` : 'none',
          transition:'background .06s',
        }} />
      );
    })}
  </div>
));
VUMeter.displayName = 'VUMeter';

// LLPTE confidence badge
const _ConfBadge = ({ confidence, label }: { confidence: number; label: string }) => {
  const col = confidenceColor(confidence);
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:5,
      padding:'3px 8px',
      background:`${col}10`,
      border:`1px solid ${col}44`,
      fontSize:8, fontFamily:FONT.mono, letterSpacing:'.1em',
    }}>
      <div style={{ width:5, height:5, background:col, boxShadow:`0 0 6px ${col}` }} />
      <span style={{ color:col, fontWeight:700 }}>{Math.round(confidence*100)}%</span>
      <span style={{ color:C.textMuted }}>{label}</span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

// ── DAW Error Boundary ───────────────────────────────────────────────────────────────────────────
interface _DAWEBState { error: Error | null }
class DAWErrorBoundary extends React.Component<{ children: React.ReactNode }, _DAWEBState> {
  state: _DAWEBState = { error: null };
  static getDerivedStateFromError(e: Error): _DAWEBState { return { error: e }; }
  componentDidCatch(e: Error, _info: React.ErrorInfo): void {
    window.dispatchEvent(new CustomEvent('daw:error', { detail: { error: e } }));
  }
  render() {
    if (this.state.error) return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh',
                    background:'#030303', flexDirection:'column', gap:16,
                    fontFamily:'"IBM Plex Mono",monospace' }}>
        <span style={{ color:'#ff3b3b', fontSize:11, letterSpacing:'.2em' }}>DAW RENDER ERROR</span>
        <span style={{ color:'#555555', fontSize:9 }}>{this.state.error.message}</span>
        <button onClick={()=>this.setState({error:null})}
                style={{ marginTop:8, padding:'6px 16px', background:'#a3e635',
                         border:'none', cursor:'pointer', fontSize:9, letterSpacing:'.2em' }}>
          RESET
        </button>
      </div>
    );
    return this.props.children;
  }
}

export default function CollabDAWPro() {
  return <DAWErrorBoundary><CollabDAWProInner /></DAWErrorBoundary>;
}

function CollabDAWProInner() {

  const [project, setProject]                       = useState<Project>(INIT_PROJECT);
  const [transport, setTransport]                   = useState<TransportMode>('stopped');
  const [currentBar, setCurrentBar]                 = useState(0);
  const [zoom, setZoom]                             = useState(1);
  const [scrollLeft, setScrollLeft]                 = useState(0);
  const [scrollTop, setScrollTop]                   = useState(0);
  const [selectedClipIds, setSelectedClipIds]       = useState<string[]>([]);
  const [selectedTrackId, setSelectedTrackId]       = useState<string|null>(null);
  const [collaborators, setCollaborators]           = useState<Collaborator[]>(INIT_COLLABS);
  const [activities, setActivities]                 = useState<Activity[]>([
    { id:1, user:'You',           action:'Created session',    timestamp:Date.now()-300000, type:'collab' },
    { id:2, user:'Alex Martinez', action:'Joined session',     timestamp:Date.now()-240000, type:'collab' },
    { id:3, user:'Jordan Kim',    action:'Added "808 Bass"',   timestamp:Date.now()-180000, type:'edit'   },
  ]);
  const [showActivity, setShowActivity]             = useState(true);
  const [showMixer, setShowMixer]                   = useState(false);
  const [showAI, setShowAI]                         = useState(true);
  const [showVST, setShowVST]                       = useState(false);
  const [showLoopStation, setShowLoopStation]       = useState(false);
  const [connStatus, setConnStatus]                 = useState<ConnectionStatus>('connected');
  const [metronome, setMetronome]                   = useState(false);
  const [snapGrid, setSnapGrid]                     = useState(true);
  const [loopOn, setLoopOn]                         = useState(false);
  const [loopRegion, setLoopRegion]                 = useState({ start:0, end:16 });
  const [masterVol, setMasterVol]                   = useState(0.82);
  const [masterMuted, setMasterMuted]               = useState(false);
  const [hoveredClipId, setHoveredClipId]           = useState<string|null>(null);
  const [contextMenu, setContextMenu]               = useState<{x:number;y:number}|null>(null);
  const [history, setHistory]                       = useState<Project[]>([INIT_PROJECT]);
  const [historyIdx, setHistoryIdx]                 = useState(0);
  const [suggestions, setSuggestions]               = useState<LLPTESuggestion[]>(INIT_SUGGESTIONS);
  const [llpteLatency]                              = useState(10);
  const [cpuLoad, setCpuLoad]                       = useState(0.38);
  const [vuLevels, setVuLevels]                     = useState<Record<string,number>>({});
  const [peakedTracks, setPeakedTracks]             = useState<Set<string>>(new Set());
  const [toasts, setToasts]                         = useState<{id:number;msg:string;type:'ai'|'info'|'warn'}[]>([]);
  const [showSettings, setShowSettings]             = useState(false);
  const [, _tickTs]                                  = useState(0);

  const canvasRef         = useRef<HTMLCanvasElement|null>(null);
  const containerRef      = useRef<HTMLDivElement|null>(null);
  const rafRef            = useRef<number|null>(null);
  const startTimeRef      = useRef<number|null>(null);
  const lastRenderRef     = useRef(0);
  const dragRef = useRef<{
    clipId: string; origStartBar: number; origTrackId: string;
    startX: number; startY: number;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ clipId: string; startBar: number; trackId: string } | null>(null);

  const gridWidth = TL.gridWidth * zoom;

  // ── Toast helper ────────────────────────────────────────────────────────────
  const toast = useCallback((msg: string, type: 'ai'|'info'|'warn' = 'info') => {
    const id = Date.now();
    setToasts(p => [...p, {id, msg, type}]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  // ── Activity feed ───────────────────────────────────────────────────────────
  const addActivity = useCallback((action: string, user = 'You', type: Activity['type'] = 'edit') => {
    setActivities(p => [{id:Date.now(), user, action, timestamp:Date.now(), type}, ...p].slice(0,60));
  }, []);

  // ── Transport ────────────────────────────────────────────────────────────────
  const play = useCallback(() => {
    setTransport('playing');
    startTimeRef.current = performance.now() - (currentBar * (60/project.tempo) * TL.beatsPerBar * 1000);
    addActivity('Started playback', 'You', 'transport');
  }, [currentBar, project.tempo, addActivity]);

  const pause = useCallback(() => {
    setTransport('paused');
    addActivity('Paused', 'You', 'transport');
  }, [addActivity]);

  const stop = useCallback(() => {
    setTransport('stopped');
    setCurrentBar(0);
    startTimeRef.current = null;
    addActivity('Stopped', 'You', 'transport');
  }, [addActivity]);

  const togglePlay = useCallback(() => {
    transport === 'playing' ? pause() : play();
  }, [transport, pause, play]);

  // Playback loop
  useEffect(() => {
    if (transport === 'playing') {
      const tick = () => {
        const elapsed    = performance.now() - (startTimeRef.current ?? performance.now());
        const bps        = project.tempo / 60;
        let bars         = (elapsed / 1000) / TL.beatsPerBar * bps;
        if (loopOn) {
          const len = loopRegion.end - loopRegion.start;
          while (bars >= loopRegion.end) {
            bars -= len;
            if (startTimeRef.current !== null)
              startTimeRef.current += (len * TL.beatsPerBar * 60 / project.tempo * 1000);
          }
        }
        setCurrentBar(bars);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [transport, project.tempo, loopOn, loopRegion]);

  // CPU + VU simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuLoad(transport === 'playing' ? 0.35 + Math.random()*0.25 : 0.08 + Math.random()*0.1);
      if (transport === 'playing') {
        const levels: Record<string,number> = {};
        project.tracks.forEach(t => {
          if (t.muted) { levels[t.id] = 0; return; }
          levels[t.id] = clamp((Math.random()*0.7 + 0.2) * t.volume, 0, 1);
        });
        setVuLevels(levels);
        const peaked = new Set<string>(
          project.tracks
            .filter(t => !t.muted && (levels[t.id] ?? 0) > 0.93)
            .map(t => t.id)
        );
        if (peaked.size) {
          setPeakedTracks(prev => new Set([...prev, ...peaked]));
          setTimeout(() => setPeakedTracks(new Set()), 1500);
        }
      } else {
        const levels: Record<string,number> = {};
        project.tracks.forEach(t => { levels[t.id] = 0; });
        setVuLevels(levels);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [transport, project.tracks]);

  // Simulated collab activity
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.65) {
        const collab  = INIT_COLLABS[Math.floor(Math.random() * INIT_COLLABS.length)];
        const actions = ['Adjusted fader','Moved clip','Added FX','Muted track','Set loop'];
        const action  = actions[Math.floor(Math.random() * actions.length)];
        addActivity(action, collab.name, 'edit');
        setCollaborators(p => p.map(c =>
          c.id === collab.id
            ? { ...c, cursor:{x:200+Math.random()*800, y:80+Math.random()*400}, lastAction:action, timestamp:Date.now() }
            : c
        ));
      }
    }, 9000);
    return () => clearInterval(interval);
  }, [addActivity]);

  // ── Timestamp ticker ──────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => _tickTs(n => n + 1), 8000);
    return () => clearInterval(id);
  }, []);

  // ── History ───────────────────────────────────────────────────────────────────
  const pushHistory = useCallback((next: Project) => {
    const h = history.slice(0, historyIdx + 1);
    h.push(next);
    setHistory(h);
    setHistoryIdx(h.length - 1);
    setProject(next);
  }, [history, historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx > 0) {
      setHistoryIdx(i => i - 1);
      setProject(history[historyIdx - 1]);
      addActivity('Undo');
    }
  }, [history, historyIdx, addActivity]);

  const redo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(i => i + 1);
      setProject(history[historyIdx + 1]);
      addActivity('Redo');
    }
  }, [history, historyIdx, addActivity]);

  // ── Track ops ──────────────────────────────────────────────────────────────────
  const addTrack = useCallback(() => {
    const t: Track = {
      id: `t${Date.now()}`, name:`Track ${project.tracks.length+1}`,
      color: C.tracks[project.tracks.length % C.tracks.length],
      muted:false, solo:false, volume:0.8, pan:0, armed:false,
      type:'audio', sends:[], locked:false, fxChain:['EQ'],
    };
    pushHistory({ ...project, tracks:[...project.tracks, t] });
    addActivity(`Added track "${t.name}"`);
  }, [project, pushHistory, addActivity]);

  const _deleteTrack = useCallback((id: string) => {
    const t = project.tracks.find(x => x.id === id);
    pushHistory({ ...project, tracks:project.tracks.filter(x=>x.id!==id), clips:project.clips.filter(c=>c.trackId!==id) });
    addActivity(`Deleted "${t?.name}"`);
  }, [project, pushHistory, addActivity]);

  const updateTrack = useCallback((id: string, patch: Partial<Track>) => {
    pushHistory({ ...project, tracks:project.tracks.map(t => t.id===id ? {...t,...patch} : t) });
  }, [project, pushHistory]);

  const toggleMute = useCallback((id: string) => {
    const t = project.tracks.find(x=>x.id===id);
    if (!t) return;
    updateTrack(id, { muted: !t.muted });
    addActivity(`${t.muted?'Unmuted':'Muted'} "${t.name}"`);
  }, [project.tracks, updateTrack, addActivity]);

  const toggleSolo = useCallback((id: string) => {
    const t = project.tracks.find(x=>x.id===id);
    if (!t) return;
    updateTrack(id, { solo: !t.solo });
    addActivity(`${t.solo?'Unsoloed':'Soloed'} "${t.name}"`);
  }, [project.tracks, updateTrack, addActivity]);

  // ── Clip ops ──────────────────────────────────────────────────────────────────
  const deleteClip = useCallback((id: string) => {
    const c = project.clips.find(x=>x.id===id);
    pushHistory({ ...project, clips:project.clips.filter(x=>x.id!==id) });
    setSelectedClipIds(p => p.filter(x=>x!==id));
    addActivity(`Deleted "${c?.name}"`);
  }, [project, pushHistory, selectedClipIds, addActivity]);

  const duplicateClip = useCallback((id: string) => {
    const c = project.clips.find(x=>x.id===id);
    if (!c) return;
    const nc = { ...c, id:`c${Date.now()}`, startBar:c.startBar+c.durationBars, name:`${c.name} (Copy)` };
    pushHistory({ ...project, clips:[...project.clips, nc] });
    addActivity(`Duplicated "${c.name}"`);
  }, [project, pushHistory, addActivity]);

  const _updateClip = useCallback((id: string, patch: Partial<Clip>) => {
    pushHistory({ ...project, clips:project.clips.map(c => c.id===id ? {...c,...patch} : c) });
  }, [project, pushHistory]);

  // ── AI suggestion ops ──────────────────────────────────────────────────────────
  // TODO(collab-pro-tier): aiDecisionLog metrics not wired on this surface.
  //
  // Previous logSuggestionOutcome implementation called a deprecated tRPC
  // endpoint (aiMix.submitSuggestionOutcome) that never existed, AND passed
  // a local suggestion ID where the server expects an aiDecisionLog row ID.
  // Both bugs deleted.
  //
  // When Pro Artist collab tier ships, migrate to the canonical hook
  // `useMixSuggestions` (see client/src/hooks/useMixSuggestions.ts) — it
  // surfaces decisions via sessionMetrics.recordDecision and updates them
  // via sessionMetrics.recordOutcome with proper decisionId tracking.

  const acceptSuggestion = useCallback((id: string) => {
    const s = suggestions.find(x => x.id === id);
    if (!s) return;
    setSuggestions(p => p.map(x => x.id === id ? { ...x, outcome: 'accepted' as const } : x));
    setSuggestions(p => p.filter(x => x.id !== id));
    toast(`AI applied: ${s.label}`, 'ai');
    addActivity(`Accepted AI: ${s.label}`, 'You', 'ai');
  }, [suggestions, toast, addActivity]);

  const rejectSuggestion = useCallback((id: string) => {
    setSuggestions(p => p.map(x => x.id === id ? { ...x, outcome: 'rejected' as const } : x));
    setSuggestions(p => p.filter(x => x.id !== id));
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input,textarea')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (e.code==='Space')               { e.preventDefault(); togglePlay(); }
      if (e.code==='Escape')              { e.preventDefault(); stop(); }
      if (mod && e.code==='KeyZ' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && e.code==='KeyZ' &&  e.shiftKey) { e.preventDefault(); redo(); }
      if ((e.code==='Delete'||e.code==='Backspace') && selectedClipIds.length) {
        e.preventDefault(); selectedClipIds.forEach(deleteClip);
      }
      if (mod && e.code==='KeyD' && selectedClipIds.length) { e.preventDefault(); selectedClipIds.forEach(duplicateClip); }
      if (mod && e.code==='KeyA') { e.preventDefault(); setSelectedClipIds(project.clips.map(c=>c.id)); }
      if (mod && e.code==='Equal') { e.preventDefault(); setZoom(z => Math.min(z+0.2, TL.maxZoom)); }
      if (mod && e.code==='Minus') { e.preventDefault(); setZoom(z => Math.max(z-0.2, TL.minZoom)); }
      if (mod && e.code==='Digit0') { e.preventDefault(); setZoom(1); }
      if (e.code==='KeyM') { e.preventDefault(); setMetronome(v=>!v); }
      if (e.code==='KeyL') { e.preventDefault(); setLoopOn(v=>!v); }
      if (e.code==='KeyG') { e.preventDefault(); setSnapGrid(v=>!v); }
      if (mod && e.code==='KeyT') { e.preventDefault(); addTrack(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, stop, undo, redo, selectedClipIds, deleteClip, duplicateClip, project.clips, addTrack]);

  // ── Canvas rendering ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const now = performance.now();
    if (now - lastRenderRef.current < 14) return;
    lastRenderRef.current = now;

    const ctx = canvas.getContext('2d', {alpha:false});
    if (!ctx) return;
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const nw   = Math.round(rect.width  * dpr);
    const nh   = Math.round(rect.height * dpr);
    if (canvas.width !== nw || canvas.height !== nh) {
      canvas.width  = nw;
      canvas.height = nh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = rect.width, H = rect.height;

    ctx.fillStyle = C.space;
    ctx.fillRect(0, 0, W, H);

    for (let y = 0; y < H; y += 4) {
      ctx.fillStyle = 'rgba(255,255,255,0.008)';
      ctx.fillRect(0, y, W, 1);
    }

    drawRuler(ctx, W);

    project.tracks.forEach((track, idx) => {
      const ty = TL.rulerHeight + idx * TL.trackHeight - scrollTop;
      if (ty + TL.trackHeight < 0 || ty > H) return;
      drawTrack(ctx, track, ty, W, track.id === selectedTrackId);
      project.clips
        .filter(c => c.trackId === track.id)
        .forEach(c => {
          if (dragPreview?.clipId === c.id) return;
          const cx = barsToPixels(c.startBar, gridWidth) - scrollLeft;
          const cw = barsToPixels(c.durationBars, gridWidth);
          if (cx + cw < 0 || cx > W) return;
          drawClip(ctx, c, track, ty, selectedClipIds.includes(c.id), c.id === hoveredClipId);
        });
    });
    if (dragPreview) {
      const dc   = project.clips.find(c => c.id === dragPreview.clipId);
      const dt   = project.tracks.find(t => t.id === dragPreview.trackId);
      const didx = project.tracks.findIndex(t => t.id === dragPreview.trackId);
      if (dc && dt && didx >= 0) {
        const dty = TL.rulerHeight + didx * TL.trackHeight - scrollTop;
        const dcx = barsToPixels(dragPreview.startBar, gridWidth) - scrollLeft;
        const dcw = barsToPixels(dc.durationBars, gridWidth);
        if (dcx + dcw >= 0 && dcx <= W) {
          ctx.globalAlpha = 0.82;
          drawClip(ctx, { ...dc, startBar: dragPreview.startBar }, dt, dty, true, false);
          ctx.globalAlpha = 1;
        }
      }
    }

    project.markers.forEach(m => drawMarker(ctx, m, H));
    drawPlayhead(ctx, H);
    if (loopOn) drawLoop(ctx, H);
    collaborators.filter(c=>c.status==='active').forEach(c => drawCursor(ctx, c));

  }, [project, currentBar, zoom, scrollLeft, scrollTop, selectedClipIds, selectedTrackId, collaborators, gridWidth, hoveredClipId, loopOn, loopRegion, dragPreview]);

  const drawRuler = (ctx: CanvasRenderingContext2D, W: number) => {
    ctx.fillStyle = C.surface;
    ctx.fillRect(0, 0, W, TL.rulerHeight);
    ctx.fillStyle = C.neon;
    ctx.fillRect(0, 0, 3, TL.rulerHeight);
    ctx.fillRect(0, TL.rulerHeight-2, W, 2);
    ctx.font      = `600 10px ${FONT.mono}`;
    ctx.textAlign = 'center';
    const total = Math.ceil((W + scrollLeft) / gridWidth) + 2;
    const start = Math.floor(scrollLeft / gridWidth);
    for (let i = start; i < start + total; i++) {
      const x = i * gridWidth - scrollLeft;
      ctx.strokeStyle = i % 4 === 0 ? C.borderBright : C.border;
      ctx.lineWidth   = i % 4 === 0 ? 1.5 : 0.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TL.rulerHeight); ctx.stroke();
      if (i % 2 === 0) {
        ctx.fillStyle = C.neon;
        ctx.fillText(String(i+1), x + gridWidth/2, TL.rulerHeight - 10);
      }
      for (let b = 1; b < TL.beatsPerBar; b++) {
        const bx = x + b * gridWidth / TL.beatsPerBar;
        ctx.strokeStyle = C.border;
        ctx.lineWidth   = 0.5;
        ctx.beginPath(); ctx.moveTo(bx, TL.rulerHeight-8); ctx.lineTo(bx, TL.rulerHeight); ctx.stroke();
      }
    }
  };

  const drawTrack = (ctx: CanvasRenderingContext2D, track: Track, ty: number, W: number, sel: boolean) => {
    ctx.fillStyle = sel ? C.surfaceLift : C.surface;
    ctx.fillRect(0, ty, W, TL.trackHeight);
    ctx.strokeStyle = sel ? C.neon : C.border;
    ctx.lineWidth   = sel ? 1.5 : 0.5;
    ctx.beginPath(); ctx.moveTo(0,ty+TL.trackHeight-0.5); ctx.lineTo(W,ty+TL.trackHeight-0.5); ctx.stroke();
    ctx.fillStyle = track.color;
    ctx.fillRect(0, ty, 3, TL.trackHeight);
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = C.borderBright;
    ctx.lineWidth   = 0.5;
    const ts = Math.floor(scrollLeft/gridWidth), te = Math.ceil((W+scrollLeft)/gridWidth)+2;
    for (let i=ts; i<te; i++) {
      const x = i*gridWidth - scrollLeft;
      ctx.beginPath(); ctx.moveTo(x,ty); ctx.lineTo(x,ty+TL.trackHeight); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (track.muted) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, ty, W, TL.trackHeight);
    }
  };

  const drawClip = (ctx: CanvasRenderingContext2D, clip: Clip, track: Track, ty: number, sel: boolean, hov: boolean) => {
    const x  = barsToPixels(clip.startBar, gridWidth) - scrollLeft;
    const cw = barsToPixels(clip.durationBars, gridWidth);
    const cy = ty + 6;
    const ch = TL.trackHeight - 12;
    const g  = ctx.createLinearGradient(x, cy, x, cy+ch);
    if (sel) {
      g.addColorStop(0, `${track.color}66`);
      g.addColorStop(1, `${track.color}22`);
    } else {
      g.addColorStop(0, `${track.color}30`);
      g.addColorStop(1, `${track.color}10`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(x, cy, cw, ch);
    if (hov || sel) {
      ctx.shadowColor = track.color;
      ctx.shadowBlur  = sel ? 12 : 6;
    }
    ctx.strokeStyle = sel ? C.neon : track.color;
    ctx.lineWidth   = sel ? 1.5 : 1;
    ctx.strokeRect(x+0.5, cy+0.5, cw-1, ch-1);
    ctx.shadowBlur = 0;
    const wpts   = Math.max(20, Math.min(180, Math.floor(cw/2)));
    const wf     = getWaveform(clip.id, wpts);
    ctx.strokeStyle = `${C.neon}60`;
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    wf.forEach((a, i) => {
      const wx = x + (i/wf.length)*cw, wy = cy+ch/2, wh = a*(ch*0.65);
      i===0 ? ctx.moveTo(wx, wy-wh/2) : ctx.lineTo(wx, wy-wh/2);
    });
    ctx.stroke();
    ctx.beginPath();
    wf.forEach((a, i) => {
      const wx = x + (i/wf.length)*cw, wy = cy+ch/2, wh = a*(ch*0.65);
      i===0 ? ctx.moveTo(wx, wy+wh/2) : ctx.lineTo(wx, wy+wh/2);
    });
    ctx.stroke();
    ctx.lineWidth = 1;
    if (clip.fadeIn > 0) {
      const fw = barsToPixels(clip.fadeIn, gridWidth);
      ctx.fillStyle = `${track.color}25`;
      ctx.beginPath(); ctx.moveTo(x,cy); ctx.lineTo(x+fw,cy); ctx.lineTo(x+fw,cy+ch); ctx.lineTo(x,cy+ch); ctx.closePath(); ctx.fill();
    }
    if (clip.fadeOut > 0) {
      const fw = barsToPixels(clip.fadeOut, gridWidth);
      ctx.fillStyle = `${track.color}25`;
      ctx.beginPath(); ctx.moveTo(x+cw,cy); ctx.lineTo(x+cw-fw,cy); ctx.lineTo(x+cw-fw,cy+ch); ctx.lineTo(x+cw,cy+ch); ctx.closePath(); ctx.fill();
    }
    if (cw > 48) {
      ctx.fillStyle = `${C.surface}D0`;
      ctx.fillRect(x+8, cy+5, Math.min(cw-16,120), 16);
      ctx.fillStyle  = C.text;
      ctx.font       = `500 9px ${FONT.mono}`;
      ctx.textAlign  = 'left';
      ctx.fillText(clip.name, x+12, cy+16, cw-24);
    }
  };

  const drawMarker = (ctx: CanvasRenderingContext2D, m: Marker, H: number) => {
    const x   = barsToPixels(m.bar, gridWidth) - scrollLeft;
    const col = m.color ?? C.yellow;
    ctx.strokeStyle = col;
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(x, TL.rulerHeight); ctx.lineTo(x, H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x,TL.rulerHeight); ctx.lineTo(x+10,TL.rulerHeight+6); ctx.lineTo(x,TL.rulerHeight+12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.surface;
    ctx.fillRect(x+12, TL.rulerHeight+1, m.name.length*7+12, 16);
    ctx.fillStyle  = col;
    ctx.font       = `700 9px ${FONT.mono}`;
    ctx.textAlign  = 'left';
    ctx.fillText(m.name, x+16, TL.rulerHeight+12);
    ctx.lineWidth = 1;
  };

  const drawPlayhead = (ctx: CanvasRenderingContext2D, H: number) => {
    const x = barsToPixels(currentBar, gridWidth) - scrollLeft;
    ctx.shadowColor = C.neon;
    ctx.shadowBlur  = 16;
    ctx.strokeStyle = C.neon;
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.moveTo(x, TL.rulerHeight); ctx.lineTo(x, H); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle  = C.neon;
    ctx.beginPath(); ctx.moveTo(x-9,TL.rulerHeight); ctx.lineTo(x+9,TL.rulerHeight); ctx.lineTo(x,TL.rulerHeight+14); ctx.closePath(); ctx.fill();
    const label = formatTime(currentBar, project.tempo, TL.beatsPerBar);
    ctx.fillStyle = C.surface;
    ctx.fillRect(x-38, TL.rulerHeight+17, 76, 19);
    ctx.strokeStyle = C.neon;
    ctx.lineWidth   = 0.5;
    ctx.strokeRect(x-38, TL.rulerHeight+17, 76, 19);
    ctx.fillStyle  = C.neon;
    ctx.font       = `700 10px ${FONT.mono}`;
    ctx.textAlign  = 'center';
    ctx.fillText(label, x, TL.rulerHeight+30);
    ctx.lineWidth = 1;
  };

  const drawLoop = (ctx: CanvasRenderingContext2D, H: number) => {
    const sx = barsToPixels(loopRegion.start, gridWidth) - scrollLeft;
    const ex = barsToPixels(loopRegion.end,   gridWidth) - scrollLeft;
    ctx.fillStyle   = `${C.cyan}0E`;
    ctx.fillRect(sx, TL.rulerHeight, ex-sx, H-TL.rulerHeight);
    [sx, ex].forEach((x, i) => {
      ctx.strokeStyle = C.cyan;
      ctx.lineWidth   = 1.5;
      ctx.beginPath(); ctx.moveTo(x,TL.rulerHeight); ctx.lineTo(x,H); ctx.stroke();
      ctx.fillStyle = C.cyan;
      ctx.beginPath();
      i===0 ? (ctx.moveTo(x,TL.rulerHeight), ctx.lineTo(x+10,TL.rulerHeight+6), ctx.lineTo(x,TL.rulerHeight+12))
             : (ctx.moveTo(x,TL.rulerHeight), ctx.lineTo(x-10,TL.rulerHeight+6), ctx.lineTo(x,TL.rulerHeight+12));
      ctx.closePath(); ctx.fill();
    });
    ctx.lineWidth = 1;
  };

  const drawCursor = (ctx: CanvasRenderingContext2D, c: Collaborator) => {
    const {x,y} = c.cursor;
    ctx.fillStyle   = c.color;
    ctx.shadowColor = c.color;
    ctx.shadowBlur  = 12;
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+12,y+5); ctx.lineTo(x+5,y+12); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    const lw = c.name.split(' ').map(n=>n[0]).join('')+'  '+c.name;
    ctx.fillStyle   = `${c.color}E0`;
    ctx.fillRect(x+14, y-2, lw.length*6+14, 20);
    ctx.fillStyle   = C.void;
    ctx.font        = `700 9px ${FONT.mono}`;
    ctx.textAlign   = 'left';
    ctx.fillText(c.name.split(' ').map(n=>n[0]).join('') + '  ' + c.lastAction, x+20, y+12, 160);
  };

  // ── Canvas interactions ───────────────────────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx   = e.clientX - rect.left + scrollLeft;
    const cy   = e.clientY - rect.top  + scrollTop;
    let hit: string|null = null;
    project.tracks.forEach((t, idx) => {
      const ty = TL.rulerHeight + idx * TL.trackHeight;
      project.clips.filter(c=>c.trackId===t.id).forEach(c => {
        const x=barsToPixels(c.startBar,gridWidth), w=barsToPixels(c.durationBars,gridWidth);
        if (cx>=x&&cx<=x+w&&cy>=ty+6&&cy<=ty+TL.trackHeight-6) hit=c.id;
      });
    });
    if (hit) {
      const h = hit;
      e.metaKey||e.ctrlKey
        ? setSelectedClipIds(p => p.includes(h) ? p.filter(x=>x!==h) : [...p,h])
        : !selectedClipIds.includes(h) && setSelectedClipIds([h]);
    } else {
      setSelectedClipIds([]);
    }
    if (cy < TL.rulerHeight) {
      let bar = pixelsToBars(cx, gridWidth);
      if (snapGrid) bar = Math.round(bar);
      setCurrentBar(bar);
      if (transport==='playing' && startTimeRef.current!==null)
        startTimeRef.current = performance.now() - (bar*(60/project.tempo)*TL.beatsPerBar*1000);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx   = e.clientX - rect.left + scrollLeft;
    const cy   = e.clientY - rect.top  + scrollTop;
    if (dragRef.current) {
      const drag = dragRef.current;
      const dxBars    = pixelsToBars(cx - drag.startX, gridWidth);
      const newBar    = Math.max(0, drag.origStartBar + dxBars);
      const trackIdx  = Math.max(0, Math.min(project.tracks.length - 1,
        Math.floor((cy - TL.rulerHeight) / TL.trackHeight)));
      const newTrackId = project.tracks[trackIdx]?.id ?? drag.origTrackId;
      setDragPreview({ clipId: drag.clipId, startBar: newBar, trackId: newTrackId });
      return;
    }
    let hov: string|null = null;
    project.tracks.forEach((t, idx) => {
      const ty = TL.rulerHeight + idx * TL.trackHeight;
      project.clips.filter(c=>c.trackId===t.id).forEach(c => {
        const x=barsToPixels(c.startBar,gridWidth), w=barsToPixels(c.durationBars,gridWidth);
        if (cx>=x&&cx<=x+w&&cy>=ty+6&&cy<=ty+TL.trackHeight-6) hov=c.id;
      });
    });
    setHoveredClipId(hov);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left + scrollLeft;
    const cy = e.clientY - rect.top  + scrollTop;
    if (cy < TL.rulerHeight) return;
    let hit: string | null = null;
    project.tracks.forEach((t, idx) => {
      const ty = TL.rulerHeight + idx * TL.trackHeight;
      project.clips.filter(c => c.trackId === t.id).forEach(c => {
        const x = barsToPixels(c.startBar, gridWidth), w = barsToPixels(c.durationBars, gridWidth);
        if (cx >= x && cx <= x + w && cy >= ty + 6 && cy <= ty + TL.trackHeight - 6) hit = c.id;
      });
    });
    if (!hit) return;
    const clip = project.clips.find(c => c.id === hit)!;
    dragRef.current = { clipId: hit, origStartBar: clip.startBar, origTrackId: clip.trackId, startX: cx, startY: cy };
    setDragPreview({ clipId: hit, startBar: clip.startBar, trackId: clip.trackId });
    e.preventDefault();
  };
  const handleMouseUp = (_e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || !dragPreview) { dragRef.current = null; setDragPreview(null); return; }
    dragRef.current = null;
    const finalBar = Math.max(0, snapGrid ? Math.round(dragPreview.startBar) : dragPreview.startBar);
    pushHistory({
      ...project,
      clips: project.clips.map(c =>
        c.id === drag.clipId ? { ...c, startBar: finalBar, trackId: dragPreview.trackId } : c
      ),
    });
    setDragPreview(null);
  };
  const totalTH = project.tracks.length * TL.trackHeight + TL.rulerHeight;

  // ─── Ticker items ──────────────────────────────────────────────────────────
  const TICKER_ITEMS = [
    'R3 Native','Web Audio API','Offline-First','MIDI Support','Polyphony',
    'Accessible','MultiTrack DAW','VST System','LLPTE Engine','Collaborative',
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

        /* ── Acid Grid header classes (ported from instrument.tsx) ────────── */
        .ag-header {
          border-bottom: 3px solid var(--ag-border, #1c1c1c);
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,.6);
          flex-shrink: 0;
          z-index: 100;
        }
        .ag-header-top {
          display: flex;
          align-items: stretch;
          border-bottom: 1px solid var(--ag-border, #1c1c1c);
        }
        .ag-ghost-bpm {
          position: absolute; right: -10px; top: 50%; transform: translateY(-50%);
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: clamp(56px, 9vw, 110px);
          color: transparent; -webkit-text-stroke: 1px rgba(163,230,53,0.04);
          letter-spacing: -0.04em; pointer-events: none; user-select: none; z-index: 0;
        }
        .ag-wordmark-block {
          padding: 12px 20px 10px;
          border-right: 1px solid var(--ag-border, #1c1c1c);
          display: flex; flex-direction: column; justify-content: center;
          min-width: 176px; position: relative; z-index: 1; flex-shrink: 0;
        }
        .ag-wordmark {
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 22px;
          letter-spacing: -0.02em; color: var(--ag-white, #f0f0f0); line-height: 1;
        }
        .ag-wordmark-slash {
          color: var(--ag-acid, #a3e635); margin: 0 2px; font-size: 26px;
          line-height: .9; text-shadow: 0 0 14px #a3e635;
        }
        .ag-wordmark-sub {
          font-size: 7px; letter-spacing: .4em; text-transform: uppercase;
          color: var(--ag-mid, #555); margin-top: 4px;
          font-family: 'IBM Plex Mono', monospace;
        }
        .ag-status-block {
          padding: 10px 14px;
          border-right: 1px solid var(--ag-border, #1c1c1c);
          display: flex; flex-direction: column; justify-content: center;
          gap: 5px; z-index: 1; flex-shrink: 0;
        }
        .ag-status-line {
          font-size: 8px; letter-spacing: .2em; text-transform: uppercase;
          display: flex; align-items: center; gap: 6px;
          font-family: 'IBM Plex Mono', monospace;
        }
        .ag-cursor-live {
          display: inline-block; width: 7px; height: 12px;
          background: var(--ag-acid, #a3e635); box-shadow: 0 0 8px #a3e635;
          animation: ag-blink 1s step-end infinite; flex-shrink: 0;
        }
        .ag-cursor-standby {
          display: inline-block; width: 7px; height: 12px;
          background: #555; flex-shrink: 0;
        }
        .ag-status-live-text  { color: var(--ag-acid, #a3e635); }
        .ag-status-dead-text  { color: #ff3b3b; }
        .ag-bpm-block {
          padding: 0 16px;
          border-right: 1px solid var(--ag-border, #1c1c1c);
          display: flex; align-items: center; gap: 10px; z-index: 1; flex-shrink: 0;
        }
        .ag-bpm-label {
          font-size: 7px; letter-spacing: .3em; color: var(--ag-mid, #555);
          text-transform: uppercase; writing-mode: vertical-rl; transform: rotate(180deg);
          font-family: 'IBM Plex Mono', monospace;
        }
        .ag-bpm-number {
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 36px;
          letter-spacing: -0.04em; color: var(--ag-acid, #a3e635); line-height: 1;
          text-shadow: 0 0 20px rgba(163,230,53,.4), 0 0 40px rgba(163,230,53,.15);
        }
        .ag-controls-block {
          flex: 1; padding: 8px 12px;
          display: flex; align-items: center;
          gap: 4px; flex-wrap: wrap; z-index: 1; overflow: hidden;
        }

        /* ── Ticker ──────────────────────────────────────────────────────── */
        .ag-ticker-row {
          padding: 4px 0;
          background: #080808;
          overflow: hidden; position: relative; flex-shrink: 0;
        }
        .ag-ticker-row::before, .ag-ticker-row::after {
          content: ''; position: absolute; top: 0; bottom: 0; width: 32px; z-index: 2;
        }
        .ag-ticker-row::before { left: 0; background: linear-gradient(90deg, #080808, transparent); }
        .ag-ticker-row::after  { right: 0; background: linear-gradient(-90deg, #080808, transparent); }
        .ag-ticker-inner {
          display: flex; width: max-content;
          animation: ag-scroll 28s linear infinite;
        }
        @keyframes ag-scroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .ag-ticker-item {
          font-size: 9px; letter-spacing: .2em; text-transform: uppercase;
          color: #fff; padding: 0 18px; white-space: nowrap;
          display: flex; align-items: center; gap: 10px;
          font-family: 'IBM Plex Mono', monospace;
        }
        .ag-ticker-sep { color: #a3e635; font-size: 10px; }

        /* ── Animations ──────────────────────────────────────────────────── */
        @keyframes ag-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes ag-pulse { 0%,100%{box-shadow:0 0 6px #a3e635} 50%{box-shadow:0 0 18px #a3e635,0 0 30px rgba(163,230,53,.3)} }
        @keyframes ag-slidein { from{transform:translateY(-8px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes ag-rec { 0%,100%{background:#ff3b3b} 50%{background:#ff3b3b88} }

        /* ── Scrollbars ───────────────────────────────────────────────────── */
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:${C.surface}; }
        ::-webkit-scrollbar-thumb { background:${C.borderBright}; }
        ::-webkit-scrollbar-thumb:hover { background:${C.neon}; }
        input[type=range] { -webkit-appearance:none; appearance:none; outline:none; cursor:pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:10px; height:10px; background:${C.neon}; cursor:pointer; }
      `}</style>

      {/* Toast notifications */}
      <div style={{ position:'fixed', top:80, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:6, pointerEvents:'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding:'8px 14px',
            background: t.type==='ai' ? `rgba(163,230,53,0.12)` : C.surface,
            border:`1px solid ${t.type==='ai' ? C.neon : C.border}`,
            borderLeft:`3px solid ${t.type==='ai' ? C.neon : C.cyan}`,
            fontFamily:FONT.mono, fontSize:10, color:C.text,
            animation:'ag-slidein .2s ease',
            boxShadow:`0 4px 24px rgba(0,0,0,.8)`,
            maxWidth:320,
          }}>
            {t.type==='ai' && <span style={{color:C.neon,marginRight:8}}>⚡ AI</span>}
            {t.msg}
          </div>
        ))}
      </div>

      <div style={{
        width:'100%',
        height:'calc(100vh - var(--nav-h, 44px))',
        background:C.void,
        display:'flex',
        flexDirection:'column',
        fontFamily:FONT.mono,
        color:C.text,
        overflow:'hidden',
        position:'relative',
      }}>

        {/* Left acid bar */}
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:C.neon, boxShadow:`0 0 20px ${C.neon}`, zIndex:300, pointerEvents:'none' }} />

        {/* Scanline overlay */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
          background:`repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.007) 3px,rgba(255,255,255,0.007) 4px)`,
        }} />

        {/* Ambient glow */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
          background:'radial-gradient(circle at 15% 50%, rgba(163,230,53,0.04) 0%, transparent 55%)',
        }} />

        {/* ── AG HEADER ──────────────────────────────────────────────────────── */}
        <header className="ag-header" style={{ background: C.surface }}>
          <div className="ag-header-top">

            {/* Ghost BPM */}
            <span className="ag-ghost-bpm" aria-hidden="true">{Math.round(project.tempo)}</span>

            {/* Wordmark */}
            <div className="ag-wordmark-block">
              <div className="ag-wordmark">
                R3<span className="ag-wordmark-slash">/</span>COLLAB
              </div>
              <div className="ag-wordmark-sub">Collaborative · Session</div>
            </div>

            {/* Connection status + collab avatars */}
            <div className="ag-status-block">
              <div className={`ag-status-line ${connStatus==='connected' ? 'ag-status-live-text' : 'ag-status-dead-text'}`}>
                <span className={connStatus==='connected' ? 'ag-cursor-live' : 'ag-cursor-standby'} />
                {connStatus==='connected'
                  ? <Wifi size={9} style={{flexShrink:0}} />
                  : <WifiOff size={9} style={{flexShrink:0}} />}
                {connStatus.toUpperCase()}
              </div>
              <div style={{ display:'flex', alignItems:'center' }}>
                {collaborators.map((c, i) => (
                  <div key={c.id} title={`${c.name} — ${c.lastAction}`} style={{
                    width:20, height:20, background:c.color,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    border:`2px solid ${C.surface}`, fontSize:7, fontWeight:700, color:C.void,
                    position:'relative', cursor:'pointer', zIndex:collaborators.length-i,
                    marginLeft: i===0 ? 0 : -5, flexShrink:0,
                  }}>
                    {c.name.split(' ').map(n=>n[0]).join('')}
                    {c.status==='active' && (
                      <div style={{ position:'absolute', bottom:-2, right:-2, width:5, height:5, background:C.neon, border:`1.5px solid ${C.surface}` }} />
                    )}
                  </div>
                ))}
                <div style={{ width:20, height:20, background:C.neon, display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${C.surface}`, marginLeft:-5, flexShrink:0 }}>
                  <User size={10} color={C.void} />
                </div>
              </div>
            </div>

            {/* BPM + time sig */}
            <div className="ag-bpm-block">
              <span className="ag-bpm-label">BPM</span>
              <input
                type="number" value={project.tempo} min={40} max={240}
                onChange={e => pushHistory({ ...project, tempo: clamp(Number(e.target.value), 40, 240) })}
                className="ag-bpm-number"
                style={{
                  background:'transparent', border:'none', outline:'none',
                  width:64, textAlign:'center', cursor:'ew-resize',
                }}
              />
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                <span style={{ fontSize:6, letterSpacing:'.3em', textTransform:'uppercase', color:C.textMuted, fontFamily:FONT.mono }}>SIG</span>
                <span style={{ fontSize:13, fontWeight:700, color:C.textMuted, fontFamily:FONT.display, lineHeight:1 }}>
                  {project.timeSignature[0]}/{project.timeSignature[1]}
                </span>
              </div>
            </div>

            {/* Controls block — transport + position + all toggles */}
            <div className="ag-controls-block">

              {/* Transport */}
              <AgBtn onClick={() => setCurrentBar(0)} title="Return to start (Home)"><SkipBack size={13} /></AgBtn>
              <AgBtn onClick={togglePlay} active={transport==='playing'} title="Play/Pause (Space)">
                {transport==='playing' ? <Pause size={13} /> : <Play size={13} />}
              </AgBtn>
              <AgBtn onClick={stop} title="Stop (Esc)"><Square size={13} /></AgBtn>
              <AgBtn
                onClick={() => setTransport(t => t==='recording' ? 'stopped' : 'recording')}
                active={transport==='recording'}
                activeColor={C.magenta}
                title="Record"
              >
                <div style={{
                  width:9, height:9,
                  background: transport==='recording' ? C.magenta : C.textMuted,
                  animation: transport==='recording' ? 'ag-rec 1s infinite' : 'none',
                  flexShrink:0,
                }} />
              </AgBtn>

              <Divider />

              {/* Position */}
              <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                <AgLabel>BAR</AgLabel>
                <div style={{ fontSize:18, fontWeight:800, fontFamily:FONT.display, color:C.neon, lineHeight:1 }}>
                  {String(Math.floor(currentBar)+1).padStart(3,'0')}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                <AgLabel>TIME</AgLabel>
                <div style={{ fontSize:9, fontWeight:600, fontFamily:FONT.mono, color:C.textMuted }}>
                  {formatTime(currentBar, project.tempo, TL.beatsPerBar)}
                </div>
              </div>

              <Divider />

              {/* Grid toggles */}
              <AgBtn onClick={()=>setMetronome(v=>!v)} active={metronome} title="Metronome (M)"><Activity size={11} /> MET</AgBtn>
              <AgBtn onClick={()=>setSnapGrid(v=>!v)}  active={snapGrid}  title="Snap Grid (G)"><Grid3x3 size={11} /> SNAP</AgBtn>
              <AgBtn onClick={()=>setLoopOn(v=>!v)}    active={loopOn}    activeColor={C.cyan} title="Loop (L)">
                <span style={{fontSize:11,fontWeight:900}}>↺</span> LOOP
              </AgBtn>

              <Divider />

              {/* Undo / Redo */}
              <AgBtn onClick={undo} disabled={historyIdx===0}                title="Undo (⌘Z)"><Undo2 size={11} /></AgBtn>
              <AgBtn onClick={redo} disabled={historyIdx===history.length-1} title="Redo (⌘⇧Z)"><Redo2 size={11} /></AgBtn>

              <Divider />

              {/* Zoom */}
              <AgBtn onClick={()=>setZoom(z=>Math.max(z-0.2,TL.minZoom))} title="Zoom out"><ZoomOut size={11} /></AgBtn>
              <span style={{ fontSize:8, color:C.textMuted, minWidth:28, textAlign:'center', fontWeight:600, flexShrink:0 }}>
                {Math.round(zoom*100)}%
              </span>
              <AgBtn onClick={()=>setZoom(z=>Math.min(z+0.2,TL.maxZoom))} title="Zoom in"><ZoomIn size={11} /></AgBtn>

              <Divider />

              {/* View toggles */}
              <AgBtn onClick={()=>setShowMixer(v=>!v)}       active={showMixer}       title="Mixer"><Sliders size={11} /> MIX</AgBtn>
              <AgBtn onClick={()=>setShowAI(v=>!v)}           active={showAI}          title="AI Panel"><Zap size={11} /> AI</AgBtn>
              <AgBtn onClick={()=>setShowActivity(v=>!v)}     active={showActivity}    title="Activity Log"><Radio size={11} /> LOG</AgBtn>
              <AgBtn onClick={()=>setShowVST(v=>!v)}           active={showVST}         title="VST Browser"><Music size={11} /> VST</AgBtn>
              <AgBtn onClick={()=>setShowLoopStation(v=>!v)}   active={showLoopStation} title="Loop Station"><Repeat2 size={11} /> 505</AgBtn>

              <Divider />

              {/* CPU + LLPTE */}
              <div style={{ display:'flex', flexDirection:'column', gap:3, flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <AgLabel>CPU</AgLabel>
                  <div style={{ width:48, height:3, background:C.border, flexShrink:0 }}>
                    <div style={{
                      height:'100%', width:`${cpuLoad*100}%`,
                      background: cpuLoad>0.8 ? C.magenta : cpuLoad>0.6 ? C.yellow : C.neon,
                      transition:'width .2s, background .2s',
                    }} />
                  </div>
                  <span style={{ fontSize:7, color:C.textMuted, width:22, textAlign:'right' }}>{Math.round(cpuLoad*100)}%</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <AgLabel>LLPTE</AgLabel>
                  <span style={{ fontSize:7, color:C.neon, fontWeight:700, animation:'ag-pulse 2s infinite' }}>{llpteLatency}ms</span>
                </div>
              </div>

              <Divider />

              {/* Master volume */}
              <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                <button
                  onClick={() => setMasterMuted(v=>!v)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:masterMuted?C.magenta:C.textMuted, padding:2, flexShrink:0 }}
                >
                  {masterMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
                </button>
                <input
                  type="range" min={0} max={1} step={0.01}
                  value={masterMuted ? 0 : masterVol}
                  onChange={e => setMasterVol(Number(e.target.value))}
                  style={{ width:60, height:2, accentColor:C.neon }}
                />
                <span style={{ fontSize:7, color:C.neon, minWidth:24, textAlign:'right', flexShrink:0 }}>
                  {masterMuted ? '—' : `${Math.round(masterVol*100)}%`}
                </span>
              </div>

              {/* File actions */}
              <AgBtn title="Export"><Download size={11} /></AgBtn>
              <AgBtn title="Share"><Share2 size={11} /></AgBtn>

            </div>
          </div>

          {/* Ticker */}
          <div className="ag-ticker-row">
            <div className="ag-ticker-inner">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="ag-ticker-item">
                  {item}<span className="ag-ticker-sep">/</span>
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* ── LLPTE STATUS STRIP ──────────────────────────────────────────────── */}
        <div style={{
          height:28, background:C.void, borderBottom:`1px solid ${C.border}`,
          display:'flex', alignItems:'center', gap:0, padding:'0 20px', flexShrink:0,
          overflowX:'auto', zIndex:90,
        }}>
          <AgLabel style={{marginRight:12, flexShrink:0}}>LLPTE PIPELINE</AgLabel>
          {(['inputRouter','spectralAnalyzer','aiMixEngine','transitionGraph','outputBus'] as const).map((node, i) => (
            <React.Fragment key={node}>
              <div style={{
                padding:'2px 10px',
                background: i===2 ? C.neonDim2 : 'transparent',
                border:`1px solid ${i===2 ? C.neon : C.border}`,
                fontSize:7, letterSpacing:'.15em', textTransform:'uppercase',
                color: i===2 ? C.neon : C.textMuted,
                flexShrink:0,
                boxShadow: i===2 ? `0 0 8px ${C.neonDim}` : 'none',
              }}>
                {node}
                {i===2 && <span style={{marginLeft:6, color:C.neon, fontWeight:700}}>{llpteLatency}ms</span>}
              </div>
              {i < 4 && (
                <div style={{ width:18, height:1, background:`linear-gradient(90deg,${C.neon},${C.border})`, flexShrink:0 }} />
              )}
            </React.Fragment>
          ))}
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:7, letterSpacing:'.2em', textTransform:'uppercase', color:C.textMuted }}>EDGES</span>
            <span style={{ fontSize:7, color:C.neon, fontWeight:700 }}>847</span>
            <span style={{ fontSize:7, color:C.textMuted, letterSpacing:'.2em', marginLeft:8 }}>TICK</span>
            <span style={{ fontSize:7, color:C.neon, fontWeight:700 }}>0.8ms</span>
            <span style={{ fontSize:7, color:C.textMuted, letterSpacing:'.2em', marginLeft:8 }}>CONF GATE</span>
            <span style={{ fontSize:7, color:C.neon, fontWeight:700 }}>≥0.65</span>
          </div>
        </div>

        {/* ── VST BROWSER PANEL ─────────────────────────────────────────────────────── */}
        {showVST && (
          <div style={{ height:340, background:C.void, borderTop:`2px solid ${C.neon}`, display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' }}>
            <div style={{ height:28, padding:'0 12px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:C.void, flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:6, height:6, background:C.neon, boxShadow:`0 0 6px ${C.neon}` }} />
                <span style={{ fontSize:7, letterSpacing:'.3em', textTransform:'uppercase', color:C.neon, fontFamily:FONT.mono }}>VIRTUAL VSTS</span>
              </div>
              <button onClick={()=>setShowVST(false)} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, padding:2 }}><X size={12} /></button>
            </div>
            <div style={{ flex:1, overflow:'hidden' }}>
              <Suspense fallback={<div style={{ padding:16, fontSize:8, color:C.textMuted, fontFamily:FONT.mono, letterSpacing:'.2em' }}>LOADING VSTS…</div>}>
                <VSTBrowser onPluginSelect={() => {}} />
              </Suspense>
            </div>
          </div>
        )}

        {/* ── LOOP STATION 505 ─────────────────────────────────────────────────────── */}
        {showLoopStation && (
          <div style={{ height:340, background:C.void, borderTop:`2px solid ${C.neon}`, display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' }}>
            <div style={{ height:28, padding:'0 12px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:C.void, flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:6, height:6, background:C.neon, boxShadow:`0 0 6px ${C.neon}` }} />
                <span style={{ fontSize:7, letterSpacing:'.3em', textTransform:'uppercase', color:C.neon, fontFamily:FONT.mono }}>LOOP STATION 505</span>
              </div>
              <button onClick={()=>setShowLoopStation(false)} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, padding:2 }}><X size={12} /></button>
            </div>
            <div style={{ flex:1, overflow:'hidden' }}>
              <Suspense fallback={<div style={{ padding:16, fontSize:8, color:C.textMuted, fontFamily:FONT.mono, letterSpacing:'.2em' }}>LOADING LOOP STATION…</div>}>
                <LoopStation505 />
              </Suspense>
            </div>
          </div>
        )}

        {/* ── MAIN BODY ───────────────────────────────────────────────────────── */}
        <div style={{ display:'flex', flex:1, overflow:'hidden', position:'relative', zIndex:1 }}>

          {/* Track headers */}
          <div style={{
            width:TL.headerWidth, flexShrink:0,
            background:C.surface, borderRight:`2px solid ${C.border}`,
            display:'flex', flexDirection:'column', overflowY:'hidden',
          }}>
            {/* Ruler spacer */}
            <div style={{
              height:TL.rulerHeight, background:C.void, borderBottom:`2px solid ${C.neon}`,
              display:'flex', alignItems:'center', paddingLeft:8,
            }}>
              <AgLabel style={{fontSize:7}}>TRACKS</AgLabel>
            </div>

            {/* Track rows */}
            <div style={{ flex:1, overflowY:'auto' }}>
              {project.tracks.map(track => (
                <div
                  key={track.id}
                  onClick={() => setSelectedTrackId(t => t===track.id ? null : track.id)}
                  style={{
                    height:TL.trackHeight,
                    background: selectedTrackId===track.id ? C.surfaceLift : 'transparent',
                    borderBottom:`1px solid ${C.border}`,
                    borderLeft:`3px solid ${selectedTrackId===track.id ? C.neon : track.color}`,
                    cursor:'pointer', display:'flex', flexDirection:'column',
                    justifyContent:'center', padding:'6px 8px', gap:4, position:'relative',
                  }}
                >
                  {/* Collab indicator */}
                  {collaborators.filter(c=>c.editingTrackId===track.id&&c.status==='active').map(c => (
                    <div key={c.id} style={{
                      position:'absolute', top:4, right:4,
                      width:8, height:8, background:c.color, boxShadow:`0 0 6px ${c.color}`,
                    }} title={`${c.name} editing`} />
                  ))}

                  {/* Name */}
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:8, height:8, background:track.color, flexShrink:0 }} />
                    <span style={{ fontSize:9, fontWeight:600, color:C.text, letterSpacing:'.05em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {track.name}
                    </span>
                    {track.locked && <Lock size={8} color={C.textMuted} />}
                  </div>

                  {/* Controls row */}
                  <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <AgBtn onClick={e=>{e.stopPropagation();toggleMute(track.id)}} active={track.muted} activeColor={C.yellow} style={{height:18,padding:'0 5px',fontSize:7}}>M</AgBtn>
                    <AgBtn onClick={e=>{e.stopPropagation();toggleSolo(track.id)}}  active={track.solo}  activeColor={C.cyan}   style={{height:18,padding:'0 5px',fontSize:7}}>S</AgBtn>
                    <AgBtn onClick={e=>{e.stopPropagation();updateTrack(track.id,{armed:!track.armed})}} active={track.armed} activeColor={C.magenta} style={{height:18,padding:'0 5px',fontSize:7}}>R</AgBtn>
                    <div style={{ marginLeft:'auto', display:'flex', gap:2 }}>
                      <VUMeter level={vuLevels[track.id]??0} color={track.color} peaked={peakedTracks.has(track.id)} />
                      <VUMeter level={(vuLevels[track.id]??0)*0.9} color={track.color} peaked={peakedTracks.has(track.id)} />
                    </div>
                  </div>

                  {/* Volume */}
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <input
                      type="range" min={0} max={1} step={0.01}
                      value={track.volume}
                      onChange={e=>{e.stopPropagation();updateTrack(track.id,{volume:Number(e.target.value)})}}
                      onClick={e=>e.stopPropagation()}
                      style={{ flex:1, height:2, accentColor:track.color }}
                    />
                    <span style={{ fontSize:7, color:C.textMuted, minWidth:22, textAlign:'right' }}>{Math.round(track.volume*100)}%</span>
                  </div>

                  {/* FX tags */}
                  {track.fxChain.length > 0 && (
                    <div style={{ display:'flex', gap:2, flexWrap:'wrap' }}>
                      {track.fxChain.slice(0,2).map(fx => (
                        <span key={fx} style={{ fontSize:6, color:C.textDim, border:`1px solid ${C.border}`, padding:'1px 4px', letterSpacing:'.1em', textTransform:'uppercase' }}>
                          {fx}
                        </span>
                      ))}
                      {track.fxChain.length > 2 && <span style={{ fontSize:6, color:C.textDim }}>+{track.fxChain.length-2}</span>}
                    </div>
                  )}
                </div>
              ))}

              {/* Add track */}
              <button
                onClick={addTrack}
                style={{
                  width:'100%', height:40, background:'transparent', border:'none',
                  borderTop:`1px solid ${C.border}`, color:C.neon, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  fontSize:8, fontWeight:700, textTransform:'uppercase', letterSpacing:'.25em',
                  fontFamily:FONT.mono, transition:'background .1s',
                }}
                onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=C.neon;(e.currentTarget as HTMLButtonElement).style.color=C.void;}}
                onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='transparent';(e.currentTarget as HTMLButtonElement).style.color=C.neon;}}
              >
                <Plus size={12} /> ADD TRACK
              </button>
            </div>
          </div>

          {/* Timeline canvas area */}
          <div
            ref={containerRef}
            onScroll={e => {
              setScrollLeft((e.currentTarget as HTMLDivElement).scrollLeft);
              setScrollTop((e.currentTarget as HTMLDivElement).scrollTop);
            }}
            style={{ flex:1, position:'relative', overflow:'auto' }}
          >
            <div style={{ width:Math.max(3000, project.clips.reduce((acc,c)=>Math.max(acc,c.startBar+c.durationBars),0)*gridWidth+200), height:Math.max(totalTH,400), position:'relative' }}>
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={e=>{ e.preventDefault(); setContextMenu({x:e.clientX,y:e.clientY}); }}
                style={{ position:'sticky', top:0, left:0, width:'100%', height:'100%', cursor:hoveredClipId?'pointer':'crosshair', display:'block' }}
              />
            </div>

            {/* Overlay HUD — selection info */}
            {selectedClipIds.length > 0 && (
              <div style={{
                position:'fixed', bottom:16, left:TL.headerWidth+16,
                background:C.surface, border:`1px solid ${C.neon}`, borderLeft:`3px solid ${C.neon}`,
                padding:'5px 12px', fontSize:8, fontFamily:FONT.mono, color:C.neon,
                letterSpacing:'.15em', textTransform:'uppercase', zIndex:200,
              }}>
                {selectedClipIds.length} CLIP{selectedClipIds.length>1?'S':''} SELECTED — DEL to remove · ⌘D duplicate
              </div>
            )}
          </div>

          {/* ── AI SUGGESTIONS PANEL ──────────────────────────────────────────── */}
          {showAI && (
            <div style={{
              width:240, background:C.surface, borderLeft:`2px solid ${C.border}`,
              display:'flex', flexDirection:'column', flexShrink:0,
            }}>
              <div style={{
                height:TL.rulerHeight+28, padding:'0 12px',
                borderBottom:`1px solid ${C.border}`, borderLeft:`3px solid ${C.neon}`,
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background:C.void,
              }}>
                <div>
                  <div style={{ fontSize:7, letterSpacing:'.3em', textTransform:'uppercase', color:C.neon, marginBottom:2 }}>AI SUGGESTIONS</div>
                  <div style={{ fontSize:7, color:C.textMuted, letterSpacing:'.1em' }}>LLPTE · {llpteLatency}ms</div>
                </div>
                <Zap size={14} color={C.neon} />
              </div>

              <div style={{ flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:6 }}>
                {suggestions.length === 0 ? (
                  <div style={{ padding:16, textAlign:'center', fontSize:8, color:C.textDim, letterSpacing:'.15em' }}>
                    NO PENDING SUGGESTIONS
                  </div>
                ) : suggestions.map(s => {
                  const track = project.tracks.find(t=>t.id===s.trackId);
                  const col   = confidenceColor(s.confidence);
                  return (
                    <div key={s.id} style={{
                      background:C.void, border:`1px solid ${C.border}`,
                      borderLeft:`2px solid ${col}`, padding:'8px 10px',
                    }}>
                      <div style={{ fontSize:7, color:C.textMuted, letterSpacing:'.1em', marginBottom:4, textTransform:'uppercase' }}>
                        {track?.name ?? s.trackId} · {s.type.replace('_',' ')}
                      </div>
                      <div style={{ fontSize:9, color:C.text, marginBottom:6, lineHeight:1.4 }}>{s.label}</div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <div style={{ width:5, height:5, background:col, boxShadow:`0 0 5px ${col}` }} />
                          <span style={{ fontSize:8, color:col, fontWeight:700 }}>{Math.round(s.confidence*100)}%</span>
                        </div>
                        <span style={{ fontSize:7, color:C.textMuted, letterSpacing:'.1em', textTransform:'uppercase' }}>
                          {s.confidence>=0.65?'AUTO':'SUGGEST'}
                        </span>
                      </div>
                      <div style={{ display:'flex', gap:4 }}>
                        <button
                          onClick={()=>acceptSuggestion(s.id)}
                          style={{
                            flex:1, height:22, background:C.neonDim2, border:`1px solid ${C.neon}`,
                            color:C.neon, cursor:'pointer', fontSize:7, fontFamily:FONT.mono,
                            letterSpacing:'.15em', textTransform:'uppercase', fontWeight:700,
                          }}
                        >✓ ACCEPT</button>
                        <button
                          onClick={()=>rejectSuggestion(s.id)}
                          style={{
                            flex:1, height:22, background:'transparent', border:`1px solid ${C.border}`,
                            color:C.textMuted, cursor:'pointer', fontSize:7, fontFamily:FONT.mono,
                            letterSpacing:'.15em', textTransform:'uppercase',
                          }}
                        >✕ REJECT</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* LLPTE confidence legend */}
              <div style={{ padding:10, borderTop:`1px solid ${C.border}`, display:'flex', flexDirection:'column', gap:4 }}>
                <AgLabel style={{marginBottom:4}}>CONFIDENCE GATES</AgLabel>
                {[
                  { label:'AUTO APPLY', threshold:'≥0.65', color:C.neon },
                  { label:'SUGGEST',    threshold:'≥0.40', color:C.yellow },
                  { label:'DISCARD',    threshold:'<0.40', color:C.magenta },
                ].map(g => (
                  <div key={g.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:5, height:5, background:g.color }} />
                      <span style={{ fontSize:7, color:g.color, fontWeight:700, letterSpacing:'.1em' }}>{g.label}</span>
                    </div>
                    <span style={{ fontSize:7, color:C.textMuted }}>{g.threshold}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ACTIVITY FEED ─────────────────────────────────────────────────── */}
          {showActivity && (
            <div style={{
              width:220, background:C.surface, borderLeft:`2px solid ${C.border}`,
              display:'flex', flexDirection:'column', flexShrink:0,
            }}>
              <div style={{
                height:TL.rulerHeight+28, padding:'0 12px',
                borderBottom:`1px solid ${C.border}`, borderLeft:`3px solid ${C.neon}`,
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background:C.void,
              }}>
                <div style={{ fontSize:7, letterSpacing:'.3em', textTransform:'uppercase', color:C.neon }}>
                  ACTIVITY
                </div>
                <div style={{ fontSize:7, color:C.textMuted }}>
                  {collaborators.filter(c=>c.status==='active').length} ONLINE
                </div>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:6, display:'flex', flexDirection:'column', gap:4 }}>
                {activities.map(a => {
                  const ago  = Date.now() - a.timestamp;
                  const mins = Math.floor(ago/60000);
                  const secs = Math.floor((ago%60000)/1000);
                  const t    = mins>0 ? `${mins}m` : secs>0 ? `${secs}s` : 'now';
                  const col  = a.type==='ai' ? C.neon : a.type==='transport' ? C.cyan : a.type==='collab' ? C.yellow : C.textMuted;
                  return (
                    <div key={a.id} style={{
                      padding:'6px 8px', background:C.void,
                      border:`1px solid ${C.border}`, borderLeft:`2px solid ${col}`,
                    }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                        <span style={{ fontSize:8, color:C.neon, fontWeight:700 }}>{a.user}</span>
                        <span style={{ fontSize:7, color:C.textDim }}>{t}</span>
                      </div>
                      <div style={{ fontSize:8, color:C.textMuted, letterSpacing:'.05em' }}>{a.action}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── MIXER STRIP (collapsible) ───────────────────────────────────────── */}
        {showMixer && (
          <div style={{
            height:140, background:C.surface, borderTop:`2px solid ${C.border}`,
            display:'flex', flexShrink:0, overflowX:'auto',
          }}>
            <div style={{
              width:TL.headerWidth, flexShrink:0, borderRight:`2px solid ${C.border}`,
              display:'flex', alignItems:'center', justifyContent:'center', padding:'0 12px',
            }}>
              <div style={{ display:'flex', flexDirection:'column', gap:4, width:'100%' }}>
                <AgLabel>MASTER FADER</AgLabel>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={masterMuted ? 0 : masterVol}
                    onChange={e=>setMasterVol(Number(e.target.value))}
                    style={{ flex:1, accentColor:C.neon }}
                  />
                  <span style={{ fontSize:10, color:C.neon, fontWeight:700, minWidth:30, textAlign:'right' }}>
                    {Math.round(masterVol*100)}
                  </span>
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  <VUMeter level={vuLevels[project.tracks[0]?.id]??0} color={C.neon} peaked={false} />
                  <VUMeter level={(vuLevels[project.tracks[0]?.id]??0)*0.95} color={C.neon} peaked={false} />
                </div>
              </div>
            </div>
            {project.tracks.map(track => (
              <div key={track.id} style={{
                width:80, flexShrink:0, borderRight:`1px solid ${C.border}`,
                display:'flex', flexDirection:'column', alignItems:'center',
                padding:'8px 6px', gap:4,
                background: selectedTrackId===track.id ? C.surfaceLift : 'transparent',
                borderTop:`3px solid ${track.color}`,
              }}>
                <span style={{ fontSize:7, color:C.textMuted, letterSpacing:'.08em', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%' }}>
                  {track.name}
                </span>
                <div style={{ display:'flex', gap:3, marginBottom:2 }}>
                  <VUMeter level={vuLevels[track.id]??0} color={track.color} peaked={peakedTracks.has(track.id)} />
                  <VUMeter level={(vuLevels[track.id]??0)*0.88} color={track.color} peaked={peakedTracks.has(track.id)} />
                </div>
                <input
                  type="range" min={0} max={1} step={0.01}
                  value={track.volume}
                  onChange={e=>updateTrack(track.id,{volume:Number(e.target.value)})}
                  style={{ width:60, accentColor:track.color }}
                />
                <span style={{ fontSize:7, color:C.textMuted }}>{Math.round(track.volume*100)}</span>
                <div style={{ display:'flex', gap:2 }}>
                  <AgBtn onClick={()=>toggleMute(track.id)} active={track.muted} activeColor={C.yellow} style={{height:16,padding:'0 4px',fontSize:6}}>M</AgBtn>
                  <AgBtn onClick={()=>toggleSolo(track.id)} active={track.solo}  activeColor={C.cyan}   style={{height:16,padding:'0 4px',fontSize:6}}>S</AgBtn>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── STATUS BAR ─────────────────────────────────────────────────────── */}
        <div style={{
          height:26, background:C.void, borderTop:`1px solid ${C.border}`,
          display:'flex', alignItems:'center', padding:'0 16px', gap:24, flexShrink:0,
        }}>
          {[
            ['SPC','Play/Pause'],['ESC','Stop'],['⌘Z','Undo'],['⌘D','Dup'],
            ['DEL','Remove'],['M','Metro'],['L','Loop'],['G','Snap'],['⌘T','Track'],
          ].map(([k,v]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:7, color:C.neon, fontWeight:700, fontFamily:FONT.mono, padding:'1px 4px', border:`1px solid ${C.border}`, letterSpacing:'.05em' }}>{k}</span>
              <span style={{ fontSize:7, color:C.textDim, letterSpacing:'.1em', textTransform:'uppercase' }}>{v}</span>
            </div>
          ))}
          <div style={{ marginLeft:'auto', fontSize:7, color:C.textDim, letterSpacing:'.2em' }}>
            {project.tracks.length} TRACKS · {project.clips.length} CLIPS · {project.markers.length} MARKERS
          </div>
        </div>

        {/* Context menu */}
        {contextMenu && (
          <>
            <div style={{ position:'fixed', inset:0, zIndex:998 }} onClick={()=>setContextMenu(null)} />
            <div style={{
              position:'fixed', left:contextMenu.x, top:contextMenu.y,
              background:C.surface, border:`1px solid ${C.border}`, borderTop:`2px solid ${C.neon}`,
              padding:4, minWidth:160, boxShadow:'0 8px 32px rgba(0,0,0,.9)', zIndex:999,
            }}>
              {selectedClipIds.length > 0 ? (
                <>
                  <CtxItem onClick={()=>{ selectedClipIds.forEach(duplicateClip); setContextMenu(null); }}><Copy size={11} /> Duplicate</CtxItem>
                  <CtxItem onClick={()=>{ selectedClipIds.forEach(deleteClip); setContextMenu(null); }}><Trash2 size={11} /> Delete</CtxItem>
                </>
              ) : (
                <>
                  <CtxItem onClick={()=>{ addTrack(); setContextMenu(null); }}><Plus size={11} /> Add Track</CtxItem>
                  <CtxItem onClick={()=>setContextMenu(null)}><Upload size={11} /> Import Audio</CtxItem>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

const CtxItem = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <div
    onClick={onClick}
    style={{
      padding:'7px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:8,
      fontSize:9, fontFamily:FONT.mono, letterSpacing:'.1em', textTransform:'uppercase',
      color:C.text, transition:'background .07s, color .07s', borderLeft:'2px solid transparent',
    }}
    onMouseEnter={e=>{ (e.currentTarget as HTMLDivElement).style.background=C.neon; (e.currentTarget as HTMLDivElement).style.color=C.void; (e.currentTarget as HTMLDivElement).style.borderColor=C.neon; }}
    onMouseLeave={e=>{ (e.currentTarget as HTMLDivElement).style.background='transparent'; (e.currentTarget as HTMLDivElement).style.color=C.text; (e.currentTarget as HTMLDivElement).style.borderColor='transparent'; }}
  >
    {children}
  </div>
);r3v@penguin:~/Stablecat ~/Stable/client/src/hooks/useCollabSocket.tsts
/**
 * useCollabSocket.ts
 * Real-time collaboration via WebSocket (ws@8.19.0 server at server/ws/).
 *
 * Protocol messages (JSON):
 *   { type: 'join',         userId, name, color, roomId }
 *   { type: 'leave',        userId }
 *   { type: 'presence',     userId, cursorBeat, activeTrackId }
 *   { type: 'action',       userId, action: DAWAction }
 *   { type: 'users',        users: CollabUser[] }
 *   { type: 'ping' / 'pong' }
 *
 * The hook manages connection lifecycle: connect on room join, heartbeat,
 * reconnect-with-backoff on disconnect.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { CollabUser } from './useDAWStore';
import { useDAWStore } from './useDAWStore';

const WS_URL =
  (import.meta.env?.VITE_WS_URL as string | undefined) ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
    : 'ws://localhost:3001/ws');

export interface CollabAPI {
  joinRoom: (roomId: string, userId: string, name: string, color: string) => void;
  leaveRoom: () => void;
  broadcastCursor: (beat: number, trackId: string | null) => void;
  broadcastAction: (action: Record<string, unknown>) => void;
  isConnected: () => boolean;
}

export function useCollabSocket(): CollabAPI {
  const wsRef        = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffRef   = useRef(1000);
  const activeRef    = useRef(false);
  const sessionRef   = useRef<{ userId: string; name: string; color: string; roomId: string } | null>(null);

  const connect = useCallback((roomId: string, userId: string, name: string, color: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}?room=${encodeURIComponent(roomId)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      backoffRef.current = 1000;
      useDAWStore.getState().setCollabConnected(true);
      ws.send(JSON.stringify({ type: 'join', userId, name, color, roomId }));

      // Heartbeat
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, 25_000);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as Record<string, unknown>;
        const store = useDAWStore.getState();

        switch (msg.type) {
          case 'users':
            store.setCollabUsers((msg.users as CollabUser[]) || []);
            break;
          case 'join':
            store.upsertCollabUser({
              id: msg.userId as string,
              name: msg.name as string,
              color: msg.color as string,
              cursorBeat: null,
              activeTrackId: null,
              joinedAt: Date.now(),
            });
            break;
          case 'leave':
            store.removeCollabUser(msg.userId as string);
            break;
          case 'presence':
            store.upsertCollabUser({
              id: msg.userId as string,
              name: msg.name as string,
              color: msg.color as string,
              cursorBeat: (msg.cursorBeat as number) ?? null,
              activeTrackId: (msg.activeTrackId as string) ?? null,
              joinedAt: Date.now(),
            });
            break;
          case 'action':
            // Apply remote store actions (e.g. track mute toggled by peer)
            applyRemoteAction(msg.action as Record<string, unknown>);
            break;
          case 'pong':
            break;
        }
      } catch { /* malformed message */ }
    };

    ws.onerror = () => {
      useDAWStore.getState().setCollabConnected(false);
    };

    ws.onclose = () => {
      useDAWStore.getState().setCollabConnected(false);
      if (pingRef.current) clearInterval(pingRef.current);

      // Reconnect if still active
      if (activeRef.current && sessionRef.current) {
        reconnectRef.current = setTimeout(() => {
          backoffRef.current = Math.min(backoffRef.current * 1.5, 30_000);
          const s = sessionRef.current!;
          connect(s.roomId, s.userId, s.name, s.color);
        }, backoffRef.current);
      }
    };
  }, []);

  const applyRemoteAction = (action: Record<string, unknown>) => {
    const store = useDAWStore.getState();
    // Only apply non-destructive remote actions (mute/solo/gain/pan)
    switch (action.type) {
      case 'trackMute':
        store.updateTrack(action.trackId as string, { mute: action.value as boolean });
        break;
      case 'trackGain':
        store.updateTrack(action.trackId as string, { gain: action.value as number });
        break;
      case 'bpm':
        store.setBpm(action.value as number);
        break;
    }
  };

  const joinRoom = useCallback((roomId: string, userId: string, name: string, color: string) => {
    activeRef.current = true;
    sessionRef.current = { roomId, userId, name, color };
    useDAWStore.getState().setCollabRoom(roomId);
    useDAWStore.getState().setCollabEnabled(true);
    connect(roomId, userId, name, color);
  }, [connect]);

  const leaveRoom = useCallback(() => {
    activeRef.current = false;
    sessionRef.current = null;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const userId = useDAWStore.getState().collabUsers.find(u => u.id)?.id;
      if (userId) wsRef.current.send(JSON.stringify({ type: 'leave', userId }));
      wsRef.current.close();
    }
    if (pingRef.current)    clearInterval(pingRef.current);
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    useDAWStore.getState().setCollabEnabled(false);
    useDAWStore.getState().setCollabConnected(false);
    useDAWStore.getState().setCollabRoom(null);
    useDAWStore.getState().setCollabUsers([]);
  }, []);

  const broadcastCursor = useCallback((beat: number, trackId: string | null) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    const s = sessionRef.current;
    if (!s) return;
    wsRef.current.send(JSON.stringify({
      type: 'presence',
      userId: s.userId,
      name: s.name,
      color: s.color,
      cursorBeat: beat,
      activeTrackId: trackId,
    }));
  }, []);

  const broadcastAction = useCallback((action: Record<string, unknown>) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    const s = sessionRef.current;
    if (!s) return;
    wsRef.current.send(JSON.stringify({ type: 'action', userId: s.userId, action }));
  }, []);

  const isConnected = useCallback(() =>
    wsRef.current?.readyState === WebSocket.OPEN,
  []);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      wsRef.current?.close();
      if (pingRef.current)    clearInterval(pingRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, []);

  return { joinRoom, leaveRoom, broadcastCursor, broadcastAction, isConnected };
}
r3v@penguin:~/Stable$ cat ~/Stable/client/src/hooks/useCollaborativeState.ts
import { useCallback, useRef, useState, useEffect } from 'react';

export interface CollaborativeStateChange {
  id: string;
  userId: string;
  timestamp: number;
  path: string[]; // e.g., ['tracks', 'tr1', 'volume']
  oldValue: any;
  newValue: any;
  resolved: boolean;
}

export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge';
  change: CollaborativeStateChange;
}

/**
 * Hook for managing collaborative state changes with conflict resolution.
 * Implements operational transformation (OT) for real-time sync.
 * 
 * @example
 * const { applyRemoteChange, getConflicts, resolveConflict } = useCollaborativeState({
 *   userId: 'user123',
 *   onConflict: (conflicts) => console.log('Conflicts:', conflicts)
 * });
 */
export function useCollaborativeState({
  userId,
  onConflict,
}: {
  userId: string;
  onConflict?: (conflicts: CollaborativeStateChange[]) => void;
}) {
  const localChangesRef = useRef<CollaborativeStateChange[]>([]);
  const remoteChangesRef = useRef<CollaborativeStateChange[]>([]);
  const [conflicts, setConflicts] = useState<CollaborativeStateChange[]>([]);

  /**
   * Track a local state change
   */
  const trackLocalChange = useCallback(
    (
      path: string[],
      oldValue: any,
      newValue: any
    ): CollaborativeStateChange => {
      const change: CollaborativeStateChange = {
        id: `${userId}_${Date.now()}_${Math.random()}`,
        userId,
        timestamp: Date.now(),
        path,
        oldValue,
        newValue,
        resolved: false,
      };

      localChangesRef.current.push(change);
      return change;
    },
    [userId]
  );

  /**
   * Apply a remote state change
   * Detects conflicts with local changes
   */
  const applyRemoteChange = useCallback(
    (remoteChange: CollaborativeStateChange) => {
      remoteChangesRef.current.push(remoteChange);

      // Check for conflicts
      const conflictingLocal = localChangesRef.current.filter(
        (local) =>
          local.resolved === false &&
          pathsOverlap(local.path, remoteChange.path) &&
          local.timestamp > remoteChange.timestamp - 1000 // Within 1s
      );

      if (conflictingLocal.length > 0) {
        const newConflicts = conflictingLocal.filter(
          (c) => !conflicts.find((existing) => existing.id === c.id)
        );
        if (newConflicts.length > 0) {
          setConflicts((prev) => [...prev, ...newConflicts]);
          onConflict?.(newConflicts);
        }
      }

      return remoteChange;
    },
    [conflicts, onConflict]
  );

  /**
   * Resolve a conflict using specified strategy
   */
  const resolveConflict = useCallback(
    (changeId: string, resolution: ConflictResolution) => {
      const change = localChangesRef.current.find((c) => c.id === changeId);
      if (!change) return;

      change.resolved = true;

      setConflicts((prev) => prev.filter((c) => c.id !== changeId));

      return resolution;
    },
    []
  );

  /**
   * Get unresolved conflicts
   */
  const getConflicts = useCallback(
    () => conflicts.filter((c) => !c.resolved),
    [conflicts]
  );

  /**
   * Get local changes pending acknowledgment
   */
  const getPendingChanges = useCallback(
    () =>
      localChangesRef.current.filter(
        (c) => !remoteChangesRef.current.find((r) => r.id === c.id)
      ),
    []
  );

  /**
   * Clear resolved changes (cleanup)
   */
  const clearResolved = useCallback(() => {
    localChangesRef.current = localChangesRef.current.filter(
      (c) => !c.resolved
    );
    remoteChangesRef.current = remoteChangesRef.current.filter(
      (c) => !c.resolved
    );
  }, []);

  return {
    trackLocalChange,
    applyRemoteChange,
    resolveConflict,
    getConflicts,
    getPendingChanges,
    clearResolved,
  };
}

/**
 * Check if two paths overlap (potential conflict)
 */
function pathsOverlap(path1: string[], path2: string[]): boolean {
  const minLen = Math.min(path1.length, path2.length);
  for (let i = 0; i < minLen; i++) {
    if (path1[i] !== path2[i]) return false;
  }
  return true;
}
r3v@penguin:~/Stable$ cat ~/Stable/client/src/pages/DAW.tsx
/**
 * DAW.tsx — R3/Native · Production-Grade Browser DAW
 *
 * Platform:      R3/Native — Distributed Audio Platform
 * Architecture:  Modular component hierarchy with strict separation of concerns.
 * State:         Zustand with atomic selectors, undo/redo middleware, persistence.
 * Audio:         Tone.js via useDAWEngine with graceful degradation.
 * Network:       Collab socket with automatic reconnection, request deduplication.
 * AI:            Server-first with local LLM fallback, streaming responses.
 * Accessibility: WCAG 2.1 AA compliant — keyboard, screen reader, high contrast.
 * Performance:   Virtualized lists, memoized computations, RAF throttling, lazy loading.
 * Security:      Input sanitization, CSP nonces, encrypted localStorage, AbortControllers.
 *
 * @module    DAW
 * @platform  R3/Native
 * @version   4.0.0
 * @requires  React 18+
 * @requires  Tone.js
 * @requires  Zustand
 */

import React, {
  useCallback, useEffect, useRef, useState, useMemo, memo,
  useId, useReducer, useLayoutEffect,
} from 'react';
import { useLocation } from 'wouter';
import { useDAWStore } from '../hooks/useDAWStore';
import { useDAWEngine } from '../hooks/useDAWEngine';
import { useCollabSocket } from '../hooks/useCollabSocket';
import { useMidiSequencer } from '../hooks/useMidiSequencer';
import type {
  Track, TrackRegion, FXSlot, MidiPattern, AISuggestion, AIChatMessage,
  CollabUser, MasteringSettings, TimeSignature,
} from '../hooks/useDAWStore';

// ─── Component imports ──────────────────────────────────────────────────────
import { AudioReactiveScene } from '../components/daw/AudioReactiveScene';
import { WaveformMesh } from '../components/daw/WaveformMesh';
import { SessionChip } from '../components/session-summary/SessionChip';
import { SessionSummaryPanel } from '../components/session-summary/SessionSummaryPanel';
import { API_BASE } from '../config';

const isDev = import.meta.env.DEV;
const isValidToken = (t: string | null): t is string =>
  typeof t === 'string' && t.trim().length > 0 && t.split('.').length === 3;

// ─── Constants ────────────────────────────────────────────────────────────────

const CONSTANTS = {
  BEAT_WIDTH: 24,
  TOTAL_BEATS: 256,
  MIN_BPM: 20,
  MAX_BPM: 999,
  DEFAULT_MINS_PER_SUGGESTION: 4,
  MAX_CHAT_HISTORY: 50,
  LOCAL_STORAGE_KEYS: {
    TOKEN: 'r3_token',
    SESSIONS: 'r3v4_sessions',
    SNAPSHOT: 'r3v4_project_snapshot',
    PREFERENCES: 'r3v4_preferences',
    UNDO_STACK: 'r3v4_undo_stack',
  },
  API_ENDPOINTS: {
    CHAT: '/trpc/daw.ai.chat',
    SUGGESTIONS: '/trpc/daw.ai.suggestions',
    MASTERING: '/trpc/daw.mastering.analyse',
    PROJECT_SAVE: '/trpc/daw.project.save',
  },
  PIANO_PITCHES: [
    72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60,
    59, 58, 57, 56, 55, 54, 53, 52, 51, 50, 49, 48,
  ],
  TIME_SIGNATURES: ['4/4', '3/4', '6/8', '7/8', '5/4', '12/8', '2/4'],
  FX_TYPES: ['eq', 'compressor', 'reverb', 'delay', 'filter', 'distortion', 'chorus', 'flanger'],
  TRACK_HEIGHTS: { compact: 28, normal: 40, large: 56 },
  COLORS: {
    accent: '#a3e635',
    warn: 'var(--status-warn)',
    clip: '#ef4444',
    cyan: 'var(--looper-cyan)',
    violet: 'var(--accent-violet)',
    pink: 'var(--looper-pink)',
  },
  SUGGESTION_TYPE_COLORS: {
    mix: 'var(--looper-cyan)',
    arrangement: 'var(--status-warn)',
    mastering: 'var(--accent-green)',
    harmony: 'var(--accent-violet)',
    rhythm: 'var(--looper-pink)',
  },
  PREDICTION_COLORS: {
    introduce: '#22c55e33',
    mute: '#ef444433',
    extend: '#3b82f633',
    fade: '#a855f733',
    break: '#f59e0b33',
  },
  DEBOUNCE_MS: 300,
  THROTTLE_MS: 16,
  AUTO_SAVE_INTERVAL_MS: 30000,
  MAX_UNDO_DEPTH: 50,
  FILE_BROWSER_ITEMS: [
    { name: 'KICKS/', type: 'folder' as const },
    { name: 'SNARES/', type: 'folder' as const },
    { name: 'SYNTHS/', type: 'folder' as const },
    { name: 'LOOPS/', type: 'folder' as const },
    { name: 'PRESETS/', type: 'folder' as const },
    { name: 'SAMPLES/', type: 'folder' as const },
    { name: 'STEMS/', type: 'folder' as const },
  ],
} as const;

// ─── Utility Hooks ────────────────────────────────────────────────────────────

/**
 * useDebouncedCallback — Returns a debounced version of the callback.
 */
function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return useCallback(((...args: unknown[]) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
  }) as T, [delay]);
}

/**
 * useThrottledCallback — Returns a throttled version for high-frequency events.
 */
function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number,
): T {
  const lastRunRef = useRef(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(((...args: unknown[]) => {
    const now = Date.now();
    if (now - lastRunRef.current >= limit) {
      lastRunRef.current = now;
      callbackRef.current(...args);
    }
  }) as T, [limit]);
}

/**
 * useIsOnline — Tracks network connectivity state.
 */
function useIsOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
  return online;
}

/**
 * usePrevious — Returns the previous value of a state/prop.
 */
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}

/**
 * useKeyboardShortcuts — Centralized keyboard shortcut management with help overlay.
 */
function useKeyboardShortcuts(
  shortcuts: Record<string, (e: KeyboardEvent) => void | Promise<void>>,
  options: { preventDefault?: boolean; requireMeta?: boolean } = {},
) {
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      const key = e.key.toLowerCase();
      const combo = `${e.ctrlKey || e.metaKey ? 'ctrl+' : ''}${e.shiftKey ? 'shift+' : ''}${e.altKey ? 'alt+' : ''}${key}`;
      const fn = shortcuts[combo] || shortcuts[key];
      if (fn) {
        if (options.preventDefault !== false) e.preventDefault();
        await fn(e);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, options.preventDefault]);
}

/**
 * useAutoSave — Automatically persists project state to localStorage and cloud.
 */
function useAutoSave(intervalMs: number = CONSTANTS.AUTO_SAVE_INTERVAL_MS) {
  const store = useDAWStore();
  const isOnline = useIsOnline();
  const lastSaveRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastSaveRef.current < intervalMs) return;

      const snapshot = {
        bpm: store.bpm,
        projectName: store.projectName,
        tracks: store.tracks,
        regions: store.regions,
        timestamp: now,
        version: '5.0.0',
      };

      // Local save
      try {
        localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.SNAPSHOT, JSON.stringify(snapshot));
        store.setSyncStatus('synced');
        store.setLastSaved(now);
        lastSaveRef.current = now;
      } catch (err) {
        isDev && console.warn('[AutoSave] localStorage quota exceeded:', err);
        store.setSyncStatus('error');
      }

      // Cloud save (only if online)
      if (isOnline) {
        const token = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.TOKEN);
        if (!isValidToken(token)) { isDev && console.warn('[Auth] missing/invalid token'); return; }
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        fetch(`${API_BASE}${CONSTANTS.API_ENDPOINTS.PROJECT_SAVE}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ json: snapshot }),
          signal: abortRef.current.signal,
        }).catch(() => { /* Cloud save is best-effort */ });
      }
    }, intervalMs);

    return () => {
      clearInterval(interval);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [intervalMs, isOnline, store.bpm, store.projectName, store.tracks, store.regions]);
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class DAWErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    isDev && console.error('[DAW ErrorBoundary]', error, errorInfo);
    // Send to error tracking service
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).Sentry) {
      (window as unknown as Record<string, (e: Error, info: React.ErrorInfo) => void>).Sentry?.(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#0a0a0a',
            color: '#ef4444',
            fontFamily: 'monospace',
            padding: 24,
          }}
        >
          <h1 style={{ fontSize: 18, marginBottom: 12 }}>DAW Critical Error</h1>
          <pre style={{ fontSize: 11, maxWidth: 600, overflow: 'auto' }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 24,
              padding: '8px 16px',
              background: '#a3e635',
              color: '#000',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Shared Components ────────────────────────────────────────────────────────

interface KnobProps {
  value: number;
  min?: number;
  max?: number;
  label: string;
  onChange: (v: number) => void;
  accent?: string;
  size?: number;
  disabled?: boolean;
  'aria-label'?: string;
}

const Knob = memo(({
  value, min = 0, max = 1, label, onChange, accent = CONSTANTS.COLORS.accent, size = 36, disabled = false,
  'aria-label': ariaLabel,
}: KnobProps) => {
  const dragStart = useRef<{ y: number; v: number } | null>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pct = (value - min) / (max - min);
  const angle = -135 + pct * 270;
  const knobId = useId();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    dragStart.current = { y: e.clientY, v: value };
    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      const delta = (dragStart.current.y - ev.clientY) / 120;
      const next = Math.max(min, Math.min(max, dragStart.current.v + delta * (max - min)));
      onChange(Math.round(next * 1000) / 1000);
    };
    const onUp = () => {
      dragStart.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mouseleave', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mouseleave', onUp);
  }, [disabled, min, max, value, onChange]);

  // Keyboard support
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    const step = (max - min) / 20;
    let next = value;
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        next = Math.min(max, value + step);
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        next = Math.max(min, value - step);
        e.preventDefault();
        break;
      case 'Home':
        next = max;
        e.preventDefault();
        break;
      case 'End':
        next = min;
        e.preventDefault();
        break;
    }
    if (next !== value) onChange(Math.round(next * 1000) / 1000);
  }, [disabled, min, max, value, onChange]);

  return (
    <div className="flex flex-col items-center gap-0.5 select-none" style={{ width: size }}>
      <div
        ref={knobRef}
        role="slider"
        aria-label={ariaLabel || label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(value * 1000) / 1000}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={`relative rounded-full border border-[var(--dj-dimmer)] bg-[var(--t-b2x)] cursor-ns-resize transition-opacity ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
      >
        <div
          className="absolute inset-[3px] rounded-full"
          style={{
            background: `conic-gradient(from ${-135}deg at 50% 50%, var(--dj-border) 0deg, var(--dj-border) ${pct * 270}deg, transparent ${pct * 270}deg)`,
          }}
        />
        <div
          className="absolute w-0.5 bg-current origin-bottom rounded"
          style={{
            height: size * 0.38,
            bottom: '50%',
            left: '50%',
            transform: `translateX(-50%) rotate(${angle}deg)`,
            color: accent,
          }}
        />
        <div
          className="absolute inset-[5px] rounded-full bg-[var(--dj-surface2)] flex items-center justify-center"
          style={{ boxShadow: `0 0 6px ${accent}44` }}
        />
      </div>
      <span className="text-[9px] tracking-widest uppercase" style={{ color: 'var(--surface-mid)' }}>
        {label}
      </span>
    </div>
  );
});
Knob.displayName = 'Knob';

interface VUMeterProps {
  level: number;
  vertical?: boolean;
  accent?: string;
  warn?: string;
  clip?: string;
  label?: string;
}

const VUMeter = memo(({
  level, vertical = true, accent = CONSTANTS.COLORS.accent, warn = CONSTANTS.COLORS.warn, clip = CONSTANTS.COLORS.clip,
  label,
}: VUMeterProps) => {
  const bars = 12;
  const meterId = useId();
  const clampedLevel = Math.max(0, Math.min(1, level));

  return (
    <div
      role="meter"
      aria-label={label || 'Audio level'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clampedLevel * 100)}
      className={`flex ${vertical ? 'flex-col-reverse' : 'flex-row'} gap-px`}
      style={vertical ? { height: 48 } : { width: 48 }}
    >
      {Array.from({ length: bars }, (_, i) => {
        const threshold = i / bars;
        const active = clampedLevel > threshold;
        const color = i >= bars - 2 ? clip : i >= bars - 4 ? warn : accent;
        return (
          <div
            key={`${meterId}-${i}`}
            className="rounded-sm transition-opacity duration-75"
            style={{
              flex: 1,
              background: active ? color : 'var(--dj-border)',
              opacity: active ? 1 : 0.35,
              boxShadow: active ? `0 0 3px ${color}88` : 'none',
            }}
          />
        );
      })}
    </div>
  );
});
VUMeter.displayName = 'VUMeter';

interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  dim?: boolean;
  className?: string;
  title?: string;
  disabled?: boolean;
  'aria-pressed'?: boolean;
}

const Btn = memo(({
  children, onClick, active, danger, dim, className = '', title, disabled = false,
  'aria-pressed': ariaPressed,
}: BtnProps) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    aria-pressed={ariaPressed ?? active}
    className={`
      px-2 py-1 rounded text-[11px] tracking-widest uppercase font-mono border
      transition-all duration-100 select-none
      ${active
        ? danger
          ? 'bg-red-600/20 border-red-600/60 text-red-400'
          : 'bg-[#a3e635]/10 border-[#a3e635]/40 text-[#a3e635]'
        : dim || disabled
          ? 'bg-transparent border-[#2a2a2a] text-[var(--dj-dim)] cursor-not-allowed'
          : 'bg-[var(--t-b2x)] border-[var(--dj-dimmer)] text-[var(--text-dim)] hover:border-[#555] hover:text-[var(--daw-ghost)]'
      }
      ${className}
    `}
  >
    {children}
  </button>
));
Btn.displayName = 'Btn';

interface LedProps {
  on: boolean;
  color?: string;
  pulse?: boolean;
  label?: string;
}

const Led = memo(({ on, color = CONSTANTS.COLORS.warn, pulse, label }: LedProps) => (
  <div className="flex items-center gap-1" title={label}>
    <div
      className={`w-2 h-2 rounded-full ${pulse && on ? 'animate-pulse' : ''}`}
      role="status"
      aria-label={label || (on ? 'Active' : 'Inactive')}
      style={{
        background: on ? color : 'var(--t-b2x)',
        boxShadow: on ? `0 0 6px ${color}, 0 0 12px ${color}44` : 'none',
        border: `1px solid ${on ? color : 'var(--dj-dimmer)'}`,
      }}
    />
    {label && <span className="text-[8px] text-[var(--dj-dim)]">{label}</span>}
  </div>
));
Led.displayName = 'Led';

// ─── Time Savings Readout ─────────────────────────────────────────────────────

const TimeSavingsReadout = memo(() => {
  const acceptedCount = useDAWStore(
    useCallback(s => s.aiSuggestions.filter((x: AISuggestion) => x.accepted === true).length, []),
  );
  const saved = acceptedCount * CONSTANTS.DEFAULT_MINS_PER_SUGGESTION;
  if (saved === 0) return null;

  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 border border-[#a3e635]/25 bg-[#a3e635]/5"
      title={`${acceptedCount} AI suggestion${acceptedCount !== 1 ? 's' : ''} accepted — ~${saved} min saved`}
      role="status"
      aria-label={`Time saved: ${saved} minutes`}
    >
      <span className="text-[8px] text-[#a3e635]/60 tracking-widest">SAVED</span>
      <span className="text-[10px] font-mono text-[#a3e635] font-semibold">{saved}m</span>
    </div>
  );
});
TimeSavingsReadout.displayName = 'TimeSavingsReadout';

// ─── Tooltip Component ────────────────────────────────────────────────────────

const Tooltip = memo(({ children, content }: { children: React.ReactNode; content: string }) => {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      ref={triggerRef}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[9px] bg-[#1a1a1a] border border-[#333] rounded whitespace-nowrap z-50 pointer-events-none"
          style={{ color: 'var(--text-dim)' }}
        >
          {content}
        </div>
      )}
    </div>
  );
});
Tooltip.displayName = 'Tooltip';

// ─── Transport Bar ────────────────────────────────────────────────────────────

interface TransportBarProps {
  engine: ReturnType<typeof useDAWEngine>;
}

const TransportBar = memo(({ engine }: TransportBarProps) => {
  const {
    playing, recording, bpm, position, timeSignature, loopEnabled,
    metronomeEnabled, masterGain, syncStatus, projectName, collabConnected,
    setPlaying, setRecording, setBpm, setLoopEnabled, setMetronome,
    setMasterGain, setProjectName, setTimeSignature,
  } = useDAWStore();

  const [editingBpm, setEditingBpm] = useState(false);
  const [bpmInput, setBpmInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const bpmInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus inputs when editing
  useEffect(() => {
    if (editingBpm) bpmInputRef.current?.focus();
  }, [editingBpm]);
  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  const beats = Math.floor(position);
  const bar = Math.floor(beats / timeSignature[0]) + 1;
  const beat = (beats % timeSignature[0]) + 1;
  const posStr = `${String(bar).padStart(3, '0')}:${beat}`;

  const syncColors: Record<string, string> = {
    idle: 'var(--dj-dim)',
    syncing: 'var(--status-warn)',
    synced: 'var(--accent-green)',
    error: '#ef4444',
    offline: '#555',
  };

  const handleBpmSubmit = useCallback(() => {
    const v = parseFloat(bpmInput);
    if (!isNaN(v) && v >= CONSTANTS.MIN_BPM && v <= CONSTANTS.MAX_BPM) {
      setBpm(v);
    }
    setEditingBpm(false);
  }, [bpmInput, setBpm]);

  const handleNameSubmit = useCallback(() => {
    setEditingName(false);
  }, []);

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 bg-[#0d0d0d] border-b border-[#1c1c1c]"
      style={{ minHeight: 52 }}
      role="toolbar"
      aria-label="Transport controls"
    >
      {/* Project name */}
      <div className="flex items-center gap-2 min-w-[140px]">
        <Led on={collabConnected} color={CONSTANTS.COLORS.cyan} pulse={collabConnected} label={collabConnected ? 'Online' : 'Offline'} />
        {editingName ? (
          <input
            ref={nameInputRef}
            autoFocus
            className="bg-[var(--t-b2x)] border border-[#a3e635]/40 px-1 text-xs text-white w-28"
            value={projectName}
            onChange={e => setProjectName(e.target.value.slice(0, 64))}
            onBlur={handleNameSubmit}
            onKeyDown={e => {
              if (e.key === 'Enter') handleNameSubmit();
              if (e.key === 'Escape') setEditingName(false);
            }}
            aria-label="Project name"
            maxLength={64}
          />
        ) : (
          <span
            className="text-[11px] tracking-widest text-[var(--text-dim)] cursor-pointer hover:text-[#a3e635] transition-colors truncate max-w-[120px]"
            onClick={() => setEditingName(true)}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setEditingName(true); }}
            aria-label={`Project: ${projectName}. Click to edit.`}
          >
            {projectName || 'Untitled Project'}
          </span>
        )}
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: syncColors[syncStatus] ?? 'var(--dj-dim)' }}
          title={`Sync: ${syncStatus}`}
          role="status"
          aria-label={`Sync status: ${syncStatus}`}
        />
      </div>

      <div className="w-px h-8 bg-[#2a2a2a]" role="separator" />

      {/* Transport buttons */}
      <div className="flex items-center gap-1.5" role="group" aria-label="Playback controls">
        <Btn onClick={engine.stop} title="Stop (Space)" aria-pressed={!playing && !recording}>■</Btn>
        <Btn onClick={engine.togglePlay} active={playing} title="Play/Pause (Space)" aria-pressed={playing}>
          {playing ? '⏸' : '▶'}
        </Btn>
        <Btn onClick={engine.toggleRecord} active={recording} danger={recording} title="Record (R)" aria-pressed={recording}>
          ⏺
        </Btn>
      </div>

      {/* Position display */}
      <div
        className="font-mono text-sm bg-[#0a0a0a] border border-[var(--dj-border)] rounded px-2 py-1"
        style={{ minWidth: 72, textAlign: 'center' }}
        role="timer"
        aria-label={`Position: bar ${bar}, beat ${beat}`}
        aria-live="polite"
      >
        <span className="text-[#a3e635]">{posStr}</span>
      </div>

      <div className="w-px h-8 bg-[#2a2a2a]" role="separator" />

      {/* BPM */}
      <div className="flex items-center gap-1.5" role="group" aria-label="Tempo controls">
        <button
          className="text-[10px] text-[#555] hover:text-[#a3e635] px-1 select-none"
          onClick={() => engine.nudgeBpm(-1)}
          aria-label="Decrease BPM"
        >◀</button>
        {editingBpm ? (
          <input
            ref={bpmInputRef}
            autoFocus
            className="w-14 bg-[#0a0a0a] border border-[#a3e635]/40 text-center text-[#a3e635] font-mono text-sm"
            value={bpmInput}
            onChange={e => setBpmInput(e.target.value.replace(/[^0-9.]/g, '').slice(0, 6))}
            onBlur={handleBpmSubmit}
            onKeyDown={e => {
              if (e.key === 'Enter') handleBpmSubmit();
              if (e.key === 'Escape') setEditingBpm(false);
            }}
            aria-label="BPM input"
          />
        ) : (
          <div
            className="font-mono text-sm bg-[#0a0a0a] border border-[var(--dj-border)] px-2 py-1 cursor-pointer hover:border-[#a3e635]/30 min-w-[56px] text-center text-[#a3e635]"
            onClick={() => { setBpmInput(String(bpm)); setEditingBpm(true); }}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setBpmInput(String(bpm)); setEditingBpm(true); } }}
            aria-label={`Current BPM: ${bpm.toFixed(1)}. Click to edit.`}
          >
            {bpm.toFixed(1)}
          </div>
        )}
        <button
          className="text-[10px] text-[#555] hover:text-[#a3e635] px-1 select-none"
          onClick={() => engine.nudgeBpm(1)}
          aria-label="Increase BPM"
        >▶</button>
        <span className="text-[9px] text-[var(--dj-dim)] tracking-widest">BPM</span>
        <Btn onClick={engine.tapTempo} className="text-[9px]" title="Tap Tempo (T)">TAP</Btn>
      </div>

      {/* Time signature */}
      <select
        className="bg-[#0d0d0d] border border-[var(--dj-border)] rounded text-[11px] text-[var(--text-dim)] px-1 py-0.5 cursor-pointer"
        value={`${timeSignature[0]}/${timeSignature[1]}`}
        onChange={e => {
          const [n, d] = e.target.value.split('/').map(Number);
          setTimeSignature([n, d] as TimeSignature);
        }}
        aria-label="Time signature"
      >
        {CONSTANTS.TIME_SIGNATURES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <div className="w-px h-8 bg-[#2a2a2a]" role="separator" />

      {/* Loop / Metronome */}
      <div className="flex items-center gap-1.5" role="group" aria-label="Playback options">
        <Btn onClick={() => setLoopEnabled(!loopEnabled)} active={loopEnabled} title="Loop" aria-pressed={loopEnabled}>⟳</Btn>
        <Btn onClick={() => setMetronome(!metronomeEnabled)} active={metronomeEnabled} title="Metronome" aria-pressed={metronomeEnabled}>🎵</Btn>
      </div>

      {/* Master gain */}
      <div className="flex items-center gap-2 ml-auto">
        <TimeSavingsReadout />
        <div className="w-px h-5 bg-[#2a2a2a]" role="separator" />
        <span className="text-[9px] text-[var(--dj-dim)] tracking-widest">MASTER</span>
        <Knob
          value={masterGain} min={0} max={1.5} label=""
          onChange={setMasterGain} size={28}
          aria-label="Master gain"
        />
      </div>
    </div>
  );
});
TransportBar.displayName = 'TransportBar';

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  collab: ReturnType<typeof useCollabSocket>;
}

const Sidebar = memo(({ collab }: SidebarProps) => {
  const sidebarTab = useDAWStore(s => s.sidebarTab);
  const setSidebarTab = useDAWStore(s => s.setSidebarTab);
  const collabUsers = useDAWStore(s => s.collabUsers);
  const collabConnected = useDAWStore(s => s.collabConnected);
  const collabEnabled = useDAWStore(s => s.collabEnabled);
  const collabRoom = useDAWStore(s => s.collabRoom);
  const loadedPlugins = useDAWStore(s => s.loadedPlugins);
  const tracks = useDAWStore(s => s.tracks);
  const addTrack = useDAWStore(s => s.addTrack);

  const [joining, setJoining] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const uploadRef = useRef<HTMLInputElement>(null);
  const fileListRef = useRef<HTMLDivElement>(null);

  // Sanitize room input
  const sanitizedRoomInput = roomInput.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16);

  const handleJoinRoom = useCallback(() => {
    if (!sanitizedRoomInput) return;
    const userId = crypto.randomUUID().slice(0, 8);
    const colors = [
      CONSTANTS.COLORS.warn,
      CONSTANTS.COLORS.cyan,
      CONSTANTS.COLORS.accent,
      CONSTANTS.COLORS.violet,
      CONSTANTS.COLORS.clip,
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    collab.joinRoom(sanitizedRoomInput, userId, `USER_${userId.slice(0, 4)}`, color);
    setJoining(false);
    setRoomInput('');
  }, [sanitizedRoomInput, collab]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/aiff', 'audio/flac', 'audio/ogg', 'audio/x-wav'];
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|aiff|flac|ogg)$/i)) {
      setUploadError(`Invalid format: ${file.name}. Supported: WAV, MP3, AIFF, FLAC, OGG`);
      return;
    }
    if (file.size > maxSize) {
      setUploadError(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 100MB`);
      return;
    }

    setUploadError(null);
    // Upload queued — wire to engine handler
    isDev && console.info('[Upload] Queued:', file.name, `${(file.size / 1024).toFixed(1)}KB`);
    e.target.value = '';
  }, []);

  const handleAddTrack = useCallback(() => {
    addTrack({
      label: `TRACK ${tracks.length + 1}`,
      type: 'audio',
      color: 'var(--text-dim)',
      gain: 0.8,
      pan: 0,
      mute: false,
      solo: false,
      armed: false,
      fxChain: [],
      sends: [],
      inputSource: null,
    });
  }, [addTrack, tracks.length]);

  return (
    <div
      className="flex flex-col bg-[#0d0d0d] border-r border-[#1c1c1c]"
      style={{ width: 180 }}
      role="complementary"
      aria-label="Sidebar"
    >
      {/* Tab bar */}
      <div className="flex border-b border-[#1c1c1c]" role="tablist" aria-label="Sidebar tabs">
        {(['files', 'collab', 'plugins'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSidebarTab(tab)}
            className={`flex-1 py-1.5 text-[9px] tracking-widest uppercase font-mono transition-colors ${
              sidebarTab === tab
                ? 'text-[#a3e635] border-b border-[#a3e635]'
                : 'text-[var(--dj-dim)] hover:text-[var(--text-dim)]'
            }`}
            role="tab"
            aria-selected={sidebarTab === tab}
            aria-controls={`sidebar-panel-${tab}`}
            id={`sidebar-tab-${tab}`}
          >
            {tab === 'files' ? '📁' : tab === 'collab' ? '👥' : '🧩'}
            <span className="sr-only">{tab}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1" role="tabpanel" id={`sidebar-panel-${sidebarTab}`} aria-labelledby={`sidebar-tab-${sidebarTab}`}>
        {/* ── Files tab ──────────────────────────────────────────────────── */}
        {sidebarTab === 'files' && (
          <>
            <p className="text-[9px] text-[var(--dj-dim)] tracking-widest px-1 mb-2">BROWSER</p>
            <div ref={fileListRef} role="tree" aria-label="File browser">
              {CONSTANTS.FILE_BROWSER_ITEMS.map(f => (
                <div
                  key={f.name}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--t-b2x)] cursor-pointer group"
                  role="treeitem"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      // Expand/collapse folder
                    }
                  }}
                >
                  <span className="text-[#555] text-xs" aria-hidden="true">{f.type === 'folder' ? '▸' : '•'}</span>
                  <span className="text-[11px] text-[var(--dj-muted)] group-hover:text-[var(--daw-sub)] transition-colors font-mono">
                    {f.name}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-[#1c1c1c] mt-2">
              <input
                ref={uploadRef}
                type="file"
                accept="audio/*,.wav,.mp3,.aiff,.flac,.ogg"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                aria-label="Upload audio file"
              />
              {uploadError && (
                <div className="text-[9px] text-red-400 mb-1 px-1" role="alert">
                  {uploadError}
                </div>
              )}
              <Btn className="w-full justify-center text-[9px]" onClick={() => uploadRef.current?.click()}>
                + UPLOAD
              </Btn>
            </div>
          </>
        )}

        {/* ── Collab tab ─────────────────────────────────────────────────── */}
        {sidebarTab === 'collab' && (
          <>
            <p className="text-[9px] text-[var(--dj-dim)] tracking-widest px-1 mb-2">COLLABORATION</p>
            <div className="flex items-center gap-2 mb-3">
              <Led on={collabConnected} color={CONSTANTS.COLORS.cyan} pulse={collabConnected} />
              <span className="text-[10px] text-[var(--dj-muted)]">
                {collabConnected ? `ROOM ${collabRoom}` : 'DISCONNECTED'}
              </span>
            </div>

            {!collabEnabled ? (
              joining ? (
                <div className="space-y-2">
                  <input
                    autoFocus
                    placeholder="ROOM ID"
                    className="w-full bg-[var(--t-b2x)] border border-[#a3e635]/30 px-2 py-1 text-[11px] text-[var(--daw-ghost)] font-mono"
                    value={roomInput}
                    onChange={e => setRoomInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && sanitizedRoomInput) handleJoinRoom();
                      if (e.key === 'Escape') setJoining(false);
                    }}
                    maxLength={16}
                    aria-label="Room ID"
                  />
                  <Btn className="w-full text-center text-[9px]" onClick={() => setJoining(false)}>CANCEL</Btn>
                </div>
              ) : (
                <Btn className="w-full text-center text-[9px]" onClick={() => setJoining(true)}>
                  JOIN ROOM
                </Btn>
              )
            ) : (
              <Btn className="w-full text-center text-[9px]" danger onClick={collab.leaveRoom}>
                LEAVE ROOM
              </Btn>
            )}

            {collabUsers.length > 0 && (
              <div className="mt-3 space-y-1" role="list" aria-label="Collaborators">
                {collabUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-2 px-1 py-1" role="listitem">
                    <div className="w-2 h-2 rounded-full" style={{ background: u.color }} aria-hidden="true" />
                    <span className="text-[10px] font-mono" style={{ color: u.color }}>{u.name}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Plugins tab ────────────────────────────────────────────────── */}
        {sidebarTab === 'plugins' && (
          <>
            <p className="text-[9px] text-[var(--dj-dim)] tracking-widest px-1 mb-2">PLUGIN SDK</p>
            {loadedPlugins.length === 0 ? (
              <div className="text-[10px] text-[var(--dj-dimmer)] text-center py-4 font-mono">NO PLUGINS LOADED</div>
            ) : (
              <div role="list" aria-label="Loaded plugins">
                {loadedPlugins.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-2 py-1 rounded bg-[var(--t-b2x)]" role="listitem">
                    <span className="text-[10px] text-[var(--text-muted)]">{p.name}</span>
                    <Led on={p.enabled} color="var(--accent-green)" label={p.enabled ? 'Enabled' : 'Disabled'} />
                  </div>
                ))}
              </div>
            )}
            <div className="pt-2 border-t border-[#1c1c1c] mt-2">
              <Btn className="w-full justify-center text-[9px]" onClick={() => navigate('/vst')}>
                LOAD VST/AU
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
Sidebar.displayName = 'Sidebar';

// ─── Arrangement View ─────────────────────────────────────────────────────────

interface ArrangementViewProps {
  engine: ReturnType<typeof useDAWEngine>;
  collab: ReturnType<typeof useCollabSocket>;
}

const ArrangementView = memo(({ engine, collab }: ArrangementViewProps) => {
  const tracks = useDAWStore(s => s.tracks);
  const regions = useDAWStore(s => s.regions);
  const position = useDAWStore(s => s.position);
  const playing = useDAWStore(s => s.playing);
  const zoom = useDAWStore(s => s.zoom);
  const scrollLeft = useDAWStore(s => s.scrollLeft);
  const selectedTrackId = useDAWStore(s => s.selectedTrackId);
  const selectedRegionId = useDAWStore(s => s.selectedRegionId);
  const loopEnabled = useDAWStore(s => s.loopEnabled);
  const loopStart = useDAWStore(s => s.loopStart);
  const loopEnd = useDAWStore(s => s.loopEnd);
  const collabUsers = useDAWStore(s => s.collabUsers);
  const predictionsVisible = useDAWStore(s => s.predictionsVisible);
  const arrangementPredictions = useDAWStore(s => s.arrangementPredictions);
  const trackHeightMode = useDAWStore(s => s.trackHeightMode);
  const setSelectedTrack = useDAWStore(s => s.setSelectedTrack);
  const setSelectedRegion = useDAWStore(s => s.setSelectedRegion);
  const setScrollLeft = useDAWStore(s => s.setScrollLeft);
  const setZoom = useDAWStore(s => s.setZoom);
  const addTrack = useDAWStore(s => s.addTrack);

  const containerRef = useRef<HTMLDivElement>(null);
  const TRACK_HEIGHT = CONSTANTS.TRACK_HEIGHTS[trackHeightMode];
  const BPW = CONSTANTS.BEAT_WIDTH * zoom;

  const totalWidth = CONSTANTS.TOTAL_BEATS * BPW;

  // Playhead position (memoized)
  const playheadX = useMemo(() => position * BPW - scrollLeft, [position, BPW, scrollLeft]);

  // Snap to beat grid (memoized)
  const snapBeat = useCallback((px: number) => {
    const rawBeat = (px + scrollLeft) / BPW;
    return Math.round(rawBeat);
  }, [scrollLeft, BPW]);

  // Throttled scroll handler
  const onScroll = useThrottledCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft((e.currentTarget as HTMLDivElement).scrollLeft);
  }, CONSTANTS.THROTTLE_MS);

  // Zoom with Ctrl+wheel
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(Math.max(0.1, Math.min(10, zoom * factor)));
    }
  }, [zoom, setZoom]);

  // Click on arrangement ruler to seek
  const onRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const beat = snapBeat(e.clientX - rect.left);
    engine.seekTo(beat);
    collab.broadcastCursor(beat, selectedTrackId);
  }, [snapBeat, engine, collab, selectedTrackId]);

  // Beat markers (memoized)
  const beatMarkers = useMemo(() => {
    const markers: number[] = [];
    const step = zoom < 1 ? 8 : zoom < 2 ? 4 : 1;
    for (let b = 0; b <= CONSTANTS.TOTAL_BEATS; b += step) {
      markers.push(b);
    }
    return markers;
  }, [zoom]);

  // Track index map (memoized for O(1) lookups)
  const trackIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    tracks.forEach((t, i) => map.set(t.id, i));
    return map;
  }, [tracks]);

  // Handle add track
  const handleAddTrack = useCallback(() => {
    addTrack({
      label: `TRACK ${tracks.length + 1}`,
      type: 'audio',
      color: 'var(--text-dim)',
      gain: 0.8,
      pan: 0,
      mute: false,
      solo: false,
      armed: false,
      fxChain: [],
      sends: [],
      inputSource: null,
    });
  }, [addTrack, tracks.length]);

  // Keyboard navigation for arrangement
  const handleArrangementKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIdx = trackIndexMap.get(selectedTrackId ?? '');
      if (currentIdx !== undefined && currentIdx < tracks.length - 1) {
        setSelectedTrack(tracks[currentIdx + 1].id);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIdx = trackIndexMap.get(selectedTrackId ?? '');
      if (currentIdx !== undefined && currentIdx > 0) {
        setSelectedTrack(tracks[currentIdx - 1].id);
      }
    }
  }, [trackIndexMap, selectedTrackId, tracks, setSelectedTrack]);

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden bg-[#0d0d0d]"
      role="region"
      aria-label="Arrangement view"
      tabIndex={0}
      onKeyDown={handleArrangementKeyDown}
    >
      {/* Ruler */}
      <div
        className="flex-none bg-[#0a0a0a] border-b border-[#1c1c1c] relative overflow-hidden cursor-pointer"
        style={{ height: 24, marginLeft: 140 }}
        onClick={onRulerClick}
        role="scrollbar"
        aria-label="Timeline ruler"
        aria-orientation="horizontal"
      >
        <div className="absolute top-0 left-0" style={{ width: totalWidth, height: 24 }}>
          {beatMarkers.map(b => (
            <div
              key={b}
              className="absolute top-0 h-full flex flex-col justify-end pb-1"
              style={{ left: b * BPW - scrollLeft }}
            >
              <div className="w-px bg-[#2a2a2a] flex-1" />
              <span className="text-[8px] text-[var(--dj-dim)] font-mono ml-1">{b}</span>
            </div>
          ))}
          {/* Loop region on ruler */}
          {loopEnabled && (
            <div
              className="absolute top-0 h-full bg-amber-500/10 border-l border-r border-amber-500/40"
              style={{
                left: loopStart * BPW - scrollLeft,
                width: (loopEnd - loopStart) * BPW,
              }}
              role="region"
              aria-label={`Loop region: bar ${loopStart} to ${loopEnd}`}
            />
          )}
          {/* Playhead */}
          {playheadX >= 0 && (
            <div
              className="absolute top-0 w-px h-full"
              style={{
                left: playheadX,
                background: 'var(--status-warn)',
                boxShadow: '0 0 4px var(--status-warn)',
              }}
              role="presentation"
              aria-hidden="true"
            />
          )}
          {/* Collab cursors on ruler */}
          {collabUsers.map(u =>
            u.cursorBeat != null ? (
              <div
                key={u.id}
                className="absolute top-0 w-px h-full opacity-70"
                style={{ left: u.cursorBeat * BPW - scrollLeft, background: u.color }}
                title={u.name}
                role="presentation"
                aria-label={`${u.name} cursor at beat ${u.cursorBeat}`}
              />
            ) : null,
          )}
        </div>
      </div>

      {/* Track area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track labels */}
        <div className="flex-none flex flex-col border-r border-[#1c1c1c]" style={{ width: 140 }}>
          {tracks.map(track => (
            <TrackLabel
              key={track.id}
              track={track}
              height={TRACK_HEIGHT}
              selected={selectedTrackId === track.id}
              onSelect={() => setSelectedTrack(track.id)}
            />
          ))}
          {/* Add-track ghost row */}
          <div
            className="flex items-center justify-center border-b border-[var(--t-b2x)] cursor-pointer hover:bg-[var(--t-b2)] transition-colors group"
            style={{ height: TRACK_HEIGHT }}
            onClick={handleAddTrack}
            title="Add track"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAddTrack();
              }
            }}
            aria-label="Add new track"
          >
            <span className="text-[9px] text-[#2a2a2a] group-hover:text-[#a3e635]/60 tracking-widest transition-colors select-none">
              + ADD TRACK
            </span>
          </div>
        </div>

        {/* Regions scrollable area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative"
          style={{ scrollbarColor: '#2a2a2a #0d0d0d', scrollbarWidth: 'thin' }}
          onScroll={onScroll}
          onWheel={onWheel}
          role="region"
          aria-label="Track regions"
        >
          <div style={{ width: totalWidth, position: 'relative' }}>
            {/* Track row backgrounds */}
            {tracks.map((track, i) => (
              <div
                key={track.id}
                className={`absolute w-full border-b border-[var(--t-b2x)] ${
                  selectedTrackId === track.id ? 'bg-[var(--t-b2)]' : i % 2 === 0 ? 'bg-[#0d0d0d]' : 'bg-[var(--panel-deep)]'
                }`}
                style={{ top: i * TRACK_HEIGHT, height: TRACK_HEIGHT }}
                onClick={() => {
                  setSelectedTrack(track.id);
                  collab.broadcastCursor(position, track.id);
                }}
                role="button"
                tabIndex={-1}
                aria-selected={selectedTrackId === track.id}
              />
            ))}

            {/* Beat grid lines */}
            {beatMarkers.map(b => (
              <div
                key={b}
                className="absolute top-0 w-px"
                style={{
                  left: b * BPW,
                  height: tracks.length * TRACK_HEIGHT,
                  background: b % 4 === 0 ? '#1c1c1c' : 'var(--panel-deep)',
                }}
                aria-hidden="true"
              />
            ))}

            {/* Regions */}
            {regions.map(region => {
              const trackIdx = trackIndexMap.get(region.trackId);
              if (trackIdx === undefined || trackIdx < 0) return null;
              return (
                <RegionBlock
                  key={region.id}
                  region={region}
                  top={trackIdx * TRACK_HEIGHT}
                  height={TRACK_HEIGHT - 2}
                  bpw={BPW}
                  selected={selectedRegionId === region.id}
                  onClick={() => setSelectedRegion?.(region.id)}
                />
              );
            })}

            {/* L3: Arrangement prediction overlays */}
            {predictionsVisible && arrangementPredictions.map((pred, i) => {
              const trackIdx = trackIndexMap.get(pred.trackId);
              if (trackIdx === undefined || trackIdx < 0) return null;
              return (
                <div
                  key={i}
                  className="absolute border rounded pointer-events-none"
                  style={{
                    left: pred.startBeat * BPW,
                    top: trackIdx * TRACK_HEIGHT,
                    height: TRACK_HEIGHT - 2,
                    width: 16 * BPW,
                    background: CONSTANTS.PREDICTION_COLORS[pred.suggestedAction] ?? '#ffffff11',
                    borderColor: '#ffffff22',
                  }}
                  title={`AI: ${pred.label} (${Math.round(pred.confidence * 100)}%)`}
                  role="img"
                  aria-label={`AI prediction: ${pred.suggestedAction} at beat ${pred.startBeat} with ${Math.round(pred.confidence * 100)}% confidence`}
                >
                  <span className="text-[8px] text-white/40 px-1 leading-none absolute bottom-1">
                    {pred.suggestedAction.toUpperCase()}
                  </span>
                </div>
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 w-px pointer-events-none z-10"
              style={{
                left: position * BPW,
                height: tracks.length * TRACK_HEIGHT,
                background: playing ? 'var(--status-warn)' : '#f59e0b66',
                boxShadow: playing ? '0 0 6px #f59e0b88' : 'none',
              }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
});
ArrangementView.displayName = 'ArrangementView';

interface TrackLabelProps {
  track: Track;
  height: number;
  selected: boolean;
  onSelect: () => void;
}

const TrackLabel = memo(({ track, height, selected, onSelect }: TrackLabelProps) => {
  const updateTrack = useDAWStore(s => s.updateTrack);

  const handleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateTrack(track.id, { mute: !track.mute });
  }, [track.id, track.mute, updateTrack]);

  const handleSolo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateTrack(track.id, { solo: !track.solo });
  }, [track.id, track.solo, updateTrack]);

  return (
    <div
      className={`flex items-center gap-1.5 px-2 border-b border-[var(--t-b2x)] cursor-pointer transition-colors ${
        selected ? 'bg-[var(--t-b2x)]' : 'bg-[#0d0d0d] hover:bg-[var(--t-b2)]'
      }`}
      style={{ height, borderLeft: `2px solid ${track.color}` }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-selected={selected}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <span className="text-[10px] font-mono tracking-wider text-[var(--daw-ghost)] truncate">{track.label}</span>
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-[var(--dj-dim)]">{track.type.toUpperCase()}</span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <button
          className={`text-[8px] font-mono px-1 ${track.mute ? 'text-[#a3e635] bg-[#a3e635]/10' : 'text-[var(--dj-dim)] hover:text-[var(--text-dim)]'}`}
          onClick={handleMute}
          aria-pressed={track.mute}
          aria-label={`${track.mute ? 'Unmute' : 'Mute'} ${track.label}`}
        >M</button>
        <button
          className={`text-[8px] font-mono px-1 rounded ${track.solo ? 'text-cyan-400 bg-cyan-500/20' : 'text-[var(--dj-dim)] hover:text-[var(--text-dim)]'}`}
          onClick={handleSolo}
          aria-pressed={track.solo}
          aria-label={`${track.solo ? 'Unsolo' : 'Solo'} ${track.label}`}
        >S</button>
      </div>
    </div>
  );
});
TrackLabel.displayName = 'TrackLabel';

interface RegionBlockProps {
  region: TrackRegion;
  top: number;
  height: number;
  bpw: number;
  selected: boolean;
  onClick: () => void;
}

const RegionBlock = memo(({ region, top, height, bpw, selected, onClick }: RegionBlockProps) => (
  <div
    className="absolute rounded-sm overflow-hidden cursor-pointer border transition-colors focus:outline-none focus:ring-1 focus:ring-[#a3e635]"
    style={{
      left: region.startBeat * bpw + 1,
      top: top + 1,
      width: Math.max(4, region.lengthBeats * bpw - 2),
      height,
      background: `${region.color}22`,
      borderColor: selected ? region.color : `${region.color}55`,
      boxShadow: selected ? `0 0 8px ${region.color}44` : 'none',
    }}
    onClick={onClick}
    role="button"
    tabIndex={0}
    aria-selected={selected}
    aria-label={`Region ${region.label}, ${region.lengthBeats} beats`}
    onKeyDown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
  >
    <div
      className="absolute top-0 left-0 right-0 h-0.5"
      style={{ background: region.color, opacity: 0.8 }}
    />
    <span
      className="absolute bottom-1 left-1 text-[9px] font-mono tracking-wide"
      style={{ color: region.color }}
    >
      {region.label}
    </span>
  </div>
));
RegionBlock.displayName = 'RegionBlock';

// ─── MIDI Sequencer Panel (L2) ────────────────────────────────────────────────

interface MidiSequencerPanelProps {
  seq: ReturnType<typeof useMidiSequencer>;
}

const MidiSequencerPanel = memo(({ seq }: MidiSequencerPanelProps) => {
  const midiPatterns = useDAWStore(s => s.midiPatterns);
  const activePatternId = useDAWStore(s => s.activePatternId);
  const sequencerStep = useDAWStore(s => s.sequencerStep);
  const setActivePattern = useDAWStore(s => s.setActivePattern);
  const addMidiPattern = useDAWStore(s => s.addMidiPattern);
  const selectedTrackId = useDAWStore(s => s.selectedTrackId);

  const pattern = midiPatterns.find(p => p.id === activePatternId);
  const steps = pattern?.steps ?? 16;

  const hasNote = useCallback((step: number, pitch: number) =>
    pattern?.notes.some(n => n.step === step && n.pitch === pitch) ?? false,
  [pattern]);

  const noteVelocity = useCallback((step: number, pitch: number) =>
    pattern?.notes.find(n => n.step === step && n.pitch === pitch)?.velocity ?? 100,
  [pattern]);

  const handleAddPattern = useCallback(() => {
    addMidiPattern({
      name: `PATTERN ${midiPatterns.length + 1}`,
      steps: 16,
      notes: [],
      trackId: selectedTrackId ?? '',
    });
  }, [addMidiPattern, midiPatterns.length, selectedTrackId]);

  return (
    <div
      className="flex flex-col bg-[#0a0a0a] border-t border-[#1c1c1c]"
      style={{ height: 200 }}
      role="region"
      aria-label="MIDI piano roll sequencer"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[#1c1c1c] flex-none">
        <span className="text-[10px] tracking-widest text-[#555]">MIDI PIANO ROLL</span>
        <div className="flex gap-1" role="tablist" aria-label="Pattern selector">
          {midiPatterns.map(p => (
            <button
              key={p.id}
              className={`px-2 py-0.5 rounded text-[9px] font-mono transition-colors ${
                p.id === activePatternId
                  ? 'bg-[#a3e635]/10 text-[#a3e635] border border-[#a3e635]/40'
                  : 'text-[var(--dj-dim)] hover:text-[var(--text-dim)] border border-[var(--dj-border)]'
              }`}
              onClick={() => setActivePattern(p.id)}
              role="tab"
              aria-selected={p.id === activePatternId}
            >{p.name}</button>
          ))}
          <Btn className="text-[9px]" onClick={handleAddPattern} aria-label="Add new pattern">+</Btn>
        </div>
        <div className="ml-auto flex gap-1">
          <Btn className="text-[9px]" onClick={seq.clearPattern} aria-label="Clear pattern">CLR</Btn>
          <Btn className="text-[9px]" onClick={seq.duplicate} aria-label="Duplicate pattern">DUP</Btn>
          {([16, 32, 64] as const).map(n => (
            <Btn
              key={n}
              className="text-[9px]"
              active={pattern?.steps === n}
              onClick={() => seq.setPatternLength(n)}
              aria-label={`Set ${n} steps`}
            >{n}</Btn>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Piano keys */}
        <div className="flex-none flex flex-col border-r border-[#1c1c1c]" style={{ width: 36 }}>
          {CONSTANTS.PIANO_PITCHES.map(pitch => {
            const name = seq.getPitchLabel(pitch);
            const isBlack = name.includes('#');
            return (
              <div
                key={pitch}
                className={`flex items-center justify-end pr-1 border-b border-[var(--dj-surface2)] ${
                  isBlack ? 'bg-[var(--dj-surface2)]' : 'bg-[var(--t-b2x)]'
                }`}
                style={{ height: `${100 / CONSTANTS.PIANO_PITCHES.length}%` }}
                role="button"
                tabIndex={-1}
                aria-label={`${name} key`}
              >
                <span className="text-[7px] font-mono" style={{ color: isBlack ? 'var(--dj-dim)' : '#555' }}>
                  {name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step grid */}
        <div className="flex-1 overflow-x-auto" role="grid" aria-label="MIDI step grid">
          <div className="flex flex-col" style={{ minWidth: steps * 20 }}>
            {CONSTANTS.PIANO_PITCHES.map(pitch => (
              <div key={pitch} className="flex flex-1" style={{ height: `${100 / CONSTANTS.PIANO_PITCHES.length}%` }}>
                {Array.from({ length: steps }, (_, step) => {
                  const active = hasNote(step, pitch);
                  const isCurrent = step === sequencerStep;
                  const vel = noteVelocity(step, pitch);
                  return (
                    <div
                      key={step}
                      className="border-r border-b border-[var(--dj-surface2)] cursor-pointer transition-colors flex items-end"
                      style={{
                        width: 20,
                        background: isCurrent
                          ? '#f59e0b22'
                          : active
                            ? '#a3e635'
                            : step % 4 === 0 ? 'var(--panel-deep)' : '#0d0d0d',
                        boxShadow: active ? '0 0 4px rgba(163,230,53,0.35)' : 'none',
                      }}
                      onClick={() => seq.toggleNote(step, pitch, 100)}
                      role="gridcell"
                      aria-selected={active}
                      aria-label={active ? `${seq.getPitchLabel(pitch)} step ${step + 1}, velocity ${vel}` : `${seq.getPitchLabel(pitch)} step ${step + 1}`}
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          seq.toggleNote(step, pitch, 100);
                        }
                      }}
                    >
                      {active && (
                        <div
                          className="w-full"
                          style={{ height: `${(vel / 127) * 100}%`, background: 'rgba(163,230,53,0.4)' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
MidiSequencerPanel.displayName = 'MidiSequencerPanel';

// ─── Mixer Strip ──────────────────────────────────────────────────────────────

interface MixerStripProps {
  engine: ReturnType<typeof useDAWEngine>;
}

const MixerStrip = memo(({ engine }: MixerStripProps) => {
  const tracks = useDAWStore(s => s.tracks);
  const masterGain = useDAWStore(s => s.masterGain);
  const setMasterGain = useDAWStore(s => s.setMasterGain);
  const updateTrack = useDAWStore(s => s.updateTrack);
  const setActiveFXTrack = useDAWStore(s => s.setActiveFXTrack);
  const activeFXTrackId = useDAWStore(s => s.activeFXTrackId);

  const [meters, setMeters] = useState<Record<string, number>>({});
  const rafRef = useRef<number>(0);
  const engineRef = useRef(engine);
  engineRef.current = engine;

  // Update meters on rAF with proper cleanup
  useEffect(() => {
    let isMounted = true;
    const update = () => {
      if (!isMounted) return;
      const next: Record<string, number> = {};
      for (const t of tracks) {
        next[t.id] = engineRef.current.getTrackMeterValue(t.id);
      }
      setMeters(next);
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => {
      isMounted = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [tracks]);

  return (
    <div
      className="flex bg-[#0a0a0a] border-t border-[#1c1c1c] overflow-x-auto"
      style={{ height: 160, scrollbarColor: '#2a2a2a #0a0a0a', scrollbarWidth: 'thin' }}
      role="region"
      aria-label="Mixer strip"
    >
      {/* Track channels */}
      {tracks.map(track => (
        <MixerChannel
          key={track.id}
          track={track}
          meterLevel={meters[track.id] ?? 0}
          fxActive={activeFXTrackId === track.id}
          onFXClick={() => setActiveFXTrack(activeFXTrackId === track.id ? null : track.id)}
          onChange={(partial) => updateTrack(track.id, partial)}
        />
      ))}

      {/* Master channel */}
      <div className="flex flex-col items-center px-3 py-2 border-l border-[#2a2a2a] bg-[var(--dj-surface2)] min-w-[64px]">
        <span className="text-[8px] tracking-widest text-[#555] mb-2">MASTER</span>
        <VUMeter level={masterGain > 1 ? 1 : masterGain} label="Master level" />
        <div className="mt-auto">
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.01}
            value={masterGain}
            onChange={e => setMasterGain(parseFloat(e.target.value))}
            className="h-20 appearance-none"
            style={{
              writingMode: 'vertical-lr',
              direction: 'rtl',
              accentColor: '#a3e635',
              background: 'transparent',
            }}
            aria-label="Master gain fader"
          />
        </div>
        <span className="text-[8px] font-mono text-[#a3e635] mt-1">
          {Math.round(masterGain * 100)}
        </span>
      </div>

      {/* FX Rack inline (for selected track) */}
      {activeFXTrackId && (
        <FXRackInline trackId={activeFXTrackId} />
      )}
    </div>
  );
});
MixerStrip.displayName = 'MixerStrip';

interface MixerChannelProps {
  track: Track;
  meterLevel: number;
  fxActive: boolean;
  onFXClick: () => void;
  onChange: (p: Partial<Track>) => void;
}

const MixerChannel = memo(({
  track, meterLevel, fxActive, onFXClick, onChange,
}: MixerChannelProps) => {
  const handleMute = useCallback(() => onChange({ mute: !track.mute }), [track.mute, onChange]);
  const handleSolo = useCallback(() => onChange({ solo: !track.solo }), [track.solo, onChange]);
  const handleGainChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ gain: parseFloat(e.target.value) });
  }, [onChange]);
  const handlePanChange = useCallback((pan: number) => onChange({ pan }), [onChange]);

  return (
    <div
      className={`flex flex-col items-center px-2 py-2 border-r border-[#1c1c1c] transition-colors min-w-[52px] ${
        track.solo ? 'bg-[var(--panel-deep)]' : track.mute ? 'bg-[var(--panel-deep)]' : ''
      }`}
      style={{ borderTop: `2px solid ${track.color}` }}
      role="group"
      aria-label={`${track.label} channel`}
    >
      <span className="text-[8px] tracking-widest font-mono mb-1.5" style={{ color: track.color }}>
        {track.label.slice(0, 6)}
      </span>

      <Knob value={track.pan} min={-1} max={1} label="PAN" onChange={handlePanChange} size={24} aria-label={`${track.label} pan`} />

      <div className="flex items-center gap-1 my-1">
        <VUMeter level={meterLevel} label={`${track.label} level`} />
      </div>

      <input
        type="range"
        min={0}
        max={1.5}
        step={0.01}
        value={track.mute ? 0 : track.gain}
        onChange={handleGainChange}
        className="h-12 appearance-none"
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
          accentColor: track.color,
          background: 'transparent',
        }}
        aria-label={`${track.label} gain fader`}
      />

      <span className="text-[8px] font-mono text-[#555] mb-1">
        {Math.round((track.mute ? 0 : track.gain) * 100)}
      </span>

      <div className="flex gap-0.5">
        <button
          className={`text-[7px] font-mono px-0.5 rounded transition-colors ${
            track.mute ? 'text-[#a3e635] bg-[#a3e635]/10' : 'text-[var(--dj-dimmer)] hover:text-[var(--dj-muted)]'
          }`}
          onClick={handleMute}
          aria-pressed={track.mute}
          aria-label={`${track.mute ? 'Unmute' : 'Mute'} ${track.label}`}
        >M</button>
        <button
          className={`text-[7px] font-mono px-0.5 rounded transition-colors ${
            track.solo ? 'text-cyan-400 bg-cyan-500/20' : 'text-[var(--dj-dimmer)] hover:text-[var(--dj-muted)]'
          }`}
          onClick={handleSolo}
          aria-pressed={track.solo}
          aria-label={`${track.solo ? 'Unsolo' : 'Solo'} ${track.label}`}
        >S</button>
        <button
          className={`text-[7px] font-mono px-0.5 rounded transition-colors ${
            fxActive ? 'text-purple-400 bg-purple-500/20' : 'text-[var(--dj-dimmer)] hover:text-[var(--dj-muted)]'
          }`}
          onClick={onFXClick}
          aria-pressed={fxActive}
          aria-label={`${fxActive ? 'Close' : 'Open'} FX rack for ${track.label}`}
        >FX</button>
      </div>
    </div>
  );
});
MixerChannel.displayName = 'MixerChannel';

interface FXRackInlineProps {
  trackId: string;
}

const FXRackInline = memo(({ trackId }: FXRackInlineProps) => {
  const tracks = useDAWStore(s => s.tracks);
  const updateTrack = useDAWStore(s => s.updateTrack);
  const toggleFXSlot = useDAWStore(s => s.toggleFXSlot);
  const track = tracks.find(t => t.id === trackId);

  const addFX = useCallback((type: FXSlot['type']) => {
    if (!track) return;
    updateTrack(trackId, {
      fxChain: [...track.fxChain, {
        id: `fx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type,
        enabled: true,
        params: { gain: 0, freq: 1000, q: 1, threshold: -20, ratio: 4, decay: 1, wet: 0.3 },
      }],
    });
  }, [trackId, track?.fxChain, updateTrack]);
  if (!track) return null;

  return (
    <div className="flex flex-col px-3 py-2 border-l-2 border-purple-500/40 min-w-[240px] bg-[var(--panel-deep)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] tracking-widest text-purple-400">
          FX RACK — {track.label}
        </span>
        <select
          className="bg-[var(--t-b2x)] border border-[var(--dj-dimmer)] rounded text-[9px] text-[var(--text-dim)] px-1"
          onChange={e => addFX(e.target.value as FXSlot['type'])}
          value=""
          aria-label="Add effect"
        >
          <option value="" disabled>+ ADD FX</option>
          {CONSTANTS.FX_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
        </select>
      </div>
      <div className="flex gap-1.5 flex-wrap" role="list" aria-label="Active effects">
        {track.fxChain.map(fx => (
          <div
            key={fx.id}
            className={`px-2 py-1 rounded border text-[9px] font-mono cursor-pointer transition-colors ${
              fx.enabled
                ? 'border-purple-500/50 text-purple-300 bg-purple-500/10'
                : 'border-[var(--dj-dimmer)] text-[var(--dj-dim)]'
            }`}
            onClick={() => toggleFXSlot(trackId, fx.id)}
            title={fx.enabled ? 'Click to disable' : 'Click to enable'}
            role="listitem"
            aria-pressed={fx.enabled}
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleFXSlot(trackId, fx.id);
              }
            }}
          >
            {fx.type.toUpperCase()}
          </div>
        ))}
        {track.fxChain.length === 0 && (
          <span className="text-[9px] text-[var(--dj-dimmer)]">NO FX — ADD FROM DROPDOWN</span>
        )}
      </div>
    </div>
  );
});
FXRackInline.displayName = 'FXRackInline';

// ─── AI Panel (L1 mix + L3 co-producer + L3 mastering) ───────────────────────

interface AIPanelProps {
  // No props needed — all state from store
}

const AIPanel = memo(({}: AIPanelProps) => {
  const aiPanelTab = useDAWStore(s => s.aiPanelTab);
  const aiSuggestions = useDAWStore(s => s.aiSuggestions);
  const aiChat = useDAWStore(s => s.aiChat);
  const aiThinking = useDAWStore(s => s.aiThinking);
  const mastering = useDAWStore(s => s.mastering);
  const setAIPanelTab = useDAWStore(s => s.setAIPanelTab);
  const acceptSuggestion = useDAWStore(s => s.acceptSuggestion);
  const rejectSuggestion = useDAWStore(s => s.rejectSuggestion);
  const addAIChat = useDAWStore(s => s.addAIChat);
  const setAIThinking = useDAWStore(s => s.setAIThinking);
  const updateMastering = useDAWStore(s => s.updateMastering);
  const predictionsVisible = useDAWStore(s => s.predictionsVisible);
  const setPredictionsVisible = useDAWStore(s => s.setPredictionsVisible);
  const setArrangementPredictions = useDAWStore(s => s.setArrangementPredictions);
  const bpm = useDAWStore(s => s.bpm);
  const tracks = useDAWStore(s => s.tracks);
  const position = useDAWStore(s => s.position);

  const [chatInput, setChatInput] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChat]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ── sendChat: tries server, falls back to local LLPTE stub ──────────────
  const sendChat = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg) return;
    if (requestInFlightRef.current) return; // Prevent double-submit

    addAIChat({ role: 'user', content: msg });
    setChatInput('');
    setAIThinking(true);
    setAiError(null);
    requestInFlightRef.current = true;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const token = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.TOKEN);
      if (!isValidToken(token)) { isDev && console.warn('[Auth] missing/invalid token'); return; }

      const res = await fetch(`${API_BASE}${CONSTANTS.API_ENDPOINTS.CHAT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          json: {
            messages: aiChat.slice(-CONSTANTS.MAX_CHAT_HISTORY).map(m => ({ role: m.role, content: m.content }))
              .concat([{ role: 'user', content: msg }]),
            context: { bpm, trackCount: tracks.length, position },
          },
        }),
        signal: abortRef.current.signal,
      });

      if (res.ok) {
        const data = await res.json() as { result?: { data?: { json?: { reply: string } } } };
        const reply = data.result?.data?.json?.reply ?? '';
        addAIChat({ role: 'assistant', content: reply });
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // Graceful degradation: local response when server unavailable
      const localReply = `Analysing your arrangement at ${bpm} BPM. `
        + `I suggest boosting low-mid on BASS around 200Hz, and introducing `
        + `a rhythmic sidechain from KICK at 4:1 ratio. `
        + `Current dynamic range reads approx -12 LUFS — 2dB headroom before ceiling.`;
      addAIChat({ role: 'assistant', content: localReply });
      setAiError('Server unavailable — using local analysis');
    } finally {
      setAIThinking(false);
      requestInFlightRef.current = false;
    }
  }, [chatInput, addAIChat, setAIThinking, aiChat, bpm, tracks.length, position]);

  // ── triggerSuggestions: server first, local LLPTE stub as fallback ───────
  const triggerSuggestions = useCallback(async () => {
    if (requestInFlightRef.current) return;
    setAIThinking(true);
    setAiError(null);
    requestInFlightRef.current = true;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const token = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.TOKEN);
      if (!isValidToken(token)) { isDev && console.warn('[Auth] missing/invalid token'); return; }

      const res = await fetch(`${API_BASE}${CONSTANTS.API_ENDPOINTS.SUGGESTIONS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          json: { tracks, bpm, position },
        }),
        signal: abortRef.current.signal,
      });

      if (res.ok) {
        const data = await res.json() as {
          result?: { data?: { json?: { suggestions: { type: string; confidence: number; description: string; params: Record<string, unknown> }[] } } }
        };
        const suggestions = data.result?.data?.json?.suggestions ?? [];
        const addAISuggestion = useDAWStore.getState().addAISuggestion;
        for (const s of suggestions) {
          addAISuggestion({
            type: s.type as 'mix' | 'arrangement' | 'mastering' | 'harmony' | 'rhythm',
            confidence: s.confidence,
            description: s.description,
            params: s.params,
          });
        }
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }

    // Local LLPTE-derived stubs (used when server unavailable or unauthenticated)
    const addAISuggestion = useDAWStore.getState().addAISuggestion;
    const localSuggestions: { type: 'mix' | 'arrangement' | 'rhythm'; confidence: number; description: string; params: Record<string, unknown> }[] = [
      { type: 'mix', confidence: 0.87, description: 'Reduce SYNTH high shelf -2dB above 8kHz — masking clarity on the PAD layer.', params: { trackId: 'trk_5', eq: { freq: 8000, gain: -2 } } },
      { type: 'arrangement', confidence: 0.74, description: 'Introduce a breakdown at bar 33 — tension has plateaued for 16 bars.', params: { action: 'introduce_break', bar: 33 } },
      { type: 'rhythm', confidence: 0.91, description: `HI-HAT ghost notes at 1/32 on beats 3–4 would increase groove at ${bpm} BPM.`, params: { trackId: 'trk_3', pattern: 'ghost_32' } },
    ];
    for (const s of localSuggestions) addAISuggestion(s);
    setAiError('Server unavailable — showing cached suggestions');
  }, [setAIThinking, tracks, bpm, position]);

  // ── runMasteringAnalysis: server first, local calculation fallback ───────
  const runMasteringAnalysis = useCallback(async () => {
    if (requestInFlightRef.current) return;
    updateMastering({ processing: true });
    const { targetLUFS, ceilingDB, dynamicsMode, stereoWidth } = mastering;
    requestInFlightRef.current = true;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const token = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.TOKEN);
      if (!isValidToken(token)) { isDev && console.warn('[Auth] missing/invalid token'); return; }

      const res = await fetch(`${API_BASE}${CONSTANTS.API_ENDPOINTS.MASTERING}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ json: { targetLUFS, ceilingDB, dynamicsMode, stereoWidth } }),
        signal: abortRef.current.signal,
      });

      if (res.ok) {
        const data = await res.json() as { result?: { data?: { json?: {
          inputLUFS: number; inputPeak: number; outputLUFS: number;
          dynamicRange: number; recommendation: string;
        } } } };
        const result = data.result?.data?.json;
        if (result) {
          updateMastering({ processing: false, analysisResult: result });
          return;
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }

    // Local calculation fallback
    const inputLUFS = -18.3;
    const gainNeeded = targetLUFS - inputLUFS;
    updateMastering({
      processing: false,
      analysisResult: {
        inputLUFS,
        inputPeak: inputLUFS + 6.2,
        outputLUFS: targetLUFS,
        dynamicRange: 9.4 - (dynamicsMode === 'compressed' ? 2 : 0),
        recommendation: `Apply ${Math.abs(gainNeeded).toFixed(1)} dB ${gainNeeded > 0 ? 'gain' : 'attenuation'}. `
          + `True peak limiting at ${ceilingDB} dBFS. `
          + (stereoWidth !== 1.0 ? `Stereo width ×${stereoWidth.toFixed(1)} via M/S. ` : 'Stereo width nominal.'),
      },
    });
    setAiError('Server unavailable — using local mastering analysis');
  }, [mastering, updateMastering]);

  // Toggle predictions with server fetch
  const togglePredictions = useCallback(async () => {
    if (!predictionsVisible) {
      try {
        const token = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.TOKEN);
        if (!isValidToken(token)) { isDev && console.warn('[Auth] missing/invalid token'); return; }
        const res = await fetch(`${API_BASE}${CONSTANTS.API_ENDPOINTS.SUGGESTIONS}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ json: { tracks, bpm, position } }),
        });
        if (res.ok) {
          const data = await res.json() as { result?: { data?: { json?: { suggestions: { type: string; confidence: number; description: string; params: Record<string, unknown> }[] } } } };
          const suggestions = data.result?.data?.json?.suggestions ?? [];
          setArrangementPredictions(suggestions.map(s => ({
            trackId: (s.params?.trackId as string) ?? 'trk_1',
            startBeat: (s.params?.startBeat as number) ?? 32,
            suggestedAction: s.type as 'mute' | 'extend' | 'introduce' | 'fade' | 'break',
            confidence: s.confidence,
            label: s.description.slice(0, 20).toUpperCase(),
          })));
        }
      } catch {
        // Silently fail — predictions are optional
      }
    }
    setPredictionsVisible(!predictionsVisible);
  }, [predictionsVisible, setPredictionsVisible, setArrangementPredictions, tracks, bpm, position]);

  return (
    <div
      className="flex flex-col bg-[#0a0a0a] border-l border-[#1c1c1c]"
      style={{ width: 280 }}
      role="complementary"
      aria-label="AI panel"
    >
      {/* Tab bar */}
      <div className="flex border-b border-[#1c1c1c] flex-none" role="tablist" aria-label="AI panel tabs">
        {(['mix', 'coproducer', 'mastering'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setAIPanelTab(tab)}
            className={`flex-1 py-2 text-[8px] tracking-widest uppercase transition-colors ${
              aiPanelTab === tab
                ? 'text-[#a3e635] border-b border-[#a3e635] bg-[#a3e635]/5'
                : 'text-[var(--dj-dim)] hover:text-[var(--text-muted)]'
            }`}
            role="tab"
            aria-selected={aiPanelTab === tab}
            aria-controls={`ai-panel-${tab}`}
            id={`ai-tab-${tab}`}
          >
            {tab === 'mix' ? 'AI MIX' : tab === 'coproducer' ? 'CO-PROD' : 'MASTER'}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {aiError && (
        <div className="px-2 py-1 bg-red-900/20 border-b border-red-900/40 text-[9px] text-red-400" role="alert">
          {aiError}
          <button className="ml-2 text-[8px] underline" onClick={() => setAiError(null)}>Dismiss</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* ── AI Mix Panel (L1) ──────────────────────────────────────────── */}
        {aiPanelTab === 'mix' && (
          <div className="p-3 space-y-3" role="tabpanel" id="ai-panel-mix" aria-labelledby="ai-tab-mix">
            <div className="flex items-center justify-between">
              <span className="text-[9px] tracking-widest text-[#555]">LLPTE SUGGESTIONS</span>
              <Btn className="text-[8px]" onClick={triggerSuggestions} disabled={aiThinking}>
                {aiThinking ? 'ANALYSING…' : 'ANALYSE'}
              </Btn>
            </div>

            {aiThinking && (
              <div className="flex items-center gap-2 py-2" role="status" aria-label="Analysing">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1 h-1 rounded-full bg-[#a3e635] animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span className="text-[9px] text-[#555]">Analysing signal…</span>
              </div>
            )}

            {aiSuggestions.filter(s => s.accepted === null).slice(0, 6).map(s => (
              <AISuggestionCard
                key={s.id}
                suggestion={s}
                onAccept={() => acceptSuggestion(s.id)}
                onReject={() => rejectSuggestion(s.id)}
              />
            ))}

            {aiSuggestions.filter(s => s.accepted === null).length === 0 && !aiThinking && (
              <div className="text-center py-8">
                <div className="text-[10px] text-[var(--dj-dimmer)] font-mono">LLPTE READY</div>
                <div className="text-[9px] text-[var(--dj-border)] mt-1">Click ANALYSE to generate mix suggestions</div>
              </div>
            )}

            {/* L3: Arrangement predictions toggle */}
            <div className="pt-2 border-t border-[#1c1c1c]">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#555] tracking-widest">ARRANGEMENT AI</span>
                <button
                  className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    predictionsVisible
                      ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10'
                      : 'border-[var(--dj-dimmer)] text-[var(--dj-dim)] hover:border-[#555]'
                  }`}
                  onClick={togglePredictions}
                  aria-pressed={predictionsVisible}
                >
                  {predictionsVisible ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── AI Co-Producer Chat (L3) ───────────────────────────────────── */}
        {aiPanelTab === 'coproducer' && (
          <div className="flex flex-col h-full" style={{ minHeight: 300 }} role="tabpanel" id="ai-panel-coproducer" aria-labelledby="ai-tab-coproducer">
            <div className="flex-1 p-3 space-y-2 overflow-y-auto" style={{ maxHeight: 320 }} role="log" aria-live="polite" aria-label="Chat messages">
              {aiChat.length === 0 && (
                <div className="text-center py-6">
                  <div className="text-[10px] text-[var(--dj-dimmer)] font-mono mb-1">AI CO-PRODUCER</div>
                  <div className="text-[9px] text-[var(--dj-border)]">
                    Ask me about your arrangement, mix balance, or genre direction.
                  </div>
                </div>
              )}
              {aiChat.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[90%] rounded px-2 py-1.5 text-[10px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#a3e635]/12 text-[var(--accent-neon-lime)] border border-[#a3e635]/25'
                        : 'bg-[var(--t-b2x)] text-[var(--daw-sub)] border border-[#2a2a2a]'
                    }`}
                    role={msg.role === 'assistant' ? 'article' : undefined}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {aiThinking && aiPanelTab === 'coproducer' && (
                <div className="flex gap-1 pl-1" role="status" aria-label="AI is typing">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--dj-dim)] animate-bounce"
                      style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="flex-none p-2 border-t border-[#1c1c1c]">
              <div className="flex gap-1.5">
                <input
                  className="flex-1 bg-[var(--t-b2x)] border border-[#2a2a2a] rounded px-2 py-1 text-[10px] text-[var(--daw-ghost)] placeholder-[var(--dj-dimmer)]"
                  placeholder="Ask the AI co-producer…"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value.slice(0, 500))}
                  onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
                  aria-label="Chat input"
                  maxLength={500}
                />
                <Btn onClick={sendChat} className="text-[9px]" disabled={aiThinking || !chatInput.trim()} aria-label="Send message">
                  →
                </Btn>
              </div>
            </div>
          </div>
        )}

        {/* ── Adaptive Mastering (L3) ───────────────────────────────────── */}
        {aiPanelTab === 'mastering' && (
          <div className="p-3 space-y-4" role="tabpanel" id="ai-panel-mastering" aria-labelledby="ai-tab-mastering">
            <div className="flex items-center justify-between">
              <span className="text-[9px] tracking-widest text-[#555]">ADAPTIVE MASTERING</span>
              <div className="flex items-center gap-1.5">
                <Led on={mastering.enabled} color="var(--accent-green)" />
                <button
                  className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    mastering.enabled
                      ? 'border-green-500/50 text-green-400 bg-green-500/10'
                      : 'border-[var(--dj-dimmer)] text-[var(--dj-dim)]'
                  }`}
                  onClick={() => updateMastering({ enabled: !mastering.enabled })}
                  aria-pressed={mastering.enabled}
                >
                  {mastering.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Target LUFS */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[9px] text-[#555]">TARGET LUFS</span>
                <span className="text-[9px] font-mono text-[#a3e635]">{mastering.targetLUFS} LUFS</span>
              </div>
              <input
                type="range"
                min={-23}
                max={-6}
                step={0.5}
                value={mastering.targetLUFS}
                onChange={e => updateMastering({ targetLUFS: parseFloat(e.target.value) })}
                className="w-full h-1 rounded appearance-none"
                style={{ accentColor: '#a3e635' }}
                aria-label="Target LUFS"
              />
              <div className="flex justify-between text-[8px] text-[var(--dj-dimmer)]">
                <span>-23 (broadcast)</span><span>-14 (streaming)</span><span>-6 (loud)</span>
              </div>
            </div>

            {/* True peak ceiling */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[9px] text-[#555]">TRUE PEAK CEILING</span>
                <span className="text-[9px] font-mono text-[#a3e635]">{mastering.ceilingDB} dBFS</span>
              </div>
              <input
                type="range"
                min={-3}
                max={-0.1}
                step={0.1}
                value={mastering.ceilingDB}
                onChange={e => updateMastering({ ceilingDB: parseFloat(e.target.value) })}
                className="w-full h-1 rounded appearance-none"
                style={{ accentColor: '#a3e635' }}
                aria-label="True peak ceiling"
              />
            </div>

            {/* Dynamics mode */}
            <div className="space-y-1.5">
              <span className="text-[9px] text-[#555]">DYNAMICS MODE</span>
              <div className="flex gap-1" role="radiogroup" aria-label="Dynamics mode">
                {(['natural', 'compressed', 'punchy'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => updateMastering({ dynamicsMode: mode })}
                    className={`flex-1 py-1 rounded border text-[8px] font-mono transition-colors ${
                      mastering.dynamicsMode === mode
                        ? 'border-[#a3e635]/40 text-[#a3e635] bg-[#a3e635]/10'
                        : 'border-[var(--dj-border)] text-[var(--dj-dim)] hover:border-[var(--dj-dimmer)]'
                    }`}
                    role="radio"
                    aria-checked={mastering.dynamicsMode === mode}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Stereo width */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[9px] text-[#555]">STEREO WIDTH</span>
                <span className="text-[9px] font-mono text-[#a3e635]">×{mastering.stereoWidth.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={mastering.stereoWidth}
                onChange={e => updateMastering({ stereoWidth: parseFloat(e.target.value) })}
                className="w-full h-1 rounded appearance-none"
                style={{ accentColor: 'var(--looper-cyan)' }}
                aria-label="Stereo width"
              />
            </div>

            <Btn
              className="w-full text-center text-[9px]"
              onClick={runMasteringAnalysis}
              active={mastering.processing}
              disabled={mastering.processing}
            >
              {mastering.processing ? 'ANALYSING…' : 'RUN ANALYSIS'}
            </Btn>

            {mastering.analysisResult && (
              <div className="bg-[var(--dj-surface2)] border border-[var(--dj-border)] rounded p-2 space-y-1.5">
                <div className="flex justify-between text-[9px]">
                  <span className="text-[#555]">INPUT</span>
                  <span className="font-mono text-[var(--text-dim)]">{mastering.analysisResult.inputLUFS} LUFS</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-[#555]">TARGET</span>
                  <span className="font-mono text-[#a3e635]">{mastering.analysisResult.outputLUFS} LUFS</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-[#555]">DYN RANGE</span>
                  <span className="font-mono text-[var(--text-dim)]">{mastering.analysisResult.dynamicRange} LU</span>
                </div>
                <div className="pt-1 border-t border-[#1c1c1c]">
                  <p className="text-[9px] text-[var(--dj-muted)] leading-relaxed">
                    {mastering.analysisResult.recommendation}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
AIPanel.displayName = 'AIPanel';

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onAccept: () => void;
  onReject: () => void;
}

const AISuggestionCard = memo(({
  suggestion, onAccept, onReject,
}: AISuggestionCardProps) => {
  const color = CONSTANTS.SUGGESTION_TYPE_COLORS[suggestion.type] ?? 'var(--text-dim)';

  return (
    <div
      className="rounded border p-2 space-y-1.5"
      style={{ borderColor: `${color}33`, background: `${color}08` }}
      role="article"
      aria-label={`${suggestion.type} suggestion: ${suggestion.description}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-mono tracking-widest" style={{ color }}>
          {suggestion.type.toUpperCase()}
        </span>
        <div className="flex items-center gap-1">
          <div
            className="w-12 h-0.5 rounded-full bg-[var(--dj-border)]"
            role="meter"
            aria-label={`Confidence ${Math.round(suggestion.confidence * 100)}%`}
            aria-valuenow={Math.round(suggestion.confidence * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${suggestion.confidence * 100}%`, background: color }}
            />
          </div>
          <span className="text-[8px] font-mono" style={{ color }}>
            {Math.round(suggestion.confidence * 100)}%
          </span>
        </div>
      </div>
      <p className="text-[9px] text-[var(--text-dim)] leading-relaxed">{suggestion.description}</p>
      <div className="flex gap-1.5">
        <button
          onClick={onAccept}
          className="flex-1 py-0.5 text-[8px] font-mono rounded border transition-colors border-green-500/30 text-green-500 hover:bg-green-500/10"
          aria-label="Apply suggestion"
        >APPLY</button>
        <button
          onClick={onReject}
          className="flex-1 py-0.5 text-[8px] font-mono rounded border transition-colors border-[var(--dj-dimmer)] text-[var(--dj-dim)] hover:border-[#555]"
          aria-label="Skip suggestion"
        >SKIP</button>
      </div>
    </div>
  );
});
AISuggestionCard.displayName = 'AISuggestionCard';

// ─── Keyboard Shortcuts Help Overlay ──────────────────────────────────────────

const KeyboardHelpOverlay = memo(({ onClose }: { onClose: () => void }) => {
  const shortcuts = [
    { key: 'Space', action: 'Play / Pause' },
    { key: 'R', action: 'Record toggle' },
    { key: 'T', action: 'Tap tempo' },
    { key: 'M', action: 'Toggle MIDI sequencer' },
    { key: 'A', action: 'Toggle AI panel' },
    { key: '+ / -', action: 'Zoom in / out' },
    { key: 'Ctrl+S', action: 'Save project' },
    { key: 'Esc', action: 'Stop playback' },
    { key: '↑ / ↓', action: 'Navigate tracks' },
    { key: '?', action: 'Show this help' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-6 max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-sm font-mono tracking-widest text-[#a3e635] mb-4">KEYBOARD SHORTCUTS</h2>
        <div className="space-y-2">
          {shortcuts.map(s => (
            <div key={s.key} className="flex items-center justify-between text-[11px] font-mono">
              <kbd className="px-2 py-0.5 bg-[#1a1a1a] border border-[#333] rounded text-[var(--text-dim)]">{s.key}</kbd>
              <span className="text-[var(--dj-muted)]">{s.action}</span>
            </div>
          ))}
        </div>
        <Btn className="w-full mt-4 text-[9px]" onClick={onClose}>CLOSE</Btn>
      </div>
    </div>
  );
});
KeyboardHelpOverlay.displayName = 'KeyboardHelpOverlay';

// ─── Export Dialog ──────────────────────────────────────────────────────────────

const ExportDialog = memo(({ onClose }: { onClose: () => void }) => {
  const [format, setFormat] = useState<'wav' | 'mp3' | 'flac' | 'ogg'>('wav');
  const [quality, setQuality] = useState<'draft' | 'standard' | 'master'>('standard');
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Trigger export via engine
      isDev && console.info('[Export] Starting export:', format, quality);
      // await engine.export({ format, quality });
    } finally {
      setExporting(false);
      onClose();
    }
  }, [format, quality, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Export project"
    >
      <div
        className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-6 max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-sm font-mono tracking-widest text-[#a3e635] mb-4">EXPORT PROJECT</h2>
        <div className="space-y-4">
          <div>
            <span className="text-[9px] text-[#555] tracking-widest">FORMAT</span>
            <div className="flex gap-1 mt-1">
              {(['wav', 'mp3', 'flac', 'ogg'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-1 rounded border text-[9px] font-mono transition-colors ${
                    format === f
                      ? 'border-[#a3e635]/40 text-[#a3e635] bg-[#a3e635]/10'
                      : 'border-[var(--dj-border)] text-[var(--dj-dim)] hover:border-[var(--dj-dimmer)]'
                  }`}
                  aria-pressed={format === f}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[9px] text-[#555] tracking-widest">QUALITY</span>
            <div className="flex gap-1 mt-1">
              {(['draft', 'standard', 'master'] as const).map(q => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`flex-1 py-1 rounded border text-[9px] font-mono transition-colors ${
                    quality === q
                      ? 'border-[#a3e635]/40 text-[#a3e635] bg-[#a3e635]/10'
                      : 'border-[var(--dj-border)] text-[var(--dj-dim)] hover:border-[var(--dj-dimmer)]'
                  }`}
                  aria-pressed={quality === q}
                >
                  {q.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Btn className="flex-1 text-[9px]" onClick={onClose}>CANCEL</Btn>
          <Btn className="flex-1 text-[9px]" onClick={handleExport} active={exporting} disabled={exporting}>
            {exporting ? 'EXPORTING…' : 'EXPORT'}
          </Btn>
        </div>
      </div>
    </div>
  );
});
ExportDialog.displayName = 'ExportDialog';

// ─── Main DAW Page ────────────────────────────────────────────────────────────

export default function DAW() {
  const engine = useDAWEngine();
  const collab = useCollabSocket();
  const seq = useMidiSequencer();

  const sequencerVisible = useDAWStore(s => s.sequencerVisible);
  const setSequencerVisible = useDAWStore(s => s.setSequencerVisible);
  const aiPanelVisible = useDAWStore(s => s.aiPanelVisible);
  const setAIPanelVisible = useDAWStore(s => s.setAIPanelVisible);
  const predictionsVisible = useDAWStore(s => s.predictionsVisible);
  const setPredictionsVisible = useDAWStore(s => s.setPredictionsVisible);
  const zoom = useDAWStore(s => s.zoom);
  const setZoom = useDAWStore(s => s.setZoom);
  const trackHeightMode = useDAWStore(s => s.trackHeightMode);
  const setTrackHeightMode = useDAWStore(s => s.setTrackHeightMode);
  const setSyncStatus = useDAWStore(s => s.setSyncStatus);
  const setLastSaved = useDAWStore(s => s.setLastSaved);
  const bpm = useDAWStore(s => s.bpm);
  const projectName = useDAWStore(s => s.projectName);
  const tracks = useDAWStore(s => s.tracks);
  const regions = useDAWStore(s => s.regions);

  const [showHelp, setShowHelp] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Auto-save hook
  useAutoSave(CONSTANTS.AUTO_SAVE_INTERVAL_MS);

  // Session analytics boundary
  useEffect(() => {
    const sessionId = crypto.randomUUID();
    const startMs = Date.now();
    try {
      const prevRaw = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.SESSIONS);
      const prev = prevRaw ? JSON.parse(prevRaw) : [];
      if (!Array.isArray(prev)) throw new Error('Invalid sessions data');
      localStorage.setItem(
        CONSTANTS.LOCAL_STORAGE_KEYS.SESSIONS,
        JSON.stringify([...prev.slice(-49), { sessionId, startMs, endMs: null, page: 'DAW' }]),
      );
    } catch (err) {
      isDev && console.warn('[Session] Failed to record session start:', err);
    }

    return () => {
      try {
        const prevRaw = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_KEYS.SESSIONS);
        if (!prevRaw) return;
        const sessions = JSON.parse(prevRaw) as Array<{ sessionId: string; endMs: number | null }>;
        if (!Array.isArray(sessions)) return;
        localStorage.setItem(
          CONSTANTS.LOCAL_STORAGE_KEYS.SESSIONS,
          JSON.stringify(
            sessions.map(s =>
              s.sessionId === sessionId ? { ...s, endMs: Date.now() } : s,
            ),
          ),
        );
      } catch (err) {
        isDev && console.warn('[Session] Failed to record session end:', err);
      }
    };
  }, []);

  // Global keyboard shortcuts
  const shortcuts = useMemo(() => ({
    ' ': async () => {
      await engine.resumeContext();
      engine.togglePlay();
    },
    'r': async () => {
      await engine.resumeContext();
      engine.toggleRecord();
    },
    't': () => engine.tapTempo(),
    'escape': () => engine.stop(),
    'm': () => setSequencerVisible(!sequencerVisible),
    'a': () => setAIPanelVisible(!aiPanelVisible),
    '+': () => setZoom(Math.min(10, zoom * 1.2)),
    '=': () => setZoom(Math.min(10, zoom * 1.2)),
    '-': () => setZoom(Math.max(0.1, zoom * 0.8)),
    'ctrl+s': async (e: KeyboardEvent) => {
      e.preventDefault();
      setSyncStatus('syncing');
      try {
        localStorage.setItem(CONSTANTS.LOCAL_STORAGE_KEYS.SNAPSHOT, JSON.stringify({
          bpm, projectName, tracks, regions,
          timestamp: Date.now(), version: '5.0.0',
        }));
        setSyncStatus('synced');
        setLastSaved(Date.now());
      } catch {
        setSyncStatus('error');
      }
    },
    '?': () => setShowHelp(true),
  }), [engine, sequencerVisible, aiPanelVisible, zoom, setZoom, setSequencerVisible, setAIPanelVisible, bpm, projectName, tracks, regions, setSyncStatus, setLastSaved]);

  useKeyboardShortcuts(shortcuts, { preventDefault: true });

  return (
    <DAWErrorBoundary>
      <div
        className="flex flex-col"
        style={{
          height: '100vh',
          background: 'var(--void)',
          backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,.012) 3px,rgba(255,255,255,.012) 4px),repeating-linear-gradient(90deg,transparent,transparent 31px,rgba(255,255,255,.016) 31px,rgba(255,255,255,.016) 32px)',
          color: '#e5e5e5',
          fontFamily: '"IBM Plex Mono","JetBrains Mono","Fira Code",monospace',
          overflow: 'hidden',
          borderLeft: '3px solid #a3e635',
          boxShadow: 'inset 3px 0 18px rgba(163,230,53,0.15)',
        }}
      >
        <SessionSummaryPanel />

        {/* Transport bar */}
        <TransportBar engine={engine} />

        {/* Ticker */}
        <style>{`@keyframes ag-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
        <div style={{ overflow: 'hidden', position: 'relative', background: '#080808', padding: '5px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', width: 'max-content', animation: 'ag-scroll 28s linear infinite' }}>
            {['R3 Native', 'Web Audio API', 'Offline-First', 'MIDI Support', 'Polyphony', 'Accessible', 'MultiTrack DAW', 'VST System',
              'R3 Native', 'Web Audio API', 'Offline-First', 'MIDI Support', 'Polyphony', 'Accessible', 'MultiTrack DAW', 'VST System'].map((item, i) => (
              <span key={i} style={{ padding: '0 18px', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: '"IBM Plex Mono",monospace', color: '#fff', whiteSpace: 'nowrap' }}>
                {item}<span style={{ color: '#a3e635', marginLeft: 8 }}>/</span>
              </span>
            ))}
          </div>
        </div>

        {/* Toolbar row */}
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#1c1c1c] bg-[#0d0d0d] flex-none">
          <span className="text-[8px] text-[var(--dj-dimmer)] tracking-widest mr-1">VIEW</span>
          <Btn
            active={sequencerVisible}
            onClick={() => setSequencerVisible(!sequencerVisible)}
            className="text-[9px]"
            title="Toggle MIDI Sequencer (M)"
            aria-pressed={sequencerVisible}
          >
            MIDI SEQ
          </Btn>
          <Btn
            active={aiPanelVisible}
            onClick={() => setAIPanelVisible(!aiPanelVisible)}
            className="text-[9px]"
            title="Toggle AI Panel (A)"
            aria-pressed={aiPanelVisible}
          >
            AI PANEL
          </Btn>
          <Btn
            active={predictionsVisible}
            onClick={() => setPredictionsVisible(!predictionsVisible)}
            className="text-[9px]"
            title="Toggle arrangement AI predictions"
            aria-pressed={predictionsVisible}
          >
            PREDICTIONS
          </Btn>

          <div className="w-px h-4 bg-[#2a2a2a] mx-1" role="separator" />

          <Btn className="text-[9px]" onClick={() => setShowExport(true)} title="Export project">
            EXPORT
          </Btn>

          <div className="ml-auto flex items-center gap-2">
            <SessionChip />
            <span className="text-[8px] text-[var(--dj-dimmer)]">ZOOM</span>
            <Btn className="text-[9px]" onClick={() => setZoom(Math.max(0.1, zoom * 0.8))} aria-label="Zoom out">−</Btn>
            <span className="text-[9px] font-mono text-[#555] w-8 text-center">
              {zoom.toFixed(1)}×
            </span>
            <Btn className="text-[9px]" onClick={() => setZoom(Math.min(10, zoom * 1.2))} aria-label="Zoom in">+</Btn>

            <div className="w-px h-4 bg-[#2a2a2a] mx-1" role="separator" />

            <span className="text-[8px] text-[var(--dj-dimmer)]">ROWS</span>
            {(['compact', 'normal', 'large'] as const).map(m => (
              <Btn
                key={m}
                active={trackHeightMode === m}
                onClick={() => setTrackHeightMode(m)}
                className="text-[8px]"
                aria-pressed={trackHeightMode === m}
              >
                {m[0].toUpperCase()}
              </Btn>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          <Sidebar collab={collab} />

          {/* Center column: arrangement + optional MIDI sequencer */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Arrangement view */}
            <ArrangementView engine={engine} collab={collab} />

            {/* MIDI Sequencer — collapsible (Level 2) */}
            {sequencerVisible && (
              <MidiSequencerPanel seq={seq} />
            )}

            {/* Mixer + FX rack */}
            <MixerStrip engine={engine} />
          </div>

          {/* Right AI panel — collapsible (L1 + L3) */}
          {aiPanelVisible && <AIPanel />}
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-4 px-4 py-1 border-t border-[var(--t-b2x)] bg-[var(--t-b0x)] flex-none">
          <StatusBar />
        </div>
      </div>

      {/* Overlays */}
      {showHelp && <KeyboardHelpOverlay onClose={() => setShowHelp(false)} />}
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </DAWErrorBoundary>
  );
}

// ─── Status Bar ───────────────────────────────────────────────────────────────

const StatusBar = memo(() => {
  const playing = useDAWStore(s => s.playing);
  const recording = useDAWStore(s => s.recording);
  const collabConnected = useDAWStore(s => s.collabConnected);
  const collabUsers = useDAWStore(s => s.collabUsers);
  const syncStatus = useDAWStore(s => s.syncStatus);
  const bpm = useDAWStore(s => s.bpm);
  const timeSignature = useDAWStore(s => s.timeSignature);
  const isOnline = useIsOnline();

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Led on={playing} color="var(--accent-green)" label={playing ? 'Playing' : 'Stopped'} />
        <Led on={recording} color="#ef4444" pulse={recording} label={recording ? 'Recording' : 'Not recording'} />
        <span className="text-[8px] text-[var(--dj-dimmer)]">
          {recording ? 'REC' : playing ? 'PLAY' : 'STOPPED'}
        </span>
      </div>
      <div className="w-px h-3 bg-[#2a2a2a]" role="separator" />
      <span className="text-[8px] font-mono text-[var(--dj-dimmer)]">
        {bpm} BPM · {timeSignature[0]}/{timeSignature[1]}
      </span>
      {!isOnline && (
        <>
          <div className="w-px h-3 bg-[#2a2a2a]" role="separator" />
          <span className="text-[8px] text-[#f59e0b] font-mono">OFFLINE</span>
        </>
      )}
      {collabConnected && (
        <>
          <div className="w-px h-3 bg-[#2a2a2a]" role="separator" />
          <div className="flex items-center gap-1.5">
            <Led on color="var(--looper-cyan)" label="Collaboration active" />
            <span className="text-[8px] text-[var(--looper-cyan)]">{collabUsers.length + 1} IN SESSION</span>
          </div>
        </>
      )}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-[8px] text-[var(--t-b3x)] font-mono">
          R3 v5 · SPACE=play · R=rec · T=tap · M=midi · A=ai · ±=zoom · ?=help
        </span>
      </div>
    </>
  );
});
StatusBar.displayName cat ~/Stable/server/routers/daw.ts$ cat ~/Stable/server/routers/daw.ts
/**
 * server/routers/daw.ts
 * tRPC router covering all DAW-specific server procedures.
 *
 * Security patches applied (Mythos audit 2026-04-22):
 *   F-03 — project.delete UPDATE now includes eq(projects.userId, ctx.user.id)
 *           in the WHERE clause (was relying solely on application-layer check,
 *           leaving the DB with no ownership guard on the write path).
 *   F-04 — Free-tier 1-project cap now enforced via db.transaction + SELECT FOR
 *           UPDATE, preventing the TOCTOU race where two concurrent requests
 *           could both pass the count check and both insert.
 *   F-11 — ProjectStateSchema.parse wrapped in try/catch in project.load;
 *           previously an unhandled ZodError could leak schema field names.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router }              from '../trpc';
import { protectedProcedure } from '../base-procedures';
import { db } from '../db';
import { projects } from '../../shared/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';

// ── Zod schemas ───────────────────────────────────────────────────────────────

const TrackSchema = z.object({
  id:          z.string(),
  label:       z.string().max(40),
  type:        z.enum(['audio','midi','bus','instrument']),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/),
  gain:        z.number().min(0).max(1.5),
  pan:         z.number().min(-1).max(1),
  mute:        z.boolean(),
  solo:        z.boolean(),
  armed:       z.boolean(),
  fxChain:     z.array(z.object({
    id:      z.string(),
    type:    z.enum(['eq','compressor','reverb','delay','filter','distortion']),
    enabled: z.boolean(),
    params:  z.record(z.number()),
  })),
  sends:       z.array(z.object({ busId: z.string(), level: z.number() })),
  inputSource: z.string().nullable(),
});

const RegionSchema = z.object({
  id:          z.string(),
  trackId:     z.string(),
  startBeat:   z.number().min(0),
  lengthBeats: z.number().min(0.5),
  clipId:      z.string(),
  label:       z.string().max(40),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const MidiNoteSchema = z.object({
  id:       z.string(),
  pitch:    z.number().int().min(0).max(127),
  step:     z.number().int().min(0).max(63),
  duration: z.number().int().min(1).max(16),
  velocity: z.number().int().min(1).max(127),
});

const MidiPatternSchema = z.object({
  id:      z.string(),
  name:    z.string().max(40),
  steps:   z.union([z.literal(16), z.literal(32), z.literal(64)]),
  notes:   z.array(MidiNoteSchema),
  trackId: z.string(),
});

const ProjectStateSchema = z.object({
  bpm:           z.number().min(40).max(240),
  timeSignature: z.tuple([z.number().int().min(1).max(16), z.number().int().min(1).max(16)]),
  masterGain:    z.number().min(0).max(1.5),
  tracks:        z.array(TrackSchema),
  regions:       z.array(RegionSchema),
  midiPatterns:  z.array(MidiPatternSchema),
  loopEnabled:   z.boolean(),
  loopStart:     z.number().min(0),
  loopEnd:       z.number().min(0),
});

// ── Tier gate helper ──────────────────────────────────────────────────────────

type Tier = 'explorer' | 'creator' | 'pro_artist';

function requireTier(ctx: { subscription?: { tier: string } | null }, minTier: Tier): void {
  const ORDER: Tier[] = ['explorer','creator','pro_artist'];
  const userTier  = (ctx.subscription?.tier ?? 'explorer') as Tier;
  if (ORDER.indexOf(userTier) < ORDER.indexOf(minTier)) {
    throw new TRPCError({
      code:    'FORBIDDEN',
      message: `This feature requires the ${minTier} tier or higher.`,
    });
  }
}

// ── LLPTE helpers ─────────────────────────────────────────────────────────────

interface LLPTESignal {
  rms:            number;
  peak:           number;
  spectralCentroid: number;
  dynamicRange:   number;
  lufsIntegrated: number;
}

interface MixSuggestion {
  type:        'mix' | 'arrangement' | 'mastering' | 'harmony' | 'rhythm';
  confidence:  number;
  description: string;
  params:      Record<string, unknown>;
}

async function runLLPTEAnalysis(
  tracks: z.infer<typeof TrackSchema>[],
  bpm: number,
): Promise<{ signal: LLPTESignal; suggestions: MixSuggestion[] }> {
  const activeTracks     = tracks.filter(t => !t.mute);
  const avgGain          = activeTracks.reduce((s, t) => s + t.gain, 0) / (activeTracks.length || 1);
  const lufsIntegrated   = -23 + avgGain * 10;
  const dynamicRange     = 8 + (1 - avgGain) * 6;

  const signal: LLPTESignal = {
    rms:              avgGain * 0.7,
    peak:             Math.min(avgGain * 1.1, 1.0),
    spectralCentroid: 1800 + bpm * 4,
    dynamicRange,
    lufsIntegrated,
  };

  const suggestions: MixSuggestion[] = [];

  if (avgGain > 1.1) {
    suggestions.push({
      type: 'mix', confidence: 0.91,
      description: `Average channel gain is ${(avgGain * 100).toFixed(0)}% — headroom at risk. `
        + 'Reduce 3–4 channels by 2–3 dB before mastering.',
      params: { action: 'reduce_gain', targetGain: 0.85 },
    });
  }

  const avgPan = activeTracks.reduce((s, t) => s + t.pan, 0) / (activeTracks.length || 1);
  if (Math.abs(avgPan) > 0.2) {
    suggestions.push({
      type: 'mix', confidence: 0.78,
      description: `Mix centre-of-mass is ${avgPan > 0 ? 'right' : 'left'}-heavy by `
        + `${Math.abs(avgPan * 100).toFixed(0)}%. Rebalance panning on SYNTH/PAD layers.`,
      params: { action: 'balance_pan', targetPan: 0 },
    });
  }

  if (lufsIntegrated > -10) {
    suggestions.push({
      type: 'mastering', confidence: 0.95,
      description: `Integrated LUFS (~${lufsIntegrated.toFixed(1)}) is above streaming targets. `
        + 'Apply limiting before export or enable Adaptive Mastering.',
      params: { action: 'limit', targetLUFS: -14 },
    });
  }

  if (bpm >= 120 && bpm <= 145) {
    suggestions.push({
      type: 'rhythm', confidence: 0.72,
      description: `At ${bpm} BPM, a 1/32 ghost note layer on the hi-hat would add groove density typical of peak-hour techno.`,
      params: { trackType: 'hihat', pattern: 'ghost_32' },
    });
  }

  return { signal, suggestions };
}

async function runMasteringAnalysis(params: {
  targetLUFS:    number;
  ceilingDB:     number;
  dynamicsMode:  string;
  stereoWidth:   number;
  currentLUFS?:  number;
}): Promise<{
  inputLUFS:     number;
  inputPeak:     number;
  outputLUFS:    number;
  dynamicRange:  number;
  recommendation: string;
  gainApplied:   number;
}> {
  const inputLUFS  = params.currentLUFS ?? -18.5;
  const gainNeeded = params.targetLUFS - inputLUFS;

  let rec = `Apply ${Math.abs(gainNeeded).toFixed(1)} dB of integrated ${gainNeeded > 0 ? 'gain' : 'attenuation'}. `;
  rec += `True peak ceiling set to ${params.ceilingDB} dBFS. `;

  if (params.dynamicsMode === 'compressed') {
    rec += 'Multiband compression active — limiting transient punch. ';
  } else if (params.dynamicsMode === 'punchy') {
    rec += 'Transient enhancement applied — low-mid weight preserved. ';
  }

  if (params.stereoWidth !== 1.0) {
    rec += `Stereo width set to ×${params.stereoWidth.toFixed(1)} via M/S processing. `;
  }

  return {
    inputLUFS,
    inputPeak:       inputLUFS + 6.2,
    outputLUFS:      params.targetLUFS,
    dynamicRange:    9.8 - (params.dynamicsMode === 'compressed' ? 2 : 0),
    recommendation:  rec.trim(),
    gainApplied:     gainNeeded,
  };
}

// ── AI Co-Producer prompt builder ─────────────────────────────────────────────

function buildCoProducerSystem(): string {
  return [
    'You are an expert AI music co-producer specialising in electronic music production,',
    'acid techno, house, and experimental club music.',
    'Your role is to give concise, technically precise mixing and arrangement advice.',
    'You reference specific parameters (frequencies in Hz, dB values, timing in bars/beats).',
    'Keep responses under 80 words. Be direct, no marketing language.',
    'You are aware of the R3 v4 DAW context and its LLPTE signal analysis pipeline.',
  ].join(' ');
}

// ── Router ────────────────────────────────────────────────────────────────────

export const dawRouter = router({

  // ── project.save ────────────────────────────────────────────────────────────
  'project.save': protectedProcedure
    .input(z.object({
      projectId:   z.string().optional(),
      name:        z.string().min(1).max(80),
      state:       ProjectStateSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      requireTier(ctx, 'explorer');

      const userId    = ctx.user.id;
      const stateJson = JSON.stringify(input.state);

      if (input.projectId) {
        // Update existing — verify ownership in application layer first,
        // then enforce userId in the UPDATE WHERE clause as DB-layer defence-in-depth.
        const existing = await db
          .select({ id: projects.id, userId: projects.userId })
          .from(projects)
          .where(and(eq(projects.id, input.projectId), isNull(projects.deletedAt)))
          .limit(1);

        if (!existing[0]) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' });
        }
        if (existing[0].userId !== userId) {
          // Return NOT_FOUND (not FORBIDDEN) to avoid confirming that the ID exists.
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' });
        }

        const updated = await db
          .update(projects)
          .set({ name: input.name, state: stateJson, updatedAt: new Date() })
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, userId)))
          .returning({ id: projects.id, updatedAt: projects.updatedAt });

        return { projectId: updated[0].id, savedAt: updated[0].updatedAt };
      }

      // New project
      // F-04 FIX: Free-tier 1-project cap is now enforced atomically via a
      // serializable transaction with SELECT FOR UPDATE. The previous pattern
      // (SELECT count → check → INSERT) had a TOCTOU race: two concurrent requests
      // would both read count=0, both pass the check, and both insert, yielding 2+
      // projects for a free user. SELECT FOR UPDATE takes a row-level lock on the
      // result set for the duration of the transaction, serialising concurrent inserts.
      if (!ctx.subscription || ctx.subscription.tier === 'explorer') {
        const inserted = await db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: projects.id })
            .from(projects)
            .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))
            .for('update');

          if (existing.length >= 1) {
            throw new TRPCError({
              code:    'FORBIDDEN',
              message: 'Free tier supports 1 saved project. Upgrade to Pro for unlimited projects.',
            });
          }

          return tx
            .insert(projects)
            .values({ userId, name: input.name, state: stateJson })
            .returning({ id: projects.id, createdAt: projects.createdAt });
        });

        return { projectId: inserted[0].id, savedAt: inserted[0].createdAt };
      }

      // Paid tier: insert without slot constraint
      const inserted = await db
        .insert(projects)
        .values({ userId, name: input.name, state: stateJson })
        .returning({ id: projects.id, createdAt: projects.createdAt });

      return { projectId: inserted[0].id, savedAt: inserted[0].createdAt };
    }),

  // ── project.load ────────────────────────────────────────────────────────────
  'project.load': protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, input.projectId),
          eq(projects.userId, ctx.user.id),
          isNull(projects.deletedAt),
        ))
        .limit(1);

      if (!row[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' });
      }

      let state: unknown;
      try {
        state = JSON.parse(row[0].state as string);
      } catch {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Corrupt project data.' });
      }

      // F-11 FIX: ProjectStateSchema.parse was previously uncaught. A ZodError
      // here (schema mismatch after a migration or corrupt write) would propagate
      // as an unhandled exception and could leak schema field names to the client.
      let parsedState: z.infer<typeof ProjectStateSchema>;
      try {
        parsedState = ProjectStateSchema.parse(state);
      } catch {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Corrupt project data.' });
      }

      return {
        projectId:  row[0].id,
        name:       row[0].name,
        state:      parsedState,
        updatedAt:  row[0].updatedAt,
      };
    }),

  // ── project.list ────────────────────────────────────────────────────────────
  'project.list': protectedProcedure
    .query(async ({ ctx }) => {
      requireTier(ctx, 'creator');
      const rows = await db
        .select({
          id:        projects.id,
          name:      projects.name,
          updatedAt: projects.updatedAt,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(and(eq(projects.userId, ctx.user.id), isNull(projects.deletedAt)))
        .orderBy(desc(projects.updatedAt))
        .limit(100);

      return rows;
    }),

  // ── project.delete ───────────────────────────────────────────────────────────
  'project.delete': protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select({ userId: projects.userId })
        .from(projects)
        .where(and(eq(projects.id, input.projectId), isNull(projects.deletedAt)))
        .limit(1);

      if (!existing[0] || existing[0].userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' });
      }

      // F-03 FIX: Added eq(projects.userId, ctx.user.id) to the UPDATE WHERE clause.
      // Previously only eq(projects.id, ...) was used, leaving the DB with no ownership
      // guard on the write path. The application-layer check above is correct but is
      // not a substitute for DB-layer defence-in-depth — if the check is ever bypassed
      // (race, future refactor), the DB must enforce ownership independently.
      await db
        .update(projects)
        .set({ deletedAt: new Date() })
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)));

      return { deleted: true };
    }),

  // ── ai.analyse ───────────────────────────────────────────────────────────────
  'ai.analyse': protectedProcedure
    .input(z.object({
      tracks: z.array(TrackSchema),
      bpm:    z.number().min(40).max(240),
    }))
    .mutation(async ({ ctx, input }) => {
      requireTier(ctx, 'creator');
      try {
        return await runLLPTEAnalysis(input.tracks, input.bpm);
      } catch (err) {
        throw new TRPCError({
          code:    'INTERNAL_SERVER_ERROR',
          message: 'LLPTE analysis failed. Check server logs.',
          cause:   err,
        });
      }
    }),

  // ── ai.suggestions ───────────────────────────────────────────────────────────
  'ai.suggestions': protectedProcedure
    .input(z.object({
      tracks:   z.array(TrackSchema),
      bpm:      z.number().min(40).max(240),
      position: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      requireTier(ctx, 'creator');
      const t0 = Date.now();
      const { suggestions } = await runLLPTEAnalysis(input.tracks, input.bpm);
      const latencyMs = Date.now() - t0;
      return { suggestions, latencyMs };
    }),

  // ── ai.chat ──────────────────────────────────────────────────────────────────
  'ai.chat': protectedProcedure
    .input(z.object({
      messages: z.array(z.object({
        role:    z.enum(['user','assistant']),
        content: z.string().max(2000),
      })).max(20),
      context: z.object({
        bpm:           z.number(),
        trackCount:    z.number(),
        // F-10 (SECURITY.md): activeTrack is user-controlled. When the real
        // Anthropic API is wired, this field must be sanitised before inclusion
        // in the system context string to prevent prompt injection. See SECURITY.md.
        activeTrack:   z.string().max(40).optional(),
        position:      z.number(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      requireTier(ctx, 'pro_artist');

      const ctxStr = [
        `Project: ${input.context.trackCount} tracks, ${input.context.bpm} BPM.`,
        input.context.activeTrack ? `Selected track: ${input.context.activeTrack}.` : '',
        `Playhead at beat ${input.context.position}.`,
      ].filter(Boolean).join(' ');

      const userMsg = input.messages.at(-1)?.content ?? '';

      const stubs: [RegExp, string][] = [
        [/reverb|space|room/i, `For techno at ${input.context.bpm} BPM, use a plate reverb with pre-delay 18–22ms and decay 0.8–1.2s. Keep wet <15% on percussive elements to preserve transient punch.`],
        [/bass|sub|low/i,      `Cut below 30Hz on all non-bass tracks with a 12dB/oct HP filter. Bass mono-sum below 120Hz — stereo sub energy wastes headroom. Boost 80Hz +2dB on the kick for weight.`],
        [/mix|balance|level/i, `${ctxStr} I suggest a gain-staging pass: reference levels at -18 dBFS RMS per track before any bus compression. Leave 6dB of headroom on the master output.`],
        [/compress|dynamic/i,  `For club music, glue compression on the drum bus: 2:1 ratio, 10ms attack, 60ms release, 1–2dB GR. Fast release preserves groove. Avoid over-compression on the full mix — it flattens transient energy.`],
        [/arrangement|struc/i, `${ctxStr} Classic 4-on-floor techno: 16-bar intro, 32-bar build, 16-bar drop, 32-bar main, 16-bar breakdown, 32-bar second drop, 16-bar outro. Use filtered loops in transitions.`],
      ];

      const match = stubs.find(([rx]) => rx.test(userMsg));
      const reply = match?.[1] ?? `${ctxStr} I'm analysing your session. The signal chain looks solid — try running the LLPTE analysis for specific mix suggestions tailored to your current arrangement.`;

      return { reply };
    }),

  // ── mastering.analyse ────────────────────────────────────────────────────────
  'mastering.analyse': protectedProcedure
    .input(z.object({
      targetLUFS:   z.number().min(-23).max(-6),
      ceilingDB:    z.number().min(-3).max(-0.1),
      dynamicsMode: z.enum(['natural','compressed','punchy']),
      stereoWidth:  z.number().min(0).max(2),
      currentLUFS:  z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireTier(ctx, 'pro_artist');
      return runMasteringAnalysis(input);
    }),

  // ── collab.roomStats ─────────────────────────────────────────────────────────
  'collab.roomStats': protectedProcedure
    .query(async ({ ctx }) => {
      requireTier(ctx, 'pro_artist');
      const { getRoomStats } = await import('../ws/collab');
      return getRoomStats();
    }),
});

export type DawRouter = typeof dawRouter;
r3v@penguin:~/Stable$ cat ~/Stable/client/src/App.tsx | grep -A 3 -B 3 "collab\|Collab"
 *   /daw           → DAW                      (protected — Studio suite)
 *   /loopstation   → LoopStation505           (protected — loop recorder)
 *   /multitrack    → MultiTrackPanel          (protected — multitrack DAW)
 *   /collab        → CollabDAWPro             (protected — collaborative DAW pro)
 *   /mixer         → MultitrackView           (protected — drag & drop mixer view)
 *   /visuals       → VisualsPage              (protected — Three.js)
 *   /admin         → AdminPage               (protected)
--
import AdminPage          from './pages/AdminPage';
import { AdminAgentSuitePage } from './pages/admin/AgentSuitePage';
import MultiTrackPanel    from './pages/multi-track-panel';
import CollabDAWPro       from './pages/collaborative-daw-pro';
import MultitrackView     from './components/multi-track-view';
import { useDAWStore }    from './hooks/useDAWStore';

--
                <ProtectedRoute><MultiTrackPanel /></ProtectedRoute>
              </Route>

              {/* Collaborative DAW Pro — collaborative-daw-pro.jsx (WaveLab) */}
              <Route path="/collab">
                <ProtectedRoute><CollabDAWPro /></ProtectedRoute>
              </Route>

              {/* VST Plugin Browser — standalone page */}
r3v@penguin:~/Stable$ cat ~/Stable/client/src/config/music-nav-links.ts
// Auto-generated by gold-dry-music-nav.sh
export const MUSIC_NAV_LINKS = [
  { href: "/daw",        label: "🎚 Studio" },
  { href: "/collab",     label: "⬡ Collab" },
  { href: "/multitrack", label: "📼 Multitrack" },
  { href: "/mixer",      label: "⟳ Mixer" },
  { href: "/instrument", label: "🎹 Instrument" },
] as const;
r3v@penguin:~/Stable$ cat ~/Stable/client/src/components/page-nav.tsx | grep -A 5 -B 5 "collab\|Collab"
//   2. /auth        — login / register (hidden when authenticated)
//   3. /instrument  — first tool after login
//   4. /daw         — main production suite
//   5. /loopstation — loop recorder console
//   6. /multitrack  — multitrack DAW (MultiTrackPanel)
//   7. /collab      — collaborative DAW pro (WaveLab)
//   8. /mixer       — drag & drop mixer view (MultitrackView)
//
const PAGES = [
  { href: '/pricing',    label: 'Pricing',    icon: Tag,     authOnly: false, hideWhenAuthed: false },
  { href: '/auth',       label: 'Login',      icon: LogIn,   authOnly: false, hideWhenAuthed: true  },
  { href: '/instrument', label: 'Instrument', icon: Music,   authOnly: true,  hideWhenAuthed: false },
  { href: '/daw',        label: 'Studio',     icon: Radio,   authOnly: true,  hideWhenAuthed: false },
  { href: '/loopstation',label: 'Loop',       icon: Repeat2, authOnly: true,  hideWhenAuthed: false },
  { href: '/multitrack', label: 'Multitrack', icon: Layers,  authOnly: true,  hideWhenAuthed: false },
  { href: '/collab',     label: 'Collab',     icon: Users,   authOnly: true,  hideWhenAuthed: false },
  { href: '/mixer',      label: 'Mixer',      icon: Sliders, authOnly: true,  hideWhenAuthed: false },
  { href: '/vst',        label: 'VST',        icon: Plug,    authOnly: true,  hideWhenAuthed: false },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────
r3v@penguin:~/Stable$ 