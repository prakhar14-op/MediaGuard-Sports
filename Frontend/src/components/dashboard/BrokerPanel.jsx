import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "../../context/DashboardContext";
import { brokerService } from "../../services/api";
import { useNavigate } from "react-router-dom";
import {
  Coins, CheckCircle, TrendingUp, Wallet, Activity,
  AlertTriangle, XCircle, Hash, ChevronDown, ChevronUp,
  DollarSign, Zap, BarChart3, Globe,
} from "lucide-react";

const G = {
  teal: "#0d9488", tealBg: "rgba(13,148,136,0.08)", tealBdr: "rgba(13,148,136,0.2)",
  card: "#ffffff", border: "rgba(148,163,184,0.15)", text: "#0f172a",
  sub: "#64748b", muted: "#94a3b8", bg: "#f6f7fc",
  amber: "#f59e0b", amberBg: "rgba(245,158,11,0.08)", amberBdr: "rgba(245,158,11,0.2)",
  indigo: "#6366f1", indigoBg: "rgba(99,102,241,0.08)",
  purple: "#a855f7", purpleBg: "rgba(168,85,247,0.08)",
};

const TIER_CFG = {
  Platinum: { color: "#818cf8", bg: "rgba(129,140,248,0.08)", emoji: "💎", label: "Platinum", cpm: "High" },
  Gold:     { color: G.amber,   bg: G.amberBg,                emoji: "🥇", label: "Gold",     cpm: "Med-High" },
  Silver:   { color: G.muted,   bg: "rgba(148,163,184,0.08)", emoji: "🥈", label: "Silver",   cpm: "Medium" },
  Bronze:   { color: "#f97316", bg: "rgba(249,115,22,0.08)",  emoji: "🥉", label: "Bronze",   cpm: "Standard" },
};

const PLATFORM_COLORS = {
  YouTube: "#ef4444", TikTok: "#000", Twitter: "#1d9bf0",
  Instagram: "#e1306c", Telegram: "#2ca5e0", Reddit: "#ff4500", Other: G.muted,
};

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EmptyState = () => {
  const navigate = useNavigate();
  return (
    React.createElement(motion.div, {
      initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 },
      style: {
        textAlign: "center", padding: "80px 32px",
        background: "linear-gradient(135deg, rgba(13,148,136,0.06) 0%, rgba(99,102,241,0.04) 100%)",
        borderRadius: 24, border: "2px dashed rgba(13,148,136,0.25)",
      }
    },
      React.createElement("div", {
        style: {
          width: 80, height: 80, borderRadius: 24, background: G.tealBg,
          border: "2px solid " + G.tealBdr, display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 24px", fontSize: 36,
        }
      }, "💰"),
      React.createElement("p", { style: { fontSize: 20, fontWeight: 900, color: G.text, margin: "0 0 12px" } },
        "No Contracts Minted Yet"),
      React.createElement("p", { style: { fontSize: 14, color: G.sub, margin: "0 0 32px", maxWidth: 400, marginInline: "auto", lineHeight: 1.7 } },
        "Revenue-sharing contracts are minted when the Adjudicator classifies content as ",
        React.createElement("strong", { style: { color: G.teal } }, "FAIR USE / FAN CONTENT"),
        ". Run the swarm to start monetizing."),
      React.createElement(motion.button, {
        whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 },
        onClick: () => navigate("/dashboard/hunter"),
        style: {
          padding: "13px 32px", borderRadius: 12, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, " + G.teal + ", #2dd4bf)",
          color: "#fff", fontWeight: 700, fontSize: 14,
          boxShadow: "0 0 28px rgba(13,148,136,0.3)",
        }
      }, "🚀 Launch Swarm")
    )
  );
};

