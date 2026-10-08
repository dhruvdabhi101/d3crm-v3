import SignUpForm from "@/components/sign-up-form";
import { redirectSignedInUser } from "@/lib/permissions";

export default async function SignUpPage() {
  await redirectSignedInUser();
  return <SignUpForm />;
}
