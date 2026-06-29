import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import App from "@/components/App";
import { BackgroundPaths } from "@/components/ui/background-paths";

const eyebrowText = "MasterStocks \u00b7 Real-time market intelligence";
const heroPara =
  "Track crypto, US equities and Indian markets in one premium, real-time workspace \u2014 with an ICT-style edge read on every asset.";
const footTitle = "MasterStocks \u2014 premium stock & crypto tracker";

export default function Page() {
  return (
    <>
      <SmoothScroll />
      <div className="grain" />
      <Navbar />
      <main>
        <BackgroundPaths
          title="Markets, refined."
          eyebrow={eyebrowText}
          subtitle={heroPara}
          primaryLabel="Launch the app"
          primaryHref="#markets"
          secondaryLabel="View analytics"
          secondaryHref="#analytics"
        />
        <App />
        <footer id="about">
          <div>{footTitle}</div>
          <div>
            Developed by <b>Priyanshu Kumar Rai</b>
          </div>
        </footer>
      </main>
    </>
  );
}
