import { useState, useEffect, useRef, useCallback } from "react";
import {
  allocateSandboxInvestment, createAccount, createSandboxRequest,
  claimProfitCode, getAdminOverview, getProfile, getProfitCodeHistory, getSandboxAccount, reviewSandboxRequest,
  settleSandboxInvestment, submitKyc, updateSandboxKyc, validateReferral,
  type LedgerEntry, type SandboxInvestment, type SandboxRequest, type UserProfile,
} from "./lib/api";
import { supabase } from "./lib/supabase";

// ─── Theme tokens ─────────────────────────────────────────────────────────────
// Header: #0d0d0d (black + swirl)   Body: #f4f5f7 (off-white)   Nav: #111111
// Accent: #00c896 (green-teal)      Cards: #ffffff              Text: #111111

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen =
  | "splash" | "onboarding" | "login" | "signup"
  | "home" | "markets" | "trade" | "profile"
  | "asset-detail" | "buy" | "sell" | "swap"
  | "wallet" | "deposit" | "withdraw" | "receive"
  | "transactions" | "invest" | "investment-plans"
  | "staking" | "copy-trading"
  | "notifications" | "security" | "settings" | "kyc" | "help"
  | "tx-success" | "error" | "profit-code" | "referral" | "admin";

type MainTab = "home" | "markets" | "trade" | "profile";

// ─── Data ─────────────────────────────────────────────────────────────────────
const COINS = [
  { symbol:"BTC", name:"Bitcoin",  price:68421.32, change:+2.4,  spark:[63000,65000,64000,66000,67000,66500,68421], color:"#f7931a" },
  { symbol:"ETH", name:"Ethereum", price:3245.17,  change:+1.8,  spark:[2900,3050,2980,3100,3080,3200,3245],  color:"#627eea" },
  { symbol:"SOL", name:"Solana",   price:142.76,   change:+3.6,  spark:[130,135,132,138,140,141,142],         color:"#9945ff" },
  { symbol:"BNB", name:"BNB",      price:582.14,   change:+1.2,  spark:[560,568,565,572,575,580,582],         color:"#f3ba2f" },
  { symbol:"XRP", name:"Ripple",   price:0.6123,   change:-0.7,  spark:[0.63,0.62,0.61,0.62,0.61,0.61,0.612],color:"#00aae4" },
  { symbol:"ADA", name:"Cardano",  price:0.4231,   change:+0.9,  spark:[0.40,0.41,0.41,0.42,0.42,0.42,0.423],color:"#0033ad" },
];
const PORTFOLIO = [
  { symbol:"BTC", name:"Bitcoin",  amount:0.3621, value:24793.32, color:"#f7931a" },
  { symbol:"ETH", name:"Ethereum", amount:2.3410, value:7787.90,  color:"#627eea" },
  { symbol:"SOL", name:"Solana",   amount:12.548, value:1791.08,  color:"#9945ff" },
  { symbol:"BNB", name:"BNB",      amount:1.2500, value:727.92,   color:"#f3ba2f" },
];
const TXS = [
  { type:"received", asset:"BTC", amount:+0.0123, date:"Apr 11, 2025 · 10:34 AM" },
  { type:"sent",     asset:"ETH", amount:-0.5000, date:"Apr 11, 2025 · 02:17 PM" },
  { type:"staked",   asset:"SOL", amount:+2.5000, date:"Apr 10, 2025 · 09:45 AM" },
  { type:"swapped",  asset:"USDT",amount:-100.00, date:"Apr 9, 2025 · 06:12 PM"  },
  { type:"received", asset:"ADA", amount:+500.00, date:"Apr 9, 2025 · 11:03 AM"  },
];
const NEWS = [
  { title:"BlackRock Bitcoin ETF surpasses $20B AUM in record time", time:"2026-09-07 09:41:22 (UTC+5.5)" },
  { title:"Fed signals possible rate cut; crypto markets rally on liquidity hopes", time:"2026-09-07 08:15:11 (UTC+5.5)" },
  { title:"Ethereum L2 daily transactions eclipse mainnet for first time", time:"2026-09-07 07:02:05 (UTC+5.5)" },
  { title:"Solana DEX volume hits $4.2B in 24 hours, new all-time high", time:"2026-09-07 06:30:44 (UTC+5.5)" },
  { title:"Companies with huge datasets can save up to 80% in AI costs by using open-weight models", time:"2026-08-19 11:08:18 (UTC+5.5)" },
  { title:"9 killed in Indian budget hotel fire after suspected air-con explosion", time:"2026-08-19 11:07:06 (UTC+5.5)" },
];
const TRADERS = [
  { name:"CryptoAlpha", followers:"6M",   roi:+46.7, color:"#00c896" },
  { name:"BlockMaster", followers:"4.2M", roi:+32.4, color:"#627eea" },
  { name:"DefiQueen",   followers:"1.8M", roi:+28.1, color:"#9945ff" },
  { name:"TraderX",     followers:"500K", roi:+21.6, color:"#f5a623" },
];

// ─── Countries ────────────────────────────────────────────────────────────────
const ALL_COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Brazzaville)","Congo (Kinshasa)","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];

// ─── Dial Codes ───────────────────────────────────────────────────────────────
const DIAL_CODES=[
  {code:"+91",flag:"🇮🇳",name:"India"},{code:"+1",flag:"🇺🇸",name:"USA/Canada"},
  {code:"+44",flag:"🇬🇧",name:"UK"},{code:"+234",flag:"🇳🇬",name:"Nigeria"},
  {code:"+233",flag:"🇬🇭",name:"Ghana"},{code:"+254",flag:"🇰🇪",name:"Kenya"},
  {code:"+27",flag:"🇿🇦",name:"South Africa"},{code:"+971",flag:"🇦🇪",name:"UAE"},
  {code:"+65",flag:"🇸🇬",name:"Singapore"},{code:"+61",flag:"🇦🇺",name:"Australia"},
  {code:"+60",flag:"🇲🇾",name:"Malaysia"},{code:"+880",flag:"🇧🇩",name:"Bangladesh"},
  {code:"+92",flag:"🇵🇰",name:"Pakistan"},{code:"+94",flag:"🇱🇰",name:"Sri Lanka"},
  {code:"+977",flag:"🇳🇵",name:"Nepal"},{code:"+86",flag:"🇨🇳",name:"China"},
  {code:"+81",flag:"🇯🇵",name:"Japan"},{code:"+82",flag:"🇰🇷",name:"South Korea"},
  {code:"+49",flag:"🇩🇪",name:"Germany"},{code:"+33",flag:"🇫🇷",name:"France"},
  {code:"+55",flag:"🇧🇷",name:"Brazil"},{code:"+52",flag:"🇲🇽",name:"Mexico"},
  {code:"+20",flag:"🇪🇬",name:"Egypt"},{code:"+212",flag:"🇲🇦",name:"Morocco"},
  {code:"+255",flag:"🇹🇿",name:"Tanzania"},{code:"+256",flag:"🇺🇬",name:"Uganda"},
  {code:"+251",flag:"🇪🇹",name:"Ethiopia"},{code:"+237",flag:"🇨🇲",name:"Cameroon"},
  {code:"+243",flag:"🇨🇩",name:"DR Congo"},{code:"+7",flag:"🇷🇺",name:"Russia"},
  {code:"+966",flag:"🇸🇦",name:"Saudi Arabia"},{code:"+62",flag:"🇮🇩",name:"Indonesia"},
  {code:"+63",flag:"🇵🇭",name:"Philippines"},{code:"+84",flag:"🇻🇳",name:"Vietnam"},
];

function formatInternationalPhone(dialCode:string, localNumber:string) {
  const nationalNumber=localNumber.replace(/\D/g,"").replace(/^0+/,"");
  return `${dialCode}${nationalNumber}`;
}

