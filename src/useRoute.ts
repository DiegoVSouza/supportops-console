import { useEffect, useState } from "react";

export type Route = { name: "tickets" } | { name: "ticket"; id: string } | { name: "approvals" };

export function parseRoute(hash: string): Route {
  const [, first, second] = hash.replace(/^#/, "").split("/");
  if (first === "approvals") return { name: "approvals" };
  if (first === "tickets" && second) return { name: "ticket", id: decodeURIComponent(second) };
  return { name: "tickets" };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}
