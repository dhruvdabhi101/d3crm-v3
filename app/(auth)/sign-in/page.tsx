import SignInForm from "@/components/sign-in-form";
import { redirectSignedInUser } from "@/lib/permissions";

export default async function SignInPage() {
  await redirectSignedInUser();
  return <SignInForm />;
}
