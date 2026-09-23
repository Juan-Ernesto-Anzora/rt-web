import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { SystemStatusPage } from "../components/common/SystemStatusPage";

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const { tenant } = useAuth();

  return <SystemStatusPage insideShell eyebrow={`Tenant: ${tenant ?? "-"}`} title="Access denied" message="Your account is signed in, but it does not have permission to open this administration area." primaryLabel="Back to Home" onPrimary={() => navigate("/")} />;
}
