// components/ui/date-picker.tsx

"use client";

import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Icon } from "@iconify/react";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  label?: string;
  id?: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  containerClassName?: string;
}

export function DatePicker({
  label,
  id = "date-picker",
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  minDate,
  maxDate,
  className,
  containerClassName,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  /* flex flex-col gap-1.5  */
  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <Label
          htmlFor={id}
          className="px-0.5 text-muted-foreground font-medium text-xs"
        >
          {label}
        </Label>
      )}
      <Popover
        open={disabled ? false : open}
        onOpenChange={disabled ? undefined : setOpen}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            className={cn(
              "w-full h-8 px-2 justify-between font-normal bg-white text-slate-800 border-slate-300 hover:bg-slate-50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs dark:bg-white dark:text-slate-900 dark:border-slate-300 dark:hover:bg-slate-100",
              className,
            )}
            // className={cn(
            //   "w-full justify-between font-normal bg-white text-foreground hover:bg-lightprimary/20  disabled:opacity-50 disabled:cursor-not-allowed",
            //   className,
            // )}
            // className='w-full justify-between font-normal bg-transparent border-border text-foreground hover:bg-lightprimary/20 focus:border-primary focus-visible:ring-primary/30 h-10 px-3 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <span
              className={
                !value ? "text-slate-400" : "text-slate-800 dark:text-slate-900"
              }
            >
              {value ? format(value, "dd/MM/yyyy") : placeholder}
              {/* {value ? value.toLocaleDateString(undefined, { dateStyle: 'medium' }) : placeholder} */}
            </span>
            <Icon
              icon="solar:calendar-minimalistic-linear"
              className="text-slate-500 shrink-0"
              width={16}
              height={16}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-white border border-slate-200 shadow-lg rounded-md overflow-hidden text-slate-900 z-50 dark:bg-white dark:text-slate-900"
          align="start"
        >
          <Calendar
            mode="single"
            selected={value}
            disabled={(date) =>
              disabled ||
              (minDate ? date < minDate : false) ||
              (maxDate ? maxDate < date : false)
            }
            // disabled={disabled} // Prevents interaction inside the calendar if open
            captionLayout="dropdown"
            className="bg-white text-slate-900 rounded-md p-3 dark:bg-white dark:text-slate-900"
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
