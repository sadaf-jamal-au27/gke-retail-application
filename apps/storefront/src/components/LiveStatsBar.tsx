import { useEffect, useState } from "react";
import { automobileApi } from "../api/automobile";

export function LiveStatsBar() {
  const [text, setText] = useState("Loading inventory…");
  const [ok, setOk] = useState(true);

  useEffect(() => {
    const load = () =>
      automobileApi
        .realtime()
        .then((s) => {
          if ((s as unknown as Record<string, unknown>)._unavailable) {
            setOk(false);
            setText("Services starting… data will appear shortly");
            return;
          }
          setOk(true);
          setText(
            `${s.unitsInStock} units in stock · ${s.vehiclesListed} models · ${s.testDrivesToday} test drives today · ${s.openOrders} open orders`
          );
        })
        .catch(() => {
          setOk(false);
          setText("BFF offline — restart: pnpm dev (from app-retail/gke-retail-application)");
        });
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, []);

  return <div className={`live-bar ${ok ? "live-ok" : "live-err"}`}>{text}</div>;
}
