import type { CRMContactLifecycleStatus } from "@/lib/admin-crm";

export type AdminCustomerSummary = {
  id: number;
  name: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  whatsapp: string | null;
  ordersCount: number;
  totalSpent: number;
  lastPurchaseAt: string | null;
  acceptedMarketing: boolean | null;
  lifecycleStatus: CRMContactLifecycleStatus | null;
  mainGoal: string | null;
  skinType: string | null;
  source: string | null;
  hasOrders: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminCustomerAddress = {
  id: number;
  label: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
};

export type AdminCustomerRecentOrder = {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentProvider: string;
  total: number;
  createdAt: string;
};

export type AdminCustomerNote = {
  id: number;
  note: string;
  createdAt: string;
};

export type AdminCustomerDetail = AdminCustomerSummary & {
  addresses: AdminCustomerAddress[];
  recentOrders: AdminCustomerRecentOrder[];
  notes: AdminCustomerNote[];
  tags: string[];
};

export type PaginatedAdminCustomersResponse = {
  items: AdminCustomerSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminCustomersFilters = {
  accepted_marketing?: "true" | "false";
  has_orders?: "true" | "false";
  lifecycle_status?: CRMContactLifecycleStatus;
  main_goal?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  skin_type?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};
