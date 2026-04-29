import { AppShell } from "./components/layout/AppShell";
import { ToastViewport } from "./components/ui/ToastViewport";
import { ToastProvider } from "./hooks/useToast";
import { WalletProvider, useWallet } from "./hooks/useWallet";
import { CreateStream } from "./pages/CreateStream";
import { Dashboard } from "./pages/Dashboard";
import { Landing } from "./pages/Landing";
import { StreamDetail } from "./pages/StreamDetail";
import { useRoute } from "./router";

function Routes() {
  const pathname = useRoute();
  const { isConnected } = useWallet();

  if (pathname === "/" && !isConnected) {
    return (
      <AppShell pathname={pathname} withSidebar={false}>
        <Landing />
      </AppShell>
    );
  }

  if (pathname.startsWith("/stream/")) {
    const streamId = pathname.split("/").filter(Boolean)[1];
    return (
      <AppShell pathname={pathname}>
        <StreamDetail streamId={streamId} />
      </AppShell>
    );
  }

  if (pathname === "/create") {
    return (
      <AppShell pathname={pathname}>
        <CreateStream />
      </AppShell>
    );
  }

  return (
    <AppShell pathname="/dashboard">
      <Dashboard />
    </AppShell>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <WalletProvider>
        <Routes />
        <ToastViewport />
      </WalletProvider>
    </ToastProvider>
  );
}
