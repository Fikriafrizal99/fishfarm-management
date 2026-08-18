import { AppFrame } from "@/app/_components/app-frame";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  let shell: Awaited<ReturnType<typeof getAppShellContext>> = null;

  try {
    shell = await getAppShellContext();
  } catch {
    shell = null;
  }

  return (
    <AppFrame
      active="sales"
      ownerName={shell?.ownerName ?? null}
      alertCount={shell?.openAlertCount ?? 0}
      activePonds={shell?.activePonds}
    >
      {children}
    </AppFrame>
  );
}
