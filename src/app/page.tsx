import { EagleGate } from "@/components/gate/eagle-gate";
import { Marquee } from "@/components/fx/marquee";
import { ScrollProgress } from "@/components/fx/scroll-progress";
import { Manifest } from "@/components/sections/manifest";
import { ApexGrid } from "@/components/sections/apex-grid";
import { Velocity } from "@/components/sections/velocity";
import { SiteFooter } from "@/components/sections/site-footer";

export default function Home() {
  return (
    <main>
      <ScrollProgress />

      {/* 420vh dive into the pupil */}
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

        <Velocity />

        <SiteFooter />
      </div>
    </main>
  );
}
