import { EagleGate } from "@/components/gate/eagle-gate";
import { Marquee } from "@/components/fx/marquee";
import { TapeStrip } from "@/components/fx/tape-strip";
import { Manifest } from "@/components/sections/manifest";
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

        {/* the NQ tape as a living divider */}
        <TapeStrip />

        <ApexGrid />

        <Marquee
          items={[
            "AQUILA CHRYSAETOS",
            "ACINONYX JUBATUS",
            "LEMUR CATTA",
            "SEE FIRST",
            "STRIKE ONCE",
            "GLOBEX NEVER SLEEPS",
          ]}
          duration="42s"
          separator="✦"
        />

        <SiteFooter />
      </div>
    </main>
  );
}
