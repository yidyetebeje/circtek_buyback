import { Metadata } from "next";
import { LoginPageClient } from "@/components/admin/LoginPageClient";
import { EnvironmentChecker } from "@/components/admin/EnvironmentChecker";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Login to access the admin dashboard",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <EnvironmentChecker />
      <LoginPageClient />
    </div>
  );
} 