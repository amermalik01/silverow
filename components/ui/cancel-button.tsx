// components/ui/cancel-button.tsx

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export const CancelButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "variant">
>((props, ref) => {
  return <Button ref={ref} variant="cancel" {...props} />;
});

CancelButton.displayName = "CancelButton";
