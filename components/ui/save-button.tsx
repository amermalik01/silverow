// components/ui/save-button.tsx

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export const SaveButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "variant">
>((props, ref) => {
  return (
    <Button
      ref={ref}
      variant="save"
      {...props}
    />
  );
});

SaveButton.displayName = "SaveButton";