// ─── Micro components ─────────────────────────────────────────────────────────
function Sparkline({ data, color, w=80, h=32 }: { data:number[]; color:string; w?:number; h?:number }) {
  const min=Math.min(...data), max=Math.max(...data), range=max-min||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/range)*h}`);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible flex-shrink-0">
      <defs><linearGradient id={`sg${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
        <stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <path d={`M${pts[0]} L${pts.slice(1).join(" L")} L${w},${h} L0,${h} Z`} fill={`url(#sg${color.replace("#","")})`}/>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CoinIcon({ symbol, color, size=36 }: { symbol:string; color:string; size?:number }) {
  return (
    <div style={{width:size,height:size,background:color+"18",border:`1.5px solid ${color}40`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <span style={{fontSize:size*0.29,fontWeight:700,color,fontFamily:"JetBrains Mono,monospace"}}>{symbol.slice(0,2)}</span>
    </div>
  );
}

// Dark header used across all authenticated screens
function DarkHeader({ title, left, right }: { title?: React.ReactNode; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="header-pattern flex-shrink-0 px-4 pt-5 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">{left}</div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
      {title && <div className="mt-3">{title}</div>}
    </div>
  );
}

function BackButton({ onBack, light }: { onBack:()=>void; light?:boolean }) {
  return (
    <button onClick={onBack} className={`w-9 h-9 rounded-xl flex items-center justify-center ${light ? "bg-white/10 border border-white/20" : "bg-[#f0f0f0] border border-[#e0e0e0]"}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke={light?"white":"#444"} strokeWidth="2" className="w-4 h-4"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
  );
}

function GreenBtn({ label, onClick, disabled }: { label:string; onClick?:()=>void; disabled?:boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-colors ${disabled ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#00c896] text-white hover:bg-[#00b585]"}`}>
      {label}
    </button>
  );
}

function OutlineBtn({ label, onClick }: { label:string; onClick?:()=>void }) {
  return (
    <button onClick={onClick} className="w-full py-3.5 rounded-xl border-2 border-[#00c896] text-[#00c896] font-bold text-sm tracking-wide hover:bg-[#00c896]/5 transition-colors">
      {label}
    </button>
  );
}

function Chip({ label, active, onClick }: { label:string; active?:boolean; onClick?:()=>void }) {
  return (
    <button onClick={onClick} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${active ? "bg-[#111] text-white" : "bg-white text-[#888] border border-[#e0e0e0]"}`}>
      {label}
    </button>
  );
}

function Card({ children, className="", style }: { children:React.ReactNode; className?:string; style?:React.CSSProperties }) {
  return <div className={`bg-white rounded-2xl shadow-sm ${className}`} style={style}>{children}</div>;
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"home",    label:"Home",
    icon:(a:boolean)=>(
      <svg viewBox="0 0 24 24" fill={a?"white":"none"} stroke={a?"none":"#888"} strokeWidth="1.8" className="w-5 h-5">
        {a
          ? <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></>
          : <><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round"/></>
        }
      </svg>
    )
  },
  { id:"markets", label:"Market",
    icon:(a:boolean)=><svg viewBox="0 0 24 24" fill="none" stroke={a?"white":"#888"} strokeWidth="1.8" className="w-5 h-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
  },
  { id:"trade",   label:"Invest",
    icon:(a:boolean)=><svg viewBox="0 0 24 24" fill="none" stroke={a?"white":"#888"} strokeWidth="1.8" className="w-5 h-5"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
  },
  { id:"profile", label:"My Account",
    icon:(a:boolean)=><svg viewBox="0 0 24 24" fill="none" stroke={a?"white":"#888"} strokeWidth="1.8" className="w-5 h-5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/></svg>
  },
] as const;

function BottomNav({ tab, setTab }: { tab:MainTab; setTab:(t:MainTab)=>void }) {
  return (
    <div className="flex-shrink-0 bg-[#111111] px-1 pt-2 pb-6">
      <div className="flex">
        {NAV_ITEMS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as MainTab)} className="flex-1 flex flex-col items-center gap-1 py-1">
            <div className={`w-10 h-8 rounded-xl flex items-center justify-center transition-colors ${tab===t.id?"bg-[#2a2a2a]":""}`}>
              {t.icon(tab===t.id)}
            </div>
            <span className={`text-[10px] font-medium ${tab===t.id?"text-white":"text-[#666]"}`}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Deposit Notice Modal ─────────────────────────────────────────────────────
function DepositModal({ onClose }: { onClose:()=>void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg slide-up" onClick={e=>e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5"/>
        <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" className="w-7 h-7"><circle cx="12" cy="12" r="10"/><path d="M12 8v4" strokeLinecap="round"/><circle cx="12" cy="16" r="0.5" fill="#f59e0b" strokeWidth="1"/></svg>
        </div>
        <h3 className="text-base font-bold text-[#111] text-center mb-2">Deposit Pending Activation</h3>
        <p className="text-sm text-[#666] text-center leading-relaxed mb-4">Due to regulatory requirements from crypto exchanges, deposits are activated by our compliance team on your behalf.</p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="#00c896" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.37 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.97-.97a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 21.5 16.18z" strokeLinecap="round"/></svg>
          <span className="text-xs text-[#444] font-mono">support@novainvest.app</span>
        </div>
        <button onClick={onClose} className="w-full py-3 rounded-xl bg-[#111] text-white text-sm font-semibold hover:bg-[#222] transition-colors">Got it</button>
      </div>
    </div>
  );
}

// ─── Splash ───────────────────────────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone:()=>void }) {
  useEffect(()=>{ const t=setTimeout(onDone,2500); return ()=>clearTimeout(t); },[onDone]);
  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#0d0d0d] relative overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='400' height='400' viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23444' stroke-width='1'%3E%3Cpath d='M-50 200 Q 100 50 250 200 Q 400 350 550 200'/%3E%3Cpath d='M-50 240 Q 100 90 250 240 Q 400 390 550 240'/%3E%3Cpath d='M-50 160 Q 100 10 250 160 Q 400 310 550 160'/%3E%3Cpath d='M-50 280 Q 100 130 250 280 Q 400 430 550 280'/%3E%3C/g%3E%3C/svg%3E\")",backgroundSize:"100% 100%"}}/>
      <div className="relative flex flex-col items-center gap-4 fade-in">
        <div className="w-20 h-20 rounded-3xl bg-[#00c896] flex items-center justify-center shadow-[0_0_40px_rgba(0,200,150,0.4)]">
          <svg viewBox="0 0 40 40" className="w-10 h-10"><polygon points="20,4 36,32 4,32" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round"/><polygon points="20,14 28,28 12,28" fill="white" opacity="0.7"/></svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-[0.2em]">NOVA INVEST</h1>
          <p className="text-[#00c896] text-sm mt-1 tracking-wider">Build Wealth Through Crypto</p>
        </div>
        <div className="flex gap-2 mt-1">
          {["Secure","Smart","Global"].map(w=>(
            <span key={w} className="text-xs text-[#888] border border-[#333] px-3 py-1 rounded-full">{w}</span>
          ))}
        </div>
      </div>
      <div className="absolute bottom-14 flex gap-2">
        {[0,1,2].map(i=><div key={i} className={`rounded-full ${i===0?"w-6 bg-[#00c896]":"w-2 bg-[#333]"} h-2`}/>)}
      </div>
    </div>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
const OB=[
  { title:"We Invest, You Earn",       body:"NOVA INVEST manages your portfolio across global stock markets — NYSE, TSE, London Stock Exchange and the London Metal Exchange." },
  { title:"Grow With Your Network",    body:"Join through a trusted member's referral code. As your network grows across levels, your earnings multiply." },
  { title:"Profits Distributed to All",body:"Our team sends a profit code to every investor when returns are generated. Enter the code and your balance is updated instantly." },
];
function OnboardingScreen({ navigate }: { navigate:(s:Screen)=>void }) {
  const [slide,setSlide]=useState(0);
  return (
    <div className="h-full flex flex-col bg-[#0d0d0d]">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='400' height='300' viewBox='0 0 400 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23555' stroke-width='1'%3E%3Cpath d='M-50 150 Q 100 0 250 150 Q 400 300 550 150'/%3E%3Cpath d='M-50 200 Q 100 50 250 200 Q 400 350 550 200'/%3E%3C/g%3E%3C/svg%3E\")"}}/>
        <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#333] opacity-50"/>
          <div className="absolute inset-6 rounded-full border border-[#444] opacity-40"/>
          <div className="w-20 h-20 rounded-3xl bg-[#1a1a1a] border border-[#333] flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-10 h-10"><polygon points="20,4 36,32 4,32" fill="none" stroke="#00c896" strokeWidth="3" strokeLinejoin="round"/><polygon points="20,14 28,28 12,28" fill="#00c896" opacity="0.5"/></svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-3">{OB[slide].title}</h2>
        <p className="text-[#888] text-sm leading-relaxed">{OB[slide].body}</p>
        <div className="flex gap-2 mt-6">
          {OB.map((_,i)=><button key={i} onClick={()=>setSlide(i)} className={`rounded-full transition-all ${i===slide?"w-6 bg-[#00c896]":"w-2 bg-[#333]"} h-2`}/>)}
        </div>
      </div>
      <div className="px-6 pb-12 flex flex-col gap-3">
        {slide<OB.length-1
          ? <GreenBtn label="Next" onClick={()=>setSlide(s=>s+1)}/>
          : <GreenBtn label="Join with Referral Code" onClick={()=>navigate("signup")}/>
        }
        <button onClick={()=>navigate("login")} className="text-[#888] text-sm text-center py-2">I already have an account</button>
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ navigate, onAuthenticated }: { navigate:(s:Screen)=>void; onAuthenticated:(profile:UserProfile)=>void }) {
  const [phone,setPhone]=useState(""); const [pw,setPw]=useState("");
  const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  async function login(){
    if(!phone||!pw)return;
    setLoading(true);setError("");
    const normalizedPhone=phone.replace(/[^\d+]/g,"");
    const {error:authError}=await supabase.auth.signInWithPassword({phone:normalizedPhone,password:pw});
    if(authError){setError("The mobile number or password is incorrect.");setLoading(false);return;}
    try{const profile=await getProfile();onAuthenticated(profile);navigate("home");}
    catch(e){await supabase.auth.signOut();setError(e instanceof Error?e.message:"Your profile could not be loaded.");}
    finally{setLoading(false);}
  }
  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="header-pattern px-6 pt-14 pb-10 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-[#00c896] flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,200,150,0.3)]">
          <svg viewBox="0 0 40 40" className="w-8 h-8"><polygon points="20,4 36,32 4,32" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round"/><polygon points="20,14 28,28 12,28" fill="white" opacity="0.6"/></svg>
        </div>
        <h1 className="text-xl font-bold text-white">Welcome Back</h1>
        <p className="text-[#888] text-xs mt-1">Sign in to your NOVA INVEST account</p>
      </div>
      <div className="flex-1 bg-[#f4f5f7] rounded-t-3xl -mt-4 px-6 pt-6 pb-8 flex flex-col gap-4">
        <PhoneInput label="Mobile Number" onChange={setPhone}/>
        <div>
          <div className="flex justify-between mb-1.5"><label className="text-xs text-[#666] font-medium">Password</label><span className="text-xs text-[#999]">Contact support to reset</span></div>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" autoComplete="current-password" className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm text-[#111] outline-none focus:border-[#00c896]"/>
        </div>
        {error&&<p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
        <GreenBtn label={loading?"Signing In…":"Sign In"} onClick={login} disabled={loading||!phone||!pw}/>
        <p className="text-center text-xs text-[#888] pb-2">Don&apos;t have an account? <button onClick={()=>navigate("signup")} className="text-[#00c896] font-semibold">Sign Up</button></p>
      </div>
    </div>
  );
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────
function SignUpScreen({ navigate, onAuthenticated }: { navigate:(s:Screen)=>void; onAuthenticated:(profile:UserProfile)=>void }) {
  const [ref,setRef]=useState(""); const [refValid,setRefValid]=useState<null|boolean>(null);
  const [agreed,setAgreed]=useState(false); const [fullName,setFullName]=useState(""); const [phone,setPhone]=useState("");
  const [password,setPassword]=useState(""); const [confirmPassword,setConfirmPassword]=useState("");
  const [checkingRef,setCheckingRef]=useState(false); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  function checkRef(v:string){setRef(v.toUpperCase().replace(/\s/g,"").slice(0,9));setRefValid(null);}
  useEffect(()=>{
    if(!/^NI-[A-Z0-9]{6}$/.test(ref)){setRefValid(ref.length===9?false:null);return;}
    let active=true;
    const timer=setTimeout(async()=>{setCheckingRef(true);try{const valid=await validateReferral(ref);if(active)setRefValid(valid);}catch{if(active)setRefValid(false);}finally{if(active)setCheckingRef(false);}},350);
    return()=>{active=false;clearTimeout(timer);};
  },[ref]);
  const canSubmit=refValid===true&&agreed&&fullName.trim().length>=2&&phone.length>=8&&password.length>=8&&password===confirmPassword&&!loading;
  async function signup(){
    if(!canSubmit)return;
    setLoading(true);setError("");
    try{
      await createAccount({fullName:fullName.trim(),phone,password,referralCode:ref});
      const normalizedPhone=phone.replace(/[^\d+]/g,"");
      const {error:authError}=await supabase.auth.signInWithPassword({phone:normalizedPhone,password});
      if(authError)throw authError;
      const profile=await getProfile();onAuthenticated(profile);navigate("kyc");
    }catch(e){setError(e instanceof Error?e.message:"Account creation failed.");}
    finally{setLoading(false);}
  }
  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="header-pattern px-6 pt-14 pb-10 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-[#00c896] flex items-center justify-center mb-4"><svg viewBox="0 0 40 40" className="w-8 h-8"><polygon points="20,4 36,32 4,32" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round"/><polygon points="20,14 28,28 12,28" fill="white" opacity="0.6"/></svg></div>
        <h1 className="text-xl font-bold text-white">Join NOVA INVEST</h1><p className="text-[#888] text-xs mt-1">Invitation only — referral code required</p>
      </div>
      <div className="flex-1 bg-[#f4f5f7] rounded-t-3xl -mt-4 px-6 pt-6 pb-8 flex flex-col gap-4">
        <div className="bg-[#00c896]/8 border border-[#00c896]/30 rounded-2xl p-4">
          <label className="text-xs font-bold text-[#00c896] block mb-2">Referral Code <span className="text-red-500">*</span></label>
          <input value={ref} onChange={e=>checkRef(e.target.value)} placeholder="NI-A1B2C3" autoCapitalize="characters" className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-mono placeholder-[#bbb] outline-none tracking-widest ${refValid===false?"border-red-400 text-red-500":refValid===true?"border-[#00c896] text-[#111]":"border-[#e5e7eb] text-[#111]"}`}/>
          {checkingRef&&<p className="text-xs text-[#888] mt-1.5">Checking referral code…</p>}
          {!checkingRef&&refValid===false&&<p className="text-xs text-red-500 mt-1.5">Invalid referral code. Please ask your referrer for the correct code.</p>}
          {!checkingRef&&refValid===true&&<p className="text-xs text-[#00c896] mt-1.5">Valid referral code accepted</p>}
          <p className="text-[10px] text-[#aaa] mt-2">You can only join NOVA INVEST if you are referred by an existing member.</p>
        </div>
        <div><label className="text-xs text-[#666] mb-1.5 block font-medium">Full Name</label><input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Full Name" autoComplete="name" className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm text-[#111] placeholder-[#bbb] outline-none focus:border-[#00c896]"/></div>
        <PhoneInput label="Mobile Number" onChange={setPhone}/>
        <div><label className="text-xs text-[#666] mb-1.5 block font-medium">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm text-[#111] placeholder-[#bbb] outline-none focus:border-[#00c896]"/></div>
        <div><label className="text-xs text-[#666] mb-1.5 block font-medium">Confirm Password</label><input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repeat password" autoComplete="new-password" className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm text-[#111] placeholder-[#bbb] outline-none focus:border-[#00c896]"/></div>
        {confirmPassword&&password!==confirmPassword&&<p className="text-xs text-red-500">Passwords do not match.</p>}
        <div className="flex items-start gap-2"><button onClick={()=>setAgreed(v=>!v)} className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 ${agreed?"bg-[#00c896] border-[#00c896]":"border-[#ccc]"}`}>{agreed&&<svg viewBox="0 0 12 12" className="w-3 h-3"><polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth="1.5"/></svg>}</button><span className="text-xs text-[#666]">I agree to the Terms of Service and Privacy Policy</span></div>
        {error&&<p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
        <GreenBtn label={loading?"Creating Account…":"Create Account"} onClick={signup} disabled={!canSubmit}/>
        <p className="text-center text-xs text-[#888] pb-2">Already have an account? <button onClick={()=>navigate("login")} className="text-[#00c896] font-semibold">Sign In</button></p>
      </div>
    </div>
  );
}

// ─── Side Menu ────────────────────────────────────────────────────────────────
function SideMenu({ navigate, onClose, profile }: { navigate:(s:Screen)=>void; onClose:()=>void; profile:UserProfile|null }) {
  const items=[
    {i:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 21V12h6v9" strokeLinecap="round"/></svg>,l:"Home",s:"home"},
    {i:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round"/></svg>,l:"Markets",s:"markets"},
    {i:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/></svg>,l:"Investment Plans",s:"investment-plans"},
    {i:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round"/></svg>,l:"Staking",s:"staking"},
    {i:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="8" r="3"/><path d="M8 14c0-2.2 1.8-4 4-4s4 1.8 4 4" strokeLinecap="round"/><path d="M3 17c0-2.2 1.8-4 4-4M21 17c0-2.2-1.8-4-4-4" strokeLinecap="round"/></svg>,l:"Copy Trading",s:"copy-trading"},
    {i:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/></svg>,l:"Profit Code",s:"profit-code"},
    {i:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4" strokeLinecap="round"/></svg>,l:"Transactions",s:"transactions"},
    {i:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,l:"Settings",s:"settings"},
    {i:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/></svg>,l:"My Network",s:"referral"},
    {i:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" strokeLinecap="round"/></svg>,l:"Help & Support",s:"help"},
  ] as const;
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      {/* Drawer */}
      <div className="relative w-72 h-full bg-[#0d0d0d] flex flex-col slide-up" style={{animation:"slideMenu 0.28s ease forwards"}}>
        {/* Header */}
        <div className="header-pattern px-5 pt-8 pb-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 40 40" className="w-7 h-7"><polygon points="20,4 36,32 4,32" fill="none" stroke="#00c896" strokeWidth="3" strokeLinejoin="round"/><polygon points="20,14 28,28 12,28" fill="#00c896" opacity="0.6"/></svg>
              <span className="text-white font-bold tracking-widest text-sm">NOVA INVEST</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-6 h-6"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/></svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{profile?.fullName??"NOVA Member"}</p>
              <p className="text-[#888] text-xs font-mono">{profile?.referralCode??"—"}</p>
            </div>
          </div>
        </div>
        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-2">
          {items.map(item=>(
            <button key={item.l} onClick={()=>{navigate(item.s as Screen);onClose();}} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-white/5 transition-colors text-[#ccc] hover:text-white">
              <span className="flex-shrink-0 text-[#888]">{item.i}</span>
              <span className="text-sm font-medium">{item.l}</span>
            </button>
          ))}
        </div>
        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex-shrink-0">
          <p className="text-[10px] text-[#555] font-mono">support@novainvest.app</p>
          <p className="text-[10px] text-[#444] mt-0.5">v2.1.0 · All rights reserved</p>
        </div>
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function HomeScreen({ navigate, showDeposit, profile }: { navigate:(s:Screen)=>void; showDeposit:()=>void; profile:UserProfile|null }) {
  const [bal,setBal]=useState(true);
  const [menuOpen,setMenuOpen]=useState(false);
  const [sandboxTotal,setSandboxTotal]=useState(0);
  useEffect(()=>{if(profile)getSandboxAccount().then(d=>setSandboxTotal(d.account.available+d.account.invested)).catch(()=>{});},[profile]);
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {menuOpen&&<SideMenu navigate={navigate} onClose={()=>setMenuOpen(false)} profile={profile}/>}
      {/* BLACK HEADER */}
      <div className="header-pattern flex-shrink-0 px-4 pt-5 pb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/></svg>
            </div>
            <button onClick={()=>setMenuOpen(true)} className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-5 h-5"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>navigate("notifications")} className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-5 h-5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button onClick={()=>navigate("profile")} className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
        {/* Sandbox balance */}
        <p className="text-[#aaa] text-sm mb-2">Total Sandbox Balance</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white text-xl font-bold font-mono">
              {bal ? `${sandboxTotal.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} TUSDT` : "● ● ● ● ●"}
            </span>
            <button onClick={()=>setBal(v=>!v)} className="text-[#888] hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          <button onClick={showDeposit} className="px-6 py-2.5 rounded-full border-2 border-white text-white font-bold text-sm hover:bg-white hover:text-black transition-colors">
            Deposit
          </button>
        </div>
      </div>

      {/* WHITE BODY */}
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7]">
        {/* notification bell bar */}
        <div className="px-4 pt-3">
          <div className="bg-white rounded-full px-4 py-2.5 flex items-center gap-2 border border-[#eee]">
            <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" className="w-4 h-4"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round"/></svg>
          </div>
        </div>

        {/* Quick actions — flat icon+label */}
        <div className="grid grid-cols-4 gap-0 px-4 mt-3">
          {[
            { label:"Deposit",      action:showDeposit,
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8" className="w-7 h-7"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 14l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
            { label:"Withdrawal",   action:()=>navigate("withdraw"),
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8" className="w-7 h-7"><circle cx="12" cy="12" r="10"/><path d="M12 16V8M8 10l4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
            { label:"Transactions", action:()=>navigate("transactions"),
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8" className="w-7 h-7"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4" strokeLinecap="round"/></svg> },
            { label:"Profit Code",  action:()=>navigate("profit-code"),
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8" className="w-7 h-7"><circle cx="12" cy="8" r="3"/><path d="M12 2v2M12 14v8M5 11l2.5 2M18.5 13L21 11" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 19l2-3h4l2 3" strokeLinecap="round" strokeLinejoin="round"/></svg> },
          ].map(q=>(
            <button key={q.label} onClick={q.action} className="flex flex-col items-center gap-2 py-3 hover:bg-white/60 rounded-xl transition-colors">
              {q.icon}
              <span className="text-[11px] text-[#333] font-medium">{q.label}</span>
            </button>
          ))}
        </div>

        {/* Referral Code — bold, prominent */}
        <div className="mx-4 mt-3 mb-1">
          <div className="bg-[#111] rounded-2xl px-4 py-3 flex items-center gap-3 border border-[#2a2a2a]">
            <div className="w-9 h-9 rounded-xl bg-[#00c896]/15 border border-[#00c896]/30 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#00c896" strokeWidth="1.5" className="w-4 h-4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[#888] mb-0.5">Your Referral Code</p>
              <p className="text-lg font-black font-mono text-white tracking-widest">{profile?.referralCode??"Loading…"}</p>
              <p className="text-[10px] text-[#555] mt-0.5">Share to grow your network</p>
            </div>
            <button onClick={()=>navigate("referral")} className="flex-shrink-0 bg-[#00c896] text-white text-[10px] font-bold px-3 py-2 rounded-xl">
              My Network
            </button>
          </div>
        </div>

        {/* NOVA INVEST banner */}
        <div className="mx-4 mt-1 mb-1 rounded-2xl overflow-hidden bg-[#0a1a0d] relative h-32">
          <div className="absolute inset-0 flex">
            <div className="flex-1 p-3 flex flex-col justify-between">
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 40 40" className="w-5 h-5"><polygon points="20,4 36,32 4,32" fill="none" stroke="#00c896" strokeWidth="3" strokeLinejoin="round"/><polygon points="20,14 28,28 12,28" fill="#00c896" opacity="0.6"/></svg>
                <span className="text-[#00c896] font-bold text-sm tracking-widest">NOVA INVEST</span>
              </div>
              <div>
                <p className="text-white text-xs font-bold">World Markets</p>
                <p className="text-[#aaa] text-[10px] mt-0.5">NYSE · TSE · LSE · LME</p>
                <p className="text-[#00c896] text-xs font-mono mt-1">+96.87% YTD</p>
              </div>
            </div>
            <div className="flex-[1.4] flex items-center justify-center p-2">
              <div className="w-full h-full bg-[#0d1a0d] rounded-xl flex items-center justify-center">
                <div className="relative flex items-center justify-center">
                  {[32,22,12].map((s,i)=><div key={i} className="absolute rounded-full border border-[#00c896]" style={{width:s*2,height:s*2,opacity:0.3-i*0.05}}/>)}
                  <div className="w-8 h-8 rounded-full bg-[#00c896]/20 border-2 border-[#00c896] flex items-center justify-center z-10">
                    <div className="w-3 h-3 rounded-full bg-[#00c896]"/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* audio bar */}
        <div className="mx-4 mt-3 mb-1">
          <div className="bg-white rounded-full px-4 py-2.5 flex items-center gap-2 border border-[#eee]">
            <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" className="w-4 h-4"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round"/></svg>
          </div>
        </div>

        {/* Ticker */}
        <div className="overflow-hidden bg-white border-y border-[#f0f0f0] py-2 my-2">
          <div className="flex ticker-scroll whitespace-nowrap">
            {[...COINS,...COINS].map((c,i)=>(
              <span key={i} className="inline-flex items-center gap-2 px-5 text-xs font-mono">
                <span className="text-[#111] font-semibold">{c.symbol}</span>
                <span className="text-[#888]">{c.price>=1?"$"+c.price.toLocaleString():"$"+c.price.toFixed(4)}</span>
                <span className={c.change>=0?"text-[#00c896]":"text-red-500"}>{c.change>=0?"▲":"▼"}{Math.abs(c.change).toFixed(2)}%</span>
              </span>
            ))}
          </div>
        </div>

        {/* News — plain list with dividers */}
        <div className="px-4 pt-1 pb-24 bg-white mx-0">
          <h2 className="text-base font-bold text-[#111] py-3">News</h2>
          {NEWS.map((n,i)=>(
            <div key={i} className={`py-4 ${i<NEWS.length-1?"border-b border-[#efefef]":""}`}>
              <p className="text-sm font-bold text-[#111] leading-snug mb-1.5">{n.title}</p>
              <p className="text-xs text-[#999]">{n.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Markets ──────────────────────────────────────────────────────────────────
function MarketsScreen({ navigate }: { navigate:(s:Screen)=>void }) {
  const [filter,setFilter]=useState("All"); const [search,setSearch]=useState("");
  const shown=COINS.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.symbol.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<h1 className="text-lg font-bold text-white">Markets</h1>} right={<button onClick={()=>navigate("notifications")} className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center"><svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-4 h-4"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round"/></svg></button>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7]">
        <div className="px-4 pt-3 pb-2 bg-white">
          <div className="relative mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search coins…" className="w-full bg-[#f4f5f7] border border-[#e5e7eb] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#111] placeholder-[#bbb] outline-none focus:border-[#00c896]"/>
          </div>
          <div className="flex gap-2">
            {["All","Top","Gainers","Losers"].map(f=><Chip key={f} label={f} active={filter===f} onClick={()=>setFilter(f)}/>)}
          </div>
        </div>
        <div className="bg-white border-t border-[#f0f0f0]">
          <div className="flex px-4 py-2 border-b border-[#f0f0f0]">
            <span className="text-[10px] text-[#bbb] font-mono flex-1">NAME</span>
            <span className="text-[10px] text-[#bbb] font-mono w-24 text-right">PRICE</span>
            <span className="text-[10px] text-[#bbb] font-mono w-14 text-right">24H</span>
          </div>
          {shown.map((c,i)=>(
            <button key={c.symbol} onClick={()=>navigate("asset-detail")} className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${i<shown.length-1?"border-b border-[#f5f5f5]":""}`}>
              <CoinIcon symbol={c.symbol} color={c.color}/>
              <div className="flex-1 text-left"><p className="text-sm font-semibold text-[#111]">{c.name}</p><p className="text-xs text-[#bbb] font-mono">24h vol</p></div>
              <Sparkline data={c.spark} color={c.change>=0?"#00c896":"#ef4444"} w={56} h={26}/>
              <div className="w-24 text-right"><p className="text-sm font-semibold text-[#111] font-mono">{c.price>=1?"$"+c.price.toLocaleString():"$"+c.price.toFixed(4)}</p></div>
              <div className={`w-14 text-right text-xs font-mono font-semibold ${c.change>=0?"text-[#00c896]":"text-red-500"}`}>{c.change>=0?"+":""}{c.change}%</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Asset Detail ─────────────────────────────────────────────────────────────
function AssetDetailScreen({ navigate, goBack }: { navigate:(s:Screen)=>void; goBack:()=>void }) {
  const c=COINS[0]; const [period,setPeriod]=useState("1D");
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader
        left={<><BackButton onBack={goBack} light/><div className="flex items-center gap-2 ml-1"><CoinIcon symbol={c.symbol} color={c.color} size={24}/><span className="font-semibold text-white">{c.name}</span></div></>}
        right={<button className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center"><svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-4 h-4"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" strokeLinejoin="round"/></svg></button>}
        title={<><p className="text-2xl font-bold text-white font-mono">${c.price.toLocaleString()}</p><span className="text-[#00c896] text-sm font-mono">+12.4% (24h)</span></>}
      />
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pb-4 pt-3">
        <Card className="p-4 mb-3">
          <div className="flex gap-2 mb-3">{["1D","1W","1M","1Y","ALL"].map(t=><Chip key={t} label={t} active={period===t} onClick={()=>setPeriod(t)}/>)}</div>
          <Sparkline data={c.spark} color="#00c896" w={320} h={100}/>
        </Card>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[["Market Cap","$1.34T"],["Volume (24h)","$42.6B"],["Circulating Supply","19.6M BTC"],["All Time High","$73,835"]].map(([k,v])=>(
            <Card key={k} className="p-3"><p className="text-[10px] text-[#aaa] mb-1">{k}</p><p className="text-sm font-semibold text-[#111] font-mono">{v}</p></Card>
          ))}
        </div>
        <button onClick={()=>navigate("investment-plans")} className="w-full py-3.5 rounded-xl bg-[#00c896] text-white font-bold text-sm">View Investment Plans</button>
      </div>
    </div>
  );
}

// ─── Buy ──────────────────────────────────────────────────────────────────────
function BuyScreen({ navigate, goBack }: { navigate:(s:Screen)=>void; goBack:()=>void }) {
  const [amt,setAmt]=useState("100"); const rate=0.001462;
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-1"><h1 className="text-base font-bold text-white">Buy Crypto</h1><p className="text-[10px] text-[#888]">Purchase with your preferred method</p></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-8 flex flex-col gap-3">
        <Card className="p-4">
          <p className="text-xs text-[#888] mb-2 font-medium">You spend</p>
          <div className="flex items-center gap-3 mb-3"><input value={amt} onChange={e=>setAmt(e.target.value)} className="flex-1 text-2xl font-bold font-mono bg-transparent text-[#111] outline-none"/><div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl"><span className="text-sm font-semibold text-[#333]">USD</span><svg viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" className="w-3 h-3"><path d="M6 9l6 6 6-6" strokeLinecap="round"/></svg></div></div>
          <div className="flex gap-2">{["25","50","100","200"].map(v=><button key={v} onClick={()=>setAmt(v)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${amt===v?"bg-[#111] text-white":"bg-gray-100 text-[#666]"}`}>{v}</button>)}</div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#888] mb-2 font-medium">You get</p>
          <div className="flex items-center gap-3"><span className="flex-1 text-2xl font-bold font-mono text-[#111]">{(parseFloat(amt||"0")*rate).toFixed(6)}</span><div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl"><CoinIcon symbol="BTC" color="#f7931a" size={20}/><span className="text-sm font-semibold text-[#333]">BTC</span></div></div>
          <p className="text-xs text-[#aaa] mt-2 font-mono">1 BTC ≈ ${(1/rate).toLocaleString()} USD</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#888] mb-2 font-medium">Payment method</p>
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"><span className="text-xs font-bold text-[#333]">AP</span></div><span className="text-sm text-[#111]">Apple Pay</span></div><svg viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" className="w-4 h-4"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg></div>
        </Card>
        <GreenBtn label="Buy Now" onClick={()=>navigate("tx-success")}/>
      </div>
    </div>
  );
}

// ─── Sell ─────────────────────────────────────────────────────────────────────
function SellScreen({ navigate, goBack }: { navigate:(s:Screen)=>void; goBack:()=>void }) {
  const [amt,setAmt]=useState("0.1");
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-1"><h1 className="text-base font-bold text-white">Sell Crypto</h1><p className="text-[10px] text-[#888]">Convert your crypto to cash</p></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-8 flex flex-col gap-3">
        <Card className="p-4">
          <p className="text-xs text-[#888] mb-2 font-medium">You sell</p>
          <div className="flex items-center gap-3"><input value={amt} onChange={e=>setAmt(e.target.value)} className="flex-1 text-2xl font-bold font-mono bg-transparent text-[#111] outline-none"/><div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl"><CoinIcon symbol="BTC" color="#f7931a" size={20}/><span className="text-sm font-semibold text-[#333]">BTC</span></div></div>
          <p className="text-xs text-[#aaa] mt-2 font-mono">Balance: 0.3621 BTC</p>
        </Card>
        <div className="flex justify-center"><div className="w-9 h-9 rounded-full bg-white border border-[#e5e7eb] flex items-center justify-center shadow-sm"><svg viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" className="w-4 h-4"><path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round"/></svg></div></div>
        <Card className="p-4">
          <p className="text-xs text-[#888] mb-2 font-medium">You get</p>
          <div className="flex items-center gap-3"><span className="flex-1 text-2xl font-bold font-mono text-[#111]">{(parseFloat(amt||"0")*COINS[0].price).toFixed(2)}</span><div className="bg-gray-100 px-3 py-2 rounded-xl"><span className="text-sm font-semibold text-[#333]">USD</span></div></div>
          <p className="text-xs text-[#00c896] mt-2 font-mono">1 BTC = ${COINS[0].price.toLocaleString()}</p>
        </Card>
        <button onClick={()=>navigate("tx-success")} className="w-full py-3.5 rounded-xl bg-red-500 text-white font-bold text-sm">Sell Now</button>
      </div>
    </div>
  );
}

// ─── Swap ─────────────────────────────────────────────────────────────────────
function SwapScreen({ navigate, goBack }: { navigate:(s:Screen)=>void; goBack:()=>void }) {
  const [fromAmt,setFromAmt]=useState("0.5"); const rate=29.2642;
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-1"><h1 className="text-base font-bold text-white">Swap / Convert</h1><p className="text-[10px] text-[#888]">Exchange between assets instantly</p></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-8 flex flex-col gap-2">
        <Card className="p-4">
          <p className="text-xs text-[#888] mb-2 font-medium">From</p>
          <div className="flex items-center gap-3"><div className="flex items-center gap-2 bg-gray-100 px-3 py-2.5 rounded-xl"><CoinIcon symbol="BTC" color="#f7931a" size={24}/><span className="font-semibold text-[#111] text-sm">BTC</span></div><input value={fromAmt} onChange={e=>setFromAmt(e.target.value)} className="flex-1 text-2xl font-bold font-mono bg-transparent text-[#111] outline-none text-right"/><button className="text-xs text-[#00c896] font-semibold px-2 py-1 bg-[#00c896]/10 rounded-lg">MAX</button></div>
        </Card>
        <div className="flex justify-center -my-1 z-10 relative"><button className="w-9 h-9 rounded-full bg-white border border-[#e5e7eb] flex items-center justify-center shadow-sm"><svg viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" className="w-4 h-4"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round"/></svg></button></div>
        <Card className="p-4">
          <p className="text-xs text-[#888] mb-2 font-medium">To</p>
          <div className="flex items-center gap-3"><div className="flex items-center gap-2 bg-gray-100 px-3 py-2.5 rounded-xl"><CoinIcon symbol="ETH" color="#627eea" size={24}/><span className="font-semibold text-[#111] text-sm">ETH</span></div><span className="flex-1 text-2xl font-bold font-mono text-[#111] text-right">{(parseFloat(fromAmt||"0")*rate).toFixed(4)}</span></div>
        </Card>
        <Card className="p-3 mt-1">
          <div className="flex justify-between text-xs mb-1"><span className="text-[#888]">Rate</span><span className="text-[#111] font-mono">1 BTC = {rate} ETH</span></div>
          <div className="flex justify-between text-xs"><span className="text-[#888]">Fee</span><span className="text-[#00c896] font-mono">0.3%</span></div>
        </Card>
        <div className="mt-2"><GreenBtn label="Swap" onClick={()=>navigate("tx-success")}/></div>
      </div>
    </div>
  );
}

// ─── Wallet ───────────────────────────────────────────────────────────────────
function WalletScreen({ navigate, showDeposit }: { navigate:(s:Screen)=>void; showDeposit:()=>void }) {
  const [available,setAvailable]=useState(0); const [invested,setInvested]=useState(0);
  useEffect(()=>{getSandboxAccount().then(d=>{setAvailable(d.account.available);setInvested(d.account.invested);}).catch(()=>{});},[]);
  const total=available+invested;
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader
        left={<h1 className="text-lg font-bold text-white">Wallet</h1>}
        title={<><p className="text-[#aaa] text-xs mb-1">Total Sandbox Balance</p><p className="text-2xl font-bold text-white font-mono">{total.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} TUSDT</p><p className="text-amber-400 text-xs font-mono mt-0.5">Test credits · no cash value</p><div className="flex gap-2 mt-3">{[{l:"Request",a:showDeposit},{l:"Withdraw",a:()=>navigate("withdraw")},{l:"Ledger",a:()=>navigate("transactions")}].map(b=><button key={b.l} onClick={b.a} className="flex-1 py-2 rounded-xl border border-white/20 text-white text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors">{b.l}</button>)}</div></>}
      />
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-4">
        <h2 className="text-sm font-bold text-[#111] mb-3">Sandbox account</h2>
        <Card className="overflow-hidden mb-24">
          {[["Available",available],["Invested",invested]].map(([label,value],i)=>(
            <div key={String(label)} className={`flex items-center gap-3 px-4 py-4 ${i===0?"border-b border-[#f5f5f5]":""}`}>
              <div className="w-9 h-9 rounded-full bg-[#00c896]/10 flex items-center justify-center text-[#00c896] font-bold text-xs">T</div><div className="flex-1"><p className="text-sm font-semibold text-[#111]">{label}</p><p className="text-xs text-[#aaa]">Sandbox TUSDT</p></div>
              <p className="text-sm font-semibold text-[#111] font-mono">{Number(value).toFixed(2)}</p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// USDT deposit address (same address used for withdraw verification)
const USDT_TRC20 = "TRx7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6";
const USDT_ERC20 = "0x4e3bFc7b3deC7B48a57eF5c2D3A894f0bBa8913";

// Realistic QR code SVG with proper finder patterns
function USDTQRCode({ size=180 }: { size?:number }) {
  const cell = size / 21;
  // finder pattern (7x7 with quiet zone) positions: TL, TR, BL
  const finderCells = new Set<string>();
  [[0,0],[14,0],[0,14]].forEach(([ox,oy])=>{
    for(let r=0;r<7;r++) for(let c=0;c<7;c++) {
      const inner=(r>=1&&r<=5&&c>=1&&c<=5);
      const core=(r>=2&&r<=4&&c>=2&&c<=4);
      if(!inner||core) finderCells.add(`${ox+r},${oy+c}`);
    }
  });
  // timing patterns
  for(let i=8;i<13;i++){finderCells.add(`${i},6`);finderCells.add(`6,${i}`);}
  // pseudo-random data modules
  const dataCells = new Set<string>();
  const seed=[1,0,1,1,0,1,0,1,0,1,1,0,1,0,0,1,1,1,0,1,0,1,0,1,0,1,1,0,0,1,1,0,1,0,1,1,0,1,0,0,1,1,0,1,0,1,0,0,1,1,1,0,1,1,0,1,0,1,1,0,1,0,0,1,1,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1];
  let si=0;
  for(let r=0;r<21;r++) for(let c=0;c<21;c++){
    const k=`${r},${c}`;
    if(!finderCells.has(k)&&r>7&&c>7){
      if(seed[si%seed.length]) dataCells.add(k);
      si++;
    }
  }
  const all=[...finderCells,...dataCells];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg">
      <rect width={size} height={size} fill="white"/>
      {all.map(k=>{const[r,c]=k.split(",").map(Number);return<rect key={k} x={c*cell} y={r*cell} width={cell} height={cell} fill="#111"/>;  })}
    </svg>
  );
}

// ─── Deposit Screen ───────────────────────────────────────────────────────────
function DepositScreen({ goBack }: { goBack:()=>void }) {
  const [amount,setAmount]=useState(""); const [reference,setReference]=useState("");
  const [status,setStatus]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(){
    setLoading(true);setStatus("");
    try{await createSandboxRequest({type:"deposit",amount:Number(amount),detail:reference||"Test credit request"});setStatus("Test deposit request submitted for admin review.");setAmount("");setReference("");}
    catch(e){setStatus(e instanceof Error?e.message:"Request failed.");}
    finally{setLoading(false);}
  }
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-2"><h1 className="text-base font-bold text-white">Request Test Funds</h1><p className="text-[10px] text-[#888]">Sandbox credits only</p></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-8 flex flex-col gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4"><p className="text-xs font-bold text-amber-800">SANDBOX — DO NOT SEND MONEY</p><p className="text-xs text-amber-700 mt-1 leading-relaxed">This creates a test request only. No wallet address, bank transfer, blockchain payment, or real USDT is involved.</p></div>
        <Card className="p-4">
          <label className="text-xs text-[#666] mb-2 block font-medium">Test amount (TUSDT)</label>
          <input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^\d.]/g,""))} inputMode="decimal" placeholder="1000.00" className="w-full bg-gray-50 border border-[#e5e7eb] rounded-xl px-4 py-3 text-lg font-mono outline-none focus:border-[#00c896]"/>
          <label className="text-xs text-[#666] mb-2 mt-4 block font-medium">Test reference</label>
          <input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Reason for sandbox credit" className="w-full bg-gray-50 border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00c896]"/>
        </Card>
        {status&&<p className={`text-xs rounded-xl px-3 py-2 border ${status.includes("submitted")?"text-[#007b5d] bg-[#00c896]/10 border-[#00c896]/20":"text-red-600 bg-red-50 border-red-200"}`}>{status}</p>}
        <GreenBtn label={loading?"Submitting…":"Submit Test Deposit Request"} onClick={submit} disabled={loading||!Number(amount)}/>
      </div>
    </div>
  );
}

// ─── Withdraw ─────────────────────────────────────────────────────────────────
function WithdrawScreen({ navigate:_, goBack }: { navigate:(s:Screen)=>void; goBack:()=>void }) {
  const [amount,setAmount]=useState(""); const [wallet,setWallet]=useState("");
  const [available,setAvailable]=useState(0); const [status,setStatus]=useState(""); const [loading,setLoading]=useState(false);
  useEffect(()=>{getSandboxAccount().then(d=>setAvailable(d.account.available)).catch(()=>{});},[]);
  async function submit(){
    setLoading(true);setStatus("");
    try{await createSandboxRequest({type:"withdrawal",amount:Number(amount),detail:`Binance: ${wallet.trim()}`});setStatus("Test withdrawal request submitted for admin review.");setAmount("");setWallet("");}
    catch(e){setStatus(e instanceof Error?e.message:"Request failed.");}
    finally{setLoading(false);}
  }
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-2"><h1 className="text-base font-bold text-white">Test Withdrawal</h1><p className="text-[10px] text-[#888]">No real transfer will occur</p></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-8 flex flex-col gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4"><p className="text-xs font-bold text-amber-800">SANDBOX TUSDT</p><p className="text-xs text-amber-700 mt-1">Approval only changes the test ledger. It never sends crypto.</p></div>
        <Card className="p-4"><p className="text-xs text-[#888]">Available test balance</p><p className="text-2xl font-black font-mono text-[#111] mt-1">{available.toLocaleString("en-US",{minimumFractionDigits:2})} TUSDT</p></Card>
        <Card className="p-4">
          <label className="text-xs text-[#666] mb-2 block font-medium">Amount (TUSDT)</label>
          <div className="flex gap-2"><input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^\d.]/g,""))} inputMode="decimal" placeholder="0.00" className="flex-1 min-w-0 bg-gray-50 border border-[#e5e7eb] rounded-xl px-4 py-3 text-lg font-mono outline-none focus:border-[#00c896]"/><button onClick={()=>setAmount(String(available))} className="px-3 rounded-xl bg-[#00c896]/10 text-[#00c896] text-xs font-bold">MAX</button></div>
          <label className="text-xs text-[#666] mb-2 mt-4 block font-medium">Binance UID or approved wallet reference</label>
          <input value={wallet} onChange={e=>setWallet(e.target.value)} placeholder="Enter your Binance withdrawal reference" className="w-full bg-gray-50 border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00c896]"/>
        </Card>
        {status&&<p className={`text-xs rounded-xl px-3 py-2 border ${status.includes("submitted")?"text-[#007b5d] bg-[#00c896]/10 border-[#00c896]/20":"text-red-600 bg-red-50 border-red-200"}`}>{status}</p>}
        <GreenBtn label={loading?"Submitting…":"Submit Test Withdrawal"} onClick={submit} disabled={loading||!Number(amount)||Number(amount)>available||!wallet.trim()}/>
      </div>
    </div>
  );
}

// ─── Receive ──────────────────────────────────────────────────────────────────
function ReceiveScreen({ goBack }: { goBack:()=>void }) {
  const addr="bc1qxy2kgdygjrsqtzq2n0yrf249vspze7pk7n3k";
  const [copied,setCopied]=useState(false);
  function copy(){
    navigator.clipboard?.writeText(addr).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  }
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><h1 className="text-base font-bold text-white ml-2">Receive Crypto</h1></>}/>
      <div className="flex-1 flex flex-col items-center bg-[#f4f5f7] px-4 pt-6 pb-8">
        <p className="text-[#888] text-sm mb-5">Scan to receive funds</p>
        <div className="bg-white p-4 rounded-2xl shadow-sm mb-5 border border-[#f0f0f0]">
          <svg viewBox="0 0 100 100" className="w-48 h-48">
            {Array.from({length:10},(_,r)=>Array.from({length:10},(_,c)=>{const on=((r*7+c*3+r*c)%3)===0||(r<3&&c<3&&!((r===1||c===1)&&!(r===1&&c===1)))||(r<3&&c>6)||(r>6&&c<3);return on?<rect key={`${r}-${c}`} x={r*10} y={c*10} width={10} height={10} fill="#111"/>:null;})).flat()}
          </svg>
        </div>
        <Card className="w-full p-3 mb-4 flex items-center gap-2">
          <CoinIcon symbol="BTC" color="#f7931a" size={24}/>
          <span className="text-xs text-[#666] font-mono flex-1 truncate">{addr.slice(0,20)}…{addr.slice(-6)}</span>
        </Card>
        <button onClick={copy} className={`w-full py-3 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${copied?"border-[#00c896] bg-[#00c896] text-white":"border-[#00c896] text-[#00c896]"}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round"/></svg>
          {copied?"✓ Copied!":"Copy Address"}
        </button>
      </div>
    </div>
  );
}

// ─── Transactions ─────────────────────────────────────────────────────────────
function TransactionsScreen({ goBack }: { goBack:()=>void }) {
  const [ledger,setLedger]=useState<LedgerEntry[]>([]); const [requests,setRequests]=useState<SandboxRequest[]>([]); const [error,setError]=useState("");
  useEffect(()=>{getSandboxAccount().then(d=>{setLedger([...d.ledger].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));setRequests([...d.requests].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));}).catch(e=>setError(e.message));},[]);
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-2"><h1 className="text-base font-bold text-white">Sandbox Ledger</h1><p className="text-[10px] text-[#888]">Auditable test events</p></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 py-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4 text-xs text-amber-800">All values are test-only TUSDT and have no cash value.</div>
        {error&&<p className="text-xs text-red-600 mb-3">{error}</p>}
        <p className="text-xs font-bold text-[#888] uppercase tracking-wider mb-2">Pending requests</p>
        <Card className="overflow-hidden mb-5">{requests.length===0?<p className="p-4 text-xs text-[#aaa]">No requests yet.</p>:requests.map(r=><div key={r.id} className="p-4 border-b border-[#f0f0f0] last:border-0 flex items-center gap-3"><div className="flex-1"><p className="text-sm font-semibold capitalize">{r.type}</p><p className="text-[10px] text-[#aaa]">{new Date(r.createdAt).toLocaleString()}</p></div><div className="text-right"><p className="text-sm font-mono font-bold">{r.amount.toFixed(2)}</p><p className={`text-[10px] font-bold ${r.status==="approved"?"text-[#00c896]":r.status==="rejected"?"text-red-500":"text-amber-600"}`}>{r.status}</p></div></div>)}</Card>
        <p className="text-xs font-bold text-[#888] uppercase tracking-wider mb-2">Posted ledger</p>
        <Card className="overflow-hidden">{ledger.length===0?<p className="p-4 text-xs text-[#aaa]">No ledger entries yet.</p>:ledger.map(e=><div key={e.id} className="p-4 border-b border-[#f0f0f0] last:border-0"><div className="flex justify-between gap-3"><div><p className="text-sm font-semibold capitalize">{e.type.replace(/_/g," ")}</p><p className="text-[10px] text-[#aaa] mt-0.5">{e.note}</p></div><p className={`text-sm font-mono font-bold ${e.amount>=0?"text-[#00c896]":"text-red-500"}`}>{e.amount>=0?"+":""}{e.amount.toFixed(2)}</p></div><p className="text-[10px] text-[#bbb] mt-2">Available {e.availableAfter.toFixed(2)} · Invested {e.investedAfter.toFixed(2)}</p></div>)}</Card>
      </div>
    </div>
  );
}

// ─── Trade Tab (Invest Hub) ───────────────────────────────────────────────────
function TradeScreen({ navigate }: { navigate:(s:Screen)=>void }) {
  const total=PORTFOLIO.reduce((s,a)=>s+a.value,0);
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader
        left={<div><h1 className="text-lg font-bold text-white">Invest</h1><p className="text-[10px] text-[#888]">NOVA INVEST managed portfolio</p></div>}
        title={<><p className="text-[#aaa] text-xs mb-0.5">Demo Market Portfolio</p><p className="text-2xl font-bold text-white font-mono">${total.toLocaleString("en-US",{minimumFractionDigits:2})}</p><p className="text-amber-400 text-xs font-mono mt-0.5">Illustrative data only</p></>}
      />
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-24">
        {/* Markets we trade */}
        <h2 className="text-xs font-bold text-[#888] uppercase tracking-wider mb-3">Active Markets</h2>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[{flag:"🇺🇸",name:"US Stock Market",sub:"NYSE · NASDAQ",ret:"+18.4%"},{flag:"🇯🇵",name:"Japan Exchange",sub:"TSE · JPX",ret:"+11.2%"},{flag:"🇬🇧",name:"London Stock Exch.",sub:"LSE · FTSE 100",ret:"+9.7%"},{flag:"🏅",name:"London Metal Exch.",sub:"Gold · Oil · Metals",ret:"+14.6%"}].map(m=>(
            <div key={m.name} className="bg-white rounded-2xl p-4 border border-[#f0f0f0] shadow-sm">
              <span className="text-2xl">{m.flag}</span>
              <p className="text-xs font-bold text-[#111] mt-2 leading-snug">{m.name}</p>
              <p className="text-[10px] text-[#aaa] mt-0.5">{m.sub}</p>
              <p className="text-sm font-bold font-mono text-[#00c896] mt-2">{m.ret}</p>
            </div>
          ))}
        </div>
        {/* Investment options */}
        <h2 className="text-xs font-bold text-[#888] uppercase tracking-wider mb-3">Investment Options</h2>
        <Card className="overflow-hidden mb-4">
          {[{t:"Investment Plans",s:"Managed & auto-invested",i:"📈",a:"investment-plans"},{t:"Staking Rewards",s:"Earn on idle assets",i:"🔒",a:"staking"},{t:"Copy Trading",s:"Follow expert strategies",i:"👥",a:"copy-trading"},{t:"Profit Code",s:"Claim profit distribution",i:"🏆",a:"profit-code"},{t:"Swap / Convert",s:"Exchange between assets",i:"⇄",a:"swap"}].map((q,i,arr)=>(
            <button key={q.t} onClick={()=>navigate(q.a as Screen)} className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left ${i<arr.length-1?"border-b border-[#f0f0f0]":""}`}>
              <span className="text-xl w-7 text-center">{q.i}</span>
              <div className="flex-1"><p className="text-sm font-semibold text-[#111]">{q.t}</p><p className="text-xs text-[#aaa]">{q.s}</p></div>
              <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" className="w-4 h-4"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
            </button>
          ))}
        </Card>
        <p className="text-xs text-[#bbb] text-center leading-relaxed px-4">Investments are managed by NOVA INVEST on your behalf through direct contacts and interactive market channels.</p>
      </div>
    </div>
  );
}

// ─── Staking ──────────────────────────────────────────────────────────────────
function StakingScreen({ navigate, goBack }: { navigate:(s:Screen)=>void; goBack:()=>void }) {
  const [amt,setAmt]=useState("");
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-1"><h1 className="text-base font-bold text-white">Staking</h1><p className="text-[10px] text-[#888]">Stake & Earn</p></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-8 flex flex-col gap-3">
        <Card className="p-4 flex items-center gap-4"><CoinIcon symbol="SOL" color="#9945ff" size={48}/><div><p className="text-sm font-semibold text-[#111]">Solana Staking</p><p className="text-2xl font-bold font-mono" style={{color:"#9945ff"}}>7.8% APY</p><p className="text-xs text-[#aaa]">Flexible · Unstake anytime</p></div></Card>
        <Card className="p-4"><p className="text-xs text-[#888] mb-2 font-medium">Amount to Stake</p><div className="flex items-center gap-2"><input value={amt} onChange={e=>setAmt(e.target.value)} placeholder="0.00" className="flex-1 text-2xl font-bold font-mono bg-transparent text-[#111] outline-none"/><span className="text-sm text-[#aaa]">SOL</span><button className="text-xs text-[#00c896] font-semibold ml-1 px-2 py-1 bg-[#00c896]/10 rounded-lg">MAX</button></div><div className="h-px bg-[#f0f0f0] my-3"/><div className="flex justify-between text-xs"><span className="text-[#888]">Est. monthly rewards</span><span className="text-[#00c896] font-mono">{amt?(parseFloat(amt)*0.078/12).toFixed(4):"—"} SOL</span></div></Card>
        <div className="grid grid-cols-2 gap-3">
          {[["Lock Period","Flexible"],["Min Stake","1 SOL"],["Est. APY","7.8%"],["Unbonding","2 days"]].map(([k,v])=>(
            <Card key={k} className="p-3"><p className="text-[10px] text-[#aaa]">{k}</p><p className="text-sm font-semibold text-[#111] font-mono mt-0.5">{v}</p></Card>
          ))}
        </div>
        <GreenBtn label="Stake Now" onClick={()=>navigate("tx-success")}/>
      </div>
    </div>
  );
}

// ─── Copy Trading ─────────────────────────────────────────────────────────────
function CopyTradingScreen({ navigate, goBack }: { navigate:(s:Screen)=>void; goBack:()=>void }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-1"><h1 className="text-base font-bold text-white">Copy Trading</h1><p className="text-[10px] text-[#888]">Follow Top Traders</p></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-24">
        {TRADERS.map(t=>(
          <Card key={t.name} className="p-4 mb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold font-mono" style={{background:t.color+"15",color:t.color,border:`1.5px solid ${t.color}40`}}>{t.name.slice(0,2).toUpperCase()}</div>
              <div className="flex-1"><p className="text-sm font-semibold text-[#111]">{t.name}</p><p className="text-xs text-[#aaa]">{t.followers} Followers</p></div>
              <div className="text-right"><p className="text-lg font-bold font-mono text-[#00c896]">+{t.roi}%</p><p className="text-[10px] text-[#aaa]">30d ROI</p></div>
            </div>
            <button onClick={()=>navigate("tx-success")} className="w-full py-2.5 rounded-xl bg-[#00c896] text-white text-xs font-bold hover:bg-[#00b585] transition-colors">Copy Trade</button>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Investment Plans ─────────────────────────────────────────────────────────
function InvestmentPlansScreen({ navigate, goBack }: { navigate:(s:Screen)=>void; goBack:()=>void }) {
  const [sel,setSel]=useState("Balanced");
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-1"><h1 className="text-base font-bold text-white">Investment Plans</h1></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-8">
        <div className="flex gap-2 mb-4 overflow-x-auto">{["All","Conservative","Balanced","Aggressive"].map(t=><Chip key={t} label={t} active={t==="All"}/>)}</div>
        <div className="flex flex-col gap-3">
          {[{n:"Conservative",apy:"5–8%",risk:"Low risk · Stable returns",c:"#00c896"},{n:"Balanced",apy:"8–15%",risk:"Moderate risk · Steady growth",c:"#627eea"},{n:"Aggressive",apy:"15–30%",risk:"Higher risk · Higher rewards",c:"#ef4444"}].map(p=>(
            <button key={p.n} onClick={()=>setSel(p.n)} className="flex items-center gap-4 p-4 rounded-2xl bg-white text-left transition-all" style={{border:`2px solid ${sel===p.n?p.c:"#f0f0f0"}`}}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:p.c+"15"}}><span className="text-lg">📊</span></div>
              <div className="flex-1"><p className="text-sm font-bold text-[#111]">{p.n}</p><p className="text-xs font-mono font-semibold" style={{color:p.c}}>{p.apy} APY</p><p className="text-xs text-[#aaa] mt-0.5">{p.risk}</p></div>
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{borderColor:sel===p.n?p.c:"#ddd"}}>
                {sel===p.n&&<div className="w-2.5 h-2.5 rounded-full" style={{background:p.c}}/>}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-5"><GreenBtn label="Start Investing" onClick={()=>navigate("buy")}/></div>
      </div>
    </div>
  );
}

// ─── Invest Hub ───────────────────────────────────────────────────────────────
function InvestScreen({ navigate, goBack }: { navigate:(s:Screen)=>void; goBack:()=>void }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-1"><h1 className="text-base font-bold text-white">Invest</h1><p className="text-[10px] text-[#888]">Grow your wealth with smart strategies</p></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-8">
        <Card className="overflow-hidden mb-5">
          {[{t:"Auto Invest",s:"Set it and grow",i:"⚡",a:"investment-plans"},{t:"Recurring Buy",s:"Build your position",i:"🔄",a:"buy"},{t:"Copy Trading",s:"Mirror expert strategies",i:"👥",a:"copy-trading"}].map((q,i,arr)=>(
            <button key={q.t} onClick={()=>navigate(q.a as Screen)} className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left ${i<arr.length-1?"border-b border-[#f0f0f0]":""}`}>
              <span className="text-xl w-7 text-center">{q.i}</span><div className="flex-1"><p className="text-sm font-semibold text-[#111]">{q.t}</p><p className="text-xs text-[#aaa]">{q.s}</p></div>
              <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" className="w-4 h-4"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
            </button>
          ))}
        </Card>
        <GreenBtn label="Get Started" onClick={()=>navigate("investment-plans")}/>
      </div>
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
function ProfileScreen({ navigate, logout, profile }: { navigate:(s:Screen)=>void; logout:()=>void; profile:UserProfile|null }) {
  const [sandboxAccount,setSandboxAccount]=useState({available:0,invested:0});
  useEffect(()=>{if(profile)getSandboxAccount().then(d=>setSandboxAccount(d.account)).catch(()=>{});},[profile]);
  const profileItems=[
    ...(profile?.role==="admin"?[{l:"Sandbox Admin",s:"admin"}]:[]),
    {l:"Transaction History",s:"transactions"},
    {l:"KYC Verification",s:"kyc"},{l:"Security / 2FA",s:"security"},
    {l:"Notifications",s:"notifications"},{l:"Help & Support",s:"help"},
  ];
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader
        left={<h1 className="text-lg font-bold text-white">My Account</h1>}
        right={<button onClick={()=>navigate("settings")} className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center"><svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-4 h-4"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>}
        title={<div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"><svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-6 h-6"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/></svg></div><div><p className="text-white font-semibold">{profile?.fullName??"NOVA Member"}</p><p className="text-[#888] text-xs font-mono">ID: {profile?.referralCode??"—"}</p></div><div className="ml-auto px-2 py-1 rounded-full bg-[#00c896]/20 border border-[#00c896]/40"><span className="text-xs text-[#00c896] font-semibold">{profile?.kycStatus==="approved"?"Verified":"KYC pending"}</span></div></div>}
      />
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[[sandboxAccount.available.toFixed(0),"Available","#00c896"],[sandboxAccount.invested.toFixed(0),"Invested","#111"],[profile?.kycStatus==="approved"?"Yes":"No","Test KYC","#f5a623"]].map(([v,k,c])=>(
            <Card key={k} className="p-3 text-center"><p className="text-base font-bold font-mono" style={{color:c}}>{v}</p><p className="text-[10px] text-[#aaa] mt-0.5">{k}</p></Card>
          ))}
        </div>
        <Card className="overflow-hidden mb-3">
          {profileItems.map((item,i,arr)=>(
            <button key={item.l} onClick={()=>navigate(item.s as Screen)} className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left ${i<arr.length-1?"border-b border-[#f0f0f0]":""}`}>
              <span className="text-sm font-medium text-[#111] flex-1">{item.l}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" className="w-4 h-4"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
            </button>
          ))}
        </Card>
        <button onClick={logout} className="w-full py-3.5 rounded-xl bg-red-50 border border-red-200 text-red-500 font-semibold text-sm mb-6">Sign Out</button>
      </div>
    </div>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────
function NotificationsScreen({ goBack }: { goBack:()=>void }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><h1 className="text-base font-bold text-white ml-2">Notifications</h1></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7]">
        <div className="flex gap-2 px-4 pt-3 pb-2 bg-white border-b border-[#f0f0f0]">{["All","Price Alerts","System"].map((t,i)=><Chip key={t} label={t} active={i===0}/>)}</div>
        <div className="bg-white flex-1 flex flex-col items-center justify-center py-20 px-8">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" className="w-7 h-7"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round"/></svg>
          </div>
          <p className="text-sm font-semibold text-[#333] mb-1">No notifications yet</p>
          <p className="text-xs text-[#aaa] text-center leading-relaxed">You'll be notified here about deposits, withdrawals, KYC updates, and important account activity.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Security ─────────────────────────────────────────────────────────────────
function SecurityScreen({ goBack }: { goBack:()=>void }) {
  const [auth,setAuth]=useState(true); const [sms,setSms]=useState(false); const [em,setEm]=useState(false);
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-1"><h1 className="text-base font-bold text-white">Security / 2FA</h1></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-8">
        <p className="text-xs text-[#888] mb-4">Add an extra layer of security to protect your account and assets.</p>
        <Card className="overflow-hidden mb-5">
          {[{l:"Authenticator App",s:"Google Auth or similar",v:auth,set:setAuth},{l:"SMS Verification",s:"Receive codes via SMS",v:sms,set:setSms},{l:"Email Verification",s:"Confirm via email address",v:em,set:setEm}].map((item,i,arr)=>(
            <div key={item.l} className={`flex items-center gap-3 px-4 py-4 ${i<arr.length-1?"border-b border-[#f0f0f0]":""}`}>
              <div className="flex-1"><p className="text-sm font-semibold text-[#111]">{item.l}</p><p className="text-xs text-[#aaa]">{item.s}</p></div>
              <button onClick={()=>item.set(v=>!v)} className={`w-11 h-6 rounded-full relative transition-colors ${item.v?"bg-[#00c896]":"bg-[#ddd]"}`}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-sm ${item.v?"left-6":"left-1"}`}/>
              </button>
            </div>
          ))}
        </Card>
        <GreenBtn label="Enable 2FA"/>
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsScreen({ goBack, navigate }: { goBack:()=>void; navigate:(s:Screen)=>void }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><h1 className="text-base font-bold text-white ml-2">Settings</h1></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-24">
        <Card className="overflow-hidden">
          {[{l:"Appearance",v:"Dark mode",i:"🌙"},{l:"Language",v:"English",i:"🌐"},{l:"Currency",v:"USD $",i:"💱"},{l:"Notifications",v:null,i:"🔔"},{l:"Privacy",v:null,i:"🛡️"},{l:"Security",v:null,i:"🔒",a:()=>navigate("security")},{l:"About",v:"v2.1.0",i:"ℹ️"}].map((s,i,arr)=>(
            <button key={s.l} onClick={s.a} className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left ${i<arr.length-1?"border-b border-[#f0f0f0]":""}`}>
              <span className="text-base w-5 text-center">{s.i}</span><span className="text-sm font-medium text-[#111] flex-1">{s.l}</span>
              {s.v&&<span className="text-xs text-[#aaa]">{s.v}</span>}
              <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" className="w-4 h-4"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
            </button>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── Searchable Country Combobox ─────────────────────────────────────────────
function CountrySelect({ label, required=true, value:ext, onChange:extOnChange }: { label:string; required?:boolean; value?:string; onChange?:(v:string)=>void }) {
  const [inputText,setInputText]=useState(ext||"");
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);

  const filtered=(inputText&&inputText!==ext
    ?ALL_COUNTRIES.filter(c=>c.toLowerCase().includes(inputText.toLowerCase()))
    :ALL_COUNTRIES).slice(0,10);

  useEffect(()=>{
    function h(e:MouseEvent){ if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  function pick(c:string){
    setInputText(c);
    if(extOnChange) extOnChange(c);
    setOpen(false);
  }
  function handleChange(e:React.ChangeEvent<HTMLInputElement>){
    setInputText(e.target.value);
    if(extOnChange) extOnChange("");
    setOpen(true);
  }

  return (
    <div ref={ref} className="relative">
      <label className="text-xs text-[#666] mb-1.5 block font-medium">{label}{required&&<span className="text-red-500 ml-0.5">*</span>}</label>
      <div className="relative">
        <input value={inputText} onChange={handleChange} onFocus={()=>setOpen(true)}
          placeholder="Type to search country…"
          className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 pr-9 text-sm text-[#111] placeholder-[#bbb] outline-none focus:border-[#00c896]"/>
        <svg viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><path d="M6 9l6 6 6-6" strokeLinecap="round"/></svg>
      </div>
      {open&&filtered.length>0&&(
        <div className="absolute z-50 w-full bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden mt-1">
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(c=>(
              <button key={c} onMouseDown={()=>pick(c)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-[#f5f5f5] last:border-0 transition-colors ${inputText===c?"text-[#00c896] font-semibold bg-[#00c896]/5":"text-[#111] hover:bg-[#00c896]/5"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Phone Input with Dial Code ───────────────────────────────────────────────
function PhoneInput({ label="Mobile Number", required=true, onChange }: { label?:string; required?:boolean; onChange?:(v:string)=>void }) {
  const [dial,setDial]=useState("+234");
  const [num,setNum]=useState("");
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  const dc=DIAL_CODES.find(d=>d.code===dial)||DIAL_CODES[0];

  useEffect(()=>{
    function h(e:MouseEvent){ if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  function updateNum(v:string){
    const n=v.replace(/\D/g,"").slice(0,15);
    setNum(n);
    if(onChange) onChange(formatInternationalPhone(dial,n));
  }
  function pickDial(c:string){ setDial(c); setOpen(false); if(onChange) onChange(formatInternationalPhone(c,num)); }

  return (
    <div ref={ref}>
      <label className="text-xs text-[#666] mb-1.5 block font-medium">{label}{required&&<span className="text-red-500 ml-0.5">*</span>}</label>
      <div className="flex gap-2">
        <div className="relative flex-shrink-0">
          <button onClick={()=>setOpen(o=>!o)}
            className="flex items-center gap-1.5 bg-white border border-[#e5e7eb] rounded-xl px-3 py-3 text-sm hover:border-[#00c896] transition-colors min-w-[90px]">
            <span className="text-base leading-none">{dc.flag}</span>
            <span className="font-mono font-semibold text-[#111]">{dc.code}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" className="w-3 h-3 flex-shrink-0"><path d="M6 9l6 6 6-6" strokeLinecap="round"/></svg>
          </button>
          {open&&(
            <div className="absolute z-50 left-0 top-full mt-1 w-52 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden">
              <div className="max-h-52 overflow-y-auto">
                {DIAL_CODES.map(d=>(
                  <button key={d.code} onMouseDown={()=>pickDial(d.code)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left border-b border-[#f5f5f5] last:border-0 transition-colors ${dial===d.code?"bg-[#00c896]/8 text-[#00c896]":"hover:bg-gray-50 text-[#111]"}`}>
                    <span className="text-base">{d.flag}</span>
                    <span className="font-mono font-semibold text-xs">{d.code}</span>
                    <span className="text-[#888] text-xs truncate">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <input value={num} onChange={e=>updateNum(e.target.value)} placeholder="Mobile number" type="tel" inputMode="numeric"
          className="flex-1 bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm text-[#111] placeholder-[#bbb] outline-none focus:border-[#00c896] font-mono"/>
      </div>
    </div>
  );
}

// ─── File Upload Zone ─────────────────────────────────────────────────────────
type KycFile = { label:string; name:string; dataUrl:string };

function UploadZone({ label, accept="image/*,application/pdf", onFile }: { label:string; accept?:string; onFile?:(file:KycFile)=>void }) {
  const [preview,setPreview]=useState<string|null>(null);
  const [fileName,setFileName]=useState<string|null>(null);
  const ref=useRef<HTMLInputElement>(null);
  function handle(e:React.ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0];
    if(!f) return;
    if(f.size>5*1024*1024){e.target.value="";return;}
    setFileName(f.name);
    const reader=new FileReader();
    reader.onload=()=>{
      const dataUrl=String(reader.result||"");
      setPreview(f.type.startsWith("image/")?dataUrl:null);
      onFile?.({label:label||"Selfie",name:f.name,dataUrl});
    };
    reader.readAsDataURL(f);
  }
  return (
    <div>
      <label className="text-xs text-[#666] mb-1.5 block font-medium">{label}<span className="text-red-500 ml-0.5">*</span></label>
      <input ref={ref} type="file" accept={accept} onChange={handle} className="hidden"/>
      <div onClick={()=>ref.current?.click()}
        className={`w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors overflow-hidden ${preview?"border-[#00c896] p-0":"border-[#e5e7eb] bg-gray-50 hover:border-[#00c896] p-4 h-28"}`}>
        {preview
          ? <><img src={preview} alt="preview" className="w-full h-32 object-cover rounded-xl"/><p className="text-[10px] text-[#00c896] font-semibold py-1.5">✓ {fileName} — tap to replace</p></>
          : fileName
            ? <><span className="text-3xl">📄</span><p className="text-xs font-semibold text-[#00c896]">✓ {fileName}</p><p className="text-[10px] text-[#aaa]">Tap to replace</p></>
            : <><span className="text-3xl">📤</span><p className="text-xs font-semibold text-[#555]">Tap to upload</p><p className="text-[10px] text-[#bbb]">JPG · PNG · PDF · Max 5MB</p></>
        }
      </div>
    </div>
  );
}

// ─── Camera Selfie ────────────────────────────────────────────────────────────
function CameraModule({ onCapture }: { onCapture:(img:string)=>void }) {
  const videoRef=useRef<HTMLVideoElement>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [streamActive,setStreamActive]=useState(false);
  const [captured,setCaptured]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const streamRef=useRef<MediaStream|null>(null);

  const stopStream=useCallback(()=>{
    streamRef.current?.getTracks().forEach(t=>t.stop());
    streamRef.current=null;
    setStreamActive(false);
  },[]);

  useEffect(()=>()=>{ stopStream(); },[stopStream]);

  async function startCamera(){
    setError(null);
    try {
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:480}}});
      streamRef.current=s;
      setStreamActive(true);
      // set srcObject after state update so the video element is rendered
      setTimeout(()=>{
        if(videoRef.current){
          videoRef.current.srcObject=s;
          videoRef.current.play().catch(()=>{});
        }
      },50);
    } catch {
      setError("Camera access denied. Please allow camera permission and try again.");
    }
  }

  function capture(){
    const v=videoRef.current; const c=canvasRef.current;
    if(!v||!c) return;
    c.width=v.videoWidth; c.height=v.videoHeight;
    c.getContext("2d")?.drawImage(v,0,0);
    const img=c.toDataURL("image/jpeg",0.92);
    setCaptured(img);
    onCapture(img);
    stopStream();
  }

  function retake(){ setCaptured(null); startCamera(); }

  if(captured) return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#00c896] w-full">
        <img src={captured} alt="selfie" className="w-full object-cover"/>
        <div className="absolute top-2 right-2 bg-[#00c896] rounded-full px-2 py-0.5 flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3"><path d="M20 6L9 17l-5-5" strokeLinecap="round"/></svg>
          <span className="text-[10px] font-bold text-white">Captured</span>
        </div>
      </div>
      <button onClick={retake} className="w-full py-2.5 rounded-xl border-2 border-[#00c896] text-[#00c896] text-sm font-semibold">🔄 Retake Selfie</button>
    </div>
  );

  if(streamActive) return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#00c896] w-full bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-2xl" style={{transform:"scaleX(-1)"}}/>
        {/* face oval guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-white/50 rounded-full" style={{width:"55%",height:"75%"}}/>
        </div>
        <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/80 font-medium">Centre your face in the oval</p>
      </div>
      <canvas ref={canvasRef} className="hidden"/>
      <button onClick={capture} className="w-16 h-16 rounded-full bg-white border-4 border-[#00c896] flex items-center justify-center shadow-lg active:scale-95 transition-transform">
        <div className="w-10 h-10 rounded-full bg-[#00c896]"/>
      </button>
      <p className="text-xs text-[#888]">Tap the button to capture your selfie</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} className="hidden"/>
      {error&&<div className="w-full bg-red-50 border border-red-200 rounded-xl p-3"><p className="text-xs text-red-600">{error}</p></div>}
      <div onClick={startCamera} className="w-full h-44 border-2 border-dashed border-[#e5e7eb] rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer bg-gray-50 hover:border-[#00c896] transition-colors">
        <span className="text-4xl">🤳</span>
        <p className="text-sm font-semibold text-[#555]">Tap to open camera</p>
        <p className="text-xs text-[#aaa]">Your front-facing camera will open</p>
      </div>
      <p className="text-[10px] text-[#bbb] text-center">Or upload a photo from your gallery</p>
      <UploadZone label="" accept="image/*" onFile={file=>onCapture(file.dataUrl)}/>
    </div>
  );
}

// ─── KYC ─────────────────────────────────────────────────────────────────────
function KYCScreen({ navigate, goBack }: { navigate:(s:Screen)=>void; goBack:()=>void }) {
  const [submitted,setSubmitted]=useState(false);
  const [selfieImg,setSelfieImg]=useState<string|null>(null);
  const [docType,setDocType]=useState("");
  const [fullName,setFullName]=useState("");
  const [gender,setGender]=useState("");
  const [documentNumber,setDocumentNumber]=useState("");
  const [documentFront,setDocumentFront]=useState<KycFile|null>(null);
  const [submitting,setSubmitting]=useState(false);
  const [submissionError,setSubmissionError]=useState("");

  const DOC_TYPES=["National ID","Passport","Driver's Licence","Voter's Card","Aadhaar Card"];

  const canSubmit=fullName.trim()&&gender&&docType&&documentNumber.trim()&&documentFront&&selfieImg;

  async function submitKycApplication(){
    if(!canSubmit)return;
    setSubmitting(true);setSubmissionError("");
    try{
      await submitKyc({
        fullName,dateOfBirth:"",nationality:"",phone:"",gender,
        address:"",
        documentType:docType,documentNumber,issueDate:"",expiryDate:"",issuingCountry:"",
        documents:[documentFront].filter((file):file is KycFile=>Boolean(file)),
        selfie:{name:"selfie.jpg",dataUrl:selfieImg!},
      });
      setSubmitted(true);
    }catch(error){setSubmissionError(error instanceof Error?error.message:"KYC submission failed.");}
    finally{setSubmitting(false);}
  }

  if(submitted) return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-2"><h1 className="text-base font-bold text-white">KYC Submitted</h1></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-6 pb-8 flex flex-col gap-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-green-100 border border-green-300 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" className="w-5 h-5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-green-800">Verification Submitted!</p>
            <p className="text-xs text-green-600 mt-0.5">Your details are under review. You will be notified once approved.</p>
          </div>
        </div>
        <Card className="p-4 flex flex-col gap-3">
          {[["Name",fullName],["Gender",gender],["Document",docType],["ID Number",documentNumber]].map(([k,v])=>(
            <div key={k} className="flex items-center gap-3 border-b border-[#f0f0f0] pb-2 last:border-0 last:pb-0">
              <span className="text-xs text-[#888] w-24 flex-shrink-0">{k}:</span>
              <span className="text-xs font-semibold text-[#111] flex-1">{v||"—"}</span>
            </div>
          ))}
        </Card>
        <OutlineBtn label="Back to Dashboard" onClick={()=>navigate("home")}/>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-1"><h1 className="text-base font-bold text-white">KYC Verification</h1><p className="text-[10px] text-[#888]">Personal Information</p></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-8 flex flex-col gap-4">

        {/* Personal details */}
        <Card className="p-4 flex flex-col gap-4">
          <p className="text-xs font-bold text-[#111]">Personal Details</p>
          <div>
            <label className="text-xs text-[#666] mb-1.5 block font-medium">Full Name<span className="text-red-500 ml-0.5">*</span></label>
            <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="As it appears on your ID"
              className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm text-[#111] placeholder-[#bbb] outline-none focus:border-[#00c896]"/>
          </div>
          <div>
            <label className="text-xs text-[#666] mb-1.5 block font-medium">Gender<span className="text-red-500 ml-0.5">*</span></label>
            <div className="flex gap-2">
              {["Male","Female","Other"].map(g=>(
                <button key={g} onClick={()=>setGender(g)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${gender===g?"bg-[#111] text-white border-[#111]":"bg-white text-[#666] border-[#e5e7eb]"}`}>{g}</button>
              ))}
            </div>
          </div>
        </Card>

        {/* ID Document */}
        <Card className="p-4 flex flex-col gap-4">
          <p className="text-xs font-bold text-[#111]">Identity Document</p>
          <div>
            <label className="text-xs text-[#666] mb-1.5 block font-medium">Document Type<span className="text-red-500 ml-0.5">*</span></label>
            <div className="flex gap-2 flex-wrap">
              {DOC_TYPES.map(t=>(
                <button key={t} onClick={()=>setDocType(t)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${docType===t?"bg-[#111] text-white border-[#111]":"bg-white text-[#666] border-[#e5e7eb]"}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-[#666] mb-1.5 block font-medium">ID Number<span className="text-red-500 ml-0.5">*</span></label>
            <input value={documentNumber} onChange={e=>setDocumentNumber(e.target.value)} placeholder="Enter your document number"
              className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm text-[#111] placeholder-[#bbb] outline-none focus:border-[#00c896]"/>
          </div>
          <div>
            <label className="text-xs text-[#666] mb-1.5 block font-medium">ID Photo<span className="text-red-500 ml-0.5">*</span></label>
            <UploadZone label="Upload ID / Document Photo" onFile={setDocumentFront}/>
          </div>
        </Card>

        {/* Selfie */}
        <Card className="p-4 flex flex-col gap-3">
          <p className="text-xs font-bold text-[#111]">Selfie</p>
          <p className="text-xs text-[#888] leading-relaxed">Take a clear selfie to confirm you are the real owner of the submitted document.</p>
          <CameraModule onCapture={img=>{setSelfieImg(img);}}/>
        </Card>

        {submissionError&&<p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{submissionError}</p>}
        <GreenBtn label={submitting?"Submitting…":"Submit KYC →"} disabled={!canSubmit||submitting} onClick={submitKycApplication}/>
      </div>
    </div>
  );
}

// ─── Help ─────────────────────────────────────────────────────────────────────
function HelpScreen({ goBack }: { goBack:()=>void }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-1"><h1 className="text-base font-bold text-white">Help & Support</h1></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-24">
        <Card className="overflow-hidden mb-4">
          {[{i:"❓",l:"FAQs",s:"Find quick answers"},{i:"💬",l:"Live Chat",s:"Chat with support"},{i:"📧",l:"Email Support",s:"support@novainvest.app"},{i:"🌐",l:"Community",s:"Join our community"}].map((h,i,arr)=>(
            <button key={h.l} className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left ${i<arr.length-1?"border-b border-[#f0f0f0]":""}`}>
              <span className="text-xl">{h.i}</span><div className="flex-1"><p className="text-sm font-semibold text-[#111]">{h.l}</p><p className="text-xs text-[#aaa]">{h.s}</p></div>
              <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" className="w-4 h-4"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
            </button>
          ))}
        </Card>
        <Card className="p-4">
          <p className="text-sm font-semibold text-[#111] mb-1">Still need help?</p>
          <p className="text-xs text-[#888] mb-3">Our team responds within 24 hours.</p>
          <GreenBtn label="Contact Support"/>
        </Card>
      </div>
    </div>
  );
}

