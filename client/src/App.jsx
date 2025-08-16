import { useEffect, useState } from "react";
import "./styles.css";
import piLogo from "/logo-pi.svg";
import synLogo from "/logo-synkronia.svg";

const pi = typeof window !== "undefined" ? window.Pi : null;

export default function App() {
  const [user, setUser] = useState(null);
  const [talent, setTalent] = useState("");
  const [seeking, setSeeking] = useState("");
  const [tags, setTags] = useState("");
  const [cards, setCards] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (pi?.init) pi.init({ version: "2.0" });
    fetch("/api/cards").then(r=>r.json()).then(setCards).catch(()=>{});
  }, []);

  async function login() {
    try {
      const scopes = ["username", "payments"];
      const auth = await pi.authenticate(scopes, (p) => console.log("Pago incompleto:", p));
      setUser(auth.user);
    } catch {
      alert("Login Pi falló. Ejecuta dentro del Pi Browser.");
    }
  }

  async function saveCard() {
    if (!user) return alert("Inicia sesión con Pi primero");
    if (!talent.trim() || !seeking.trim()) return alert("Completa tu perfil");
    const res = await fetch("/api/cards", {
      method: "POST", headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ username: user.username, talent, seeking, tags })
    });
    const data = await res.json();
    setCards(data.cards || []);
    setTalent(""); setSeeking(""); setTags("");
  }

  async function payOnePi(toUsername) {
    if (!user) return alert("Inicia sesión con Pi primero");
    try {
      await pi.createPayment({
        amount: 1,
        memo: `Synkronia Match Express to @${toUsername}`,
        metadata: { kind: "match-express", to: toUsername }
      },{
        onReadyForServerApproval: async (paymentId) => {
          await fetch("/api/pay/approve", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ paymentId })
          });
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          const r = await fetch("/api/pay/complete", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ paymentId, txid, rate: 5, note: "Excelente!" })
          });
          const data = await r.json();
          setStatus(data.message || "Pago completado");
        },
        onCancel: () => setStatus("Pago cancelado"),
        onError: (e) => { console.error(e); setStatus("Error de pago"); }
      });
    } catch {
      alert("Debe ejecutarse dentro del Pi Browser.");
    }
  }

  return (
    <div className="app-shell">
      <header className="header">
        <img className="logo" src={synLogo} alt="Synkronía" />
        <div className="title">Synkronía · Pi</div>
        <img className="logo pi" src={piLogo} alt="Pi Network" />
      </header>

      <section className="panel" style={{display:"flex",gap:12,alignItems:"center",justifyContent:"space-between"}}>
        {!user
          ? <button className="btn" onClick={login}>Sign in with Pi</button>
          : <div>Bienvenido, <strong>@{user.username}</strong></div>
        }
        <div className="badge">MVP · Neon</div>
      </section>

      <section className="panel">
        <h2>1) Perfil de Talento</h2>
        <input className="input" placeholder="Lo que ofrezco (p.ej., Edición de video)" value={talent} onChange={e=>setTalent(e.target.value)} />
        <input className="input" placeholder="Lo que busco (p.ej., Motion para reels)" value={seeking} onChange={e=>setSeeking(e.target.value)} />
        <input className="input" placeholder="Tags (video, reels, motion)" value={tags} onChange={e=>setTags(e.target.value)} />
        <div style={{display:"flex",gap:10}}>
          <button className="btn" onClick={saveCard}>Guardar tarjeta</button>
        </div>
      </section>

      <section className="panel">
        <h2>2) Match Express + Pago en Pi</h2>
        <ul className="cards">
          {cards.map((c, i)=>(
            <li key={i} className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <strong>@{c.username}</strong>
                <span className="badge">{c.tags}</span>
              </div>
              <div><b>Ofrezco:</b> {c.talent}</div>
              <div><b>Busco:</b> {c.seeking}</div>
              <div style={{marginTop:8}}>
                <button className="btn" onClick={()=>payOnePi(c.username)}>Contratar en Pi (1 Pi)</button>
              </div>
            </li>
          ))}
        </ul>
        <div className={`status ${status.includes("exitoso")||status.includes("completado")?"ok":status.includes("cancel")?"warn":status.includes("Error")?"err":""}`}>{status}</div>
      </section>

      <section className="panel">
        <h2>3) Reputación Flash</h2>
        <p>Tras completar un pago, el servidor guarda un recibo firmado + rating ⭐.</p>
        <a href="/api/receipts" target="_blank" rel="noreferrer">Ver recibos JSON</a>
      </section>

      <footer>© Synkronía · Pi Hackathon</footer>
    </div>
  );
}
