import { TabBar } from "./tab-bar";

// Wraps every /app/* page. The TabBar is a client component that decides
// internally whether to render based on pathname (only the three main tab
// routes: /app, /app/discover, /app/swaps). Detail pages show no tab bar.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <TabBar />
    </>
  );
}
