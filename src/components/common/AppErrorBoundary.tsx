import React from "react";
import { SystemStatusPage } from "./SystemStatusPage";

type State = { failed: boolean };

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch() {
    // Unexpected details stay out of the production UI. Runtime monitoring can be added separately.
  }

  render() {
    if (this.state.failed) {
      return (
        <SystemStatusPage
          eyebrow="Request Tracker"
          title="Something went wrong"
          message="The application could not finish rendering this page. Reload to try again or return to the home screen."
          primaryLabel="Reload"
          onPrimary={() => window.location.reload()}
          secondaryLabel="Go to Home"
          onSecondary={() => window.location.assign("/")}
        />
      );
    }
    return this.props.children;
  }
}
