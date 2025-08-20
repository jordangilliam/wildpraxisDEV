/* User-provided WildPraxis AppKit (v1) */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Settings, Wand2, FileDown, Upload, Database, MessageSquare, Rocket, ClipboardList, BarChart3, Globe2, Map as MapIcon, NotebookText, CheckCircle2, Circle, Info } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const THEME = { forest: "#1f3d2a", leaf: "#5aa870", gold: "#f5a524", coal: "#0f172a", mist: "#f7faf7" } as const;
const shadow = "shadow-[0_10px_30px_rgba(0,0,0,0.12)]";
const card = `rounded-2xl ${shadow} border border-black/5 bg-white`;
const pill = "px-2.5 py-1 rounded-full text-xs font-semibold";

function useLocalState<T=any>(key: string, initial: T){
  const [v, setV] = useState<T>(()=>{ try{const x=localStorage.getItem(key); return x?JSON.parse(x):initial;}catch{return initial;} });
  useEffect(()=>{ try{localStorage.setItem(key, JSON.stringify(v));}catch{} }, [key,v]);
  return [v,setV] as const;
}

const ProviderRouter = {
  async chat(messages: any[]){ await new Promise(r=>setTimeout(r,300)); return { output: "(demo) Connect ProviderRouter.chat to your backend to get real answers.", tokens: 42 }; },
  async embed(texts: string[]){ await new Promise(r=>setTimeout(r,150)); return texts.map((_,i)=> Array.from({length:8},(_,j)=> Math.sin((i+1)*(j+1)) )); }
};

function useMiniRAG(){
  const [docs, setDocs] = useLocalState<any[]>("wp.appkit.docs", []);
  function chunk(text:string){ return text.split(/\n\n+/).map(s=>s.trim()).filter(Boolean); }
  async function addDoc(name:string, text:string){ const parts = chunk(text); const vecs = await ProviderRouter.embed(parts as any); setDocs((prev)=>[...prev, { name, parts, vecs }]); }
  function search(query:string, k=4){ if(!docs.length) return []; const qv = [ ...query.toLowerCase().split(/\W+/).filter(Boolean) ];
    const scored:any[]=[]; docs.forEach((doc:any)=> doc.parts.forEach((p:string,idx:number)=>{ const score = jaccard(qv, p.toLowerCase().split(/\W+/).filter(Boolean)); scored.push({ doc:doc.name, idx, text:p, score }); }));
    return scored.sort((a,b)=>b.score-a.score).slice(0,k);
  }
  return { addDoc, search, docs };
}
function jaccard(a:string[],b:string[]){ const A=new Set(a), B=new Set(b); const inter=[...A].filter(x=>B.has(x)).length; return inter/Math.max(1, A.size+B.size-inter); }

function composeMessages(spec:any){
  const sys = `You are ${spec.role}. Write for ${spec.audience}. Follow constraints strictly.`;
  const inst = [
    `Goal: ${spec.goal}`,
    spec.constraints.length?`Constraints: ${spec.constraints.join("; ")}`:null,
    spec.citations?`Citations: include sources and URLs when making claims.`:null,
    `Style: ${spec.style.join(", ")}. Formality: ${spec.formality}. Length: ${spec.length}.`,
    `Acceptance criteria: ${spec.acceptance.map((x:string,i:number)=>`${i+1}. ${x}`).join(" ")}`
  ].filter(Boolean).join("\n");
  const user = [ `Inputs:`, ...spec.inputs.map((i:any)=>`- ${i.label}: ${i.value}`) ].join("\n");
  const messages:any[] = [ { role:'system', content: sys }, { role:'user', content: inst }, { role:'user', content: user } ];
  (spec.examples as any[]).forEach(ex=>{ messages.push({ role:'user', content: ex.input }); messages.push({ role:'assistant', content: ex.output }); });
  return messages;
}