export default function BrokerPanel() {
  const { contracts, refresh, addNotification } = useDashboard();
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const minted = contracts.filter((c) => c.status === "minted");
  const active = contracts.filter((c) => c.status === "active");
  const other  = contracts.filter((c) => c.status !== "minted" && c.status !== "active");
  const totalRevenue = active.reduce((s, c) => s + (Number(c.estimated_monthly_revenue) || 0), 0);
  const pendingRevenue = minted.reduce((s, c) => s + (Number(c.estimated_monthly_revenue) || 0), 0);

  const filtered = useMemo(() => {
    if (filter === "minted") return minted;
    if (filter === "active") return active;
    return contracts;
  }, [filter, contracts, minted, active]);

  const handleActivate = async (id) => {
    setProcessing(id); setError("");
    try {
      await brokerService.activate(id);
      addNotification({ type: "success", title: "Contract Activated", message: "Rev-share contract is now live on Polygon." });
      refresh();
    } catch (err) { setError(err?.response?.data?.message || "Failed to activate contract."); }
    finally { setProcessing(null); }
  };

  const handleDispute = async (id) => {
    setProcessing(id); setError("");
    try {
      await brokerService.dispute(id);
      addNotification({ type: "agent", title: "Contract Disputed", message: "Incident returned to review queue." });
      refresh();
    } catch (err) { setError(err?.response?.data?.message || "Failed to dispute contract."); }
    finally { setProcessing(null); }
  };

  return (
    React.createElement("div", { style: { color: G.text } },
      /* Page header */
      React.createElement("div", { style: { marginBottom: 28 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14 } },
            React.createElement("div", {
              style: {
                width: 48, height: 48, borderRadius: 14, background: G.tealBg,
                border: "1.5px solid " + G.tealBdr, display: "flex", alignItems: "center", justifyContent: "center",
              }
            }, React.createElement(Coins, { size: 22, style: { color: G.teal } })),
            React.createElement("div", null,
              React.createElement("h2", { style: { fontSize: "1.4rem", fontWeight: 900, color: G.text, margin: 0, letterSpacing: "-0.02em" } }, "Monetization Broker"),
              React.createElement("p", { style: { fontSize: 12, color: G.sub, margin: "3px 0 0" } }, "AI-minted rev-share contracts · Fair use becomes revenue")
            )
          ),
          contracts.length > 0 && React.createElement("div", { style: { display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4 } },
            [
              { key: "all",    label: "All (" + contracts.length + ")" },
              { key: "minted", label: "Pending (" + minted.length + ")" },
              { key: "active", label: "Live (" + active.length + ")" },
            ].map((tab) =>
              React.createElement("button", {
                key: tab.key, onClick: () => setFilter(tab.key),
                style: {
                  padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 700, transition: "all 0.15s",
                  background: filter === tab.key ? "#fff" : "transparent",
                  color: filter === tab.key ? G.text : G.sub,
                  boxShadow: filter === tab.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }
              }, tab.label)
            )
          )
        )
      ),

      /* Summary cards */
      contracts.length > 0 && React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 } },
        [
          { label: "Pending Activation", value: minted.length,          color: G.amber,   icon: React.createElement(Zap, { size: 16 }),         sub: "$" + fmt(pendingRevenue) + "/mo potential" },
          { label: "Live Contracts",     value: active.length,          color: G.teal,    icon: React.createElement(Activity, { size: 16 }),     sub: "Yielding revenue" },
          { label: "Monthly Revenue",    value: "$" + fmt(totalRevenue), color: G.indigo,  icon: React.createElement(DollarSign, { size: 16 }),   sub: "From active contracts" },
          { label: "Total Contracts",    value: contracts.length,       color: G.purple,  icon: React.createElement(BarChart3, { size: 16 }),    sub: "All time" },
        ].map((s, i) =>
          React.createElement(motion.div, {
            key: s.label,
            initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 },
            transition: { delay: i * 0.06 },
            style: {
              background: G.card, borderRadius: 16, padding: "18px 20px",
              border: "1px solid " + G.border, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              position: "relative", overflow: "hidden",
            }
          },
            React.createElement("div", { style: { position: "absolute", top: 0, left: 0, right: 0, height: 3, background: s.color, borderRadius: "16px 16px 0 0" } }),
            React.createElement("div", { style: { width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: s.color + "12", color: s.color, marginBottom: 10 } }, s.icon),
            React.createElement("p", { style: { fontSize: 26, fontWeight: 900, color: s.color, margin: "0 0 2px", lineHeight: 1 } }, s.value),
            React.createElement("p", { style: { fontSize: 11, fontWeight: 700, color: G.text, margin: "0 0 2px" } }, s.label),
            React.createElement("p", { style: { fontSize: 10, color: G.muted, margin: 0 } }, s.sub)
          )
        )
      ),

      error && React.createElement(motion.div, {
        initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 },
        style: { display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", marginBottom: 20, borderRadius: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#ef4444" }
      },
        React.createElement(AlertTriangle, { size: 14 }), error,
        React.createElement("button", { onClick: () => setError(""), style: { marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#ef4444" } },
          React.createElement(XCircle, { size: 14 }))
      ),

      contracts.length === 0
        ? React.createElement(EmptyState)
        : React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } },
            /* Pending section */
            (filter === "all" || filter === "minted") && minted.length > 0 && React.createElement("div", { key: "pending-header", style: { display: "flex", alignItems: "center", gap: 10, marginTop: 4 } },
              React.createElement("div", { style: { width: 10, height: 10, borderRadius: "50%", background: G.amber, animation: "pulse 1.5s ease-in-out infinite" } }),
              React.createElement("span", { style: { fontSize: 11, fontWeight: 800, color: G.amber, textTransform: "uppercase", letterSpacing: "0.18em" } }, "Awaiting Activation — " + minted.length + " contract" + (minted.length !== 1 ? "s" : "")),
              React.createElement("div", { style: { flex: 1, height: 1, background: G.amber + "20" } })
            ),
            ...filtered.filter((c) => c.status === "minted").map((c) =>
              React.createElement(ContractCard, { key: c._id, contract: c, onActivate: handleActivate, onDispute: handleDispute, processing })
            ),
            /* Active section */
            (filter === "all" || filter === "active") && active.length > 0 && React.createElement("div", { key: "active-header", style: { display: "flex", alignItems: "center", gap: 10, marginTop: 8 } },
              React.createElement("div", { style: { width: 10, height: 10, borderRadius: "50%", background: G.teal, animation: "pulse 1.5s ease-in-out infinite" } }),
              React.createElement("span", { style: { fontSize: 11, fontWeight: 800, color: G.teal, textTransform: "uppercase", letterSpacing: "0.18em" } }, "Live Contracts — $" + fmt(totalRevenue) + "/mo"),
              React.createElement("div", { style: { flex: 1, height: 1, background: G.teal + "20" } })
            ),
            ...filtered.filter((c) => c.status === "active").map((c) =>
              React.createElement(ContractCard, { key: c._id, contract: c, onActivate: handleActivate, onDispute: handleDispute, processing })
            ),
            filter === "all" && other.map((c) =>
              React.createElement(ContractCard, { key: c._id, contract: c, onActivate: handleActivate, onDispute: handleDispute, processing })
            )
          ),

      React.createElement("style", null, "@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}")
    )
  );
}

