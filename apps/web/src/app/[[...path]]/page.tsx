import { Suspense } from "react";
import DemoApp from "@/components/demo-app";
export default function Page() {
  return (
    <Suspense
      fallback={<div className="inline-loading">Opening Perform+…</div>}
    >
      <DemoApp />
    </Suspense>
  );
}