function download(name:string, text:string){ const blob=new Blob([text],{type:'text/plain'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url); }

const demoSeries = Array.from({length:24}, (_,i)=> ({ t: i, pH: 7 + Math.sin(i/3)*0.25 + (i%7===0?0.2:0), tempC: 16 + Math.cos(i/4)*2.3 }));

export default function AppKit(){
  const [tab, setTab] = useLocalState("appkit.tab", "intake");
  const [persona, setPersona] = useLocalState("appkit.persona", "conservation");
  const [role, setRole] = useLocalState("spec.role", "a conservation AI coach");
  const [goal, setGoal] = useLocalState("spec.goal", "draft a community-friendly water quality brief with one chart and a clear call to action");
  const [audience, setAudience] = useLocalState("spec.audience", "Pittsburgh watershed volunteers and local leaders");
  const [constraints, setConstraints] = useLocalState("spec.constraints", ["no sensitive site disclosure", "plain language, 8th grade reading level", "cite sources"]);
  const [inputs, setInputs] = useLocalState("spec.inputs", [ {label:"Dataset", value:"October CSV: pH / tempC"}, {label:"Place", value:"Nine Mile Run"} ]);
  const [examples, setExamples] = useLocalState("spec.examples", [ { input: "Summarize: tempC increased this week.", output: "This week saw a mild warming (avg +1.2°C)." } ]);
  const [acceptance, setAcceptance] = useLocalState("spec.acceptance", ["includes one bullet list of findings", "one plain-language risk" ,"links to raw data"]);
  const [style, setStyle] = useLocalState("spec.style", ["kind", "specific", "evidence-first"]);
  const [citations, setCitations] = useLocalState("spec.citations", true);
  const [formality, setFormality] = useLocalState("spec.formality", "plain");
  const [length, setLength] = useLocalState("spec.length", "medium");

  const spec = useMemo(()=>({ role, goal, audience, constraints, inputs, examples, acceptance, style, citations, formality, length }), [role,goal,audience,constraints,inputs,examples,acceptance,style,citations,formality,length]);
  const messages = useMemo(()=> composeMessages(spec), [spec]);

  const rag = useMiniRAG();
  const [ragQuery, setRagQuery] = useState("");
  const [llm, setLLM] = useState<any>(null);
  async function runLLM(){ const res = await ProviderRouter.chat(messages as any); setLLM(res); }

  return (
    <div className="min-h-screen" style={{ background: THEME.mist }}>
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/70 border-b border-black/5">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: THEME.forest }}>
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold" style={{ color: THEME.coal }}>WildPraxis AppKit</h1>
              <p className="text-xs opacity-70">Deploy faster • Data-optimized intake • Pluggable AI</p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Tab label="Intake" icon={<ClipboardList className="w-4 h-4" />} active={(tab as any)==='intake'} onClick={()=>setTab('intake')} />
            <Tab label="Composer" icon={<MessageSquare className="w-4 h-4" />} active={(tab as any)==='compose'} onClick={()=>setTab('compose')} />
            <Tab label="Workbench" icon={<BarChart3 className="w-4 h-4" />} active={(tab as any)==='work'} onClick={()=>setTab('work')} />
            <Tab label="RAG" icon={<Database className="w-4 h-4" />} active={(tab as any)==='rag'} onClick={()=>setTab('rag')} />
            <Tab label="Admin" icon={<Settings className="w-4 h-4" />} active={(tab as any)==='admin'} onClick={()=>setTab('admin')} />
            <button className="ml-2 px-3 py-1.5 rounded-xl border border-black/10 hover:bg-black/5 text-sm" onClick={()=>download('TaskSpec.json', JSON.stringify(spec,null,2))}><FileDown className="inline w-4 h-4 mr-1"/> Export Spec</button>
          </nav>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-3">
          <div className="inline-flex rounded-xl border border-black/10 overflow-hidden">
            <button onClick={()=>setPersona('conservation')} className={`px-3 py-1.5 text-sm ${(persona as any)==='conservation'?'bg-black/80 text-white':'hover:bg-black/5'}`}>Conservation</button>
            <button onClick={()=>setPersona('nonprofit')} className={`px-3 py-1.5 text-sm ${(persona as any)==='nonprofit'?'bg-black/80 text-white':'hover:bg-black/5'}`}>Nonprofit</button>
            <button onClick={()=>setPersona('teen')} className={`px-3 py-1.5 text-sm ${(persona as any)==='teen'?'bg-black/80 text-white':'hover:bg-black/5'}`}>Teen</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {(tab as any)==='intake' && <IntakePanel spec={spec} setSpec={{setRole,setGoal,setAudience,setConstraints,setInputs,setExamples,setAcceptance,setStyle,setCitations,setFormality,setLength}}/>}
        {(tab as any)==='compose' && <ComposerPanel messages={messages} onRun={runLLM} llm={llm} />}
        {(tab as any)==='work' && <Workbench />}
        {(tab as any)==='rag' && <RAGPanel rag={rag} ragQuery={ragQuery} setRagQuery={setRagQuery} />}
        {(tab as any)==='admin' && <AdminPanel />}
      </main>

      <footer className="py-10 mt-8 border-t border-black/5">
        <div className="mx-auto max-w-7xl px-4 grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-semibold mb-1" style={{ color: THEME.coal }}>About</h4>
            <p className="opacity-70">This template packages the exact fields LLMs need for consistent results, so you spend less time prompting and more time shipping.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1" style={{ color: THEME.coal }}>Connect</h4>
            <p className="opacity-70">Wire ProviderRouter to your serverless functions for OpenAI, Anthropic, Gemini, Cohere, or Mistral. Add vector DB and storage for RAG.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1" style={{ color: THEME.coal }}>License</h4>
            <p className="opacity-70">Use freely for your String Theory Solutions projects. Keep attributions if you distribute.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Tab({ label, icon, active, onClick }:{ label:string; icon: React.ReactNode; active:boolean; onClick:()=>void }){
  return <button onClick={onClick} className={`px-3 py-1.5 rounded-xl flex items-center gap-2 border text-sm transition ${active? 'bg-black/80 text-white border-transparent':'hover:bg-black/5 border-black/10'}`}>{icon}<span>{label}</span></button>;
}

function IntakePanel({ spec, setSpec }:any){
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  function addInput(){ if(!label.trim()||!value.trim()) return; setSpec.setInputs((prev:any)=>[...prev, {label, value}]); setLabel(""); setValue(""); }
  function rmInput(i:number){ setSpec.setInputs((prev:any) => prev.filter((_:any,idx:number)=> idx!==i)); }
  function addExample(){ setSpec.setExamples((prev:any)=>[...prev, { input: "Input example", output: "Expected output" }]); }

  return (
    <section className={`${card} p-5`}>
      <div className="flex items-center gap-2 mb-3"><ClipboardList className="w-4 h-4"/><h3 className="font-semibold">Universal Intake</h3><span className={pill} style={{ background: THEME.leaf, color:'white' }}>LLM-friendly</span></div>
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <input className="p-2 rounded-lg border border-black/10" value={spec.role} onChange={e=>setSpec.setRole((e.target as any).value)} placeholder="Role (e.g., conservation coach)"/>
        <input className="p-2 rounded-lg border border-black/10" value={spec.goal} onChange={e=>setSpec.setGoal((e.target as any).value)} placeholder="Goal (one sentence)"/>
        <input className="p-2 rounded-lg border border-black/10" value={spec.audience} onChange={e=>setSpec.setAudience((e.target as any).value)} placeholder="Audience"/>
        <input className="p-2 rounded-lg border border-black/10" value={spec.style.join(', ')} onChange={e=>setSpec.setStyle((e.target as any).value.split(',').map((s:string)=>s.trim()).filter(Boolean))} placeholder="Style (comma separated)"/>
        <div className="flex items-center gap-2"><input className="p-2 rounded-lg border border-black/10 flex-1" value={spec.constraints.join('; ')} onChange={e=>setSpec.setConstraints((e.target as any).value.split(';').map((s:string)=>s.trim()).filter(Boolean))} placeholder="Constraints (semicolon separated)"/><span className="text-xs opacity-70">Guardrails</span></div>
        <div className="flex items-center gap-2">
          <select className="p-2 rounded-lg border border-black/10" value={spec.formality} onChange={e=>setSpec.setFormality((e.target as any).value)}>
            <option value="plain">Plain</option><option value="professional">Professional</option><option value="scholarly">Scholarly</option>
          </select>
          <select className="p-2 rounded-lg border border-black/10" value={spec.length} onChange={e=>setSpec.setLength((e.target as any).value)}>
            <option value="short">Short</option><option value="medium">Medium</option><option value="long">Long</option>
          </select>
          <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={spec.citations} onChange={e=>setSpec.setCitations((e.target as any).checked)}/> Require citations</label>
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className={`${card} p-4`}>
          <div className="flex items-center gap-2 mb-2"><NotebookText className="w-4 h-4"/><strong className="text-sm">Inputs</strong></div>
          <div className="grid gap-2 text-sm">
            {spec.inputs.map((it:any,i:number)=> (
              <div key={i} className="flex gap-2 items-center"><span className="w-28 truncate opacity-70">{it.label}</span><span className="flex-1 truncate">{it.value}</span><button onClick={()=>rmInput(i)} className="px-2 py-1 rounded-lg border border-black/10 text-xs">Remove</button></div>
            ))}
            <div className="flex gap-2"><input className="p-2 rounded-lg border border-black/10 w-32" placeholder="Label" value={label} onChange={e=>setLabel((e.target as any).value)}/><input className="p-2 rounded-lg border border-black/10 flex-1" placeholder="Value" value={value} onChange={e=>setValue((e.target as any).value)}/><button onClick={addInput} className="px-3 py-2 rounded-lg text-sm border border-black/10">Add</button></div>
          </div>
        </div>
        <div className={`${card} p-4`}>
          <div className="flex items-center gap-2 mb-2"><Wand2 className="w-4 h-4"/><strong className="text-sm">Examples (few-shot)</strong></div>
          <div className="grid gap-2 text-sm">
            {spec.examples.map((ex:any,i:number)=> (
              <details key={i} className="rounded-lg border border-black/10 p-2">
                <summary className="cursor-pointer text-sm">Example {i+1}</summary>
                <label className="text-xs opacity-70">Input</label>
                <textarea className="w-full p-2 rounded-lg border border-black/10 text-xs" value={ex.input} onChange={e=>setSpec.setExamples((prev:any)=> prev.map((x:any,idx:number)=> idx===i? {...x, input: (e.target as any).value} : x))}/>
                <label className="text-xs opacity-70">Output</label>
                <textarea className="w-full p-2 rounded-lg border border-black/10 text-xs" value={ex.output} onChange={e=>setSpec.setExamples((prev:any)=> prev.map((x:any,idx:number)=> idx===i? {...x, output: (e.target as any).value} : x))}/>
              </details>
            ))}
            <button onClick={addExample} className="px-3 py-2 rounded-lg text-sm border border-black/10">Add example</button>
          </div>
        </div>
      </div>

      <div className={`${card} p-4 mt-4`}>
        <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4"/><strong className="text-sm">Acceptance criteria</strong></div>
        <textarea className="w-full p-2 rounded-lg border border-black/10 text-sm" value={spec.acceptance.join('\n')} onChange={e=>setSpec.setAcceptance((e.target as any).value.split(/\n/).map((s:string)=>s.trim()).filter(Boolean))} placeholder="One criterion per line"/>
      </div>
    </section>
  );
}

function ComposerPanel({ messages, onRun, llm }:{ messages:any[]; onRun:()=>void; llm:any }){
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section className={`${card} p-5`}>
        <div className="flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4"/><h3 className="font-semibold">Composed Messages</h3></div>
        <pre className="text-xs bg-black/[.04] p-3 rounded-lg overflow-auto max-h-96">{JSON.stringify(messages, null, 2)}</pre>
        <div className="mt-3 flex gap-2"><button onClick={onRun} className="px-3 py-2 rounded-lg text-sm text-white" style={{ background: THEME.leaf }}><Rocket className="inline w-4 h-4 mr-1"/> Run with Provider</button></div>
      </section>
      <section className={`${card} p-5`}>
        <div className="flex items-center gap-2 mb-2"><Wand2 className="w-4 h-4"/><h3 className="font-semibold">LLM Output</h3></div>
        {!llm ? <p className="text-sm opacity-70">Connect ProviderRouter.chat to your backend to see real responses.</p> : (
          <div className="text-sm"><div className="opacity-70 mb-1">Tokens (approx): {llm.tokens}</div><div className="whitespace-pre-wrap">{llm.output}</div></div>
        )}
      </section>
    </div>
  );
}

function Workbench(){
  const [series, setSeries] = useState(demoSeries);
  const [status, setStatus] = useState("");
  function onFile(file:File){ const r=new FileReader(); r.onload=()=>{ try{ const text=String(r.result).trim(); const lines=text.split(/\r?\n/); const headers=lines[0].split(',').map(s=>s.trim()); const tIdx=headers.findIndex(h=>/time|date|t/i.test(h)); const pIdx=headers.findIndex(h=>/ph/i.test(h)); const cIdx=headers.findIndex(h=>/temp|celsius|degc/i.test(h)); const rows=lines.slice(1).map((ln,i)=>{ const parts=ln.split(','); return { t: parts[tIdx]||String(i), pH: pIdx>=0? Number(parts[pIdx]): undefined, tempC: cIdx>=0? Number(parts[cIdx]): undefined }; }); setSeries(rows.map((r:any,i:number)=> ({ t: r.t||String(i), pH: r.pH ?? (7 + Math.sin(i/3)*0.2), tempC: r.tempC ?? (16 + Math.cos(i/4)*2.0) }))); setStatus(`Loaded ${rows.length} rows`); }catch{ setStatus('Could not parse CSV'); } }; r.readAsText(file); }
  return (
    <section className={`${card} p-5`}>
      <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4"/><h3 className="font-semibold">Data Workbench</h3></div>
      <div className="text-sm opacity-80">Upload CSV with columns like time, pH, tempC to preview trends.</div>
      <div className="mt-2 flex items-center gap-2"><input type="file" accept=".csv" onChange={e=>{ const f=(e.target as any).files?.[0]; if(f) onFile(f); }}/><span className="text-xs opacity-70">{status}</span></div>
      <div className="h-56 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="t" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={[5, 9]} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line yAxisId="left" type="monotone" dataKey="pH" dot={false} strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="tempC" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function RAGPanel({ rag, ragQuery, setRagQuery }:{ rag:any; ragQuery:string; setRagQuery:(v:string)=>void }){
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section className={`${card} p-5`}>
        <div className="flex items-center gap-2 mb-2"><Database className="w-4 h-4"/><h3 className="font-semibold">Add context (RAG)</h3></div>
        <input className="p-2 rounded-lg border border-black/10 text-sm w-full" placeholder="Doc name (e.g., Water policy excerpt)" value={name} onChange={e=>setName((e.target as any).value)} />
        <textarea className="mt-2 w-full h-40 p-2 rounded-lg border border-black/10 text-sm" placeholder="Paste text. In production, parse PDFs/Docs and store in a vector DB." value={text} onChange={e=>setText((e.target as any).value)} />
        <div className="mt-2"><button onClick={()=>{ if(!name||!text) return; rag.addDoc(name, text); setName(""); setText(""); }} className="px-3 py-2 rounded-lg text-sm border border-black/10">Embed</button></div>
        <div className="text-xs opacity-70 mt-2">Backends: Supabase pgvector, Pinecone, Qdrant, Weaviate. Use ProviderRouter.embed for your chosen model.</div>
      </section>
      <section className={`${card} p-5`}>
        <div className="flex items-center gap-2 mb-2"><SearchIcon/><h3 className="font-semibold">Search context</h3></div>
        <input className="p-2 rounded-lg border border-black/10 text-sm w-full" placeholder="Ask a question to retrieve passages…" value={ragQuery} onChange={e=>setRagQuery((e.target as any).value)} />
        <div className="mt-3 grid gap-2">
          {ragQuery && rag.search(ragQuery, 5).map((h:any,i:number)=> (
            <div key={i} className="p-3 rounded-lg border border-black/10 text-sm">
              <div className="opacity-60 text-xs">{h.doc} · score {h.score.toFixed(2)}</div>
              <div className="mt-1">{h.text}</div>
            </div>
          ))}
          {!ragQuery && <div className="text-sm opacity-70">Type a question to see top passages.</div>}
        </div>
      </section>
    </div>
  );
}

function AdminPanel(){
  return (
    <section className={`${card} p-5`}>
      <div className="flex items-center gap-2 mb-2"><Settings className="w-4 h-4"/><h3 className="font-semibold">Admin</h3></div>
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li>Wire <code>ProviderRouter.chat</code> to your backend (Vercel/Netlify/AWS Lambda) that calls OpenAI/Anthropic/Gemini/Cohere/Mistral.</li>
        <li>Add a vector store and replace <code>useMiniRAG</code> with a real client (pgvector/Pinecone/Qdrant/Weaviate).</li>
        <li>For maps, embed MapLibre GL + OSM or Mapbox GL (public token) and add layers for your domain.</li>
        <li>For analytics, log <em>spec</em> and message latency client-side; redact PII first.</li>
      </ul>
      <div className="mt-3 text-xs opacity-70 flex items-start gap-2"><Info className="w-4 h-4"/>Tip: keep secrets on the server. GitHub Pages is static; use a serverless endpoint hostname for API calls.</div>
    </section>
  );
}

function SearchIcon(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/></svg>; }


