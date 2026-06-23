// ─────────────────────────────────────────────────────────────────────────────
//  budget.track — ULTIMATE EDITION v4
//  ✅ Multi-Currency Support (20 currencies with flags)
//  + All previous features retained
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useReducer, useMemo, useRef } from "react";
import { createWorker } from "tesseract.js";
import { entriesApi } from "./api";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ─── UTILITIES ───────────────────────────────────────────────────────────────
const createId = () => Math.random().toString(36).slice(2, 9);
const todayStr = () => new Date().toISOString().slice(0, 10);

// ─── CURRENCIES ──────────────────────────────────────────────────────────────
// ★ ADD / REMOVE currencies here freely
const rates = {
  INR: 1,
  USD: 0.0116,
  EUR: 0.0101,
  GBP: 0.0086,
};

const CURRENCIES = [
  { code:"INR",  symbol:"₹",   flag:"🇮🇳", name:"Indian Rupee"       },
  { code:"USD",  symbol:"$",   flag:"🇺🇸", name:"US Dollar"          },
  { code:"EUR",  symbol:"€",   flag:"🇪🇺", name:"Euro"               },
  { code:"GBP",  symbol:"£",   flag:"🇬🇧", name:"British Pound"      },
];

const convertAmount = (amount, targetCurrency) => Number(amount || 0) * (rates[targetCurrency] ?? 1);
const fmt = (n, sym = "₹") => sym + Number(n || 0).toFixed(2);

// ─── MOCK AUTH ────────────────────────────────────────────────────────────────
let usersDB = [{ id: "u1", name: "Demo User", email: "demo@budget.track", password: "demo123" }];
const auth = {
  login: (email, password) => {
    const user = usersDB.find(u => u.email === email && u.password === password);
    if (!user) return Promise.reject("Invalid credentials");
    return Promise.resolve({ id: user.id, name: user.name, email: user.email });
  },
  signup: (name, email, password) => {
    if (usersDB.find(u => u.email === email)) return Promise.reject("Email already registered");
    const user = { id: createId(), name, email, password };
    usersDB.push(user);
    return Promise.resolve({ id: user.id, name: user.name, email: user.email });
  },
};

// ─── DEFAULT UI DATA ──────────────────────────────────────────────────────────
const DEFAULT_GOALS = [
  { id: createId(), name: "Emergency Fund", target: 1000, saved: 320, emoji: "🛡️", color: "#6366f1", deadline: "2026-12-31" },
  { id: createId(), name: "New Laptop",     target: 800,  saved: 450, emoji: "💻", color: "#06b6d4", deadline: "2026-06-30" },
  { id: createId(), name: "Summer Holiday", target: 500,  saved: 75,  emoji: "✈️", color: "#f97316", deadline: "2026-07-01" },
];
const DEFAULT_RECURRING = [
  { id: createId(), label: "Netflix",  amount: 15, category: "Entertainment", frequency: "monthly", nextDate: "2026-04-01", active: true  },
  { id: createId(), label: "Gym",      amount: 30, category: "Health",        frequency: "monthly", nextDate: "2026-04-05", active: true  },
  { id: createId(), label: "Bus pass", amount: 35, category: "Transport",     frequency: "monthly", nextDate: "2026-04-06", active: true  },
  { id: createId(), label: "Spotify",  amount: 10, category: "Entertainment", frequency: "monthly", nextDate: "2026-04-10", active: false },
];

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES = ["Food","Housing","Transport","Entertainment","Education","Health","Income","Other"];
const CAT_COLORS = { Food:"#f97316",Housing:"#6366f1",Transport:"#06b6d4",Entertainment:"#ec4899",Education:"#8b5cf6",Health:"#10b981",Income:"#22c55e",Other:"#94a3b8" };
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const FREQS  = { weekly:"Weekly", biweekly:"Bi-weekly", monthly:"Monthly", yearly:"Yearly" };
const FREQ_MULT = { weekly:52, biweekly:26, monthly:12, yearly:1 };
const FREQ_DAYS = { weekly:7,  biweekly:14, monthly:30, yearly:365 };

// ─── THEMES ───────────────────────────────────────────────────────────────────
const T = {
  dark:  { bg:"#080a0f", surface:"#111318", surface2:"#0d0f14", border:"#1e2028", border2:"#1a1d26", text:"#e2e6f0", textMuted:"#5a5f70", textFaint:"#2a2d38", accent:"#6366f1", accentBg:"#6366f122", green:"#22c55e", red:"#ef4444", orange:"#f97316", shadow:"0 4px 24px rgba(0,0,0,.4)" },
  light: { bg:"#f0f2f8", surface:"#ffffff", surface2:"#f4f6fb", border:"#e2e6f0", border2:"#dde1ee", text:"#1a1d2e", textMuted:"#7a7f96", textFaint:"#c8cce0", accent:"#6366f1", accentBg:"#6366f114", green:"#16a34a", red:"#dc2626", orange:"#ea580c", shadow:"0 4px 24px rgba(99,102,241,.08)" },
};

// ─── REDUCER ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch(action.type) {
    case "SET_ENTRIES": return {...state,entries:action.p};
    case "ADD_ENTRY":  return {...state,entries:[action.p,...state.entries]};
    case "DEL_ENTRY":  return {...state,entries:state.entries.filter(e=>e.id!==action.id)};
    case "UPD_ENTRY":  return {...state,entries:state.entries.map(e=>e.id===action.p.id?action.p:e)};
    case "ADD_GOAL":   return {...state,goals:[...state.goals,action.p]};
    case "UPD_GOAL":   return {...state,goals:state.goals.map(g=>g.id===action.p.id?action.p:g)};
    case "DEL_GOAL":   return {...state,goals:state.goals.filter(g=>g.id!==action.id)};
    case "ADD_REC":    return {...state,recurring:[...state.recurring,action.p]};
    case "UPD_REC":    return {...state,recurring:state.recurring.map(r=>r.id===action.p.id?action.p:r)};
    case "DEL_REC":    return {...state,recurring:state.recurring.filter(r=>r.id!==action.id)};
    default: return state;
  }
}

