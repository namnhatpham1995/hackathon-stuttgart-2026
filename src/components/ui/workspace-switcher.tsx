import { NavItem } from "./nav-item";

export function WorkspaceSwitcher() {
  return (
    <nav
      aria-label="Workspaces"
      className="flex flex-wrap gap-1 border-b border-line bg-paper px-4 py-2 md:px-10"
    >
      <NavItem href="/workspace" tone="default">
        Supplier workspace
      </NavItem>
      <NavItem href="/buyer" tone="default">
        Buyer workspace
      </NavItem>
    </nav>
  );
}
