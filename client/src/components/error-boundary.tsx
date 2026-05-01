import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-2 border-red-50/50 shadow-xl rounded-[2rem]">
            <CardContent className="pt-10 pb-10 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-4">Something went wrong</h2>
              <p className="text-gray-500 font-medium mb-8">
                The page encountered an error during navigation. Don't worry, your data is safe.
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                className="rounded-xl h-12 px-8 bg-black font-black uppercase tracking-widest text-xs"
              >
                <RefreshCcw className="mr-2 h-4 w-4" /> Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