// ─── EXPORT UTILS ─────────────────────────────────────────────────────────────
const exportCSV = (entries) => {
  const blob=new Blob(["Label,Amount,Category,Type,Date\n"+entries.map(e=>`"${e.label}",${e.amount},"${e.category}","${e.type}","${e.date}"`).join("\n")],{type:"text/csv"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="budget.csv"; a.click();
};
const exportPDF=(entries,stats,f)=>{
  const w=window.open("","_blank");
  w.document.write(`<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;padding:32px}h1{color:#6366f1}table{width:100%;border-collapse:collapse}th{background:#6366f1;color:#fff;padding:8px;text-align:left}td{padding:8px;border-bottom:1px solid #eee}</style></head><body><h1>budget.track</h1><p>Income: ${f(stats.income)} | Spent: ${f(stats.expenses)} | Balance: ${f(stats.balance)}</p><table><thead><tr><th>Label</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead><tbody>${entries.map(e=>`<tr><td>${e.label}</td><td>${e.category}</td><td style="color:${e.type==="income"?"#16a34a":"#dc2626"}">${e.type==="income"?"+":"-"}${f(e.amount)}</td><td>${e.date}</td></tr>`).join("")}</tbody></table></body></html>`);
  w.document.close(); setTimeout(()=>w.print(),500);
};

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
const Badge=({cat})=><span style={{background:(CAT_COLORS[cat]||"#94a3b8")+"22",color:CAT_COLORS[cat]||"#94a3b8",border:`1px solid ${(CAT_COLORS[cat]||"#94a3b8")}44`,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,letterSpacing:".6px",textTransform:"uppercase",whiteSpace:"nowrap"}}>{cat}</span>;
const Stat=({label,value,accent,t})=><div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:14,padding:"16px 20px",flex:1,minWidth:110,boxShadow:t.shadow}}><div style={{fontSize:10,color:t.textMuted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>{label}</div><div style={{fontSize:20,fontWeight:800,color:accent||t.text,letterSpacing:"-1px",fontFamily:"'Syne',sans-serif"}}>{value}</div></div>;
const Card=({children,t,style={}})=><div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:14,padding:24,boxShadow:t.shadow,...style}}>{children}</div>;
const SLabel=({children,t})=><div style={{fontSize:10,color:t.textMuted,fontWeight:700,letterSpacing:1.4,textTransform:"uppercase",marginBottom:18}}>{children}</div>;
const Inp=(t,extra={})=>({background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"9px 12px",fontSize:13,outline:"none",fontFamily:"inherit",...extra});
const Btn=(bg,fg="#fff",sm=false)=>({background:bg,color:fg,border:"none",borderRadius:8,padding:sm?"6px 12px":"9px 18px",fontWeight:700,fontSize:sm?11:13,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"});

// ─────────────────────────────────────────────────────────────────────────────
//  CURRENCY PICKER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function CurrencyPicker({currency,currencyCode,setCurrencyCode,t}) {
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState("");
  const filtered=CURRENCIES.filter(c=>
    c.name.toLowerCase().includes(search.toLowerCase())||
    c.code.toLowerCase().includes(search.toLowerCase())||
    c.symbol.includes(search)
  );

  return (
    <div style={{position:"relative"}}>
      {/* Trigger button */}
      <button
        onClick={()=>setOpen(o=>!o)}
        style={{
          background:t.surface2, border:`1px solid ${t.border}`,
          borderRadius:9, padding:"6px 11px", cursor:"pointer",
          fontSize:13, color:t.text, fontFamily:"inherit",
          display:"flex", alignItems:"center", gap:6, fontWeight:700,
          boxShadow:open?`0 0 0 2px ${t.accent}44`:"none",
          transition:"box-shadow .15s",
        }}
      >
        <span style={{fontSize:16}}>{currency.flag}</span>
        <span style={{fontSize:13}}>{currency.symbol}</span>
        <span style={{fontSize:10,color:t.textMuted,marginLeft:1}}>{currency.code}</span>
        <span style={{fontSize:8,color:t.textMuted,marginLeft:2}}>{open?"▲":"▼"}</span>
      </button>

      {/* Dropdown */}
      {open&&(
        <>
          {/* Backdrop */}
          <div style={{position:"fixed",inset:0,zIndex:998}} onClick={()=>{setOpen(false);setSearch("");}}/>

          <div style={{
            position:"absolute", top:"calc(100% + 8px)", right:0,
            background:t.surface, border:`1px solid ${t.border}`,
            borderRadius:14, boxShadow:t.shadow, zIndex:999,
            width:260, overflow:"hidden",
          }}>
            {/* Header */}
            <div style={{padding:"12px 14px 8px",borderBottom:`1px solid ${t.border}`}}>
              <div style={{fontSize:11,color:t.textMuted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Select Currency</div>
              {/* Search box */}
              <input
                placeholder="Search currency..."
                value={search}
                onChange={e=>setSearch(e.target.value)}
                autoFocus
                style={{...Inp(t),width:"100%",fontSize:12,padding:"7px 10px",boxSizing:"border-box"}}
              />
            </div>

            {/* Currency list */}
            <div style={{maxHeight:260,overflowY:"auto",padding:6}}>
              {filtered.length===0&&<div style={{textAlign:"center",color:t.textMuted,padding:20,fontSize:12}}>No results</div>}
              {filtered.map(c=>(
                <button key={c.code} onClick={()=>{setCurrencyCode(c.code);setOpen(false);setSearch("");}} style={{
                  display:"flex", alignItems:"center", gap:10, width:"100%",
                  padding:"9px 10px", background:currencyCode===c.code?t.accentBg:"transparent",
                  border:"none", borderRadius:9, cursor:"pointer", fontFamily:"inherit",
                  textAlign:"left", transition:"background .1s",
                }}>
                  <span style={{fontSize:20,flexShrink:0}}>{c.flag}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:t.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                    <div style={{fontSize:10,color:t.textMuted,marginTop:1}}>{c.code} · <span style={{fontWeight:700}}>{c.symbol}</span></div>
                  </div>
                  {currencyCode===c.code&&<span style={{color:t.accent,fontSize:16,flexShrink:0}}>✓</span>}
                </button>
              ))}
            </div>

            {/* Footer: currently selected */}
            <div style={{borderTop:`1px solid ${t.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:8,background:t.surface2}}>
              <span style={{fontSize:18}}>{currency.flag}</span>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:t.text}}>{currency.name}</div>
                <div style={{fontSize:10,color:t.textMuted}}>{currency.code} · {currency.symbol}</div>
              </div>
              <span style={{marginLeft:"auto",fontSize:22,fontWeight:800,color:t.accent}}>{currency.symbol}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUTH PAGE
// ─────────────────────────────────────────────────────────────────────────────
function AuthPage({onLogin,t}) {
  const [mode,setMode]=useState("login");
  const [form,setForm]=useState({name:"",email:"demo@budget.track",password:"demo123"});
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const i={width:"100%",...Inp(t),marginBottom:12,boxSizing:"border-box"};
  const handle=async()=>{ setErr(""); setLoading(true); try{ const u=mode==="login"?await auth.login(form.email,form.password):await auth.signup(form.name,form.email,form.password); onLogin(u); }catch(e){setErr(e);} setLoading(false); };
  return (
    <div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace",padding:20}}>
      <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:20,padding:"40px 36px",width:"100%",maxWidth:400,boxShadow:t.shadow}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:28,fontFamily:"'Syne',sans-serif",fontWeight:800,color:t.text,letterSpacing:-1}}>budget<span style={{color:t.accent}}>.</span>track</div>
          <div style={{fontSize:12,color:t.textMuted,marginTop:6}}>{mode==="login"?"Welcome back":"Create your account"}</div>
        </div>
        {mode==="signup"&&<input style={i} placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>}
        <input style={i} placeholder="Email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
        <input style={i} type="password" placeholder="Password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handle()}/>
        {err&&<div style={{color:t.red,fontSize:12,marginBottom:12}}>{err}</div>}
        <button onClick={handle} disabled={loading} style={{...Btn(t.accent),width:"100%",marginBottom:16,opacity:loading?.7:1}}>{loading?"...":mode==="login"?"Sign In":"Create Account"}</button>
        <div style={{textAlign:"center",fontSize:12,color:t.textMuted}}>{mode==="login"?"No account? ":"Have an account? "}<span onClick={()=>setMode(m=>m==="login"?"signup":"login")} style={{color:t.accent,cursor:"pointer",fontWeight:700}}>{mode==="login"?"Sign up":"Sign in"}</span></div>
        <div style={{marginTop:20,padding:12,background:t.accentBg,borderRadius:8,fontSize:11,color:t.textMuted,textAlign:"center"}}>Demo: demo@budget.track / demo123</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ENTRIES TAB  — uses f(n) for all money display
// ─────────────────────────────────────────────────────────────────────────────
function EntriesTab({state,dispatch,monthlyBudget,setMonthlyBudget,t,f,currency}) {
  const [form,setForm]=useState({label:"",amount:"",category:"Food",type:"expense",date:todayStr()});
  const [filter,setFilter]=useState("all"); const [search,setSearch]=useState("");
  const [catFilter,setCatFilter]=useState("all"); const [sortBy,setSortBy]=useState("date");
  const [editingId,setEditingId]=useState(null); const [editForm,setEditForm]=useState({});
  const [loading,setLoading]=useState(false); const [err,setErr]=useState("");
  const [editBudget,setEditBudget]=useState(false); const [budgetInput,setBudgetInput]=useState(String(monthlyBudget));

  const {income,expenses,balance}=useMemo(()=>{ const i=state.entries.filter(e=>e.type==="income").reduce((s,e)=>s+e.amount,0); const x=state.entries.filter(e=>e.type==="expense").reduce((s,e)=>s+e.amount,0); return{income:i,expenses:x,balance:i-x}; },[state.entries]);
  const visible=useMemo(()=>{ let l=[...state.entries]; if(filter!=="all")l=l.filter(e=>e.type===filter); if(catFilter!=="all")l=l.filter(e=>e.category===catFilter); if(search.trim()){const q=search.toLowerCase();l=l.filter(e=>e.label.toLowerCase().includes(q)||e.category.toLowerCase().includes(q));} if(sortBy==="date")l.sort((a,b)=>new Date(b.date)-new Date(a.date)); else if(sortBy==="amount")l.sort((a,b)=>b.amount-a.amount); else l.sort((a,b)=>a.label.localeCompare(b.label)); return l; },[state.entries,filter,catFilter,search,sortBy]);

  const now=new Date();
  const thisExp=state.entries.filter(e=>{const d=new Date(e.date);return e.type==="expense"&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,e)=>s+e.amount,0);
  const bPct=Math.min((thisExp/monthlyBudget)*100,100); const bOver=thisExp>monthlyBudget;
  const handleAdd=async()=>{
    if(!form.label.trim())return setErr("Add a label.");
    if(!form.amount||+form.amount<=0)return setErr("Enter a valid amount.");
    setErr(""); setLoading(true);
    try {
      const p=await entriesApi.createEntry({...form,amount:parseFloat(form.amount)});
      dispatch({type:"ADD_ENTRY",p});
      setForm(fr=>({...fr,label:"",amount:""}));
    } catch(e) {
      setErr(e.message || "Unable to add entry. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const i=Inp(t);

  return (
    <div>
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <Stat label="Balance" value={f(balance)} accent={balance>=0?t.green:t.red} t={t}/>
        <Stat label="Income"  value={f(income)}  accent={t.green} t={t}/>
        <Stat label="Spent"   value={f(expenses)} accent={t.orange} t={t}/>
        <Stat label="Entries" value={state.entries.length} t={t}/>
      </div>

      {/* Budget bar */}
      <Card t={t} style={{marginBottom:16,border:`1px solid ${bOver?t.red+"44":t.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:10,color:t.textMuted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase"}}>Monthly Budget</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {editBudget?(<><input value={budgetInput} onChange={e=>setBudgetInput(e.target.value)} style={{...i,width:90,padding:"4px 8px",fontSize:12}}/><button onClick={()=>{const v=parseFloat(budgetInput);if(!isNaN(v)&&v>0){setMonthlyBudget(v);setEditBudget(false);}}} style={Btn(t.accent,"#fff",true)}>Save</button><button onClick={()=>setEditBudget(false)} style={Btn(t.surface2,t.textMuted,true)}>✕</button></>):(<><span style={{fontSize:12,color:bOver?t.red:t.textMuted,fontWeight:700}}>{bOver?"⚠ Over Budget!":f(monthlyBudget-thisExp)+" left"}</span><button onClick={()=>{setEditBudget(true);setBudgetInput(String(monthlyBudget));}} style={Btn(t.surface2,t.textMuted,true)}>✏ Edit</button></>)}
          </div>
        </div>
        <div style={{background:t.surface2,borderRadius:6,height:8,overflow:"hidden"}}><div style={{width:`${bPct}%`,height:"100%",background:bOver?t.red:bPct>80?t.orange:t.accent,borderRadius:6,transition:"width .4s"}}/></div>
        <div style={{marginTop:6,fontSize:11,color:t.textMuted}}>{f(thisExp)} of {f(monthlyBudget)} ({Math.round(bPct)}%)</div>
      </Card>

      {/* Add form */}
      <Card t={t} style={{marginBottom:16}}>
        <SLabel t={t}>+ New Entry</SLabel>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <input style={{...i,flex:2,minWidth:120}} placeholder="Label (e.g. Coffee)" value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAdd()}/>
          <input style={{...i,width:110}} placeholder={`Amount (${currency?.symbol||"£"})`} type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm(fr=>({...fr,amount:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAdd()}/>
          <select style={i} value={form.category} onChange={e=>setForm(fr=>({...fr,category:e.target.value}))}>{CATEGORIES.filter(c=>c!=="Income").map(c=><option key={c}>{c}</option>)}</select>
          <select style={i} value={form.type} onChange={e=>setForm(fr=>({...fr,type:e.target.value,category:e.target.value==="income"?"Income":fr.category==="Income"?"Food":fr.category}))}><option value="expense">Expense</option><option value="income">Income</option></select>
          <input style={{...i,width:130}} type="date" value={form.date} onChange={e=>setForm(fr=>({...fr,date:e.target.value}))}/>
          <button onClick={handleAdd} disabled={loading} style={{...Btn(t.accent),opacity:loading?.7:1}}>{loading?"...":"Add"}</button>
        </div>
        {err&&<div style={{color:t.red,fontSize:12,marginTop:10}}>{err}</div>}
      </Card>

      {/* Filters */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input style={{...i,flex:1,minWidth:130}} placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
        {["all","expense","income"].map(f2=><button key={f2} onClick={()=>setFilter(f2)} style={{...Btn(filter===f2?t.accentBg:"transparent",filter===f2?t.accent:t.textMuted,true),border:`1px solid ${filter===f2?t.accent+"44":t.border}`,borderRadius:8,textTransform:"capitalize"}}>{f2}</button>)}
        <select style={{...i,fontSize:11,padding:"7px 10px"}} value={catFilter} onChange={e=>setCatFilter(e.target.value)}><option value="all">All cats</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <select style={{...i,fontSize:11,padding:"7px 10px"}} value={sortBy} onChange={e=>setSortBy(e.target.value)}><option value="date">Date</option><option value="amount">Amount</option><option value="label">Label</option></select>
        <button onClick={()=>exportCSV(visible)} style={Btn(t.surface2,t.textMuted,true)}>⬇ CSV</button>
        <button onClick={()=>exportPDF(visible,{income,expenses,balance},f)} style={Btn(t.surface2,t.textMuted,true)}>⬇ PDF</button>
      </div>
      <div style={{fontSize:11,color:t.textFaint,marginBottom:8,textAlign:"right"}}>{visible.length} of {state.entries.length} entries</div>

      <Card t={t} style={{padding:0,overflow:"hidden"}}>
        {visible.length===0&&<div style={{padding:48,textAlign:"center",color:t.textMuted,fontSize:13}}>No entries found.</div>}
        {visible.map((entry,idx)=>editingId===entry.id?(
          <div key={entry.id} style={{padding:"12px 16px",borderBottom:idx<visible.length-1?`1px solid ${t.border2}`:"none",background:t.accentBg}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <input style={{...i,flex:2,minWidth:100,padding:"6px 10px",fontSize:12}} value={editForm.label} onChange={e=>setEditForm(f=>({...f,label:e.target.value}))}/>
              <input style={{...i,width:90,padding:"6px 10px",fontSize:12}} type="number" value={editForm.amount} onChange={e=>setEditForm(f=>({...f,amount:e.target.value}))}/>
              <select style={{...i,padding:"6px 10px",fontSize:12}} value={editForm.category} onChange={e=>setEditForm(f=>({...f,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
              <select style={{...i,padding:"6px 10px",fontSize:12}} value={editForm.type} onChange={e=>setEditForm(f=>({...f,type:e.target.value}))}><option value="expense">Expense</option><option value="income">Income</option></select>
              <input style={{...i,padding:"6px 10px",fontSize:12}} type="date" value={editForm.date} onChange={e=>setEditForm(f=>({...f,date:e.target.value}))}/>
              <button onClick={async()=>{setErr("Entry editing requires a backend update endpoint.");setEditingId(null);}} style={Btn(t.green,"#fff",true)}>✓ Save</button>
              <button onClick={()=>setEditingId(null)} style={Btn(t.surface2,t.textMuted,true)}>✕</button>
            </div>
          </div>
        ):(
          <div key={entry.id} className="rh" style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderBottom:idx<visible.length-1?`1px solid ${t.border2}`:"none",transition:"background .1s"}}>
            <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:entry.type==="income"?t.green:t.red}}/>
            <div style={{flex:1,fontSize:13,color:t.text,fontWeight:500}}>{entry.label}</div>
            <Badge cat={entry.category}/>
            <div style={{fontSize:11,color:t.textFaint,minWidth:52,textAlign:"right"}}>{new Date(entry.date+"T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</div>
            <div style={{fontSize:14,fontWeight:800,minWidth:80,textAlign:"right",color:entry.type==="income"?t.green:t.text}}>{entry.type==="income"?"+":"−"}{f(entry.amount)}</div>
            <button onClick={()=>{setEditingId(entry.id);setEditForm({...entry});}} style={{background:"transparent",border:"none",cursor:"pointer",color:t.textMuted,fontSize:13,padding:"0 3px",opacity:.5}} onMouseEnter={e=>{e.target.style.color=t.accent;e.target.style.opacity=1;}} onMouseLeave={e=>{e.target.style.color=t.textMuted;e.target.style.opacity=.5;}}>✏</button>
            <button onClick={async()=>{try{setErr("");await entriesApi.deleteEntry(entry.id);dispatch({type:"DEL_ENTRY",id:entry.id});}catch(e){setErr(e.message || "Unable to delete entry. Please try again.");}}} style={{background:"transparent",border:"none",cursor:"pointer",color:t.textMuted,fontSize:16,padding:"0 3px",opacity:.4}} onMouseEnter={e=>{e.target.style.color=t.red;e.target.style.opacity=1;}} onMouseLeave={e=>{e.target.style.color=t.textMuted;e.target.style.opacity=.4;}}>×</button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  GOALS TAB
// ─────────────────────────────────────────────────────────────────────────────
function GoalsTab({state,dispatch,t,f}) {
  const [showAdd,setShowAdd]=useState(false);
  const [contribId,setContribId]=useState(null); const [contribAmt,setContribAmt]=useState("");
  const [form,setForm]=useState({name:"",target:"",saved:"0",emoji:"🎯",color:"#6366f1",deadline:todayStr()});
  const [err,setErr]=useState("");
  const EMOJIS=["🎯","🛡️","💻","✈️","🎓","🏠","🚗","💍","🎸","📱","🏋️","🌴","💎","🎮","📚","🎁","🏖️","🍕"];
  const GCOLORS=["#6366f1","#06b6d4","#f97316","#22c55e","#ec4899","#8b5cf6","#ef4444","#eab308","#14b8a6"];
  const i=Inp(t);

  const addGoal=async()=>{ if(!form.name.trim())return setErr("Goal name required"); if(!form.target||+form.target<=0)return setErr("Enter a valid target"); setErr(""); const p={...form,id:createId(),target:parseFloat(form.target),saved:parseFloat(form.saved)||0}; dispatch({type:"ADD_GOAL",p}); setForm({name:"",target:"",saved:"0",emoji:"🎯",color:"#6366f1",deadline:todayStr()}); setShowAdd(false); };
  const contribute=async(id)=>{ const amt=parseFloat(contribAmt); if(isNaN(amt)||amt<=0)return; const g=state.goals.find(g=>g.id===id); const p={...g,saved:Math.min(g.saved+amt,g.target)}; dispatch({type:"UPD_GOAL",p}); setContribId(null); setContribAmt(""); };
  const deleteGoal=async(id)=>{ dispatch({type:"DEL_GOAL",id}); };
  const daysLeft=(dl)=>Math.max(0,Math.ceil((new Date(dl)-new Date())/86400000));

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:22,fontFamily:"'Syne',sans-serif",fontWeight:800,color:t.text}}>Financial Goals</div>
        <button onClick={()=>setShowAdd(s=>!s)} style={Btn(t.accent)}>{showAdd?"✕ Cancel":"+ New Goal"}</button>
      </div>
      {showAdd&&(
        <Card t={t} style={{marginBottom:20}}>
          <SLabel t={t}>Create New Goal</SLabel>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
            <input style={{...i,flex:2,minWidth:140}} placeholder="Goal name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
            <input style={{...i,width:120}} placeholder="Target" type="number" value={form.target} onChange={e=>setForm(f=>({...f,target:e.target.value}))}/>
            <input style={{...i,width:120}} placeholder="Already saved" type="number" value={form.saved} onChange={e=>setForm(f=>({...f,saved:e.target.value}))}/>
            <input style={{...i,width:140}} type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))}/>
          </div>
          <div style={{marginBottom:12}}><div style={{fontSize:10,color:t.textMuted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Icon</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{EMOJIS.map(e=><button key={e} onClick={()=>setForm(f=>({...f,emoji:e}))} style={{background:form.emoji===e?t.accentBg:"transparent",border:`1px solid ${form.emoji===e?t.accent:t.border}`,borderRadius:8,width:36,height:36,cursor:"pointer",fontSize:18}}>{e}</button>)}</div></div>
          <div style={{marginBottom:16}}><div style={{fontSize:10,color:t.textMuted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Color</div><div style={{display:"flex",gap:8}}>{GCOLORS.map(c=><button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:28,height:28,borderRadius:"50%",background:c,border:form.color===c?"3px solid #fff":"3px solid transparent",cursor:"pointer",outline:form.color===c?`2px solid ${c}`:"none",outlineOffset:2}}/>)}</div></div>
          {err&&<div style={{color:t.red,fontSize:12,marginBottom:10}}>{err}</div>}
          <button onClick={addGoal} style={Btn(t.accent)}>Add Goal</button>
        </Card>
      )}
      {state.goals.length===0?(
        <Card t={t}><div style={{textAlign:"center",color:t.textMuted,padding:40,fontSize:13}}>No goals yet.</div></Card>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
          {state.goals.map(goal=>{
            const pct=Math.min((goal.saved/goal.target)*100,100); const done=pct>=100;
            const days=daysLeft(goal.deadline); const remaining=goal.target-goal.saved; const daily=days>0?remaining/days:0;
            return (
              <div key={goal.id} style={{background:t.surface,border:`1px solid ${done?goal.color+"66":t.border}`,borderRadius:16,padding:22,boxShadow:done?`0 0 24px ${goal.color}22`:t.shadow,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:goal.color+"11",pointerEvents:"none"}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{fontSize:28}}>{goal.emoji}</div><div><div style={{fontSize:14,fontWeight:700,color:t.text}}>{goal.name}</div><div style={{fontSize:11,color:t.textMuted,marginTop:2}}>{done?"🎉 Completed!":days===0?"⚡ Due today!":days<7?`⚠ ${days}d left`:`${days}d left`}</div></div></div>
                  <button onClick={()=>deleteGoal(goal.id)} style={{background:"transparent",border:"none",cursor:"pointer",color:t.textMuted,fontSize:14,opacity:.5,padding:2}} onMouseEnter={e=>e.target.style.opacity=1} onMouseLeave={e=>e.target.style.opacity=.5}>×</button>
                </div>
                <div style={{background:t.surface2,borderRadius:8,height:10,marginBottom:10,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",borderRadius:8,background:done?`linear-gradient(90deg,${goal.color},#22c55e)`:`linear-gradient(90deg,${goal.color}cc,${goal.color})`,transition:"width .6s"}}/></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:16}}><span style={{color:goal.color,fontWeight:800}}>{f(goal.saved)}</span><span style={{color:t.textMuted}}>of {f(goal.target)} ({Math.round(pct)}%)</span></div>
                {!done&&<div style={{fontSize:11,color:t.textMuted,marginBottom:14,padding:"8px 10px",background:t.surface2,borderRadius:8}}>Need {f(remaining)} more · {f(daily)}/day</div>}
                {!done&&(contribId===goal.id?(
                  <div style={{display:"flex",gap:6}}><input style={{...i,flex:1,padding:"7px 10px",fontSize:12}} type="number" placeholder="Amount" value={contribAmt} onChange={e=>setContribAmt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&contribute(goal.id)} autoFocus/><button onClick={()=>contribute(goal.id)} style={{...Btn(goal.color),padding:"7px 14px",fontSize:12}}>Add</button><button onClick={()=>{setContribId(null);setContribAmt("");}} style={{...Btn(t.surface2,t.textMuted),padding:"7px 10px",fontSize:12}}>✕</button></div>
                ):(<button onClick={()=>setContribId(goal.id)} style={{background:goal.color+"22",color:goal.color,border:`1px solid ${goal.color}44`,borderRadius:8,padding:"8px 0",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",width:"100%"}}>+ Contribute</button>))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  RECEIPT OCR HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const RECEIPT_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const TOTAL_PATTERNS = [
  /(?:grand\s+total|invoice\s+total|total\s+amount|amount\s+due|total|amount)\s*[:\-]?\s*(?:rs\.?|inr|₹|\$|€|£)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/gi,
  /(?:rs\.?|inr|₹|\$|€|£)\s*([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:grand\s+total|invoice\s+total|total|amount)?/gi,
];

const parseMoney = value => Number(String(value || "").replace(/,/g, ""));

const extractReceiptTotal = text => {
  const matches = [];
  TOTAL_PATTERNS.forEach(pattern => {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const amount = parseMoney(match[1]);
      if (Number.isFinite(amount) && amount > 0) matches.push(amount);
    }
  });
  if (matches.length) return matches[matches.length - 1];

  const numericLines = text.split(/\n+/).map(line => line.match(/([0-9][0-9,]*\.\d{2})\b/)).filter(Boolean).map(m => parseMoney(m[1]));
  return numericLines.length ? Math.max(...numericLines) : 0;
};

const parseReceiptText = text => {
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const total = extractReceiptTotal(text);
  if (!total) return null;
  const dateMatch = text.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/);
  const parsedDate = dateMatch ? new Date(dateMatch[1]) : null;
  const store = lines.find(line => !/total|amount|invoice|date|gst|tax/i.test(line)) || "Scanned Receipt";
  return {
    store,
    date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString().slice(0,10) : todayStr(),
    total,
    items: [{ label: `${store} receipt`, amount: total, category: "Food" }],
  };
};

const preprocessReceiptImage = file => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(Math.max(1400 / Math.max(img.width, img.height), 1), 2.5);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const gray = (image.data[i] * 0.299 + image.data[i + 1] * 0.587 + image.data[i + 2] * 0.114);
      const contrasted = gray > 145 ? 255 : Math.max(0, gray - 30);
      image.data[i] = image.data[i + 1] = image.data[i + 2] = contrasted;
    }
    ctx.putImageData(image, 0, 0);
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Unable to preprocess image")), "image/png", 1);
  };
  img.onerror = reject;
  img.src = URL.createObjectURL(file);
});

// ─────────────────────────────────────────────────────────────────────────────
//  RECEIPT SCANNER
// ─────────────────────────────────────────────────────────────────────────────
function ReceiptScanner({state,dispatch,t,f}) {
  const [scanning,setScanning]=useState(false); const [result,setResult]=useState(null);
  const [preview,setPreview]=useState(null); const [error,setError]=useState("");
  const [adding,setAdding]=useState(false); const [items,setItems]=useState([]);
  const [rawText,setRawText]=useState(""); const [confidence,setConfidence]=useState(null);
  const fileRef=useRef(); const workerRef=useRef(null);

  useEffect(()=>()=>{ workerRef.current?.terminate?.(); },[]);

  const getWorker=async()=>{
    if(workerRef.current) return workerRef.current;
    console.log("[ReceiptScanner] Initializing Tesseract.js worker");
    const worker=await createWorker("eng", 1, {
      logger: m => console.log("[ReceiptScanner][Tesseract]", m),
    });
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:/- ₹$€£\n",
      preserve_interword_spaces: "1",
    });
    console.log("[ReceiptScanner] Tesseract.js worker initialized");
    workerRef.current=worker;
    return worker;
  };

  const handleFile=async(file)=>{
    if(!file)return; setError(""); setResult(null); setItems([]); setRawText(""); setConfidence(null);
    if(!RECEIPT_TYPES.includes(file.type)) { setError("Please upload a JPG, JPEG, or PNG receipt image."); return; }
    setScanning(true);
    const reader=new FileReader(); reader.onload=e=>setPreview(e.target.result); reader.readAsDataURL(file);
    try {
      const processed=await preprocessReceiptImage(file);
      const worker=await getWorker();
      const { data }=await worker.recognize(processed);
      const text=data.text || "";
      console.log("[ReceiptScanner] OCR output:", text);
      console.log("[ReceiptScanner] OCR confidence:", data.confidence);
      setRawText(text); setConfidence(Math.round(data.confidence || 0));
      const parsed=parseReceiptText(text);
      if(!parsed) {
        setResult({store:"OCR Text Extracted",date:todayStr(),total:0,items:[],parseFailed:true});
        setError("OCR completed, but no receipt total could be parsed. Review the extracted text below.");
      } else {
        setResult(parsed); setItems(parsed.items.map(it=>({...it,id:createId(),include:true})));
      }
    } catch(e) {
      console.error("[ReceiptScanner] Scan failed", e);
      setError(e.message || "Could not scan receipt. Please try a clearer image.");
    }
    setScanning(false);
  };

  const generateSampleReceipt=()=>{
    const canvas=document.createElement("canvas"); canvas.width=720; canvas.height=920;
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#fff"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#111"; ctx.font="bold 42px Arial"; ctx.fillText("CAMPUS MART",70,90);
    ctx.font="26px Arial";
    ["Date: 2026-06-23","Milk              65.00","Notebook         120.00","Snacks            85.50","Tax               14.50","Grand Total: ₹285.00"].forEach((line,i)=>ctx.fillText(line,70,170+i*70));
    canvas.toBlob(blob=>handleFile(new File([blob],"sample-receipt.png",{type:"image/png"})),"image/png");
  };

  const addEntries=async()=>{
    setAdding(true); setError("");
    try {
      const dt=result?.date||todayStr();
      for(const it of items.filter(i=>i.include)){
        const p=await entriesApi.createEntry({label:it.label,amount:it.amount,category:it.category,type:"expense",date:dt});
        dispatch({type:"ADD_ENTRY",p});
      }
      setResult(null);setPreview(null);setItems([]);setRawText("");setConfidence(null);
    } catch(e) {
      setError(e.message || "Unable to save receipt items. Please try again.");
    } finally { setAdding(false); }
  };
  const i=Inp(t);

  return (
    <div>
      <div style={{fontSize:22,fontFamily:"'Syne',sans-serif",fontWeight:800,color:t.text,marginBottom:6}}>Receipt Scanner</div>
      <div style={{fontSize:13,color:t.textMuted,marginBottom:24}}>Upload a JPG, JPEG, or PNG receipt photo — Tesseract OCR extracts text before parsing totals.</div>
      <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
        <Card t={t} style={{flex:1,minWidth:280}}>
          <SLabel t={t}>Upload Receipt</SLabel>
          <div onClick={()=>!scanning&&fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
            style={{border:`2px dashed ${scanning?t.accent:t.border}`,borderRadius:12,padding:"40px 20px",textAlign:"center",cursor:scanning?"wait":"pointer",background:scanning?t.accentBg:"transparent",transition:"all .2s"}}>
            {scanning?(<div><div style={{fontSize:36,marginBottom:12,display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</div><div style={{color:t.accent,fontWeight:700,fontSize:14}}>Scanning receipt...</div></div>
            ):preview?(<div><img src={preview} alt="Receipt" style={{maxWidth:"100%",maxHeight:200,borderRadius:8,marginBottom:12,objectFit:"contain"}}/><div style={{color:t.textMuted,fontSize:12}}>Click to upload different receipt</div></div>
            ):(<div><div style={{fontSize:48,marginBottom:12}}>🧾</div><div style={{color:t.text,fontWeight:700,fontSize:14,marginBottom:6}}>Drop receipt here</div><div style={{color:t.textMuted,fontSize:12}}>or click to browse · JPG, JPEG, PNG</div></div>)}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
          <button onClick={generateSampleReceipt} disabled={scanning} style={{...Btn(t.accentBg,t.accent,true),border:`1px solid ${t.accent}44`,marginTop:12}}>Generate sample receipt & scan</button>
          {error&&<div style={{color:t.red,fontSize:12,marginTop:12,padding:"10px 12px",background:t.red+"11",borderRadius:8}}>{error}</div>}
          {!scanning&&!result&&<div style={{marginTop:16,padding:"12px 14px",background:t.accentBg,borderRadius:8,fontSize:11,color:t.textMuted}}>💡 Works best with clear, well-lit photos.</div>}
        </Card>
        {(rawText||result)&&(
          <Card t={t} style={{flex:1,minWidth:280}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><SLabel t={t}>OCR Result</SLabel><div style={{fontSize:11,color:t.textMuted}}>Confidence: {confidence ?? "—"}%</div></div>
            <div style={{fontSize:11,color:t.textMuted,marginBottom:8}}>Raw OCR text before parsing</div>
            <pre style={{whiteSpace:"pre-wrap",maxHeight:180,overflow:"auto",background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,padding:12,color:t.text,fontSize:11}}>{rawText || "No OCR text extracted."}</pre>
            {result&&!result.parseFailed&&(<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"16px 0"}}><SLabel t={t}>Extracted Items</SLabel><div style={{fontSize:11,color:t.textMuted}}>{result.store} · {result.date}</div></div>
              {items.map((it,idx)=>(
                <div key={it.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:`1px solid ${t.border2}`,opacity:it.include?1:.4}}>
                  <input type="checkbox" checked={it.include} onChange={e=>setItems(arr=>arr.map((a,j)=>j===idx?{...a,include:e.target.checked}:a))} style={{accentColor:t.accent,width:14,height:14,flexShrink:0}}/>
                  <input style={{...i,flex:2,padding:"5px 8px",fontSize:12}} value={it.label} onChange={e=>setItems(arr=>arr.map((a,j)=>j===idx?{...a,label:e.target.value}:a))}/>
                  <select style={{...i,width:110,padding:"5px 8px",fontSize:12}} value={it.category} onChange={e=>setItems(arr=>arr.map((a,j)=>j===idx?{...a,category:e.target.value}:a))}>{CATEGORIES.filter(c=>c!=="Income").map(c=><option key={c}>{c}</option>)}</select>
                  <input style={{...i,width:80,padding:"5px 8px",fontSize:12}} type="number" value={it.amount} onChange={e=>setItems(arr=>arr.map((a,j)=>j===idx?{...a,amount:parseFloat(e.target.value)||0}:a))}/>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",marginBottom:12,marginTop:8,borderTop:`1px solid ${t.border}`}}><span style={{fontSize:13,color:t.textMuted,fontWeight:700}}>{items.filter(i=>i.include).length} items</span><span style={{fontSize:15,fontWeight:800,color:t.accent}}>{f(items.filter(i=>i.include).reduce((s,i)=>s+i.amount,0))}</span></div>
              <div style={{display:"flex",gap:8}}><button onClick={addEntries} disabled={adding||items.filter(i=>i.include).length===0} style={{...Btn(t.accent),flex:2,opacity:adding?.7:1}}>{adding?"Adding...":"✓ Add to Budget"}</button><button onClick={()=>{setResult(null);setPreview(null);setItems([]);setRawText("");setConfidence(null);}} style={Btn(t.surface2,t.textMuted)}>Discard</button></div>
            </>)}
          </Card>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  RECURRING TAB
// ─────────────────────────────────────────────────────────────────────────────
function RecurringTab({state,dispatch,t,f}) {
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({label:"",amount:"",category:"Entertainment",frequency:"monthly",nextDate:todayStr()});
  const [err,setErr]=useState("");
  const i=Inp(t);

  const annualCost=r=>r.amount*(FREQ_MULT[r.frequency]||12);
  const isDue=r=>Math.ceil((new Date(r.nextDate)-new Date())/86400000)<=3;
  const addR=async()=>{ if(!form.label.trim())return setErr("Label required"); if(!form.amount||+form.amount<=0)return setErr("Valid amount needed"); setErr(""); const p={...form,id:createId(),amount:parseFloat(form.amount),active:true}; dispatch({type:"ADD_REC",p}); setForm({label:"",amount:"",category:"Entertainment",frequency:"monthly",nextDate:todayStr()}); setShowAdd(false); };
  const toggleR=async(id,active)=>{ const r=state.recurring.find(r=>r.id===id); const p={...r,active:!active}; dispatch({type:"UPD_REC",p}); };
  const removeR=async(id)=>{ dispatch({type:"DEL_REC",id}); };
  const applyNow=async(r)=>{
    setErr("");
    try {
      const p=await entriesApi.createEntry({label:r.label,amount:r.amount,category:r.category,type:"expense",date:todayStr()});
      dispatch({type:"ADD_ENTRY",p});
      const nd=new Date(); nd.setDate(nd.getDate()+(FREQ_DAYS[r.frequency]||30));
      const upd={...r,nextDate:nd.toISOString().slice(0,10)}; dispatch({type:"UPD_REC",p:upd});
    } catch(e) {
      setErr(e.message || "Unable to apply recurring expense. Please try again.");
    }
  };

  const active=state.recurring.filter(r=>r.active); const inactive=state.recurring.filter(r=>!r.active);
  const monthlyTotal=active.reduce((s,r)=>s+(r.amount*(r.frequency==="weekly"?4.33:r.frequency==="biweekly"?2.17:r.frequency==="yearly"?0.083:1)),0);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><div style={{fontSize:22,fontFamily:"'Syne',sans-serif",fontWeight:800,color:t.text}}>Recurring Expenses</div><div style={{fontSize:12,color:t.textMuted,marginTop:4}}>Monthly impact: <span style={{color:t.red,fontWeight:700}}>{f(monthlyTotal)}/mo</span></div></div>
        <button onClick={()=>setShowAdd(s=>!s)} style={Btn(t.accent)}>{showAdd?"✕ Cancel":"+ Add Recurring"}</button>
      </div>
      {showAdd&&(<Card t={t} style={{marginBottom:20}}><SLabel t={t}>New Recurring Expense</SLabel><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}><input style={{...i,flex:2,minWidth:130}} placeholder="Label" value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))}/><input style={{...i,width:100}} placeholder="Amount" type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/><select style={i} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{CATEGORIES.filter(c=>c!=="Income").map(c=><option key={c}>{c}</option>)}</select><select style={i} value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}>{Object.entries(FREQS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><input style={{...i,width:130}} type="date" value={form.nextDate} onChange={e=>setForm(f=>({...f,nextDate:e.target.value}))}/><button onClick={addR} style={Btn(t.accent)}>Add</button></div>{err&&<div style={{color:t.red,fontSize:12}}>{err}</div>}</Card>)}

      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <Stat label="Active" value={active.length} accent={t.accent} t={t}/>
        <Stat label="Monthly" value={f(monthlyTotal)} accent={t.red} t={t}/>
        <Stat label="Annual" value={f(active.reduce((s,r)=>s+annualCost(r),0))} accent={t.orange} t={t}/>
        <Stat label="Due Soon" value={active.filter(isDue).length} accent={t.green} t={t}/>
      </div>

      {active.length>0&&(<Card t={t} style={{marginBottom:16}}><SLabel t={t}>Active ({active.length})</SLabel>{active.map((r,idx)=>{ const due=isDue(r); const days=Math.ceil((new Date(r.nextDate)-new Date())/86400000); return(<div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:idx<active.length-1?`1px solid ${t.border2}`:"none"}}><div style={{width:8,height:8,borderRadius:"50%",background:due?t.orange:t.green,flexShrink:0}}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:t.text}}>{r.label}</div><div style={{fontSize:11,color:t.textMuted,marginTop:2}}>{FREQS[r.frequency]} · next: {new Date(r.nextDate+"T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"})}{due&&<span style={{color:t.orange,fontWeight:700,marginLeft:6}}>⚡ {days<=0?"Today!":days+"d"}</span>}</div></div><Badge cat={r.category}/><div style={{fontSize:14,fontWeight:800,color:t.text,minWidth:64,textAlign:"right"}}>{f(r.amount)}</div><div style={{fontSize:11,color:t.textMuted,minWidth:60,textAlign:"right"}}>{f(annualCost(r))}/yr</div><button onClick={()=>applyNow(r)} style={{...Btn(t.accentBg,t.accent,true),border:`1px solid ${t.accent}44`}}>+ Apply</button><button onClick={()=>toggleR(r.id,r.active)} style={{...Btn(t.surface2,t.textMuted,true),border:`1px solid ${t.border}`}}>Pause</button><button onClick={()=>removeR(r.id)} style={{background:"transparent",border:"none",cursor:"pointer",color:t.textMuted,fontSize:16,padding:"0 2px",opacity:.4}} onMouseEnter={e=>{e.target.style.opacity=1;e.target.style.color=t.red;}} onMouseLeave={e=>{e.target.style.opacity=.4;e.target.style.color=t.textMuted;}}>×</button></div>); })}</Card>)}
      {inactive.length>0&&(<Card t={t}><SLabel t={t}>Paused ({inactive.length})</SLabel>{inactive.map((r,idx)=>(<div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:idx<inactive.length-1?`1px solid ${t.border2}`:"none",opacity:.6}}><div style={{width:8,height:8,borderRadius:"50%",background:t.textMuted,flexShrink:0}}/><div style={{flex:1,fontSize:13,color:t.text}}>{r.label}</div><Badge cat={r.category}/><div style={{fontSize:14,fontWeight:700,color:t.textMuted}}>{f(r.amount)}</div><button onClick={()=>toggleR(r.id,r.active)} style={{...Btn(t.green+"22",t.green,true),border:`1px solid ${t.green}44`}}>Resume</button><button onClick={()=>removeR(r.id)} style={{background:"transparent",border:"none",cursor:"pointer",color:t.textMuted,fontSize:16,opacity:.4}} onMouseEnter={e=>{e.target.style.opacity=1;e.target.style.color=t.red;}} onMouseLeave={e=>{e.target.style.opacity=.4;e.target.style.color=t.textMuted;}}>×</button></div>))}</Card>)}
      {state.recurring.length===0&&<Card t={t}><div style={{textAlign:"center",color:t.textMuted,padding:40,fontSize:13}}>No recurring expenses yet.</div></Card>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  HEATMAP TAB
// ─────────────────────────────────────────────────────────────────────────────
function HeatmapTab({entries,t,f}) {
  const [weeksBack,setWeeksBack]=useState(12); const [hovered,setHovered]=useState(null);
  const {cells,maxAmt,weekLabels}=useMemo(()=>{ const today=new Date(); today.setHours(0,0,0,0); const start=new Date(today); start.setDate(start.getDate()-start.getDay()-(weeksBack-1)*7); const dayMap={}; entries.filter(e=>e.type==="expense").forEach(e=>{const k=new Date(e.date+"T00:00:00").toISOString().slice(0,10);dayMap[k]=(dayMap[k]||0)+e.amount;}); const cells=[]; const weekLabels=[]; let maxAmt=0; for(let w=0;w<weeksBack;w++){const ws=new Date(start);ws.setDate(ws.getDate()+w*7);weekLabels.push(MONTHS[ws.getMonth()]+" "+ws.getDate());for(let d=0;d<7;d++){const date=new Date(ws);date.setDate(ws.getDate()+d);const key=date.toISOString().slice(0,10);const amt=dayMap[key]||0;if(amt>maxAmt)maxAmt=amt;cells.push({date:key,amount:amt,week:w,day:d,isFuture:date>today});}} return{cells,maxAmt,weekLabels}; },[entries,weeksBack]);
  const getCellBg=(amt,isFuture)=>{ if(isFuture||amt===0)return t.surface2; const p=Math.min(amt/Math.max(maxAmt,1),1); if(p<0.2)return t.accent+"33"; if(p<0.4)return t.accent+"66"; if(p<0.6)return t.accent+"99"; if(p<0.8)return t.accent+"cc"; return t.accent; };
  const dayAvgs=useMemo(()=>{ const totals=Array(7).fill(0); const counts=Array(7).fill(0); cells.filter(c=>!c.isFuture&&c.amount>0).forEach(c=>{totals[c.day]+=c.amount;counts[c.day]++;}); return totals.map((v,i)=>counts[i]>0?v/counts[i]:0); },[cells]);
  const weekTotals=useMemo(()=>{ const arr=Array(weeksBack).fill(0); cells.filter(c=>!c.isFuture).forEach(c=>arr[c.week]+=c.amount); return arr; },[cells,weeksBack]);
  const maxWeekTotal=Math.max(...weekTotals,1);
  const heatGrid=Array(7).fill(null).map((_,d)=>Array(weeksBack).fill(null).map((_,w)=>cells.find(c=>c.week===w&&c.day===d)));
  const peakDay=DAYS[dayAvgs.indexOf(Math.max(...dayAvgs))];
  const avgWeekly=weekTotals.filter(v=>v>0).reduce((s,v,_,a)=>s+v/a.length,0)||0;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div><div style={{fontSize:22,fontFamily:"'Syne',sans-serif",fontWeight:800,color:t.text}}>Spending Heatmap</div><div style={{fontSize:12,color:t.textMuted,marginTop:4}}>Visualize daily spending intensity</div></div>
        <div style={{display:"flex",gap:6}}>{[8,12,16,24].map(w=><button key={w} onClick={()=>setWeeksBack(w)} style={{...Btn(weeksBack===w?t.accentBg:"transparent",weeksBack===w?t.accent:t.textMuted,true),border:`1px solid ${weeksBack===w?t.accent+"44":t.border}`,borderRadius:7}}>{w}w</button>)}</div>
      </div>
      <Card t={t} style={{marginBottom:20,overflowX:"auto"}}>
        <SLabel t={t}>Daily Spending — Darker = More Spent</SLabel>
        <div style={{display:"flex",gap:0,minWidth:0}}>
          <div style={{display:"flex",flexDirection:"column",gap:3,marginRight:8,paddingTop:22,flexShrink:0}}>{DAYS.map(d=><div key={d} style={{height:14,fontSize:9,color:t.textMuted,fontWeight:600,display:"flex",alignItems:"center",letterSpacing:.5}}>{d}</div>)}</div>
          <div style={{overflowX:"auto",flex:1}}>
            <div style={{display:"flex",gap:3,marginBottom:4}}>{weekLabels.map((lbl,i)=><div key={i} style={{width:14,flexShrink:0,fontSize:8,color:t.textMuted,textAlign:"center",whiteSpace:"nowrap",transform:"rotate(-45deg)",transformOrigin:"left bottom",opacity:i%3===0?1:0}}>{lbl}</div>)}</div>
            {heatGrid.map((row,d)=>(<div key={d} style={{display:"flex",gap:3,marginBottom:3}}>{row.map((cell,w)=>{ if(!cell)return <div key={w} style={{width:14,height:14,flexShrink:0}}/>; const isHov=hovered?.date===cell.date; return <div key={w} onMouseEnter={()=>setHovered(cell)} onMouseLeave={()=>setHovered(null)} style={{width:14,height:14,flexShrink:0,borderRadius:3,background:getCellBg(cell.amount,cell.isFuture),cursor:cell.amount>0?"pointer":"default",transition:"transform .1s",transform:isHov?"scale(1.5)":"scale(1)",boxShadow:isHov?`0 0 8px ${t.accent}66`:"none",zIndex:isHov?10:1,position:"relative",border:isHov?`1px solid ${t.accent}`:undefined}}/>; })}</div>))}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,marginTop:16}}><span style={{fontSize:10,color:t.textMuted}}>Less</span>{[0,.2,.4,.6,.8,1].map(v=><div key={v} style={{width:12,height:12,borderRadius:2,background:v===0?t.surface2:`${t.accent}${Math.round(v*255).toString(16).padStart(2,"0")}`}}/>)}<span style={{fontSize:10,color:t.textMuted}}>More</span></div>
        {hovered&&hovered.amount>0&&(<div style={{marginTop:12,padding:"10px 14px",background:t.accentBg,border:`1px solid ${t.accent}44`,borderRadius:8,fontSize:12,color:t.text,display:"inline-flex",gap:8,alignItems:"center"}}><span style={{fontWeight:700}}>{new Date(hovered.date+"T00:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</span><span>—</span><span style={{color:t.accent,fontWeight:800,fontSize:14}}>{f(hovered.amount)}</span><span style={{color:t.textMuted}}>spent</span></div>)}
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card t={t}>
          <SLabel t={t}>Avg Spend by Day</SLabel>
          {DAYS.map((day,i)=>{ const isPeak=dayAvgs[i]===Math.max(...dayAvgs)&&dayAvgs[i]>0; return(<div key={day} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:t.text,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>{day}{isPeak&&<span style={{fontSize:9,background:t.red+"22",color:t.red,padding:"1px 5px",borderRadius:4,fontWeight:700}}>PEAK</span>}</span><span style={{color:isPeak?t.red:t.textMuted,fontWeight:700}}>{f(dayAvgs[i])}</span></div><div style={{background:t.surface2,borderRadius:4,height:7,overflow:"hidden"}}><div style={{width:`${(dayAvgs[i]/Math.max(...dayAvgs,1))*100}%`,height:"100%",borderRadius:4,background:isPeak?t.red:t.accent,transition:"width .5s"}}/></div></div>); })}
          <div style={{marginTop:12,fontSize:11,color:t.textMuted,padding:"8px 10px",background:t.surface2,borderRadius:7}}>📅 Most expensive day: <b style={{color:t.red}}>{peakDay}</b></div>
        </Card>
        <Card t={t}>
          <SLabel t={t}>Weekly Totals</SLabel>
          {weekTotals.slice(-8).map((total,i,arr)=>{ const wIdx=weeksBack-arr.length+i; const isPeak=total===Math.max(...weekTotals); return(<div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{fontSize:10,color:t.textMuted,width:50,flexShrink:0,textAlign:"right"}}>{weekLabels[wIdx]||""}</div><div style={{flex:1,background:t.surface2,borderRadius:4,height:8,overflow:"hidden"}}><div style={{width:`${(total/maxWeekTotal)*100}%`,height:"100%",borderRadius:4,background:isPeak?t.red:t.accent+"99",transition:"width .5s"}}/></div><div style={{fontSize:11,fontWeight:700,color:isPeak?t.red:t.text,width:60,textAlign:"right"}}>{f(total)}</div></div>); })}
          <div style={{marginTop:12,fontSize:11,color:t.textMuted,padding:"8px 10px",background:t.surface2,borderRadius:7}}>📊 Avg weekly: <b style={{color:t.accent}}>{f(avgWeekly)}</b></div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CHARTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function ChartsTab({entries,t,f}) {
  const catData=useMemo(()=>{ const m={}; entries.filter(e=>e.type==="expense").forEach(e=>{m[e.category]=(m[e.category]||0)+e.amount;}); return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value); },[entries]);
  const monthly=useMemo(()=>{ const m={}; entries.forEach(e=>{const d=new Date(e.date);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;if(!m[k])m[k]={month:MONTHS[d.getMonth()],income:0,expense:0};if(e.type==="income")m[k].income+=e.amount;else m[k].expense+=e.amount;}); return Object.values(m).slice(-6).reverse(); },[entries]);
  const TT=({active,payload,label})=>active&&payload?.length?<div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 14px",fontSize:12}}>{label&&<div style={{color:t.textMuted,marginBottom:4}}>{label}</div>}{payload.map((p,i)=><div key={i} style={{color:p.color,fontWeight:700}}>{p.name}: {f(p.value)}</div>)}</div>:null;
  const total=catData.reduce((s,d)=>s+d.value,0);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card t={t}><SLabel t={t}>Monthly Income vs Expenses</SLabel>{monthly.length>0?<ResponsiveContainer width="100%" height={220}><BarChart data={monthly} barGap={4} barCategoryGap="30%"><CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false}/><XAxis dataKey="month" tick={{fill:t.textMuted,fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:t.textMuted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>f(v)}/><Tooltip content={<TT/>}/><Bar dataKey="income" name="Income" fill={t.green} radius={[4,4,0,0]}/><Bar dataKey="expense" name="Expenses" fill={t.accent} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>:<div style={{textAlign:"center",color:t.textMuted,padding:40,fontSize:13}}>Add entries to see chart</div>}</Card>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        <Card t={t} style={{flex:1,minWidth:260}}><SLabel t={t}>Spending by Category</SLabel>{catData.length>0?<><ResponsiveContainer width="100%" height={180}><PieChart><Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">{catData.map((e,i)=><Cell key={i} fill={CAT_COLORS[e.name]||"#94a3b8"}/>)}</Pie><Tooltip content={<TT/>}/></PieChart></ResponsiveContainer><div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>{catData.map(d=><div key={d.name} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:t.textMuted}}><div style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[d.name]||"#94a3b8"}}/>{d.name}</div>)}</div></>:<div style={{textAlign:"center",color:t.textMuted,padding:40,fontSize:13}}>No data</div>}</Card>
        <Card t={t} style={{flex:1,minWidth:260}}><SLabel t={t}>Category Breakdown</SLabel>{catData.map(d=><div key={d.name} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:t.text,fontWeight:600}}>{d.name}</span><span style={{color:t.textMuted}}>{f(d.value)} · {Math.round((d.value/total)*100)}%</span></div><div style={{background:t.surface2,borderRadius:4,height:6,overflow:"hidden"}}><div style={{width:`${(d.value/total)*100}%`,height:"100%",background:CAT_COLORS[d.name]||"#94a3b8",borderRadius:4,transition:"width .5s"}}/></div></div>)}</Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  INSIGHTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function InsightsTab({entries,monthlyBudget,t,f}) {
  const insights=useMemo(()=>{
    const now=new Date(); const tm=entries.filter(e=>{const d=new Date(e.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}); const lm=entries.filter(e=>{const d=new Date(e.date);const l=new Date(now.getFullYear(),now.getMonth()-1,1);return d.getMonth()===l.getMonth()&&d.getFullYear()===l.getFullYear();}); const cs={}; tm.filter(e=>e.type==="expense").forEach(e=>{cs[e.category]=(cs[e.category]||0)+e.amount;}); const top=Object.entries(cs).sort((a,b)=>b[1]-a[1])[0]; const tot=Object.values(cs).reduce((s,v)=>s+v,0); const te=tm.filter(e=>e.type==="expense").reduce((s,e)=>s+e.amount,0); const le=lm.filter(e=>e.type==="expense").reduce((s,e)=>s+e.amount,0); const inc=tm.filter(e=>e.type==="income").reduce((s,e)=>s+e.amount,0); const ins=[]; if(top)ins.push({icon:"📊",text:`${top[0]} is your top expense at ${Math.round((top[1]/tot)*100)}% (${f(top[1])}).`,type:"info"}); if(le>0){const d=((te-le)/le)*100;if(d>10)ins.push({icon:"⚠️",text:`Spending ${Math.round(d)}% more than last month.`,type:"warn"});else if(d<-10)ins.push({icon:"✅",text:`Spending ${Math.round(Math.abs(d))}% less than last month!`,type:"good"});} if(inc>0){const s=Math.round(((inc-te)/inc)*100);if(s>20)ins.push({icon:"🎉",text:`Saving ${s}% of income — excellent!`,type:"good"});else if(s<0)ins.push({icon:"🚨",text:`Spending more than you earn this month.`,type:"warn"});else ins.push({icon:"💡",text:`Savings rate: ${s}%. Target 20%+ for financial health.`,type:"tip"});} if(!ins.length)ins.push({icon:"📈",text:"Add more entries to unlock personalized insights.",type:"info"}); return ins;
  },[entries,f]);
  const IC={good:{bg:"#22c55e14",border:"#22c55e33"},warn:{bg:"#ef444414",border:"#ef444433"},tip:{bg:"#f9731614",border:"#f9731633"},info:{bg:t.accentBg,border:t.accent+"33"}};
  const now=new Date(); const te=entries.filter(e=>{const d=new Date(e.date);return e.type==="expense"&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,e)=>s+e.amount,0); const pct=Math.min((te/monthlyBudget)*100,100); const over=te>monthlyBudget;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card t={t} style={{border:`1px solid ${over?t.red+"44":t.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><SLabel t={t}>Monthly Budget Tracker</SLabel><div style={{fontSize:12,color:over?t.red:t.green,fontWeight:700}}>{over?"⚠ Over Budget":f(monthlyBudget-te)+" remaining"}</div></div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:10}}><span style={{color:t.text,fontWeight:700}}>Spent: {f(te)}</span><span style={{color:t.textMuted}}>Budget: {f(monthlyBudget)}</span></div>
        <div style={{background:t.surface2,borderRadius:8,height:12,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:over?`linear-gradient(90deg,${t.red},#ff6b6b)`:`linear-gradient(90deg,${t.accent},${t.green})`,borderRadius:8,transition:"width .6s"}}/></div>
        <div style={{marginTop:8,fontSize:11,color:t.textMuted}}>{Math.round(pct)}% used</div>
      </Card>
      <Card t={t}><SLabel t={t}>🤖 Smart Insights</SLabel><div style={{display:"flex",flexDirection:"column",gap:10}}>{insights.map((ins,i)=>{ const c=IC[ins.type]||IC.info; return <div key={i} style={{background:c.bg,border:`1px solid ${c.border}`,borderRadius:10,padding:"12px 14px",fontSize:13,color:t.text,lineHeight:1.5}}><span style={{marginRight:8}}>{ins.icon}</span>{ins.text}</div>; })}</div></Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]=useState(null);
  const [dark,setDark]=useState(true);
  const t=T[dark?"dark":"light"];

  const [state,dispatch]=useReducer(reducer,{entries:[],goals:DEFAULT_GOALS,recurring:DEFAULT_RECURRING});
  const [entriesLoading,setEntriesLoading]=useState(true);
  const [entriesError,setEntriesError]=useState("");
  const [budget,setBudget]=useState(600);
  const [tab,setTab]=useState("entries");

  // ★ CURRENCY STATE — default GBP, user picks from dropdown
  const [currencyCode,setCurrencyCode]=useState("INR");
  const currency=CURRENCIES.find(c=>c.code===currencyCode)||CURRENCIES[0];
  // Stored amounts remain INR; f() converts only for display.
  const f=(n)=>fmt(convertAmount(n,currency.code),currency.symbol);

  useEffect(()=>{
    let active=true;
    const loadEntries=async()=>{
      setEntriesLoading(true);
      setEntriesError("");
      try {
        const entries=await entriesApi.getEntries();
        if(active) dispatch({type:"SET_ENTRIES",p:Array.isArray(entries)?entries:[]});
      } catch(e) {
        if(active) setEntriesError(e.message || "Unable to load entries. Please try again.");
      } finally {
        if(active) setEntriesLoading(false);
      }
    };
    loadEntries();
    return ()=>{ active=false; };
  },[]);

  const TABS=[
    {id:"entries",  label:"Entries",  icon:"📋"},
    {id:"goals",    label:"Goals",    icon:"🎯"},
    {id:"receipt",  label:"Scanner",  icon:"🧾"},
    {id:"recurring",label:"Recurring",icon:"🔁"},
    {id:"heatmap",  label:"Heatmap",  icon:"🔥"},
    {id:"charts",   label:"Charts",   icon:"📊"},
    {id:"insights", label:"Insights", icon:"💡"},
  ];

  if(!user)return <AuthPage onLogin={setUser} t={t}/>;

  return (
    <div style={{minHeight:"100vh",background:t.bg,fontFamily:"'DM Mono','Fira Code','Courier New',monospace",color:t.text,transition:"background .2s,color .2s"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;}
        select option{background:${t.surface};color:${t.text};}
        input:focus,select:focus{border-color:${t.accent}!important;}
        .rh:hover{background:${t.surface2}!important;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:${t.border};border-radius:2px;}
        @media(max-width:640px){.hd-sm{display:none!important;}}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{borderBottom:`1px solid ${t.border}`,padding:"13px 20px",display:"flex",alignItems:"center",gap:8,background:t.surface,position:"sticky",top:0,zIndex:100,boxShadow:t.shadow}}>
        <div style={{fontSize:19,fontFamily:"'Syne',sans-serif",fontWeight:800,letterSpacing:-1,color:t.text,flexShrink:0}}>
          budget<span style={{color:t.accent}}>.</span>track
        </div>

        {/* Desktop tab nav */}
        <div className="hd-sm" style={{display:"flex",gap:3,marginLeft:16,overflowX:"auto"}}>
          {TABS.map(tb=><button key={tb.id} onClick={()=>setTab(tb.id)} style={{background:tab===tb.id?t.accentBg:"transparent",border:`1px solid ${tab===tb.id?t.accent+"44":"transparent"}`,borderRadius:8,padding:"5px 11px",fontSize:11,fontWeight:700,color:tab===tb.id?t.accent:t.textMuted,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}><span>{tb.icon}</span><span>{tb.label}</span></button>)}
        </div>

        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>

          {/* ★ CURRENCY PICKER — sits here in the header */}
          <CurrencyPicker
            currency={currency}
            currencyCode={currencyCode}
            setCurrencyCode={setCurrencyCode}
            t={t}
          />

          {/* Theme toggle */}
          <button onClick={()=>setDark(d=>!d)} style={{background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,padding:"5px 9px",cursor:"pointer",fontSize:14,color:t.textMuted,fontFamily:"inherit"}}>{dark?"☀️":"🌙"}</button>

          {/* User avatar */}
          <div style={{width:28,height:28,borderRadius:"50%",background:t.accentBg,border:`2px solid ${t.accent}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:t.accent}}>{user.name[0].toUpperCase()}</div>

          <button onClick={()=>setUser(null)} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:8,padding:"5px 9px",cursor:"pointer",fontSize:11,color:t.textMuted,fontFamily:"inherit"}}>Out</button>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div style={{display:"flex",gap:3,padding:"8px 12px",background:t.surface,borderBottom:`1px solid ${t.border}`,overflowX:"auto"}} className="mob-tabs">
        <style>{`@media(min-width:641px){.mob-tabs{display:none!important;}}`}</style>
        {TABS.map(tb=><button key={tb.id} onClick={()=>setTab(tb.id)} style={{background:tab===tb.id?t.accentBg:"transparent",border:`1px solid ${tab===tb.id?t.accent+"44":t.border}`,borderRadius:7,padding:"5px 9px",fontSize:10,fontWeight:700,color:tab===tb.id?t.accent:t.textMuted,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>{tb.icon} {tb.label}</button>)}
      </div>

      {/* ── PAGE CONTENT — f and currency passed to every tab ── */}
      <div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
        {entriesError&&<div style={{color:t.red,background:t.red+"11",border:`1px solid ${t.red}33`,borderRadius:10,padding:"10px 12px",fontSize:12,marginBottom:16}}>{entriesError}</div>}
        {entriesLoading&&<div style={{color:t.textMuted,background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:"10px 12px",fontSize:12,marginBottom:16}}>Loading entries…</div>}
        {tab==="entries"   && <EntriesTab    state={state} dispatch={dispatch} monthlyBudget={budget} setMonthlyBudget={setBudget} t={t} f={f} currency={currency}/>}
        {tab==="goals"     && <GoalsTab      state={state} dispatch={dispatch} t={t} f={f}/>}
        {tab==="receipt"   && <ReceiptScanner state={state} dispatch={dispatch} t={t} f={f}/>}
        {tab==="recurring" && <RecurringTab  state={state} dispatch={dispatch} t={t} f={f}/>}
        {tab==="heatmap"   && <HeatmapTab    entries={state.entries} t={t} f={f}/>}
        {tab==="charts"    && <ChartsTab     entries={state.entries} t={t} f={f}/>}
        {tab==="insights"  && <InsightsTab   entries={state.entries} monthlyBudget={budget} t={t} f={f}/>}
        <div style={{textAlign:"center",marginTop:32,fontSize:10,color:t.textFaint,letterSpacing:1}}>
          BUDGET.TRACK · {currency.flag} {currency.code} · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}