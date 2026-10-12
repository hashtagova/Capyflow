import { AppNav } from "./app-nav";
import { ActiveDipWidget } from "./active-dip-widget";

interface Props {
  activePath?: string;
}

export function AppNavWrapper({ activePath }: Props) {
  return (
    <>
      <AppNav activePath={activePath} />
      <ActiveDipWidget />
    </>
  );
}
