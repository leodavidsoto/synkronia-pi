import { useEffect, useState } from "react";
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

  const login = async () => {
    try {
      const scopes = ["username", "payments"];
      const auth = await pi.authenticate(scopes, (payment) => {
        console.log("Pago incompleto:", payment);
      });
      setUser(auth.user);
    } catch (e) {
      alert("Login Pi falló. Ejecuta dentro del Pi Browser.");
    }
  };

  const saveCard = async () => {
    if (!user) return alert("Inicia sesión con Pi primero");
    if (!talent.trim() || !seeking.trim()) return alert("Completa tu perfil");
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ username: user.username, talent, seeking, tags })
    });
    const data = await res.json();
    setCards(data.cards || []);
    setTalent(""); setSeeking(""); setTags("");
  };

  const payOnePi = async (toUsername) => {
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
            body: JSON.stringify({ paymentId, txid, rate: 5, note: "Great!" })
          });
          const data = await r.json();
          setStatus(data.message || "Pago completado");
        },
        onCancel: () => setStatus("Pago cancelado"),
        onError: (e) => { console.error(e); setStatus("Error de pago"); }
      });
    } catch (e) {
      console.error(e);
      alert("Debe ejecutarse dentro del Pi Browser.");
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily:"system-ui, Arial" }}>
      <header style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
        <img src={synLogo} alt="Synkronía" style={{ height:50 }} />
        <h1>Synkronía Pi</h1>
        <img src={piLogo} alt="Pi Network" style={{ height:40, marginLeft:"auto" }} />
      </header>

      {!user ? <button onClick={login}>Sign in with Pi</button> : <p>Bienvenido, @{user.username}</p>}

      <section style={{ marginTop: 24, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
        <h2>1) Perfil de Talento</h2>
        <input style={{width:"100%",padding:8,margin:"6px 0"}} placeholder="Lo que ofrezco" value={talent} onChange={e=>setTalent(e.target.value)} />
        <input style={{width:"100%",padding:8,margin:"6px 0"}} placeholder="Lo que busco" value={seeking} onChange={e=>setSeeking(e.target.value)} />
        <input style={{width:"100%",padding:8,margin:"6px 0"}} placeholder="Tags (video, reels, motion)" value={tags} onChange={e=>setTags(e.target.value)} />
        <button onClick={saveCard}>Guardar tarjeta</button>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>2) Match Express + Pago en Pi</h2>
        <ul style={{ listStyle:"none", padding:0 }}>
          {cards.map((c, i)=>(
            <li key={i} style={{ border:"1px solid #eee", borderRadius:12, padding:12, margin:"8px 0" }}>
              <strong>@{c.username}</strong>
              <div><b>Ofrezco:</b> {c.talent}</div>
              <div><b>Busco:</b> {c.seeking}</div>
              <div><b>Tags:</b> {c.tags}</div>
              <button onClick={()=>payOnePi(c.username)} style={{ marginTop:8 }}>
                Contratar en Pi (1 Pi)
              </button>
            </li>
          ))}
        </ul>
        <p>{status}</p>
      </section>

      <section style={{ marginTop: 24, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
        <h2>3) Reputación Flash</h2>
        <p>Tras completar un pago, el servidor guarda un recibo firmado + rating ⭐.</p>
        <a href="/api/receipts" target="_blank" rel="noreferrer">Ver recibos JSON</a>
      </section>
    </div>
  );
}
