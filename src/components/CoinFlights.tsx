import { useEffect, useState } from "react";

export type Flight = { id: number; n: number; from: { x: number; y: number }; to: { x: number; y: number } };

/** Coins that arc from a tile to a player card when rent is paid. */
export function CoinFlights({ flights }: { flights: Flight[] }) {
  return (
    <>
      {flights.map((f) => (
        <FlightCoins key={f.id} f={f} />
      ))}
    </>
  );
}

function FlightCoins({ f }: { f: Flight }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <>
      {Array.from({ length: f.n }).map((_, i) => {
        const jitter = (i - f.n / 2) * 7;
        return (
          <span
            key={i}
            className="coin"
            style={{
              left: f.from.x - 9,
              top: f.from.y - 9,
              transform: go ? `translate(${f.to.x - f.from.x}px, ${f.to.y - f.from.y + jitter}px) scale(.8)` : `translate(${jitter}px, ${-10 - i * 4}px)`,
              transitionDelay: go ? `${i * 60}ms, ${i * 60 + 700}ms` : "0ms",
              opacity: go ? 0 : 1,
            }}
          />
        );
      })}
    </>
  );
}
