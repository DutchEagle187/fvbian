import { EagleGate } from "@/components/gate/eagle-gate";
import { Marquee } from "@/components/fx/marquee";
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
