import type { Metadata } from "next";
import { MonthlaneApp } from "./src/MonthlaneApp";

export const metadata: Metadata = {
  title: "Monthlane — Personal Calendar",
  description: "A calm, local-first personal calendar.",
};

export default function Home() {
  return <MonthlaneApp />;
}
