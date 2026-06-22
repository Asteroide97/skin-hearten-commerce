export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

export type Brand = {
  id: string;
  name: string;
  slug?: string;
  description: string;
};

export type ProductFaq = {
  question: string;
  answer: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
  stock: number;
  description: string;
  benefits: string[];
  ingredients: string[];
  usage: string[];
  faq: ProductFaq[];
  skinTypes: string[];
  concerns: string[];
  badges?: string[];
  images: string[];
  highlight: string;
  gradient: string;
  featured: boolean;
  bestSeller: boolean;
  rating: number;
  reviewCount: number;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  metaTitle: string;
  metaDescription: string;
  content: string[];
};

export type Testimonial = {
  id: string;
  name: string;
  city: string;
  rating: number;
  text: string;
};

export type Benefit = {
  title: string;
  description: string;
};

export type SkinNeed = {
  id: string;
  title: string;
  description: string;
  href: string;
  accent: string;
  eyebrow: string;
  analyticsNeed: import("@/lib/analytics").NeedAnalyticsValue;
};

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
};

export type AdminOrder = {
  id: string;
  customer: string;
  status: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpent: number;
  purchases: number;
};
