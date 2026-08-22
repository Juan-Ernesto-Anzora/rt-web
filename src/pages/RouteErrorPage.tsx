import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { SystemStatusPage } from "../components/common/SystemStatusPage";

export default function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const status = isRouteErrorResponse(error) ? error.status : undefined;
  const title = status === 403 ? "Access denied" : status === 404 ? "Page not found" : "Something went wrong";
  const message = status === 403
    ? "Your account does not have permission to open this page."
    : status === 404
      ? "The requested page could not be found."
      : "The page could not be displayed. Try again without losing your signed-in session.";
  return <SystemStatusPage eyebrow={status ? String(status) : "Request Tracker"} title={title} message={message} primaryLabel="Go to Home" onPrimary={() => navigate("/")} secondaryLabel="Reload" onSecondary={() => window.location.reload()} />;
}