// ─── Referral Network ─────────────────────────────────────────────────────────
type RefNode = { name:string; code:string; level:number; joined:string; invested:number; children:RefNode[] };
const REF_TREE: { code:string; level:number; earnings:number; children:RefNode[] } = {
  code:"NI-A8M2K9", level:1, earnings:412.50,
  children:[
    {name:"James O.",  code:"NI-B3X7P1", level:2, joined:"Aug 12",  invested:2000, children:[
      {name:"Priya S.", code:"NI-C1Q4R8", level:3, joined:"Aug 20", invested:1500, children:[]},
      {name:"Chen W.",  code:"NI-C9D2L5", level:3, joined:"Aug 22", invested:800,  children:[]},
      {name:"Amara T.", code:"NI-C6F3N7", level:3, joined:"Sep 1",  invested:1200, children:[]},
    ]},
    {name:"Sofia R.",  code:"NI-B7H5M2", level:2, joined:"Aug 15",  invested:3500, children:[
      {name:"Mark L.",  code:"NI-C4K8W3", level:3, joined:"Aug 28", invested:2000, children:[]},
      {name:"Yuki N.",  code:"NI-C2P9S6", level:3, joined:"Sep 3",  invested:500,  children:[]},
    ]},
    {name:"David K.",  code:"NI-B5N1V4", level:2, joined:"Aug 18",  invested:1800, children:[
      {name:"Elena B.", code:"NI-C8R5T1", level:3, joined:"Sep 5",  invested:1000, children:[]},
    ]},
  ]
};
const LEVEL_COLORS=["#00c896","#627eea","#9945ff","#f5a623"];
const LEVEL_COMMISSIONS=["—","5%","3%","1%"];

