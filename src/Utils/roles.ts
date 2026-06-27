export type RoleOption = {
  value: number;
  label: string;
  color: string;
  background: string;
  border: string;
};

export const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 1,
    label: "Admin",
    color: "#0f766e",
    background: "rgba(0, 105, 92, 0.08)",
    border: "rgba(0, 105, 92, 0.18)",
  },
  {
    value: 2,
    label: "Retailer",
    color: "#7c3aed",
    background: "rgba(124, 58, 237, 0.12)",
    border: "rgba(124, 58, 237, 0.2)",
  },
  {
    value: 3,
    label: "Dealer",
    color: "#1d4ed8",
    background: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.2)",
  },
  {
    value: 4,
    label: "Salesman",
    color: "#b45309",
    background: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.2)",
  },
  {
    value: 5,
    label: "Staff",
    color: "#be185d",
    background: "rgba(236, 72, 153, 0.12)",
    border: "rgba(236, 72, 153, 0.2)",
  },
  {
    value: 6,
    label: "Delivery Man",
    color: "#4338ca",
    background: "rgba(99, 102, 241, 0.12)",
    border: "rgba(99, 102, 241, 0.2)",
  },
];

const DEFAULT_ROLE_META = {
  label: "Unknown Role",
  color: "#475569",
  background: "rgba(148, 163, 184, 0.12)",
  border: "rgba(148, 163, 184, 0.2)",
};

export const getRoleMeta = (roleId?: number) =>
  ROLE_OPTIONS.find((role) => role.value === roleId) || {
    ...DEFAULT_ROLE_META,
    label: `Role ${roleId ?? "-"}`,
  };

export const isSupportedRoleId = (roleId?: number) =>
  ROLE_OPTIONS.some((role) => role.value === roleId);
