import { OrganizationRegistrationForm } from "@/components/portal/organization-registration-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <OrganizationRegistrationForm />
    </main>
  );
}
