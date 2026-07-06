import { EagleGate } from "@/components/gate/eagle-gate";
import { Marquee } from "@/components/fx/marquee";
import { Manifest } from "@/components/sections/manifest";
import { NqTerminal } from "@/components/sections/nq-terminal";
import { ApexGrid } from "@/components/sections/apex-grid";
import { SiteFooter } from "@/components/sections/site-footer";

export default function Home() {
  return (
    <main>
      {/* 420vh scroll journey through the raptor eye */}
      <EagleGate />

      {/* the site behind the pupil */}
      <div className="relative bg-bg-deep">
        <Manifest />

        <Marquee
          items={[
            "NQ FUTURES",
            "VISION 8×",
            "0–100 IN 3.0s",
            "RING-TAILED CHAOS",
            "GLOBEX NEVER SLEEPS",
            "APEX PLAYGROUND",
          ]}
        />

        <NqTerminal />

        <Marquee
          items={[
            "AQUILA CHRYSAETOS",
            "ACINONYX JUBATUS",
            "LEMUR CATTA",
            "SEE FIRST",
            "STRIKE ONCE",
          ]}
          duration="42s"
          separator="✦"
        />

        <ApexGrid />

        <SiteFooter />
      </div>
    </main>
  );
}
