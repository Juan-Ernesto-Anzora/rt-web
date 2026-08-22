import { useNavigate } from "react-router-dom";
import { SystemStatusPage } from "../components/common/SystemStatusPage";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return <SystemStatusPage eyebrow="404" title="Page not found" message="The page may have moved, or the address may be incorrect." primaryLabel="Go to Home" onPrimary={() => navigate("/")} secondaryLabel="Go Back" onSecondary={() => navigate(-1)} />;
}
