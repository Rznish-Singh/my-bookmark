import { PageHeader } from "@/components/layout/page-header";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Library", href: "/dashboard" }, { label: "Settings" }]} title="Settings" subtitle="Profile, appearance, data and shortcuts." actions="none" />
      <SettingsView />
    </>
  );
}
