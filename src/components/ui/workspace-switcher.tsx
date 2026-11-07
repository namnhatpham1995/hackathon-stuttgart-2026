import { NavItem } from "./nav-item";

export function WorkspaceSwitcher({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Workspaces" className={`flex flex-wrap gap-1 ${className}`}>
      <NavItem href="/workspace" tone="default">
        Supplier workspace
      </NavItem>
      <NavItem href="/buyer" tone="default">
        Buyer workspace
      </NavItem>
    </nav>
  );
}