function ReferralScreen({ goBack, referralCode }: { goBack:()=>void; referralCode?:string }) {
  const [copied,setCopied]=useState(false);
  const [expanded,setExpanded]=useState<Set<string>>(new Set(["root"]));
  const myCode=referralCode??REF_TREE.code;
  const level1=referralCode?[]:REF_TREE.children;
  const level2=level1.flatMap(c=>c.children);
  const level3=level2.flatMap(c=>c.children);
  const totalNetwork=level1.length+level2.length+level3.length;
  const totalInvested=level1.reduce((s,c)=>s+c.invested+c.children.reduce((ss,cc)=>ss+cc.invested+cc.children.reduce((sss,ccc)=>sss+ccc.invested,0),0),0);

  function toggle(id:string){
    setExpanded(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
  }
  function copy(){
    navigator.clipboard?.writeText(myCode).catch(()=>{});
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  }
  async function share(){
    if(navigator.share){
      try {
        await navigator.share({title:"Join NOVA INVEST",text:`Join me on NOVA INVEST and earn together! Use my referral code: ${myCode}`});
        return;
      } catch {}
    }
    copy();
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader
        left={<><BackButton onBack={goBack} light/><div className="ml-2"><h1 className="text-base font-bold text-white">My Network</h1><p className="text-[10px] text-[#888]">Referral pyramid</p></div></>}
        title={
          <div className="flex gap-3 mt-1">
            {[["Total Members",String(totalNetwork),"#00c896"],["Total Invested","$"+totalInvested.toLocaleString(),"#627eea"],["My Earnings","$"+REF_TREE.earnings.toFixed(2),"#f5a623"]].map(([k,v,c])=>(
              <div key={k} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                <p className="font-bold font-mono text-sm" style={{color:c}}>{v}</p>
                <p className="text-[9px] text-[#888] mt-0.5">{k}</p>
              </div>
            ))}
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-8 flex flex-col gap-4">

        {/* My referral code */}
        <Card className="p-4">
          <p className="text-xs font-semibold text-[#111] mb-1">Your Referral Code</p>
          <p className="text-[10px] text-[#aaa] mb-3">Share this code with people you want to invite to NOVA INVEST.</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-[#e5e7eb] rounded-xl px-4 py-3">
            <span className="flex-1 text-base font-black font-mono text-[#111] tracking-widest">{myCode}</span>
            <button onClick={copy} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ${copied?"bg-[#00c896] text-white":"bg-[#00c896]/10 text-[#00c896]"}`}>{copied?"✓ Copied":"Copy"}</button>
          </div>
          <div className="mt-3">
            <div className="bg-[#00c896]/8 border border-[#00c896]/20 rounded-xl p-2.5 flex items-center justify-between">
              <p className="text-[10px] text-[#888]">My Level</p>
              <p className="text-sm font-bold text-[#00c896]">Level 1</p>
            </div>
          </div>
        </Card>

        {/* Commission levels */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f0f0f0]"><p className="text-sm font-bold text-[#111]">Commission Structure</p></div>
          {[{l:"Level 1",d:"Direct referrals",pct:"5%",c:LEVEL_COLORS[1],n:level1.length},{l:"Level 2",d:"Their referrals",pct:"3%",c:LEVEL_COLORS[2],n:level2.length},{l:"Level 3",d:"Deep network",pct:"1%",c:LEVEL_COLORS[3],n:level3.length}].map((row,i,arr)=>(
            <div key={row.l} className={`flex items-center gap-3 px-4 py-3 ${i<arr.length-1?"border-b border-[#f5f5f5]":""}`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:row.c+"20",color:row.c}}>L{i+1}</div>
              <div className="flex-1"><p className="text-xs font-semibold text-[#111]">{row.l} — {row.d}</p><p className="text-[10px] text-[#aaa]">{row.n} member{row.n!==1?"s":""}</p></div>
              <span className="text-sm font-bold font-mono" style={{color:row.c}}>{row.pct}</span>
            </div>
          ))}
        </Card>

        {/* Pyramid visual */}
        <div>
          <p className="text-xs font-bold text-[#888] uppercase tracking-wider mb-3">Network Pyramid</p>
            {/* Level 1 */}
          <div className="bg-white rounded-2xl border border-[#f0f0f0] overflow-hidden mb-3">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#627eea]/8 border-b border-[#627eea]/20">
              <div className="w-5 h-5 rounded-full bg-[#627eea] flex items-center justify-center flex-shrink-0"><span className="text-[9px] font-black text-white">L1</span></div>
              <p className="text-xs font-bold text-[#627eea]">Level 1 — Direct Referrals ({level1.length})</p>
              <span className="ml-auto text-[10px] font-mono text-[#627eea]">5% comm.</span>
            </div>
            {level1.map((m,i)=>(
              <div key={m.code}>
                <button onClick={()=>toggle(m.code)} className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${i<level1.length-1?"border-b border-[#f5f5f5]":""}`}>
                  <div className="w-8 h-8 rounded-full bg-[#627eea]/10 border border-[#627eea]/30 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{color:"#627eea"}}>{m.name.slice(0,2).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#111]">{m.name}</p>
                    <p className="text-[10px] text-[#aaa] font-mono">{m.code}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-[#aaa]">Invested</p>
                    <p className="text-xs font-semibold text-[#111] font-mono">${m.invested.toLocaleString()}</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${expanded.has(m.code)?"rotate-90":""}`}><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
                </button>
                {/* Level 2 under this L1 */}
                {expanded.has(m.code)&&m.children.length>0&&(
                  <div className="bg-[#9945ff]/5 border-t border-[#9945ff]/10">
                    <div className="flex items-center gap-2 px-6 py-2 border-b border-[#9945ff]/10">
                      <div className="w-4 h-4 rounded-full bg-[#9945ff] flex items-center justify-center flex-shrink-0"><span className="text-[8px] font-black text-white">L2</span></div>
                      <p className="text-[10px] font-bold text-[#9945ff]">Referred by {m.name.split(" ")[0]} ({m.children.length}) — 3% comm.</p>
                    </div>
                    {m.children.map((c2,j)=>(
                      <div key={c2.code}>
                        <button onClick={()=>toggle(c2.code)} className={`w-full flex items-center gap-3 px-6 py-2.5 text-left hover:bg-white/50 transition-colors ${j<m.children.length-1?"border-b border-[#9945ff]/10":""}`}>
                          <div className="w-7 h-7 rounded-full bg-[#9945ff]/10 border border-[#9945ff]/30 flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{color:"#9945ff"}}>{c2.name.slice(0,2).toUpperCase()}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#111]">{c2.name}</p>
                            <p className="text-[10px] text-[#aaa] font-mono">{c2.code}</p>
                          </div>
                          <p className="text-xs font-mono text-[#555] flex-shrink-0">${c2.invested.toLocaleString()}</p>
                          {c2.children.length>0&&<svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" className={`w-3 h-3 flex-shrink-0 transition-transform ${expanded.has(c2.code)?"rotate-90":""}`}><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>}
                        </button>
                        {/* Level 3 */}
                        {expanded.has(c2.code)&&c2.children.length>0&&(
                          <div className="bg-[#f5a623]/5 border-t border-[#f5a623]/10">
                            <div className="flex items-center gap-1.5 px-8 py-1.5 border-b border-[#f5a623]/10">
                              <div className="w-3.5 h-3.5 rounded-full bg-[#f5a623] flex items-center justify-center flex-shrink-0"><span className="text-[7px] font-black text-white">L3</span></div>
                              <p className="text-[9px] font-bold text-[#f5a623]">Level 3 — 1% comm.</p>
                            </div>
                            {c2.children.map(c3=>(
                              <div key={c3.code} className="flex items-center gap-2 px-8 py-2 border-b border-[#f5a623]/10 last:border-0">
                                <div className="w-6 h-6 rounded-full bg-[#f5a623]/10 border border-[#f5a623]/30 flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{color:"#f5a623"}}>{c3.name.slice(0,2).toUpperCase()}</div>
                                <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-[#111]">{c3.name}</p><p className="text-[9px] text-[#aaa] font-mono">{c3.code}</p></div>
                                <p className="text-xs font-mono text-[#555]">${c3.invested.toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Share CTA */}
        <Card className="p-4">
          <p className="text-sm font-bold text-[#111] mb-1">Invite More Members</p>
          <p className="text-xs text-[#888] mb-3 leading-relaxed">Share your referral code and earn commissions from up to 3 levels of your network.</p>
          <GreenBtn label={copied?"✓ Code Copied!":`Share Code: ${myCode}`} onClick={share}/>
        </Card>
      </div>
    </div>
  );
}

// ─── Sandbox Admin ────────────────────────────────────────────────────────────
function AdminScreen({ goBack }: { goBack:()=>void }) {
  const [profiles,setProfiles]=useState<UserProfile[]>([]);
  const [requests,setRequests]=useState<SandboxRequest[]>([]);
  const [investments,setInvestments]=useState<SandboxInvestment[]>([]);
  const [userId,setUserId]=useState(""); const [amount,setAmount]=useState("");
  const [market,setMarket]=useState("NYSE / NASDAQ sandbox pool"); const [profit,setProfit]=useState("");
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  const load=useCallback(async()=>{
    try {
      const d=await getAdminOverview();
      setProfiles(d.profiles); setRequests(d.requests.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
      setInvestments(d.investments.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
      setUserId(v=>v||d.profiles.find(p=>p.role!=="admin")?.id||d.profiles[0]?.id||"");
    } catch(e) { setMessage(e instanceof Error?e.message:"Admin data failed to load."); }
  },[]);
  useEffect(()=>{load();},[load]);
  async function act(work:()=>Promise<unknown>,success:string){
    setBusy(true); setMessage("");
    try { await work(); setMessage(success); await load(); }
    catch(e) { setMessage(e instanceof Error?e.message:"Action failed."); }
    finally { setBusy(false); }
  }
  const pending=requests.filter(r=>r.status==="pending");
  const open=investments.filter(i=>i.status==="open");
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-2"><h1 className="text-base font-bold text-white">Sandbox Admin</h1><p className="text-[10px] text-[#888]">Test operations and audit controls</p></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 py-4 pb-10">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4"><p className="text-xs font-bold text-amber-800">NO REAL FUNDS</p><p className="text-xs text-amber-700 mt-1">All approvals and returns use TUSDT test credits only.</p></div>
        {message&&<p className="text-xs bg-white border border-[#e5e7eb] rounded-xl p-3 mb-4 text-[#555]">{message}</p>}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[[profiles.length,"Users"],[pending.length,"Pending"],[open.length,"Open"]].map(([v,l])=><Card key={String(l)} className="p-3 text-center"><p className="text-xl font-black font-mono">{v}</p><p className="text-[10px] text-[#888]">{l}</p></Card>)}
        </div>

        <p className="text-xs font-bold text-[#888] uppercase tracking-wider mb-2">Approval queue</p>
        <Card className="overflow-hidden mb-5">
          {pending.length===0?<p className="p-4 text-xs text-[#aaa]">No pending requests.</p>:pending.map(r=>(
            <div key={r.id} className="p-4 border-b border-[#f0f0f0] last:border-0">
              <div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{r.userName}</p><p className="text-xs text-[#888] capitalize">{r.type} · {r.detail||"No reference"}</p></div><p className="text-sm font-mono font-bold">{r.amount.toFixed(2)}</p></div>
              <div className="flex gap-2 mt-3">
                <button disabled={busy} onClick={()=>act(()=>reviewSandboxRequest(r.id,"approved"),"Request approved and ledger updated.")} className="flex-1 py-2 rounded-lg bg-[#00c896] text-white text-xs font-bold disabled:opacity-50">Approve</button>
                <button disabled={busy} onClick={()=>act(()=>reviewSandboxRequest(r.id,"rejected"),"Request rejected.")} className="flex-1 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-bold disabled:opacity-50">Reject</button>
              </div>
            </div>
          ))}
        </Card>

        <p className="text-xs font-bold text-[#888] uppercase tracking-wider mb-2">Users and sandbox KYC</p>
        <Card className="overflow-hidden mb-5">
          {profiles.map(p=>(
            <div key={p.id} className="p-4 border-b border-[#f0f0f0] last:border-0 flex items-center gap-3">
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{p.fullName}</p><p className="text-[10px] text-[#aaa] font-mono">{p.referralCode} · {p.role||"user"}</p></div>
              <button disabled={busy} onClick={()=>act(()=>updateSandboxKyc(p.id,p.kycStatus==="approved"?"pending":"approved"),"Sandbox KYC status updated.")} className={`px-3 py-2 rounded-lg text-[10px] font-bold ${p.kycStatus==="approved"?"bg-[#00c896]/10 text-[#00a77c]":"bg-gray-100 text-[#666]"}`}>{p.kycStatus==="approved"?"Approved":"Approve KYC"}</button>
            </div>
          ))}
        </Card>

        <p className="text-xs font-bold text-[#888] uppercase tracking-wider mb-2">Allocate test investment</p>
        <Card className="p-4 mb-5 flex flex-col gap-3">
          <select value={userId} onChange={e=>setUserId(e.target.value)} className="w-full bg-gray-50 border border-[#e5e7eb] rounded-xl px-3 py-3 text-sm outline-none">{profiles.map(p=><option key={p.id} value={p.id}>{p.fullName} · {p.referralCode}</option>)}</select>
          <input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^\d.]/g,""))} placeholder="Amount in TUSDT" inputMode="decimal" className="w-full bg-gray-50 border border-[#e5e7eb] rounded-xl px-3 py-3 text-sm font-mono outline-none"/>
          <input value={market} onChange={e=>setMarket(e.target.value)} placeholder="Sandbox market" className="w-full bg-gray-50 border border-[#e5e7eb] rounded-xl px-3 py-3 text-sm outline-none"/>
          <GreenBtn label={busy?"Working…":"Allocate Test Funds"} disabled={busy||!userId||!Number(amount)} onClick={()=>act(()=>allocateSandboxInvestment(userId,Number(amount),market),"Test investment allocated.")}/>
        </Card>

        <p className="text-xs font-bold text-[#888] uppercase tracking-wider mb-2">Open investments</p>
        <Card className="overflow-hidden">
          {open.length===0?<p className="p-4 text-xs text-[#aaa]">No open investments.</p>:open.map(i=>{
            const user=profiles.find(p=>p.id===i.userId);
            return <div key={i.id} className="p-4 border-b border-[#f0f0f0] last:border-0">
              <div className="flex justify-between"><div><p className="text-sm font-semibold">{user?.fullName||"User"}</p><p className="text-[10px] text-[#888]">{i.market}</p></div><p className="text-sm font-mono font-bold">{i.principal.toFixed(2)}</p></div>
              <div className="flex gap-2 mt-3"><input value={profit} onChange={e=>setProfit(e.target.value.replace(/[^\d.-]/g,""))} placeholder="Profit / loss" inputMode="decimal" className="flex-1 min-w-0 bg-gray-50 border border-[#e5e7eb] rounded-lg px-3 py-2 text-xs font-mono outline-none"/><button disabled={busy||profit===""} onClick={()=>act(()=>settleSandboxInvestment(i.id,Number(profit)),"Principal and test return posted to the ledger.")} className="px-3 rounded-lg bg-[#111] text-white text-xs font-bold disabled:opacity-50">Settle</button></div>
            </div>;
          })}
        </Card>
      </div>
    </div>
  );
}

// ─── TX Success ───────────────────────────────────────────────────────────────
function TxSuccessScreen({ navigate }: { navigate:(s:Screen)=>void }) {
  return (
    <div className="h-full flex flex-col bg-[#f4f5f7]">
      <div className="header-pattern px-4 pt-5 pb-6"/>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#00c896]/10 border-2 border-[#00c896]/40 flex items-center justify-center mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="#00c896" strokeWidth="2.5" className="w-10 h-10"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 className="text-xl font-bold text-[#111] mb-2">Transaction Successful</h2>
        <p className="text-sm text-[#888] mb-6">Your sandbox transaction simulation has completed.</p>
        <Card className="w-full p-4 mb-6 text-left">
          {[["Amount","0.0123 BTC"],["Network","Bitcoin (BTC)"],["Transaction ID","3fe...2e2"]].map(([k,v])=>(
            <div key={k} className="flex justify-between py-2.5 border-b border-[#f5f5f5] last:border-0">
              <span className="text-xs text-[#888]">{k}</span><span className="text-xs text-[#111] font-mono font-semibold">{v}</span>
            </div>
          ))}
        </Card>
        <div className="w-full flex flex-col gap-3">
          <GreenBtn label="View Details" onClick={()=>navigate("transactions")}/>
          <OutlineBtn label="Back to Home" onClick={()=>navigate("home")}/>
        </div>
      </div>
    </div>
  );
}

// ─── Profit Code ─────────────────────────────────────────────────────────────
function ProfitCodeScreen({ goBack }: { goBack:()=>void }) {
  const [code,setCode]=useState("");
  const [status,setStatus]=useState<"idle"|"loading"|"success"|"error">("idle");
  const [message,setMessage]=useState("");
  const [history,setHistory]=useState<Array<{code:string;amount:number;kind:"fixed"|"percentage";value:number;claimedAt:string}>>([]);
  useEffect(()=>{getProfitCodeHistory().then(data=>setHistory([...data.claims].sort((a,b)=>b.claimedAt.localeCompare(a.claimedAt)))).catch(()=>{});},[]);
  async function submit(){
    if(!code.trim()||status==="loading"||status==="success") return;
    setStatus("loading");setMessage("");
    try{
      const result=await claimProfitCode(code);
      setStatus("success");
      setMessage(`${result.claim.amount.toFixed(2)} TUSDT has been added to your available balance.`);
      setHistory(current=>[result.claim,...current]);
    }catch(error){
      setStatus("error");
      setMessage(error instanceof Error?error.message:"The Profit Code could not be claimed.");
    }
  }
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DarkHeader left={<><BackButton onBack={goBack} light/><div className="ml-2"><h1 className="text-base font-bold text-white">Profit Code</h1><p className="text-[10px] text-[#888]">Claim your profit distribution</p></div></>}/>
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-4 pt-4 pb-8 flex flex-col gap-3">
        {/* NOVA INVEST model card */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#00c896]/10 flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="w-5 h-5"><polygon points="20,4 36,32 4,32" fill="none" stroke="#00c896" strokeWidth="3" strokeLinejoin="round"/><polygon points="20,14 28,28 12,28" fill="#00c896" opacity="0.6"/></svg>
            </div>
            <div><p className="text-sm font-bold text-[#111]">NOVA INVEST</p><p className="text-[10px] text-[#aaa]">World Markets Portfolio</p></div>
          </div>
          <p className="text-xs text-[#666] leading-relaxed mb-3">On behalf of our investors, NOVA INVEST actively trades across the world&apos;s leading financial markets. Profits are distributed to all investors via a unique code sent by our team.</p>
          <div className="grid grid-cols-2 gap-2">
            {[["🇺🇸","US Stock Market","NYSE / NASDAQ"],["🇯🇵","Japan Stock Exchange","TSE / JPX"],["🇬🇧","London Stock Exchange","LSE / FTSE"],["🏅","London Metal Exchange","Gold · Oil · Metals"]].map(([flag,name,sub])=>(
              <div key={name} className="bg-gray-50 border border-[#f0f0f0] rounded-xl p-2.5 flex items-start gap-2">
                <span className="text-base mt-0.5">{flag}</span>
                <div><p className="text-xs font-semibold text-[#333]">{name}</p><p className="text-[10px] text-[#aaa] mt-0.5">{sub}</p></div>
              </div>
            ))}
          </div>
        </Card>
        {/* Code input */}
        <Card className="p-4">
          <p className="text-xs font-semibold text-[#111] mb-1">Enter Profit Distribution Code</p>
          <p className="text-xs text-[#aaa] mb-3 leading-relaxed">Our team sends a unique code to all investors when profits are distributed. Enter it below to claim your allocation.</p>
          <input
            value={code} onChange={e=>setCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&submit()}
            placeholder="e.g. NI-2026-SEP-01"
            maxLength={24}
            className="w-full bg-gray-50 border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm text-[#111] font-mono placeholder-[#ccc] outline-none focus:border-[#00c896] tracking-widest mb-3"
          />
          {status==="success"&&(
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" className="w-4 h-4"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div><p className="text-xs font-bold text-green-700">Code Accepted!</p><p className="text-xs text-green-600 mt-0.5">{message}</p></div>
            </div>
          )}
          {status==="error"&&(
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>
              </div>
              <p className="text-xs text-red-600">{message}</p>
            </div>
          )}
          <GreenBtn label={status==="loading"?"Verifying…":"Apply Profit Code"} onClick={submit} disabled={!code.trim()||status==="loading"||status==="success"}/>
        </Card>
        {/* History */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f0f0f0]">
            <p className="text-sm font-bold text-[#111]">Profit History</p>
          </div>
          {history.length===0&&<p className="px-4 py-5 text-xs text-[#aaa]">No Profit Codes claimed yet.</p>}
          {history.map((h,i)=>(
            <div key={`${h.code}-${h.claimedAt}`} className={`flex items-center gap-3 px-4 py-3 ${i<history.length-1?"border-b border-[#f5f5f5]":""}`}>
              <div className="w-8 h-8 rounded-full bg-[#00c896]/10 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#00c896" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="flex-1"><p className="text-xs font-mono text-[#555]">{h.code}</p><p className="text-[10px] text-[#bbb] mt-0.5">{new Date(h.claimedAt).toLocaleString()}</p></div>
              <span className="text-sm font-bold font-mono text-[#00c896]">+{h.amount.toFixed(2)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── Error ────────────────────────────────────────────────────────────────────
function ErrorScreen({ navigate }: { navigate:(s:Screen)=>void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#f4f5f7] px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mb-5">
        <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="w-10 h-10"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>
      </div>
      <h2 className="text-xl font-bold text-[#111] mb-2">Something Went Wrong</h2>
      <p className="text-sm text-[#888] mb-8">We couldn&apos;t complete your request. Please try again.</p>
      <div className="w-full flex flex-col gap-3">
        <GreenBtn label="Try Again" onClick={()=>navigate("home")}/>
        <OutlineBtn label="Contact Support" onClick={()=>navigate("help")}/>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
type AppState = { screen:Screen; mainTab:MainTab; stack:Screen[] };
const MAIN:Screen[]=["home","markets","trade","profile"];

export default function App() {
  const [state,setState]=useState<AppState>({screen:"splash",mainTab:"home",stack:[]});
  const [profile,setProfile]=useState<UserProfile|null>(null);

  useEffect(()=>{
    let active=true;
    async function restoreSession(){
      const [{data}]=await Promise.all([
        supabase.auth.getSession(),
        new Promise(resolve=>setTimeout(resolve,700)),
      ]);
      if(!active)return;
      if(!data.session){
        setState({screen:"onboarding",mainTab:"home",stack:[]});
        return;
      }
      try{
        const savedProfile=await getProfile();
        if(!active)return;
        setProfile(savedProfile);
        setState({screen:"home",mainTab:"home",stack:[]});
      }catch{
        await supabase.auth.signOut();
        if(active)setState({screen:"login",mainTab:"home",stack:[]});
      }
    }
    restoreSession();
    return()=>{active=false;};
  },[]);

  function navigate(screen:Screen) {
    setState(s=>({...s,screen,mainTab:MAIN.includes(screen)?screen as MainTab:s.mainTab,stack:MAIN.includes(screen)?[]:[...s.stack,s.screen]}));
  }
  function setTab(tab:MainTab) {
    setState(s=>({...s,screen:tab,mainTab:tab,stack:[]}));
  }
  function goBack() {
    setState(s=>{const stack=[...s.stack];const prev=stack.pop()??s.mainTab;return{...s,screen:prev,stack};});
  }
  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
    setState({screen:"login",mainTab:"home",stack:[]});
  }
  function showDeposit() { navigate("deposit"); }

  const showNav=MAIN.includes(state.screen);

  return (
    <div className="h-full w-full bg-[#f4f5f7] text-[#111] flex flex-col overflow-hidden">
      {profile&&<div className="flex-shrink-0 bg-amber-400 text-amber-950 text-[10px] font-black tracking-wider text-center py-1">SANDBOX · TEST CREDITS ONLY · NO REAL FUNDS</div>}
      <div className="flex-1 overflow-hidden flex flex-col" key={state.screen}>
        {state.screen==="splash"           &&<SplashScreen onDone={()=>{}}/>}
        {state.screen==="onboarding"       &&<OnboardingScreen navigate={navigate}/>}
        {state.screen==="login"            &&<LoginScreen navigate={navigate} onAuthenticated={setProfile}/>}
        {state.screen==="signup"           &&<SignUpScreen navigate={navigate} onAuthenticated={setProfile}/>}
        {state.screen==="home"             &&<HomeScreen navigate={navigate} showDeposit={showDeposit} profile={profile}/>}
        {state.screen==="markets"          &&<MarketsScreen navigate={navigate}/>}
        {state.screen==="trade"            &&<TradeScreen navigate={navigate}/>}
        {state.screen==="profile"          &&<ProfileScreen navigate={navigate} logout={logout} profile={profile}/>}
        {state.screen==="asset-detail"     &&<AssetDetailScreen navigate={navigate} goBack={goBack}/>}
        {state.screen==="buy"              &&<BuyScreen navigate={navigate} goBack={goBack}/>}
        {state.screen==="sell"             &&<SellScreen navigate={navigate} goBack={goBack}/>}
        {state.screen==="swap"             &&<SwapScreen navigate={navigate} goBack={goBack}/>}
        {state.screen==="wallet"           &&<WalletScreen navigate={navigate} showDeposit={showDeposit}/>}
        {state.screen==="deposit"          &&<DepositScreen goBack={goBack}/>}
        {state.screen==="withdraw"         &&<WithdrawScreen navigate={navigate} goBack={goBack}/>}
        {state.screen==="receive"          &&<ReceiveScreen goBack={goBack}/>}
        {state.screen==="transactions"     &&<TransactionsScreen goBack={goBack}/>}
        {state.screen==="invest"           &&<InvestScreen navigate={navigate} goBack={goBack}/>}
        {state.screen==="investment-plans" &&<InvestmentPlansScreen navigate={navigate} goBack={goBack}/>}
        {state.screen==="staking"          &&<StakingScreen navigate={navigate} goBack={goBack}/>}
        {state.screen==="copy-trading"     &&<CopyTradingScreen navigate={navigate} goBack={goBack}/>}
        {state.screen==="notifications"    &&<NotificationsScreen goBack={goBack}/>}
        {state.screen==="security"         &&<SecurityScreen goBack={goBack}/>}
        {state.screen==="settings"         &&<SettingsScreen goBack={goBack} navigate={navigate}/>}
        {state.screen==="kyc"              &&<KYCScreen navigate={navigate} goBack={goBack}/>}
        {state.screen==="help"             &&<HelpScreen goBack={goBack}/>}
        {state.screen==="tx-success"       &&<TxSuccessScreen navigate={navigate}/>}
        {state.screen==="error"            &&<ErrorScreen navigate={navigate}/>}
        {state.screen==="profit-code"      &&<ProfitCodeScreen goBack={goBack}/>}
        {state.screen==="referral"         &&<ReferralScreen goBack={goBack} referralCode={profile?.referralCode}/>}
        {state.screen==="admin"            &&profile?.role==="admin"&&<AdminScreen goBack={goBack}/>}
      </div>
      {showNav&&<BottomNav tab={state.mainTab} setTab={setTab}/>}
    </div>
  );
}
