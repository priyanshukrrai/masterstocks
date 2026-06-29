"use client";
import { useState } from "react";
import { useMarkets } from "@/lib/useMarkets";
import Controls from "./Controls";
import AssetGrid from "./AssetGrid";
import MarketStatus from "./MarketStatus";
import TickerStrip from "./TickerStrip";
import DetailModal from "./DetailModal";
import AnalyticsSection from "./AnalyticsSection";
import Reveal from "./Reveal";

const H2 = { fontSize: "clamp(30px, 4vw, 52px)", margin: "10px 0 6px" };

export default function App() {
  const m = useMarkets();
  // Track the open asset by id, then resolve the LIVE object from current
  // state on every render. Storing the asset object directly would freeze a
  // snapshot, which is why the modal's ICT read used to stop tracking the
  // market once it was open.
  const [selectedId, setSelectedId] = useState(null);
  const selected = selectedId
    ? [...m.crypto, ...m.stocks, ...m.india].find((a) => a.id === selectedId) ||
      null
    : null;
  const tickerItems = m.crypto.slice(0, 10);
  return (
    <section id="markets">
      <div className="container">
        <Reveal>
          <div className="eyebrow">Live Markets</div>
          <h2 className="display" style={H2}>
            Every coin. Every stock. One desk.
          </h2>
        </Reveal>
        <TickerStrip items={tickerItems} />
        <MarketStatus tab={m.tab} open={m.open} />
        <Controls
          tab={m.tab}
          setTab={m.setTab}
          search={m.search}
          setSearch={m.setSearch}
        />
        {m.tab === "analytics" ? (
          <div id="analytics">
            <AnalyticsSection
              crypto={m.crypto}
              stocks={m.stocks}
              india={m.india}
            />
          </div>
        ) : (
          <AssetGrid items={m.filtered} onOpen={(a) => setSelectedId(a.id)} />
        )}
      </div>
      <DetailModal asset={selected} onClose={() => setSelectedId(null)} />
    </section>
  );
}
