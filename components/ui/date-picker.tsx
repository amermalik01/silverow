// components/ui/date-picker.tsx

'use client'

import * as React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Icon } from '@iconify/react' 

interface DatePickerProps {
  label?: string;
  id?: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean; // Added disabled prop definition
}

export function DatePicker({
  label,
  id = 'date-picker',
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false // Default to false
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className='flex flex-col gap-1.5 w-full'>
      {label && (
        <Label htmlFor={id} className='px-0.5 text-muted-foreground font-medium text-xs'>
          {label}
        </Label>
      )}
      <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant='outline'
            id={id}
            disabled={disabled} // Disables the button visually and functionally
            className='w-full justify-between font-normal bg-transparent border-border text-foreground hover:bg-lightprimary/20 focus:border-primary focus-visible:ring-primary/30 h-10 px-3 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <span className={!value ? 'text-muted-foreground' : 'text-foreground'}>
              {value ? value.toLocaleDateString(undefined, { dateStyle: 'medium' }) : placeholder}
            </span>
            <Icon
              icon='solar:calendar-minimalistic-linear'
              className="text-muted-foreground"
              width={18}
              height={18}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='w-auto overflow-hidden p-0 bg-card border border-border shadow-lg'
          align='start'
        >
          <Calendar
            mode='single'
            selected={value}
            disabled={disabled} // Prevents interaction inside the calendar if open
            captionLayout='dropdown'
            onSelect={(date) => {
              onChange(date)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

/* "use client";

import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
// If you use Iconify, lucide-react, or another pack, adjust this import accordingly:
import { Icon } from "@iconify/react";

interface DatePickerProps {
  label?: string;
  id?: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}

export function DatePicker({
  label,
  id = "date-picker",
  value,
  onChange,
  placeholder = "Select date",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <Label
          htmlFor={id}
          className="px-0.5 text-muted-foreground font-medium text-xs"
        >
          {label}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            className="w-full justify-between font-normal bg-transparent border-border text-foreground hover:bg-lightprimary/20 focus:border-primary focus-visible:ring-primary/30 h-10 px-3"
          >
            <span
              className={!value ? "text-muted-foreground" : "text-foreground"}
            >
              {value
                ? value.toLocaleDateString(undefined, { dateStyle: "medium" })
                : placeholder}
            </span>
            <Icon
              icon="solar:calendar-minimalistic-linear"
              className="text-muted-foreground"
              width={18}
              height={18}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto overflow-hidden p-0 bg-card border border-border shadow-lg"
          align="start"
        >
          <Calendar
            mode="single"
            selected={value}
            captionLayout="dropdown"
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
} */