function ContractCard({ contract, onActivate, onDispute, processing }) {
  const [expanded, setExpanded] = useState(false);
  const tier     = TIER_CFG[contract.tier] || TIER_CFG.Bronze;
  const isMinted = contract.status === "minted";
  const isActive = contract.status === "active";
  const holderPct  = contract.copyright_holder_share ?? 0;
  const creatorPct = contract.creator_share ?? 0;
  const platColor  = PLATFORM_COLORS[contract.platform] || G.muted;

  return React.createElement(motion.div, {
    initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, layout: true,
    style: {
      background: G.card, borderRadius: 20, overflow: "hidden",
      border: "1px solid " + (isActive ? G.tealBdr : isMinted ? G.amberBdr : G.border),
      boxShadow: isActive ? "0 4px 24px rgba(13,148,136,0.12)" : isMinted ? "0 4px 24px rgba(245,158,11,0.10)" : "0 2px 8px rgba(0,0,0,0.04)",
    }
  },
    /* Top bar */
    React.createElement("div", {
      style: {
        height: 5,
        background: isActive ? "linear-gradient(90deg,#0d9488,#2dd4bf)" : isMinted ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : tier.color,
      }
    }),
    React.createElement("div", { style: { padding: "20px 22px" } },
      /* Header */
      React.createElement("div", { style: { display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 } },
        /* Tier icon */
        React.createElement("div", {
          style: {
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: tier.bg, border: "1.5px solid " + tier.color + "30", fontSize: 26,
          }
        }, tier.emoji),
        React.createElement("div", { style: { flex: 1, minWidth: 0 } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 } },
            React.createElement("span", { style: { fontSize: 16, fontWeight: 900, color: G.text } }, tier.label + " Tier"),
            React.createElement("span", {
              style: {
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 9, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
                background: isActive ? G.tealBg : isMinted ? G.amberBg : "rgba(148,163,184,0.1)",
                color: isActive ? G.teal : isMinted ? G.amber : G.muted,
                border: "1px solid " + (isActive ? G.tealBdr : isMinted ? G.amberBdr : "rgba(148,163,184,0.2)"),
                textTransform: "uppercase", letterSpacing: "0.1em",
              }
            },
              React.createElement("span", {
                style: {
                  width: 5, height: 5, borderRadius: "50%",
                  background: isActive ? G.teal : isMinted ? G.amber : G.muted,
                  animation: (isActive || isMinted) ? "pulse 1.5s ease-in-out infinite" : "none",
                }
              }),
              contract.status
            )
          ),
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            contract.platform && React.createElement("span", {
              style: { fontSize: 12, fontWeight: 600, color: platColor, display: "flex", alignItems: "center", gap: 4 }
            }, React.createElement(Globe, { size: 11 }), " ", contract.platform),
            contract.target_account && React.createElement("span", { style: { fontSize: 12, color: G.sub } }, "@" + contract.target_account),
            contract.video_title && React.createElement("span", {
              style: {
                fontSize: 11, color: G.sub, background: "#f8fafc", padding: "2px 8px",
                borderRadius: 6, border: "1px solid " + G.border,
                maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }
            }, "🎬 " + contract.video_title)
          )
        ),
        React.createElement(motion.button, {
          whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 },
          onClick: () => setExpanded((v) => !v),
          style: {
            width: 32, height: 32, borderRadius: 9, border: "1px solid " + G.border,
            background: expanded ? G.tealBg : "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }
        }, expanded ? React.createElement(ChevronUp, { size: 14, style: { color: G.teal } }) : React.createElement(ChevronDown, { size: 14, style: { color: G.sub } }))
      ),

      /* Revenue split */
      React.createElement("div", { style: { marginBottom: 16 } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
          React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: G.sub } }, "Revenue Split"),
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 5 } },
            React.createElement(DollarSign, { size: 12, style: { color: G.teal } }),
            React.createElement("span", { style: { fontSize: 15, fontWeight: 900, color: G.teal } },
              fmt(contract.estimated_monthly_revenue),
              React.createElement("span", { style: { fontSize: 10, fontWeight: 600, color: G.muted } }, "/mo")
            )
          )
        ),
        React.createElement("div", { style: { height: 12, background: "#e2e8f0", borderRadius: 99, overflow: "hidden", display: "flex", gap: 1 } },
          React.createElement(motion.div, {
            initial: { width: 0 }, animate: { width: holderPct + "%" },
            transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
            style: { background: "linear-gradient(90deg," + G.teal + ",#2dd4bf)", borderRadius: "99px 0 0 99px" }
          }),
          React.createElement(motion.div, {
            initial: { width: 0 }, animate: { width: creatorPct + "%" },
            transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 },
            style: { background: "linear-gradient(90deg," + tier.color + "," + tier.color + "80)", borderRadius: "0 99px 99px 0" }
          })
        ),
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 6 } },
          React.createElement("span", { style: { fontSize: 10, color: G.teal, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 } },
            React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: G.teal, display: "inline-block" } }),
            "IP Holder " + holderPct + "%"
          ),
          React.createElement("span", { style: { fontSize: 10, color: tier.color, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 } },
            "Creator " + creatorPct + "%",
            React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: tier.color, display: "inline-block" } })
          )
        )
      ),

      /* IP holder cut highlight */
      React.createElement("div", {
        style: {
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", background: G.tealBg, borderRadius: 10,
          border: "1px solid " + G.tealBdr, marginBottom: 14,
        }
      },
        React.createElement("span", { style: { fontSize: 11, color: G.teal, fontWeight: 700 } }, "Your monthly cut"),
        React.createElement("span", { style: { fontSize: 16, fontWeight: 900, color: G.teal } },
          "$" + fmt((Number(contract.estimated_monthly_revenue) || 0) * holderPct / 100) + "/mo"
        )
      ),

      /* Expandable hashes */
      React.createElement(AnimatePresence, null,
        expanded && React.createElement(motion.div, {
          initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 },
          exit: { height: 0, opacity: 0 }, transition: { duration: 0.25 },
          style: { overflow: "hidden" }
        },
          React.createElement("div", { style: { marginBottom: 14, background: "#f8fafc", borderRadius: 12, border: "1px solid " + G.border, padding: "12px 14px" } },
            contract.tx_hash && React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
              React.createElement("span", { style: { fontSize: 10, color: G.sub, display: "flex", alignItems: "center", gap: 5 } },
                React.createElement("svg", { viewBox: "0 0 38 33", style: { width: 11, height: 11, fill: "#a855f7" } },
                  React.createElement("path", { d: "M29 10.2L19 4.6 9 10.2v11.2l10 5.6 10-5.6V10.2zM19 0L38 11v11L19 33 0 22V11L19 0z" })
                ),
                "Polygon TX"
              ),
              React.createElement("span", { style: { fontSize: 10, fontFamily: "monospace", color: "#a855f7", background: "rgba(168,85,247,0.08)", padding: "2px 8px", borderRadius: 6 } },
                contract.tx_hash.slice(0, 22) + "…"
              )
            ),
            contract.integrity_hash && React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
              React.createElement("span", { style: { fontSize: 10, color: G.sub, display: "flex", alignItems: "center", gap: 5 } },
                React.createElement(Hash, { size: 11 }), "Integrity"
              ),
              React.createElement("span", { style: { fontSize: 10, fontFamily: "monospace", color: G.teal, background: G.tealBg, padding: "2px 8px", borderRadius: 6 } },
                contract.integrity_hash.slice(0, 22) + "…"
              )
            )
          )
        )
      ),

      /* Actions */
      isMinted && React.createElement("div", { style: { display: "flex", gap: 10 } },
        React.createElement(motion.button, {
          whileHover: { scale: 1.02 }, whileTap: { scale: 0.97 },
          onClick: () => onActivate(contract._id), disabled: !!processing,
          style: {
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "12px 0", borderRadius: 12, border: "none",
            cursor: processing ? "not-allowed" : "pointer",
            background: processing === contract._id ? G.border : "linear-gradient(135deg," + G.teal + ",#2dd4bf)",
            color: processing === contract._id ? G.muted : "#fff",
            fontWeight: 700, fontSize: 13,
            boxShadow: processing ? "none" : "0 0 24px rgba(13,148,136,0.35)",
            opacity: processing && processing !== contract._id ? 0.5 : 1,
          }
        },
          processing === contract._id
            ? React.createElement("div", { style: { width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" } })
            : React.createElement(Wallet, { size: 15 }),
          "Activate Contract"
        ),
        React.createElement(motion.button, {
          whileHover: { scale: 1.02 }, whileTap: { scale: 0.97 },
          onClick: () => onDispute(contract._id), disabled: !!processing,
          style: {
            padding: "12px 16px", borderRadius: 12, cursor: processing ? "not-allowed" : "pointer",
            background: "transparent", border: "1px solid " + G.border,
            opacity: processing ? 0.5 : 1,
          }
        }, React.createElement(XCircle, { size: 14, style: { color: G.sub } }))
      ),

      isActive && React.createElement("div", {
        style: {
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "12px 0", borderRadius: 12, background: G.tealBg,
          border: "1px solid " + G.tealBdr, color: G.teal, fontWeight: 700, fontSize: 13,
        }
      },
        React.createElement(Activity, { size: 15, style: { animation: "pulse 1.5s ease-in-out infinite" } }),
        "Live & Yielding Revenue"
      )
    )
  );
}
